import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL } from '../../database/database.module';

/** Quanto tempo a resposta "sessão aberta" fica guardada antes de ir ao banco de novo. */
const MEMORIA_MS = 30_000;
/** Teto de sessões guardadas; passou, a memória recomeça do zero. */
const LIMITE_MEMORIA = 5_000;

/**
 * Diz se a sessão de um token de acesso continua aberta.
 *
 * O token de acesso vale 15 minutos e não guarda estado. Antes, sair, trocar a
 * senha ou desativar a conta encerrava a sessão de renovação, mas o token já
 * emitido seguia aceito até vencer (CO-05 do parecer;
 * docs/ANALISE_SEGURANCA_LGPD.md, item 2.4). Agora cada token leva o id da
 * sessão (`sid`, a linha de `refresh_token`), e o `JwtAuthGuard` confere aqui
 * se ela segue aberta.
 *
 * A renovação troca a linha por outra (`substituto_id`). O token emitido antes
 * da troca continua valendo enquanto a substituta estiver aberta, para não
 * derrubar pedidos que já estavam a caminho.
 *
 * A resposta fica guardada por 30 s, para não ir ao banco a cada pedido no
 * servidor gratuito. Quem encerra sessão chama `sessoesEncerradas`, que limpa
 * a memória na hora. Com mais de uma instância da API, as outras levam no
 * máximo esses 30 s para saber.
 */
@Injectable()
export class SessoesService {
  private readonly abertas = new Map<string, number>();

  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async aberta(sid: string, idUsuario: string): Promise<boolean> {
    const chave = `${idUsuario}:${sid}`;
    if ((this.abertas.get(chave) ?? 0) > Date.now()) return true;

    const { rowCount } = await this.pool.query(
      `SELECT 1
         FROM refresh_token t
         LEFT JOIN refresh_token s ON s.id_token = t.substituto_id
        WHERE t.id_token = $1
          AND t.id_usuario = $2
          AND (t.revogado_em IS NULL OR (s.id_token IS NOT NULL AND s.revogado_em IS NULL))`,
      [sid, idUsuario],
    );
    if (!rowCount) return false;

    if (this.abertas.size >= LIMITE_MEMORIA) this.abertas.clear();
    this.abertas.set(chave, Date.now() + MEMORIA_MS);
    return true;
  }

  /** Chamar depois de encerrar qualquer sessão (sair, trocar senha, desativar, apagar conta). */
  sessoesEncerradas(): void {
    this.abertas.clear();
  }
}
