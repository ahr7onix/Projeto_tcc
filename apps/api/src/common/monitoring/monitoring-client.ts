import { randomUUID } from 'node:crypto';
import { logger } from '../logging/logger.service';
import { limparDados, limparUrl } from '../logging/redacao';

/**
 * Cliente mínimo da central de monitoramento.
 *
 * A central é um projeto separado (`monitoramento-nutricare`). Aqui dentro do
 * TCC existe só isto: um enfileirador que envia telemetria técnica por HTTP.
 *
 * Regra que manda em todo o arquivo: o monitoramento NUNCA pode derrubar nem
 * atrasar o NutriCare. Por isso —
 *
 *   - nenhuma função aqui lança exceção nem devolve promessa que o chamador
 *     precise esperar (`registrar` retorna `void`);
 *   - o envio acontece fora do caminho da requisição, em lote, num intervalo;
 *   - o timeout é curto (`MONITORING_TIMEOUT_MS`, padrão 2 s);
 *   - a fila tem teto: cheia, descarta o evento mais antigo em vez de crescer;
 *   - depois de falhas seguidas o circuito abre e para de tentar por um tempo,
 *     para a central fora do ar não custar uma conexão por erro;
 *   - os timers são `unref()`, então não seguram o processo no encerramento;
 *   - desligado por padrão: sem `MONITORING_ENABLED=true` nada é enviado.
 */

export type NivelMonitoramento = 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

export interface EventoDeMonitoramento {
  nivel: NivelMonitoramento;
  mensagem: string;
  tipo?: string;
  statusHttp?: number | null;
  metodo?: string | null;
  endpoint?: string | null;
  duracaoMs?: number | null;
  stack?: string | null;
  origem?: 'backend' | 'database' | 'integracao';
  servico?: string;
  metadados?: Record<string, unknown>;
}

/** Fila pequena de propósito: telemetria não pode competir por memória. */
const TETO_DA_FILA = 200;
const TAMANHO_DO_LOTE = 25;
const INTERVALO_DE_ENVIO_MS = 5_000;
const FALHAS_PARA_ABRIR_CIRCUITO = 3;
const PAUSA_DO_CIRCUITO_MS = 60_000;
const MAXIMO_DE_TENTATIVAS = 2;

interface EventoNaFila {
  corpo: Record<string, unknown>;
  tentativas: number;
}

function ligado(): boolean {
  return (process.env.MONITORING_ENABLED ?? '').toLowerCase() === 'true';
}

function inteiro(chave: string, padrao: number): number {
  const n = Number(process.env[chave]);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : padrao;
}

class ClienteDeMonitoramento {
  private fila: EventoNaFila[] = [];
  private temporizador: NodeJS.Timeout | null = null;
  private batida: NodeJS.Timeout | null = null;
  private enviando = false;
  private falhasSeguidas = 0;
  private circuitoAbertoAte = 0;
  private descartados = 0;
  private avisou = false;

  get ativo(): boolean {
    return ligado() && Boolean(process.env.MONITORING_API_URL && process.env.MONITORING_API_KEY);
  }

  private get base(): string {
    return (process.env.MONITORING_API_URL ?? '').replace(/\/+$/, '');
  }

  /**
   * Ponto de entrada usado pelo filtro de exceção e pelo middleware de log.
   * Síncrono e à prova de erro: no pior caso não faz nada.
   */
  registrar(evento: EventoDeMonitoramento): void {
    if (!this.ativo) return;
    try {
      this.enfileirar(this.montar(evento));
    } catch {
      // Falha ao montar o evento não pode virar erro na requisição do usuário.
    }
  }

  private montar(evento: EventoDeMonitoramento): Record<string, unknown> {
    // Sanitização ANTES de sair daqui, com a mesma função que o log em arquivo
    // já usa. A central sanitiza de novo do lado dela; as duas camadas são de
    // propósito, porque o dado é de saúde.
    const metadados = evento.metadados
      ? (limparDados(evento.metadados) as Record<string, unknown>)
      : undefined;

    return {
      eventId: randomUUID(),
      application: process.env.MONITORING_APP ?? 'nutricare',
      service: evento.servico ?? process.env.MONITORING_SERVICE ?? 'backend',
      environment: process.env.MONITORING_ENV ?? process.env.NODE_ENV ?? 'development',
      origin: evento.origem ?? 'backend',
      level: evento.nivel,
      type: evento.tipo ?? null,
      message: String(evento.mensagem ?? '').slice(0, 2000),
      statusCode: evento.statusHttp ?? null,
      method: evento.metodo ?? null,
      endpoint: evento.endpoint ? limparUrl(evento.endpoint).slice(0, 500) : null,
      durationMs: evento.duracaoMs ?? null,
      version: process.env.APP_VERSION ?? null,
      stack: evento.stack ? evento.stack.split('\n').slice(0, 20).join('\n') : null,
      metadata: metadados ?? null,
      timestamp: new Date().toISOString(),
    };
  }

  private enfileirar(corpo: Record<string, unknown>): void {
    if (this.fila.length >= TETO_DA_FILA) {
      this.fila.shift();
      this.descartados += 1;
    }
    this.fila.push({ corpo, tentativas: 0 });
    this.garantirTemporizador();
    // Rajada de erros não espera o próximo tique.
    if (this.fila.length >= TAMANHO_DO_LOTE) void this.esvaziar();
  }

  private garantirTemporizador(): void {
    if (this.temporizador) return;
    this.temporizador = setInterval(() => void this.esvaziar(), INTERVALO_DE_ENVIO_MS);
    this.temporizador.unref();
  }

  /** Envia um lote. Nunca lança: erro aqui só devolve o lote para a fila. */
  private async esvaziar(): Promise<void> {
    if (this.enviando || this.fila.length === 0 || !this.ativo) return;
    if (Date.now() < this.circuitoAbertoAte) return;

    this.enviando = true;
    const lote = this.fila.splice(0, TAMANHO_DO_LOTE);
    try {
      const resposta = await this.enviar('/api/events', { events: lote.map((e) => e.corpo) });

      if (resposta.ok) {
        this.falhasSeguidas = 0;
        if (this.descartados > 0) {
          logger.escrever('WARN', `monitoramento: ${this.descartados} eventos descartados`);
          this.descartados = 0;
        }
        return;
      }

      // 4xx é culpa do formato: reenviar não resolve, então descarta.
      if (resposta.status >= 400 && resposta.status < 500 && resposta.status !== 429) {
        logger.escrever('DEBUG', `monitoramento: central recusou o lote (${resposta.status})`);
        return;
      }
      this.devolver(lote);
    } catch {
      this.devolver(lote);
    } finally {
      this.enviando = false;
    }
  }

  private devolver(lote: EventoNaFila[]): void {
    this.falhasSeguidas += 1;
    if (this.falhasSeguidas >= FALHAS_PARA_ABRIR_CIRCUITO) {
      this.circuitoAbertoAte = Date.now() + PAUSA_DO_CIRCUITO_MS;
      this.falhasSeguidas = 0;
      if (!this.avisou) {
        // Uma linha, não uma por evento: a central fora do ar não pode inundar
        // o log do TCC.
        logger.escrever('WARN', 'monitoramento: central inacessível, pausando envios');
        this.avisou = true;
        setTimeout(() => {
          this.avisou = false;
        }, PAUSA_DO_CIRCUITO_MS).unref();
      }
    }

    // Retentativa controlada: no máximo duas, e sem estourar o teto da fila.
    const paraReenviar = lote
      .filter((e) => e.tentativas + 1 < MAXIMO_DE_TENTATIVAS)
      .map((e) => ({ ...e, tentativas: e.tentativas + 1 }));
    this.descartados += lote.length - paraReenviar.length;
    this.fila = [...paraReenviar, ...this.fila].slice(0, TETO_DA_FILA);
  }

  private enviar(caminho: string, corpo: unknown): Promise<Response> {
    return fetch(this.base + caminho, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': process.env.MONITORING_API_KEY ?? '',
      },
      body: JSON.stringify(corpo),
      // Timeout curto: a central pode estar fora; ninguém espera por ela.
      signal: AbortSignal.timeout(inteiro('MONITORING_TIMEOUT_MS', 2000)),
    });
  }

  /**
   * "Continuo online". A central declara o serviço OFFLINE quando as batidas
   * param — é o sinal que sobrevive a um processo que morreu sem avisar.
   */
  iniciarHeartbeat(medirBanco: () => Promise<{ ok: boolean; ms: number }>): void {
    if (!this.ativo || this.batida) return;
    const intervalo = inteiro('MONITORING_HEARTBEAT_MS', 60_000);

    const bater = async () => {
      if (Date.now() < this.circuitoAbertoAte) return;
      try {
        const banco = await medirBanco();
        await this.enviar('/api/heartbeat', {
          application: process.env.MONITORING_APP ?? 'nutricare',
          service: process.env.MONITORING_SERVICE ?? 'backend',
          environment: process.env.MONITORING_ENV ?? process.env.NODE_ENV ?? 'development',
          version: process.env.APP_VERSION ?? null,
          uptimeSeconds: Math.round(process.uptime()),
          databaseOk: banco.ok,
          databaseMs: banco.ms,
        });
      } catch {
        // Silêncio: a ausência da batida já é a informação que a central usa.
      }
    };

    setTimeout(() => void bater(), 3_000).unref();
    this.batida = setInterval(() => void bater(), intervalo);
    this.batida.unref();
  }

  /** Chamado no encerramento: tenta uma última descarga e solta os timers. */
  async parar(): Promise<void> {
    if (this.temporizador) clearInterval(this.temporizador);
    if (this.batida) clearInterval(this.batida);
    this.temporizador = null;
    this.batida = null;
    try {
      await this.esvaziar();
    } catch {
      /* encerrando mesmo assim */
    }
  }
}

export const monitoramento = new ClienteDeMonitoramento();
