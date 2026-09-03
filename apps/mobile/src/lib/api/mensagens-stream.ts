import { AppState, type AppStateStatus, type NativeEventSubscription } from 'react-native';
import { api } from '@/lib/api';
import { env } from '@/lib/env';
import { log } from '@/lib/logger';
import { STORAGE_KEYS, secureStorage } from '@/lib/storage';
import type { Mensagem } from './mensagens';

export interface EventoMensagem {
  /** Com quem é a conversa, do ponto de vista de quem recebe. */
  contraparteId: string;
  mensagem: Mensagem;
}

interface Opcoes {
  /**
   * Chamado toda vez que o canal volta a ficar de pé (primeira conexão,
   * reconexão após falha ou retorno do segundo plano). Enquanto o canal esteve
   * fora do ar pode ter chegado mensagem, então quem assina recarrega a lista
   * aqui em vez de confiar só no que vier daqui para a frente.
   */
  aoReconectar?: () => void;
}

/**
 * Acima disso o texto acumulado da resposta é reciclado.
 *
 * O `XMLHttpRequest` guarda em `responseText` tudo o que já chegou, e esta
 * conexão fica aberta por horas recebendo batimento: sem reciclar, a string
 * cresce para sempre na memória do aparelho.
 */
const LIMITE_BUFFER = 256 * 1024;

/**
 * Divide o texto que chega no fluxo em eventos SSE completos.
 *
 * Um evento termina em linha em branco. O `resto` que sobra é o começo de um
 * evento ainda incompleto — a leitura corta em qualquer ponto, inclusive no
 * meio de um JSON, então ele precisa esperar o próximo pedaço.
 */
function separarEventos(buffer: string) {
  const partes = buffer.split('\n\n');
  const resto = partes.pop() ?? '';
  const eventos = partes.map((bloco) => {
    let tipo = 'message';
    const dados: string[] = [];
    for (const linha of bloco.split('\n')) {
      if (linha.startsWith('event:')) tipo = linha.slice(6).trim();
      else if (linha.startsWith('data:')) dados.push(linha.slice(5).trim());
    }
    return { tipo, dados: dados.join('\n') };
  });
  return { eventos, resto };
}

/**
 * Mantém aberta uma conexão com `/mensagens/stream` e chama `aoReceber` a cada
 * mensagem nova, para o app não depender de o usuário puxar a tela.
 *
 * É o mesmo canal SSE do painel web, mas lido com `XMLHttpRequest`: no React
 * Native o `fetch` é um verniz sobre o XHR e não entrega `response.body`, e
 * `EventSource` não existe — então ler o `responseText` conforme ele cresce é
 * a forma de consumir o fluxo sem dependência nova. De quebra, o XHR aceita
 * cabeçalho: o token vai em `Authorization`, e não na URL (onde acabaria em
 * log de servidor), igual ao web.
 *
 * Devolve a função que encerra a assinatura.
 */
export function assinarMensagens(
  aoReceber: (evento: EventoMensagem) => void,
  opcoes: Opcoes = {},
): () => void {
  let encerrado = false;
  let falhasSeguidas = 0;
  let requisicao: XMLHttpRequest | null = null;
  /** Encerra a conexão atual sem agendar reconexão. */
  let descartarConexao: (() => void) | null = null;
  let reconexaoAgendada: ReturnType<typeof setTimeout> | null = null;
  let assinaturaAppState: NativeEventSubscription | null = null;

  function fecharConexao() {
    descartarConexao?.();
  }

  function agendar(ms: number) {
    if (encerrado || reconexaoAgendada) return;
    reconexaoAgendada = setTimeout(() => {
      reconexaoAgendada = null;
      void conectar();
    }, ms);
  }

  async function conectar() {
    if (encerrado || requisicao) return;

    const token = await secureStorage.get(STORAGE_KEYS.authToken);
    if (!token) {
      // Sem sessão não há o que ouvir; tenta de novo caso o login termine agora.
      falhasSeguidas += 1;
      agendar(Math.min(1000 * 2 ** falhasSeguidas, 30_000));
      return;
    }

    const req = new XMLHttpRequest();
    requisicao = req;

    let lido = 0;
    let buffer = '';
    let finalizada = false;
    let avisouConectado = false;

    function finalizar(motivo: 'falha' | 'reciclagem' | 'sessao' | 'descarte') {
      if (finalizada) return;
      finalizada = true;
      req.onreadystatechange = null;
      req.onerror = null;
      req.ontimeout = null;
      if (requisicao === req) {
        requisicao = null;
        descartarConexao = null;
      }
      try {
        req.abort();
      } catch {
        // Abortar uma requisição já encerrada não é problema.
      }

      // Fechamos de propósito (saiu do app ou a assinatura acabou): quem pediu
      // decide se e quando reconectar.
      if (encerrado || motivo === 'descarte') return;

      if (motivo === 'reciclagem') {
        // Foi decisão nossa derrubar: reconecta na hora, sem punir com espera.
        void conectar();
        return;
      }

      if (motivo === 'sessao') {
        // A conexão fica aberta por horas e o token de acesso expira antes.
        // Esta chamada passa pelo interceptor do axios, que renova a sessão;
        // na reconexão o token novo já está no armazenamento seguro.
        api
          .get('/mensagens/nao-lidas')
          .catch(() => undefined)
          .finally(() => agendar(1000));
        return;
      }

      // Recuo progressivo: se a API caiu, não adianta martelar de 1 em 1 s.
      falhasSeguidas += 1;
      const espera = Math.min(1000 * 2 ** falhasSeguidas, 30_000);
      // Só o estado do canal: nada do que trafega por ele é registrado.
      log.warn('realtime caiu', { motivo, tentativa: falhasSeguidas, emMs: espera });
      agendar(espera);
    }

    function consumirPedaco() {
      const texto = req.responseText;
      if (texto.length <= lido) return;

      buffer += texto.slice(lido);
      lido = texto.length;

      const { eventos, resto } = separarEventos(buffer);
      buffer = resto;

      for (const evento of eventos) {
        // O batimento só serve para segurar a conexão; não vira nada na tela.
        if (evento.tipo !== 'mensagem' || !evento.dados) continue;
        try {
          aoReceber(JSON.parse(evento.dados) as EventoMensagem);
        } catch {
          // Um evento malformado não pode derrubar o canal inteiro.
        }
      }

      if (lido > LIMITE_BUFFER) finalizar('reciclagem');
    }

    req.onreadystatechange = () => {
      // LOADING (3) é onde o corpo chega aos pedaços; DONE (4) fecha o ciclo.
      if (req.readyState < 3) return;

      if (req.status === 401 || req.status === 403) {
        finalizar('sessao');
        return;
      }
      if (req.status !== 200) {
        if (req.readyState === 4) finalizar('falha');
        return;
      }

      if (!avisouConectado) {
        avisouConectado = true;
        falhasSeguidas = 0;
        log.info('realtime conectado');
        opcoes.aoReconectar?.();
      }

      consumirPedaco();

      // O servidor não fecha esse fluxo sozinho: chegar em DONE é queda.
      if (req.readyState === 4) finalizar('falha');
    };

    req.onerror = () => finalizar('falha');
    req.ontimeout = () => finalizar('falha');
    descartarConexao = () => finalizar('descarte');

    try {
      req.open('GET', `${env.apiUrl}/mensagens/stream`);
      // `text` mantém a resposta em texto e é o que faz o React Native
      // entregar os pedaços conforme chegam, em vez de só no final.
      req.responseType = 'text';
      req.timeout = 0;
      req.setRequestHeader('Authorization', `Bearer ${token}`);
      req.setRequestHeader('Accept', 'text/event-stream');
      req.setRequestHeader('Cache-Control', 'no-cache');
      req.send();
    } catch {
      finalizar('falha');
    }
  }

  /**
   * Em segundo plano o sistema suspende a conexão e ela morre em silêncio.
   * Então o canal é fechado ao sair e reaberto ao voltar — e o `aoReconectar`
   * da nova conexão recarrega o que chegou nesse meio-tempo.
   */
  function aoMudarAppState(estado: AppStateStatus) {
    if (encerrado) return;
    if (estado === 'active') {
      falhasSeguidas = 0;
      if (reconexaoAgendada) {
        clearTimeout(reconexaoAgendada);
        reconexaoAgendada = null;
      }
      if (!requisicao) void conectar();
      else opcoes.aoReconectar?.();
      return;
    }
    fecharConexao();
  }

  assinaturaAppState = AppState.addEventListener('change', aoMudarAppState);
  void conectar();

  return () => {
    encerrado = true;
    if (reconexaoAgendada) clearTimeout(reconexaoAgendada);
    assinaturaAppState?.remove();
    fecharConexao();
  };
}

