import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { Pool } from 'pg';
import type { JwtPayload } from '../../common/guards/jwt.guard';
import type { PushService } from '../push/push.service';
import { MensagensEventosService } from './mensagens-eventos.service';
import { MensagensService } from './mensagens.service';
import type { CreateMensagemDto } from './dto/create-mensagem.dto';
import type { EventoMensagem, Sinal } from './mensagens-eventos.service';

function criarPoolMock(respostas: unknown[][]) {
  const query = jest.fn();
  respostas.forEach((rows) => query.mockResolvedValueOnce({ rows, rowCount: rows.length }));
  return { pool: { query } as unknown as Pool, query };
}

function criarPushMock(falha = false) {
  const enviarPara = falha
    ? jest.fn().mockRejectedValue(new Error('sem token de push'))
    : jest.fn().mockResolvedValue(undefined);
  return { push: { enviarPara } as unknown as PushService, enviarPara };
}

function usuario(role: JwtPayload['role'], sub = '1'): JwtPayload {
  return { sub, email: 'teste@nutricare.local', role };
}

/** Linha do vínculo como o JOIN de `buscarVinculo` devolve. */
function linhaVinculo(extra: Record<string, unknown> = {}) {
  return {
    id_vinculo: '10',
    paciente_id: '2',
    paciente_nome: 'Ana',
    nutricionista_id: '1',
    nutricionista_nome: 'Bruno',
    paciente_nascimento: null,
    paciente_diabetes: null,
    paciente_genero: null,
    paciente_peso: null,
    paciente_altura: null,
    ...extra,
  };
}

function linhaMensagem(extra: Record<string, unknown> = {}) {
  return {
    id_mensagem: '100',
    id_vinculo: '10',
    id_remetente: '2',
    remetente_nome: 'Ana',
    remetente_tipo: 'paciente',
    conteudo: 'Bom dia',
    lida_em: null,
    criado_em: new Date('2026-07-30T09:00:00Z'),
    ...extra,
  };
}

function criarServico(respostas: unknown[][], pushFalha = false) {
  const { pool, query } = criarPoolMock(respostas);
  const { push, enviarPara } = criarPushMock(pushFalha);
  // O barramento é de verdade (não tem dependência nenhuma); assim os testes
  // conseguem escutar o que seria empurrado pelo canal em tempo real.
  const eventos = new MensagensEventosService();
  const publicados: EventoMensagem[] = [];
  const sinais: Sinal[] = [];
  jest.spyOn(eventos, 'publicar').mockImplementation((e) => {
    publicados.push(e);
  });
  jest.spyOn(eventos, 'publicarSinal').mockImplementation((s) => {
    sinais.push(s);
  });
  return {
    service: new MensagensService(pool, push, eventos),
    query,
    enviarPara,
    publicados,
    sinais,
  };
}

describe('MensagensService', () => {
  describe('vínculo obrigatório', () => {
    it('should refuse to open a conversation without an active link', async () => {
      const { service } = criarServico([[]]);
      await expect(
        service.listarMensagens(usuario('paciente', '2'), '9'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should refuse to send a message without an active link', async () => {
      const { service, query } = criarServico([[]]);
      await expect(
        service.enviar(usuario('nutricionista'), {
          destinatarioId: '9',
          conteudo: 'Oi',
        } as CreateMensagemDto),
      ).rejects.toThrow(ForbiddenException);
      // Só a consulta do vínculo aconteceu: nada foi inserido.
      expect(query).toHaveBeenCalledTimes(1);
    });

    it('should look the link up by the column of the role that is asking', async () => {
      const { service, query } = criarServico([[linhaVinculo()], [], []]);
      await service.listarMensagens(usuario('paciente', '2'), '1');

      const [sql, params] = query.mock.calls[0];
      // Paciente: o próprio é o usuário do paciente, a contraparte é o nutricionista.
      expect(sql).toContain('AND up.id_usuario = $1');
      expect(sql).toContain('AND un.id_usuario = $2');
      expect(params).toEqual(['2', '1']);
    });
  });

  describe('listarMensagens', () => {
    it('should apply the default limit and cap it at the maximum', async () => {
      const primeiro = criarServico([[linhaVinculo()], [], []]);
      await primeiro.service.listarMensagens(usuario('paciente', '2'), '1');
      expect(primeiro.query.mock.calls[1][1]).toEqual(['10', 50]);

      const segundo = criarServico([[linhaVinculo()], [], []]);
      await segundo.service.listarMensagens(usuario('paciente', '2'), '1', 9000);
      expect(segundo.query.mock.calls[1][1]).toEqual(['10', 200]);
    });

    it('should return the messages oldest first', async () => {
      // O SELECT traz do mais novo para o mais antigo (para respeitar o LIMIT);
      // a tela precisa da ordem inversa.
      const { service } = criarServico([
        [linhaVinculo()],
        [
          linhaMensagem({ id_mensagem: '102', conteudo: 'Terceira' }),
          linhaMensagem({ id_mensagem: '101', conteudo: 'Segunda' }),
          linhaMensagem({ id_mensagem: '100', conteudo: 'Primeira' }),
        ],
        [],
      ]);

      const resposta = await service.listarMensagens(usuario('paciente', '2'), '1');
      expect(resposta.data.map((m) => m.conteudo)).toEqual([
        'Primeira',
        'Segunda',
        'Terceira',
      ]);
    });

    it('should mark only the messages from the other person as read', async () => {
      const { service, query } = criarServico([[linhaVinculo()], [linhaMensagem()], []]);
      await service.listarMensagens(usuario('paciente', '2'), '1');

      const [sql, params] = query.mock.calls[2];
      expect(sql).toContain('SET lida_em = NOW()');
      expect(sql).toContain('id_remetente <> $2');
      expect(params).toEqual(['10', '2']);
    });

    it('should flag which messages belong to who is reading', async () => {
      const { service } = criarServico([
        [linhaVinculo()],
        [
          linhaMensagem({ id_mensagem: '101', id_remetente: '1' }),
          linhaMensagem({ id_mensagem: '100', id_remetente: '2' }),
        ],
        [],
      ]);

      const resposta = await service.listarMensagens(usuario('paciente', '2'), '1');
      expect(resposta.data.map((m) => m.propria)).toEqual([true, false]);
      expect(resposta.contraparte).toEqual({ id: '1', nome: 'Bruno' });
    });

    it('should push a read signal to the sender when messages were marked read', async () => {
      const { service, sinais } = criarServico([
        [linhaVinculo()],
        [linhaMensagem()],
        [{}, {}], // duas linhas atualizadas pelo UPDATE
      ]);
      await service.listarMensagens(usuario('paciente', '2'), '1');

      expect(sinais).toHaveLength(1);
      expect(sinais[0]).toMatchObject({
        tipo: 'leitura',
        paraUsuarioId: '1',
        contraparteId: '2',
      });
    });

    it('should not push a read signal when nothing was unread', async () => {
      const { service, sinais } = criarServico([
        [linhaVinculo()],
        [linhaMensagem()],
        [],
      ]);
      await service.listarMensagens(usuario('paciente', '2'), '1');
      expect(sinais).toHaveLength(0);
    });

    it('should attach the patient quick profile only for the nutritionist', async () => {
      const comPerfil = criarServico([
        [linhaVinculo({ paciente_diabetes: 'tipo1', paciente_peso: '72.50' })],
        [linhaMensagem()],
        [],
      ]);
      const resposta = await comPerfil.service.listarMensagens(
        usuario('nutricionista', '1'),
        '2',
      );
      expect(resposta.contraparte).toMatchObject({
        id: '2',
        nome: 'Ana',
        perfil: { tipoDiabetes: 'tipo1', peso: 72.5 },
      });
    });
  });

  describe('registrarDigitando', () => {
    it('should push a typing signal to the counterpart', async () => {
      const { service, sinais } = criarServico([[linhaVinculo()]]);
      await service.registrarDigitando(usuario('nutricionista', '1'), '2', true);

      expect(sinais).toEqual([
        { tipo: 'digitando', paraUsuarioId: '2', contraparteId: '1', digitando: true },
      ]);
    });

    it('should refuse to signal typing without an active link', async () => {
      const { service, sinais } = criarServico([[]]);
      await expect(
        service.registrarDigitando(usuario('nutricionista', '1'), '9', true),
      ).rejects.toThrow(ForbiddenException);
      expect(sinais).toHaveLength(0);
    });
  });

  describe('enviar', () => {
    const dto = { destinatarioId: '2', conteudo: '  Bom dia  ' } as CreateMensagemDto;

    it('should trim the content before saving it', async () => {
      const { service, query } = criarServico([
        [linhaVinculo()],
        [linhaMensagem({ conteudo: 'Bom dia' })],
      ]);
      const mensagem = await service.enviar(usuario('nutricionista'), dto);

      expect(query.mock.calls[1][1]).toEqual(['10', '1', 'Bom dia']);
      expect(mensagem.conteudo).toBe('Bom dia');
    });

    it('should notify the recipient by push', async () => {
      const { service, enviarPara } = criarServico([
        [linhaVinculo()],
        [linhaMensagem()],
      ]);
      await service.enviar(usuario('nutricionista'), dto);

      expect(enviarPara).toHaveBeenCalledWith('2', {
        titulo: 'Nova mensagem',
        corpo: 'Bom dia',
        dados: { tipo: 'mensagem', remetenteId: '1' },
      });
    });

    it('should still deliver the message when the push fails', async () => {
      // O push é acessório: aparelho sem token não pode impedir a conversa.
      const { service } = criarServico([[linhaVinculo()], [linhaMensagem()]], true);
      await expect(
        service.enviar(usuario('nutricionista'), dto),
      ).resolves.toMatchObject({ conteudo: 'Bom dia' });
    });

    it('should publish the message to both sides of the conversation', async () => {
      // Sem isso a tela de quem recebe só mostraria a mensagem depois de um F5.
      const { service, publicados } = criarServico([
        [linhaVinculo()],
        [linhaMensagem({ id_remetente: '1', remetente_nome: 'Bruno' })],
      ]);
      await service.enviar(usuario('nutricionista'), dto);

      expect(publicados).toHaveLength(2);

      const destinatario = publicados.find((e) => e.paraUsuarioId === '2');
      expect(destinatario?.contraparteId).toBe('1');
      expect(destinatario?.mensagem.propria).toBe(false);
      expect(destinatario?.mensagem.conteudo).toBe('Bom dia');

      const remetente = publicados.find((e) => e.paraUsuarioId === '1');
      expect(remetente?.contraparteId).toBe('2');
      expect(remetente?.mensagem.propria).toBe(true);
    });

    it('should not publish anything when the insert returns nothing', async () => {
      const { service, publicados } = criarServico([[linhaVinculo()], []]);
      await expect(service.enviar(usuario('nutricionista'), dto)).rejects.toThrow(
        NotFoundException,
      );
      expect(publicados).toHaveLength(0);
    });

    it('should throw NotFoundException when the insert returns nothing', async () => {
      const { service } = criarServico([[linhaVinculo()], []]);
      await expect(service.enviar(usuario('nutricionista'), dto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('listarConversas', () => {
    it('should show the patient as the counterpart for the nutritionist', async () => {
      const { service, query } = criarServico([
        [
          {
            id_vinculo: '10',
            contraparte_id: '2',
            contraparte_nome: 'Ana',
            ultima_mensagem: 'Bom dia',
            ultima_em: new Date('2026-07-30T09:00:00Z'),
            nao_lidas: '3',
          },
        ],
      ]);

      const resposta = await service.listarConversas(usuario('nutricionista'));
      expect(query.mock.calls[0][0]).toContain('AND un.id_usuario = $1');
      expect(resposta.data[0]).toMatchObject({
        vinculoId: '10',
        contraparteId: '2',
        contraparteNome: 'Ana',
        naoLidas: 3,
      });
    });

    it('should return null instead of undefined for an empty conversation', async () => {
      const { service } = criarServico([
        [
          {
            id_vinculo: '10',
            contraparte_id: '1',
            contraparte_nome: 'Bruno',
            ultima_mensagem: null,
            ultima_em: null,
            nao_lidas: '0',
          },
        ],
      ]);

      const resposta = await service.listarConversas(usuario('paciente', '2'));
      expect(resposta.data[0].ultimaMensagem).toBeNull();
      expect(resposta.data[0].ultimaEm).toBeNull();
    });
  });

  describe('contarNaoLidas', () => {
    it('should convert the count that comes as text from the database', async () => {
      const { service } = criarServico([[{ total: '7' }]]);
      await expect(service.contarNaoLidas(usuario('paciente', '2'))).resolves.toEqual({
        naoLidas: 7,
      });
    });
  });
});
