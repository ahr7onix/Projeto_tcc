import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import type { Pool } from 'pg';
import { PG_POOL } from '../../database/database.module';

@Injectable()
export class PerfilService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async getMe(idUsuario: string) {
    const result = await this.pool.query(
      `SELECT id_usuario, nome, email, tipo FROM usuario WHERE id_usuario = $1`,
      [idUsuario],
    );
    const u = result.rows[0];
    if (!u) throw new UnauthorizedException();
    return { id: String(u.id_usuario), nome: u.nome, email: u.email, role: u.tipo };
  }

  async update(idUsuario: string, dto: { nome?: string; senhaAtual?: string; novaSenha?: string }) {
    if (dto.senhaAtual && dto.novaSenha) {
      const result = await this.pool.query<{ senha: string }>(
        'SELECT senha FROM usuario WHERE id_usuario = $1',
        [idUsuario],
      );
      const ok = await bcrypt.compare(dto.senhaAtual, result.rows[0]?.senha ?? '');
      if (!ok) throw new UnauthorizedException('Senha atual incorreta');

      const hash = await bcrypt.hash(dto.novaSenha, 10);
      await this.pool.query(
        'UPDATE usuario SET senha = $1 WHERE id_usuario = $2',
        [hash, idUsuario],
      );
    }

    if (dto.nome) {
      await this.pool.query(
        'UPDATE usuario SET nome = $1 WHERE id_usuario = $2',
        [dto.nome.trim(), idUsuario],
      );
    }

    return this.getMe(idUsuario);
  }
}
