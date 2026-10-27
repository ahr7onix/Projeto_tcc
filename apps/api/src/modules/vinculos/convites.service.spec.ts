import { ConflictException, NotFoundException } from '@nestjs/common';
import type { Pool } from 'pg';
import type { JwtPayload } from '../../common/guards/jwt.guard';
import type { NotificacoesService } from '../notificacoes/notificacoes.service';
import type { PushService } from '../push/push.service';
import { ConvitesService } from './convites.service';
import type { VinculosService } from './vinculos.service';

function criarPoolMock(respostas: unknown[][]) {
  const query = jest.fn();
  respostas.forEach((rows) => query.mockResolvedValueOnce({ rows, rowCount: rows.length }));
  return query;
}

/**
 * Cliente de transação: responde às consultas na ordem dada, depois de
 * deixar passar BEGIN, COMMIT e ROLLBACK, que não devolvem linhas.
 */
function criarClienteMock(respostas: unknown[][]) {
  const fila = [...respostas];
  const query = jest.fn(async (sql: string, _params?: unknown[]) => {
    if (/^(BEGIN|COMMIT|ROLLBACK)/.test(sql.trim())) return { rows: [], rowCount: 0 };
    const rows = fila.shift() ?? [];
    return { rows, rowCount: rows.length };
  });
  return { query, release: jest.fn() };
}

function montar(opcoes: {
  consultas?: unknown[][];
  transacao?: unknown[][];
  jaVinculado?: boolean;
}) {
  const query = criarPoolMock(opcoes.consultas ?? []);
  const cliente = criarClienteMock(opcoes.transacao ?? []);
  const pool = { query, connect: jest.fn(async () => cliente) } as unknown as Pool;
  const vinculos = {
    resolveNutricionistaId: jest.fn(async () => '7'),
    existeVinculo: jest.fn(async () => opcoes.jaVinculado ?? false),
  } as unknown as VinculosService;
  const push = { enviarPara: jest.fn(async () => 1) };
  const notificacoes = { registrar: jest.fn(async () => ({})) };
  const service = new ConvitesService(
    pool,
    vinculos,
    push as unknown as PushService,
    notificacoes as unknown as NotificacoesService,
  );
  return { service, query, cliente, push, notificacoes };
}

const comandos = (cliente: { query: jest.Mock }) =>
  cliente.query.mock.calls.map(([sql]) => String(sql).trim().split(/\s+/)[0]);

describe('ConvitesService', () => {
  describe('convidar', () => {
    const paciente = { id_paciente: 3, id_usuario: 30, nome: 'João', email: 'joao@x.com' };

    it('should refuse an e-mail that does not belong to an active patient', async () => {
      const { service } = montar({ consultas: [[]] });
      await expect(service.convidar('1', 'ninguem@x.com')).rejects.toThrow(NotFoundException);
    });

    it('should refuse a patient that is already linked', async () => {
      const { service, query } = montar({ consultas: [[paciente]], jaVinculado: true });
      await expect(service.convidar('1', 'joao@x.com')).rejects.toThrow(ConflictException);
      // Nenhum convite gravado.
      expect(query).toHaveBeenCalledTimes(1);
    });

    it('should answer 409 when an invitation is already pending', async () => {
      const { service, query } = montar({ consultas: [[paciente]] });
      query.mockRejectedValueOnce(Object.assign(new Error('duplicate'), { code: '23505' }));
      await expect(service.convidar('1', 'joao@x.com')).rejects.toThrow(ConflictException);
    });

    it('should create the invitation and tell the patient', async () => {
      const criadoEm = new Date();
      const { service, query, push, notificacoes } = montar({
        consultas: [[paciente], [{ id_solicitacao: 9, criado_em: criadoEm }], [{ nome: 'Camila' }]],
      });

      const convite = await service.convidar('1', '  JOAO@x.com ');

      expect(query.mock.calls[0][1]).toEqual(['joao@x.com']);
      expect(convite).toEqual({
        id: '9',
        paciente: { id: '30', nome: 'João', email: 'joao@x.com' },
        criadoEm,
      });
      expect(notificacoes.registrar).toHaveBeenCalledWith(
        expect.objectContaining({ idUsuario: '30', titulo: 'Convite de acompanhamento' }),
      );
      expect(push.enviarPara).toHaveBeenCalledWith('30', expect.anything());
    });
  });

  describe('responder', () => {
    const resposta = [{ id_nutricionista: 7, id_paciente: 3 }];
    const partes = [{ id_nutri: 1, nome_paciente: 'João' }];

    it('should create the link in the same transaction when the patient accepts', async () => {
      const { service, cliente, notificacoes } = montar({
        transacao: [resposta, []],
        consultas: [partes],
      });

      await expect(service.responder('30', '9', true)).resolves.toEqual({
        id: '9',
        status: 'aceita',
      });
      expect(comandos(cliente)).toEqual(['BEGIN', 'UPDATE', 'INSERT', 'COMMIT']);
      expect(cliente.query.mock.calls[1][1]).toEqual(['9', '30', 'aceita']);
      expect(notificacoes.registrar).toHaveBeenCalledWith(
        expect.objectContaining({ idUsuario: '1', titulo: 'Convite aceito' }),
      );
    });

    it('should not create a link when the patient refuses', async () => {
      const { service, cliente } = montar({ transacao: [resposta], consultas: [partes] });

      await service.responder('30', '9', false);

      expect(comandos(cliente)).toEqual(['BEGIN', 'UPDATE', 'COMMIT']);
      expect(cliente.query.mock.calls[1][1]).toEqual(['9', '30', 'recusada']);
    });

    it('should refuse an invitation of another patient or already answered', async () => {
      // O UPDATE filtra pelo paciente do token e pelo status pendente: sem
      // linha, ou o convite é de outra pessoa ou já foi respondido.
      const { service, cliente } = montar({ transacao: [[]] });

      await expect(service.responder('30', '9', true)).rejects.toThrow(NotFoundException);
      expect(comandos(cliente)).toEqual(['BEGIN', 'UPDATE', 'ROLLBACK']);
      expect(cliente.release).toHaveBeenCalled();
    });
  });

  describe('cancelar', () => {
    it('should refuse when nothing pending belongs to the nutritionist', async () => {
      const { service } = montar({ consultas: [[]] });
      await expect(service.cancelar('1', '9')).rejects.toThrow(NotFoundException);
    });
  });

  describe('listarPendentes', () => {
    it('should list the invitations a patient received, with who sent them', async () => {
      const criadoEm = new Date();
      const { service, query } = montar({
        consultas: [
          [{ id_solicitacao: 9, criado_em: criadoEm, id_usuario: 1, nome: 'Camila', crn: '3-123', especialidade: null }],
        ],
      });
      const paciente: JwtPayload = { sub: '30', email: 'joao@x.com', role: 'paciente' };

      const { data } = await service.listarPendentes(paciente);

      expect(query.mock.calls[0][0]).toContain('p.id_usuario = $1');
      expect(data).toEqual([
        {
          id: '9',
          nutricionista: { id: '1', nome: 'Camila', crn: '3-123', especialidade: null },
          criadoEm,
        },
      ]);
    });
  });

  describe('encerrarPeloPaciente', () => {
    it('should refuse when there is no active link', async () => {
      const { service } = montar({ consultas: [[]] });
      await expect(service.encerrarPeloPaciente('30', '1')).rejects.toThrow(NotFoundException);
    });

    it('should end the link and tell the nutritionist', async () => {
      const { service, query, notificacoes } = montar({
        consultas: [[{ '?column?': 1 }], [{ nome: 'João' }]],
      });

      await expect(service.encerrarPeloPaciente('30', '1')).resolves.toEqual({ encerrado: true });
      // Encerra, não apaga: o histórico continua.
      expect(query.mock.calls[0][0]).toContain('SET ativo = FALSE, encerrado_em = NOW()');
      expect(query.mock.calls[0][1]).toEqual(['1', '30']);
      expect(notificacoes.registrar).toHaveBeenCalledWith(
        expect.objectContaining({ idUsuario: '1', titulo: 'Acompanhamento encerrado' }),
      );
    });
  });
});
