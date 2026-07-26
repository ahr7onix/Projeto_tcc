import { Controller, Get, Inject } from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL } from '../../database/database.module';

/**
 * Rota pública usada pelo servidor de hospedagem para saber se a API está de pé.
 * Não expõe nenhum dado — só responde se o processo e o banco estão respondendo.
 *
 * Não confundir com o módulo `saude`, que guarda os dados de saúde do paciente
 * e exige autenticação.
 */
@Controller('status')
export class StatusController {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  @Get()
  async status() {
    let banco: 'ok' | 'indisponivel' = 'ok';
    try {
      await this.pool.query('SELECT 1');
    } catch {
      banco = 'indisponivel';
    }

    return {
      status: 'ok',
      servico: 'nutricare-api',
      banco,
      horario: new Date().toISOString(),
    };
  }
}
