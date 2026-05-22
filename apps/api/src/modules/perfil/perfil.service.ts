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

  async getPacienteData(idUsuario: string) {
    const result = await this.pool.query(
      `SELECT p.data_nascimento, p.genero, p.tipo_diabetes, p.peso, p.altura, p.restricoes_alergias
       FROM paciente p
       JOIN usuario u ON u.id_usuario = p.id_usuario
       WHERE u.id_usuario = $1`,
      [idUsuario],
    );
    const r = result.rows[0];
    if (!r) return null;
    return {
      dataNascimento: r.data_nascimento ?? null,
      sexo: r.genero ?? null,
      tipoDiabetes: r.tipo_diabetes ?? null,
      peso: r.peso ? Number(r.peso) : null,
      altura: r.altura ? Number(r.altura) : null,
      restricoesAlergias: r.restricoes_alergias ?? null,
    };
  }

  async updatePacienteData(
    idUsuario: string,
    dto: { dataNascimento?: string; sexo?: string; tipoDiabetes?: string; peso?: number; altura?: number; restricoesAlergias?: string },
  ) {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (dto.dataNascimento !== undefined) { fields.push(`data_nascimento = $${values.length + 1}`); values.push(dto.dataNascimento || null); }
    if (dto.sexo !== undefined)           { fields.push(`genero = $${values.length + 1}`); values.push(dto.sexo || null); }
    if (dto.tipoDiabetes !== undefined)   { fields.push(`tipo_diabetes = $${values.length + 1}`); values.push(dto.tipoDiabetes || null); }
    if (dto.peso !== undefined)           { fields.push(`peso = $${values.length + 1}`); values.push(dto.peso ?? null); }
    if (dto.altura !== undefined)         { fields.push(`altura = $${values.length + 1}`); values.push(dto.altura ?? null); }
    if (dto.restricoesAlergias !== undefined) { fields.push(`restricoes_alergias = $${values.length + 1}`); values.push(dto.restricoesAlergias || null); }

    if (fields.length > 0) {
      values.push(idUsuario);
      await this.pool.query(
        `UPDATE paciente SET ${fields.join(', ')}
         WHERE id_usuario = $${values.length}`,
        values,
      );
    }

    return this.getPacienteData(idUsuario);
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
