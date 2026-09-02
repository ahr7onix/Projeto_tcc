import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL } from '../../database/database.module';
import { logger } from '../../common/logging/logger.service';
import { monitoramento } from '../../common/monitoring/monitoring-client';
import { realtime } from '../../common/logging/realtime-metrics';

export type EstadoBanco = 'connected' | 'error';

export interface Saude {
  status: 'ok' | 'degraded';
  api: 'online';
  database: EstadoBanco;
  realtime: ReturnType<typeof realtime.resumo>;
  uptime: number;
  timestamp: string;
}

/** Sem resposta em 3 s o banco está tão ruim quanto fora do ar. */
const LIMITE_MS = 3000;

@Injectable()
export class HealthService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  /**
   * Toca no banco de verdade (`SELECT 1`), e não só no pool: pool montado não
   * prova que a conexão existe.
   *
   * O motivo da falha fica no log do servidor. Nada dele vai para a resposta:
   * a mensagem do driver carrega host, porta, usuário e nome do banco.
   */
  async verificarBanco(): Promise<EstadoBanco> {
    return (await this.medirBanco()).ok ? 'connected' : 'error';
  }

  /**
   * Mesma verificação, com o tempo de resposta junto — é o que o heartbeat e
   * a rota `/health/database` mandam para a central de monitoramento.
   */
  async medirBanco(): Promise<{ ok: boolean; ms: number }> {
    const inicio = Date.now();
    try {
      await Promise.race([
        this.pool.query('SELECT 1'),
        new Promise((_, rejeitar) =>
          setTimeout(() => rejeitar(new Error('timeout')), LIMITE_MS),
        ),
      ]);
      return { ok: true, ms: Date.now() - inicio };
    } catch (erro) {
      const tipo = (erro as Error)?.name ?? 'Error';
      logger.escrever('ERROR', 'health: banco indisponível', { tipo });
      // Falha de banco é um dos eventos que a central precisa ver. Só o tipo
      // do erro: mensagem do driver carrega host, usuário e nome do banco.
      monitoramento.registrar({
        nivel: 'CRITICAL',
        origem: 'database',
        servico: 'database',
        tipo: tipo === 'Error' ? 'BANCO_INDISPONIVEL' : tipo,
        mensagem: 'Banco de dados não respondeu à verificação de saúde',
        duracaoMs: Date.now() - inicio,
      });
      return { ok: false, ms: Date.now() - inicio };
    }
  }

  async resumo(): Promise<Saude> {
    const database = await this.verificarBanco();
    return {
      status: database === 'connected' ? 'ok' : 'degraded',
      api: 'online',
      database,
      realtime: realtime.resumo(),
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }
}
