import { BadRequestException, ConflictException } from '@nestjs/common';
import type { Pool } from 'pg';
import type { ContasService } from '../contas/contas.service';
import type { VinculosService } from '../vinculos/vinculos.service';
import { PacientesService } from './pacientes.service';

const LINK = 'http://painel/redefinir-senha?token=abc&boasvindas=1';

function montar(opcoes: { falharNoInsert?: { code: string } } = {}) {
  const clientQuery = jest.fn(async (sql: string, _params?: unknown[]) => {
    const comando = sql.trim().split(/\s+/)[0];
    if (comando === 'INSERT' && sql.includes('INTO usuario') && opcoes.falharNoInsert) {
      throw Object.assign(new Error('duplicado'), opcoes.falharNoInsert);
    }
    if (sql.includes('INTO usuario')) return { rows: [{ id_usuario: 40 }], rowCount: 1 };
    if (sql.includes('INTO paciente')) return { rows: [{ id_paciente: 4 }], rowCount: 1 };
    return { rows: [], rowCount: 0 };
  });
  const release = jest.fn();
  const query = jest.fn(async () => ({ rows: [{ nome: 'Dra. Camila' }], rowCount: 1 }));
  const pool = { query, connect: jest.fn(async () => ({ query: clientQuery, release })) };
  const vinculos = { resolveNutricionistaId: jest.fn(async () => '7') };
  const contas = {
    gerarLinkDefinirSenha: jest.fn(async () => LINK),
    enviarBoasVindas: jest.fn(async () => ({ emailEnviado: true })),
  };
  const service = new PacientesService(
    pool as unknown as Pool,
    vinculos as unknown as VinculosService,
    contas as unknown as ContasService,
  );
  return { service, clientQuery, release, contas, pool };
}

const comandos = (clientQuery: jest.Mock) =>
  clientQuery.mock.calls.map(([sql]) => {
    const texto = String(sql).trim();
    const tabela = texto.match(/INTO (\w+)/)?.[1];
    return tabela ? `INSERT ${tabela}` : texto.split(/\s+/)[0];
  });

describe('PacientesService.cadastrar', () => {
  const dto = {
    nome: '  Rita   Souza ',
    email: ' RITA@Email.com ',
    dataNascimento: '1975-03-12',
    sexo: 'feminino' as const,
    tipoDiabetes: 'tipo2' as const,
  };

  it('should create the account, the patient and a pending invitation together', async () => {
    const { service, clientQuery, contas } = montar();

    const resposta = await service.cadastrar('1', dto);

    expect(comandos(clientQuery)).toEqual([
      'BEGIN',
      'INSERT usuario',
      'INSERT paciente',
      'INSERT solicitacao_vinculo',
      'COMMIT',
    ]);
    // O link entra na mesma transação: sem conta, sem link.
    expect(contas.gerarLinkDefinirSenha).toHaveBeenCalledWith(expect.anything(), '40');
    expect(clientQuery.mock.calls[1][1]?.slice(0, 2)).toEqual(['Rita Souza', 'rita@email.com']);
    expect(resposta).toEqual({
      paciente: { id: '40', nome: 'Rita Souza', email: 'rita@email.com' },
      emailEnviado: true,
    });
  });

  it('should create only the invitation, never the active bond', async () => {
    // O cadastro cria o convite, não o vínculo: o aceite continua com o paciente.
    const { service, clientQuery } = montar();
    await service.cadastrar('1', dto);
    const sqls = clientQuery.mock.calls.map(([sql]) => String(sql));
    expect(sqls.some((s) => s.includes('nutricionista_paciente'))).toBe(false);
  });

  it('should send the password link only to the patient e-mail', async () => {
    const { service, contas } = montar();
    await service.cadastrar('1', dto);
    expect(contas.enviarBoasVindas).toHaveBeenCalledWith({
      para: 'rita@email.com',
      nome: 'Rita Souza',
      link: LINK,
      autor: 'Dra. Camila',
      perfil: 'paciente',
    });
  });

  it('should answer 409 and roll back when the e-mail already has an account', async () => {
    const { service, clientQuery, release, contas } = montar({ falharNoInsert: { code: '23505' } });

    await expect(service.cadastrar('1', dto)).rejects.toThrow(ConflictException);
    expect(comandos(clientQuery)).toEqual(['BEGIN', 'INSERT usuario', 'ROLLBACK']);
    expect(release).toHaveBeenCalled();
    expect(contas.enviarBoasVindas).not.toHaveBeenCalled();
  });

  it('should refuse a birth date in the future before touching the database', async () => {
    const { service, pool } = montar();
    await expect(
      service.cadastrar('1', { ...dto, dataNascimento: '2999-01-01' }),
    ).rejects.toThrow(BadRequestException);
    expect(pool.connect).not.toHaveBeenCalled();
  });
});
