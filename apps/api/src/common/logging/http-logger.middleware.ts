import { randomBytes } from 'node:crypto';
import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { monitoramento } from '../monitoring/monitoring-client';
import { logger } from './logger.service';
import { limparUrl } from './redacao';
import { realtime } from './realtime-metrics';

export interface RequisicaoComId extends Request {
  requestId?: string;
  inicio?: number;
  user?: { sub?: string; role?: string };
}

/** Rotas de sonda: entram como DEBUG para não afogar o terminal. */
const ROTAS_SILENCIOSAS = [
  '/health',
  '/health/live',
  '/health/ready',
  '/health/database',
  '/health/services',
  '/status',
];

/** Acima disto a requisição vira evento de lentidão na central. */
const LIMITE_DE_LENTIDAO_MS = 3000;

/**
 * IP inteiro é dado pessoal. Guardamos só o prefixo da rede, que já basta
 * para separar "veio do meu PC" de "veio da internet".
 */
function origem(req: Request): string {
  const bruto = (req.ip ?? req.socket.remoteAddress ?? '').replace('::ffff:', '');
  if (!bruto) return 'desconhecida';
  if (bruto.includes(':')) return `${bruto.split(':').slice(0, 3).join(':')}::x`;
  const partes = bruto.split('.');
  return partes.length === 4 ? `${partes[0]}.${partes[1]}.${partes[2]}.x` : 'desconhecida';
}

/**
 * Uma linha por requisição, escrita quando a resposta termina — só aí o
 * status final é conhecido, inclusive o das que nem chegam a um controller
 * (404) e o das que passaram pelo filtro de exceção (500).
 *
 * Também carimba o `requestId`, que amarra esta linha ao erro registrado pelo
 * filtro global e volta ao cliente no cabeçalho `X-Request-Id`.
 */
@Injectable()
export class HttpLoggerMiddleware implements NestMiddleware {
  use(req: RequisicaoComId, res: Response, next: NextFunction): void {
    // O id é sempre gerado aqui; aceitar o do cliente deixaria ele escolher
    // sob qual identificador o próprio ataque aparece no log.
    const requestId = randomBytes(4).toString('hex');
    req.requestId = requestId;
    req.inicio = Date.now();
    res.setHeader('X-Request-Id', requestId);

    const rota = limparUrl(req.originalUrl || req.url);
    const sonda = ROTAS_SILENCIOSAS.includes(rota);
    const fluxo = rota === '/mensagens/stream';

    if (fluxo) {
      realtime.conectou();
      logger.escrever('INFO', `SSE conectado ${rota}`, { requestId });
    }

    let registrado = false;
    const registrar = () => {
      if (registrado) return;
      registrado = true;

      const ms = Date.now() - (req.inicio ?? Date.now());
      const status = res.statusCode;
      const linha = `${req.method} ${rota} ${status} ${ms}ms`;

      if (fluxo) {
        realtime.desconectou();
        logger.escrever('INFO', `SSE encerrado ${rota} ${status} ${ms}ms`, { requestId });
        return;
      }

      const dados: Record<string, unknown> = { requestId };
      if (req.user?.sub) dados.usuario = req.user.sub;
      if (status >= 400) dados.origem = origem(req);

      if (status >= 500) logger.escrever('ERROR', linha, dados);
      else if (status >= 400) logger.escrever('WARN', linha, dados);
      else if (sonda) logger.escrever('DEBUG', linha, dados);
      else logger.escrever('INFO', linha, dados);

      // Central de monitoramento: só o que interessa lá — requisição que falhou
      // (4xx e 5xx) e requisição lenta. Sucesso rápido não vira tráfego de rede.
      // O 5xx já é enviado pelo filtro de exceção, com tipo e stack; aqui
      // entram as respostas de erro que nunca chegam a um controller.
      if (!sonda && (status >= 400 || ms >= LIMITE_DE_LENTIDAO_MS)) {
        monitoramento.registrar({
          nivel: status >= 500 ? 'ERROR' : status >= 400 ? 'WARNING' : 'INFO',
          tipo: status >= 400 ? `HTTP_${status}` : 'REQUISICAO_LENTA',
          mensagem: linha,
          statusHttp: status,
          metodo: req.method,
          endpoint: rota,
          duracaoMs: ms,
          metadados: { requestId },
        });
      }
    };

    res.on('finish', registrar);
    // Cliente que desiste no meio (aba fechada, app em segundo plano) nunca
    // dispara `finish`; sem isto a requisição sumiria do log.
    res.on('close', registrar);

    next();
  }
}
