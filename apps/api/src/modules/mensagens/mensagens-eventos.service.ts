import { Injectable } from '@nestjs/common';
import type { MessageEvent } from '@nestjs/common';
import { Observable, Subject, filter, interval, map, merge } from 'rxjs';

/**
 * Mensagem pronta para ser entregue a UM usuário, já do ponto de vista dele
 * (`propria` diz se foi ele quem escreveu).
 */
export interface MensagemEntregue {
  id: string;
  conteudo: string;
  remetenteId: string;
  remetenteNome: string;
  remetenteTipo: string;
  propria: boolean;
  lida: boolean;
  criadoEm: Date;
}

export interface EventoMensagem {
  /** Quem deve receber este evento. */
  paraUsuarioId: string;
  /** Com quem é a conversa, do ponto de vista de quem recebe. */
  contraparteId: string;
  mensagem: MensagemEntregue;
}

/**
 * Sinal leve da conversa — não é mensagem, mas muda a tela de quem recebe:
 * "está digitando" e "leu até aqui". Vai pelo mesmo canal SSE.
 */
export interface SinalDigitando {
  tipo: 'digitando';
  paraUsuarioId: string;
  contraparteId: string;
  digitando: boolean;
}

export interface SinalLeitura {
  tipo: 'leitura';
  paraUsuarioId: string;
  contraparteId: string;
  lidoEm: string;
}

export type Sinal = SinalDigitando | SinalLeitura;

/**
 * Barramento em memória que liga quem envia uma mensagem a quem está com a
 * tela aberta, para o painel não depender de o usuário apertar F5.
 *
 * É em memória de propósito: com uma única instância da API — que é o caso
 * aqui — isso basta e não exige Redis nem outro serviço. Se um dia a API rodar
 * em mais de um processo, cada um só enxergará os próprios clientes, e este
 * `Subject` precisa virar um canal compartilhado (LISTEN/NOTIFY do Postgres,
 * por exemplo).
 */
@Injectable()
export class MensagensEventosService {
  private readonly eventos = new Subject<EventoMensagem>();
  private readonly sinais = new Subject<Sinal>();

  publicar(evento: EventoMensagem): void {
    this.eventos.next(evento);
  }

  /** "Digitando" e "leu": efêmero, não passa pelo banco. */
  publicarSinal(sinal: Sinal): void {
    this.sinais.next(sinal);
  }

  /**
   * Fluxo SSE de um usuário: só os eventos endereçados a ele, mais um
   * batimento periódico.
   */
  fluxoDoUsuario(usuarioId: string): Observable<MessageEvent> {
    const mensagens = this.eventos.pipe(
      filter((e) => e.paraUsuarioId === usuarioId),
      map(
        (e): MessageEvent => ({
          type: 'mensagem',
          data: { contraparteId: e.contraparteId, mensagem: e.mensagem },
        }),
      ),
    );

    const sinais = this.sinais.pipe(
      filter((s) => s.paraUsuarioId === usuarioId),
      map((s): MessageEvent =>
        s.tipo === 'digitando'
          ? {
              type: 'digitando',
              data: { contraparteId: s.contraparteId, digitando: s.digitando },
            }
          : {
              type: 'lida',
              data: { contraparteId: s.contraparteId, lidoEm: s.lidoEm },
            },
      ),
    );

    // Sem tráfego, proxies e o próprio navegador derrubam a conexão ociosa.
    // O batimento mantém o canal vivo e faz o cliente perceber a queda rápido.
    const batimento = interval(25_000).pipe(
      map((): MessageEvent => ({ type: 'batimento', data: { em: Date.now() } })),
    );

    return merge(mensagens, sinais, batimento);
  }
}
