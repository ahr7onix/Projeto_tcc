import { Inject, Module, OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL } from '../../database/database.module';
import { logger } from '../logging/logger.service';
import { monitoramento } from './monitoring-client';

/**
 * Liga o heartbeat para a central de monitoramento.
 *
 * É a única peça do monitoramento que o Nest enxerga. Ela não expõe rota, não
 * cria tabela e não intercepta requisição: só avisa periodicamente que a API
 * está de pé e mede o banco junto. Com `MONITORING_ENABLED` diferente de
 * `true`, o módulo carrega e não faz nada.
 */
@Module({})
export class MonitoringModule implements OnModuleInit, OnApplicationShutdown {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  onModuleInit(): void {
    if (!monitoramento.ativo) return;

    monitoramento.iniciarHeartbeat(async () => {
      const inicio = Date.now();
      try {
        await this.pool.query('SELECT 1');
        return { ok: true, ms: Date.now() - inicio };
      } catch {
        // O motivo fica no log do TCC; para a central basta "não respondeu".
        return { ok: false, ms: Date.now() - inicio };
      }
    });

    logger.escrever('INFO', 'monitoramento externo ativo');
  }

  async onApplicationShutdown(): Promise<void> {
    await monitoramento.parar();
  }
}
