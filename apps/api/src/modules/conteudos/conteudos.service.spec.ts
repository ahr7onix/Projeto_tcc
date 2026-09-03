import { NotFoundException } from '@nestjs/common';
import type { Pool } from 'pg';
import type { JwtPayload } from '../../common/guards/jwt.guard';
import { ConteudosService } from './conteudos.service';

function criarPoolMock(respostas: unknown[][]) {
  const query = jest.fn();
  respostas.forEach((rows) => query.mockResolvedValueOnce({ rows, rowCount: rows.length }));
  return { pool: { query } as unknown as Pool, query };
}

const paciente: JwtPayload = {
  sub: '10',
  email: 'paciente@teste.local',
  role: 'paciente',
};
const nutricionista: JwtPayload = {
  sub: '20',
  email: 'nutri@teste.local',
  role: 'nutricionista',
};

/** Perfil devolvido pela consulta que resolve o público-alvo do paciente. */
function perfil(temDiabetes: boolean, adulto: boolean) {
  return [{ tem_diabetes: temDiabetes, adulto }];
}

/** A lista de públicos vai como último parâmetro da consulta de conteúdos. */
function publicosUsados(query: jest.Mock, chamada: number): string[] {
  const params = query.mock.calls[chamada][1] as unknown[];
  return params[params.length - 1] as string[];
}

describe('ConteudosService', () => {
  describe('listar', () => {
    it('should restrict a patient to the audiences they belong to', async () => {
      const { pool, query } = criarPoolMock([perfil(true, true), []]);
      const service = new ConteudosService(pool);

      await service.listar(paciente);

      expect(publicosUsados(query, 1)).toEqual([
        'todos',
        'pacientes_diabetes',
        'adultos',
      ]);
    });

    it('should not include the diabetes audience when the patient has no diagnosis', async () => {
      const { pool, query } = criarPoolMock([perfil(false, true), []]);
      const service = new ConteudosService(pool);

      await service.listar(paciente);

      expect(publicosUsados(query, 1)).toEqual(['todos', 'adultos']);
    });

    it('should not include the adult audience when the birth date is missing', async () => {
      const { pool, query } = criarPoolMock([perfil(true, false), []]);
      const service = new ConteudosService(pool);

      await service.listar(paciente);

      expect(publicosUsados(query, 1)).toEqual(['todos', 'pacientes_diabetes']);
    });

    it('should fall back to the public audience when there is no patient record', async () => {
      const { pool, query } = criarPoolMock([[], []]);
      const service = new ConteudosService(pool);

      await service.listar(paciente);

      expect(publicosUsados(query, 1)).toEqual(['todos']);
    });

    it('should not filter by audience for editors', async () => {
      const { pool, query } = criarPoolMock([[]]);
      const service = new ConteudosService(pool);

      await service.listar(nutricionista);

      // Uma consulta só: editores não passam pela resolução de público-alvo.
      expect(query).toHaveBeenCalledTimes(1);
      expect(query.mock.calls[0][0]).not.toContain('c.publico = ANY');
    });
  });

  describe('buscar', () => {
    const conteudo = (extra: Record<string, unknown>) => [
      {
        id_conteudo: 1,
        titulo: 'Contagem de carboidratos',
        conteudo: 'texto',
        categoria: 'geral',
        publicado: true,
        publico: 'todos',
        agendado_em: null,
        criado_em: '2026-01-01',
        atualizado_em: '2026-01-01',
        ...extra,
      },
    ];

    it('should hide content scheduled for a future date', async () => {
      const amanha = new Date(Date.now() + 86_400_000).toISOString();
      const { pool } = criarPoolMock([conteudo({ agendado_em: amanha }), perfil(true, true)]);
      const service = new ConteudosService(pool);

      await expect(service.buscar(paciente, '1')).rejects.toThrow(NotFoundException);
    });

    it('should hide content aimed at an audience the patient is not part of', async () => {
      const { pool } = criarPoolMock([
        conteudo({ publico: 'pacientes_diabetes' }),
        perfil(false, true),
      ]);
      const service = new ConteudosService(pool);

      await expect(service.buscar(paciente, '1')).rejects.toThrow(NotFoundException);
    });

    it('should hide drafts from patients', async () => {
      const { pool } = criarPoolMock([conteudo({ publicado: false }), perfil(true, true)]);
      const service = new ConteudosService(pool);

      await expect(service.buscar(paciente, '1')).rejects.toThrow(NotFoundException);
    });

    it('should return content already published for the right audience', async () => {
      const ontem = new Date(Date.now() - 86_400_000).toISOString();
      const { pool } = criarPoolMock([
        conteudo({ publico: 'pacientes_diabetes', agendado_em: ontem }),
        perfil(true, false),
      ]);
      const service = new ConteudosService(pool);

      await expect(service.buscar(paciente, '1')).resolves.toMatchObject({
        id: '1',
        publico: 'pacientes_diabetes',
      });
    });

    it('should let editors open a draft', async () => {
      const { pool, query } = criarPoolMock([conteudo({ publicado: false })]);
      const service = new ConteudosService(pool);

      await expect(service.buscar(nutricionista, '1')).resolves.toMatchObject({
        id: '1',
      });
      // Editor não chega a consultar o público-alvo.
      expect(query).toHaveBeenCalledTimes(1);
    });
  });
});
