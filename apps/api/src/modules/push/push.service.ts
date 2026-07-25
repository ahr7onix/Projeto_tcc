import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL } from '../../database/database.module';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const LOTE_MAXIMO = 100;

export interface PushPayload {
  titulo: string;
  corpo: string;
  dados?: Record<string, unknown>;
}

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async registrarToken(idUsuario: string, token: string, plataforma?: string) {
    await this.pool.query(
      `INSERT INTO push_token (id_usuario, token, plataforma)
       VALUES ($1, $2, $3)
       ON CONFLICT (token)
       DO UPDATE SET id_usuario = EXCLUDED.id_usuario,
                     plataforma = EXCLUDED.plataforma,
                     usado_em = NOW()`,
      [idUsuario, token, plataforma ?? null],
    );
    return { registrado: true };
  }

  async removerToken(idUsuario: string, token: string) {
    await this.pool.query(
      `DELETE FROM push_token WHERE id_usuario = $1 AND token = $2`,
      [idUsuario, token],
    );
    return { removido: true };
  }

  private async tokensDoUsuario(idUsuario: string): Promise<string[]> {
    const { rows } = await this.pool.query<{ token: string }>(
      `SELECT token FROM push_token WHERE id_usuario = $1`,
      [idUsuario],
    );
    return rows.map((r) => r.token);
  }

  private async removerTokensInvalidos(tokens: string[]) {
    if (!tokens.length) return;
    await this.pool.query(`DELETE FROM push_token WHERE token = ANY($1::varchar[])`, [
      tokens,
    ]);
  }

  async enviarPara(idUsuario: string, payload: PushPayload): Promise<number> {
    const tokens = await this.tokensDoUsuario(idUsuario);
    if (!tokens.length) return 0;

    let enviados = 0;
    for (let i = 0; i < tokens.length; i += LOTE_MAXIMO) {
      const lote = tokens.slice(i, i + LOTE_MAXIMO);
      const mensagens = lote.map((to) => ({
        to,
        title: payload.titulo,
        body: payload.corpo,
        data: payload.dados ?? {},
        sound: 'default',
      }));

      try {
        const resposta = await fetch(EXPO_PUSH_URL, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(mensagens),
        });

        if (!resposta.ok) {
          this.logger.warn(`Expo push respondeu ${resposta.status}`);
          continue;
        }

        const json = (await resposta.json()) as {
          data?: { status: string; details?: { error?: string } }[];
        };

        const invalidos: string[] = [];
        json.data?.forEach((item, indice) => {
          if (item.status === 'ok') {
            enviados += 1;
            return;
          }
          if (item.details?.error === 'DeviceNotRegistered') {
            invalidos.push(lote[indice]);
          }
        });

        await this.removerTokensInvalidos(invalidos);
      } catch (err) {
        this.logger.error(`Falha ao enviar push: ${String(err)}`);
      }
    }

    return enviados;
  }

  async notificarNutricionistasDoPaciente(
    idUsuarioPaciente: string,
    payload: PushPayload,
  ): Promise<number> {
    const { rows } = await this.pool.query<{ id_usuario: string }>(
      `SELECT un.id_usuario
         FROM nutricionista_paciente np
         JOIN paciente p      ON p.id_paciente = np.id_paciente
         JOIN usuario  up     ON up.id_usuario = p.id_usuario
         JOIN nutricionista n ON n.id_nutricionista = np.id_nutricionista
         JOIN usuario  un     ON un.id_usuario = n.id_usuario
        WHERE np.ativo = TRUE AND up.id_usuario = $1`,
      [idUsuarioPaciente],
    );

    let total = 0;
    for (const row of rows) {
      total += await this.enviarPara(String(row.id_usuario), payload);
    }
    return total;
  }
}
