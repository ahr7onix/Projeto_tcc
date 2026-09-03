import { Controller, Get, HttpStatus, NotFoundException, Res } from '@nestjs/common';
import type { Response } from 'express';
import { logger } from '../../common/logging/logger.service';
import { HealthService } from './health.service';

/**
 * Sondas públicas de disponibilidade. Não exigem autenticação de propósito —
 * quem monitora normalmente não tem sessão — e por isso não devolvem nada
 * além de estado: nenhum dado de paciente, nenhuma configuração, nenhuma
 * string de conexão.
 */
@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  /** Visão completa: API, banco e canal em tempo real. */
  @Get()
  async health_(@Res({ passthrough: true }) res: Response) {
    const resumo = await this.health.resumo();
    // 503 quando algo essencial caiu, para o monitor perceber sem ler o corpo.
    res.status(resumo.status === 'ok' ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE);
    return resumo;
  }

  /** `live`: o processo está de pé. Não consulta dependências de propósito. */
  @Get('live')
  live() {
    return { status: 'ok', uptime: Math.round(process.uptime()) };
  }

  /**
   * Dispara de propósito um erro não tratado, para conferir que o filtro
   * global registra ERROR com `requestId` e responde sem stack trace.
   *
   * Fora de desenvolvimento a rota simplesmente não existe (404), e mesmo em
   * desenvolvimento ela não toca em banco nem em dado de ninguém.
   */
  @Get('erro-simulado')
  erroSimulado(): never {
    if (!logger.desenvolvimento) throw new NotFoundException();
    throw new Error('Erro simulado para testar o monitoramento');
  }

  /**
   * Só o banco, com o tempo de resposta. É o que a central de monitoramento
   * consulta quando quer separar "API fora" de "banco fora".
   */
  @Get('database')
  async database(@Res({ passthrough: true }) res: Response) {
    const banco = await this.health.medirBanco();
    res.status(banco.ok ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE);
    return {
      status: banco.ok ? 'connected' : 'error',
      responseTimeMs: banco.ms,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Estado de cada peça interna, no formato que a central espera. Continua
   * sem autenticação e continua sem devolver dado de ninguém: só nomes de
   * subsistema e estado.
   */
  @Get('services')
  async services(@Res({ passthrough: true }) res: Response) {
    const banco = await this.health.medirBanco();
    const servicos = [
      { service: 'api', status: 'online' as const, responseTimeMs: null as number | null },
      {
        service: 'database',
        status: banco.ok ? ('online' as const) : ('offline' as const),
        responseTimeMs: banco.ms,
      },
      {
        service: 'realtime',
        status: 'online' as const,
        responseTimeMs: null as number | null,
      },
    ];
    const tudoOk = servicos.every((s) => s.status === 'online');
    res.status(tudoOk ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE);
    return { status: tudoOk ? 'ok' : 'degraded', services: servicos, timestamp: new Date().toISOString() };
  }

  /** `ready`: dá para receber tráfego, ou seja, o banco responde. */
  @Get('ready')
  async ready(@Res({ passthrough: true }) res: Response) {
    const database = await this.health.verificarBanco();
    const pronto = database === 'connected';
    res.status(pronto ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE);
    return { status: pronto ? 'ready' : 'not-ready', database };
  }
}
