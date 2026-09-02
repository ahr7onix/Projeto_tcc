import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import type { RequisicaoComId } from './http-logger.middleware';
import { monitoramento } from '../monitoring/monitoring-client';
import { logger } from './logger.service';
import { limparUrl } from './redacao';

/**
 * Rede de segurança para tudo que escapa dos controllers.
 *
 * Erro previsto (HttpException) continua saindo exatamente como o Nest já
 * devolvia — o painel e o app dependem do formato atual, e mudar isso
 * quebraria as mensagens de validação.
 *
 * Erro imprevisto vira 500 genérico com o `requestId`: quem chamou tem como
 * dizer qual requisição falhou, sem que a resposta revele stack trace, SQL ou
 * nome de tabela.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(excecao: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<RequisicaoComId>();
    const requestId = req?.requestId ?? '-';
    const rota = limparUrl(req?.originalUrl ?? req?.url ?? '-');

    if (excecao instanceof HttpException) {
      const status = excecao.getStatus();
      // 4xx é comportamento normal da aplicação (login errado, sem permissão);
      // o middleware já registra a linha da requisição. Aqui só interessa o
      // 5xx explícito, que indica defeito.
      if (status >= 500) {
        logger.escrever('ERROR', `${req?.method} ${rota} ${status} — ${excecao.name}`, {
          requestId,
        });
        // Envio para a central: chamada síncrona que só enfileira, nunca espera.
        monitoramento.registrar({
          nivel: 'ERROR',
          tipo: excecao.name,
          mensagem: excecao.message,
          statusHttp: status,
          metodo: req?.method,
          endpoint: rota,
          duracaoMs: req?.inicio ? Date.now() - req.inicio : null,
          metadados: { requestId },
        });
      }
      if (!res.headersSent) res.status(status).json(excecao.getResponse());
      return;
    }

    const erro = excecao as Error;
    const status = HttpStatus.INTERNAL_SERVER_ERROR;

    logger.escrever('ERROR', `${req?.method} ${rota} ${status} — ${erro?.name ?? 'Error'}`, {
      requestId,
      tipo: erro?.name ?? typeof excecao,
      usuario: req?.user?.sub,
    });

    // Erro imprevisto é o caso mais importante para a central: vai com stack,
    // já cortado e sanitizado dentro do cliente.
    monitoramento.registrar({
      nivel: 'CRITICAL',
      tipo: erro?.name ?? 'Error',
      mensagem: erro?.message ?? String(excecao),
      statusHttp: status,
      metodo: req?.method,
      endpoint: rota,
      duracaoMs: req?.inicio ? Date.now() - req.inicio : null,
      stack: erro?.stack ?? null,
      metadados: { requestId },
    });

    // Mensagem e pilha do erro podem conter trecho de SQL e caminho de arquivo:
    // só no terminal de desenvolvimento, nunca na resposta.
    if (logger.desenvolvimento) {
      logger.escrever('ERROR', `requestId=${requestId} ${erro?.message ?? String(excecao)}`);
      if (erro?.stack) {
        logger.escrever('ERROR', erro.stack.split('\n').slice(0, 12).join(' | '));
      }
    }

    if (res.headersSent) {
      res.end();
      return;
    }

    res.status(status).json({
      statusCode: status,
      message: 'Erro interno do servidor',
      requestId,
    });
  }
}
