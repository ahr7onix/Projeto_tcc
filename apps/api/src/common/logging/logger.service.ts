import { closeSync, existsSync, mkdirSync, openSync, renameSync, statSync, writeSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import type { LoggerService } from '@nestjs/common';
import { limparDados } from './redacao';

export type Nivel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';

const PESO: Record<Nivel, number> = { DEBUG: 10, INFO: 20, WARN: 30, ERROR: 40, FATAL: 50 };

const COR: Record<Nivel, string> = {
  DEBUG: '\x1b[90m',
  INFO: '\x1b[36m',
  WARN: '\x1b[33m',
  ERROR: '\x1b[31m',
  FATAL: '\x1b[35m',
};
const RESET = '\x1b[0m';

/**
 * O Nest anuncia cada rota mapeada e cada módulo carregado em nível `log`.
 * São dezenas de linhas que só interessam quando algo não sobe, então caem
 * para DEBUG — o terminal fica com o que é da aplicação.
 */
const CONTEXTOS_DE_BOOT = [
  'InstanceLoader',
  'RoutesResolver',
  'RouterExplorer',
  'NestFactory',
  'NestApplication',
];

/** `2026-08-29 16:10:32` — hora local, que é como o log é lido no terminal. */
function carimbo(data = new Date()): string {
  const p = (n: number, casas = 2) => String(n).padStart(casas, '0');
  return (
    `${data.getFullYear()}-${p(data.getMonth() + 1)}-${p(data.getDate())} ` +
    `${p(data.getHours())}:${p(data.getMinutes())}:${p(data.getSeconds())}`
  );
}

/**
 * Arquivo de log com limite de tamanho. Ao estourar, o arquivo atual vira
 * `.1` e um novo é aberto — mantém só duas gerações de propósito, para o
 * repositório do TCC não crescer sem controle.
 *
 * Escreve por descritor síncrono, e não por WriteStream: no Windows não dá
 * para renomear um arquivo que ainda tem handle aberto, e `closeSync` garante
 * que ele foi fechado de verdade antes da troca. É uma linha por requisição,
 * então o custo do write síncrono não pesa.
 */
class ArquivoDeLog {
  private fd: number | null = null;
  private bytes = 0;

  constructor(
    private readonly caminho: string,
    private readonly limiteBytes: number,
  ) {}

  private abrir(truncar = false): number {
    if (this.fd !== null) return this.fd;
    mkdirSync(dirname(this.caminho), { recursive: true });
    this.bytes = !truncar && existsSync(this.caminho) ? statSync(this.caminho).size : 0;
    this.fd = openSync(this.caminho, truncar ? 'w' : 'a');
    return this.fd;
  }

  private fechar(): void {
    if (this.fd === null) return;
    try {
      closeSync(this.fd);
    } catch {
      // Já fechado: nada a fazer.
    }
    this.fd = null;
  }

  private girar(): void {
    this.fechar();
    let renomeado = true;
    try {
      renameSync(this.caminho, `${this.caminho}.1`);
    } catch {
      renomeado = false;
    }
    // Se o sistema recusou renomear, reabrimos truncando: perder o histórico
    // antigo é melhor do que deixar o arquivo crescer sem limite.
    this.abrir(!renomeado);
  }

  escrever(linha: string): void {
    try {
      this.abrir();
      if (this.bytes >= this.limiteBytes) this.girar();
      const dados = `${linha}\n`;
      this.bytes += Buffer.byteLength(dados);
      writeSync(this.fd as number, dados);
    } catch {
      // Log é diagnóstico, não função de negócio: falhou, segue o jogo.
      // Descarta o descritor para que a próxima escrita tente reabrir.
      this.fd = null;
    }
  }
}

interface Configuracao {
  minimo: number;
  emArquivo: boolean;
  pasta: string;
  limiteBytes: number;
  desenvolvimento: boolean;
}

/**
 * Logger estruturado da API, usado como logger do próprio Nest — assim os
 * avisos do framework e os da aplicação saem no mesmo formato.
 *
 * Nada aqui recebe corpo de requisição bruto: quem chama passa apenas campos
 * técnicos, e mesmo esses ainda atravessam `limparDados`.
 */
export class NutriCareLogger implements LoggerService {
  private config: Configuracao | null = null;
  private app: ArquivoDeLog | null = null;
  private erros: ArquivoDeLog | null = null;

  /**
   * A configuração é lida na primeira escrita, e não no construtor: o logger
   * nasce antes do ConfigModule carregar o `.env` no `process.env`.
   */
  private obterConfig(): Configuracao {
    if (this.config) return this.config;

    const ambiente = (process.env.NODE_ENV ?? 'development').toLowerCase();
    const desenvolvimento = ambiente !== 'production';
    const pedido = (process.env.LOG_LEVEL ?? '').trim().toUpperCase() as Nivel;
    // Sem LOG_LEVEL o padrão é INFO nos dois ambientes: DEBUG guarda sonda de
    // saúde e detalhe de erro, útil quando se investiga, ruído no dia a dia.
    const minimo = PESO[pedido] ?? PESO.INFO;
    const emArquivo = (process.env.LOG_TO_FILE ?? 'true').toLowerCase() !== 'false';
    const pasta = resolve(process.cwd(), process.env.LOG_DIR ?? 'logs');
    const limiteMb = Number(process.env.LOG_MAX_SIZE_MB ?? '5');
    const limiteBytes = (Number.isFinite(limiteMb) && limiteMb > 0 ? limiteMb : 5) * 1024 * 1024;

    this.config = { minimo, emArquivo, pasta, limiteBytes, desenvolvimento };
    if (emArquivo) {
      this.app = new ArquivoDeLog(join(pasta, 'app.log'), limiteBytes);
      this.erros = new ArquivoDeLog(join(pasta, 'error.log'), limiteBytes);
    }
    return this.config;
  }

  get desenvolvimento(): boolean {
    return this.obterConfig().desenvolvimento;
  }

  /** Onde `app.log` e `error.log` estão. Só o servidor usa — nunca vai para a resposta. */
  get pastaDeLogs(): string {
    return this.obterConfig().pasta;
  }

  get gravaEmArquivo(): boolean {
    return this.obterConfig().emArquivo;
  }

  escrever(nivel: Nivel, mensagem: string, dados?: Record<string, unknown>): void {
    const config = this.obterConfig();
    if (PESO[nivel] < config.minimo) return;

    const limpos = dados ? (limparDados(dados) as Record<string, unknown>) : undefined;
    const extra = limpos && Object.keys(limpos).length ? ` ${JSON.stringify(limpos)}` : '';
    // Parte do texto vem da requisição (rota, tipo de erro). Quebra de linha
    // dentro dele forjaria uma entrada falsa no arquivo de log.
    const seguro = mensagem.replace(/[\u0000-\u001f\u007f]/g, ' ');
    const linha = `[${carimbo()}] ${nivel} ${seguro}${extra}`;

    const saida = PESO[nivel] >= PESO.ERROR ? process.stderr : process.stdout;
    saida.write(`${COR[nivel]}${linha}${RESET}\n`);

    if (config.emArquivo) {
      this.app?.escrever(linha);
      if (PESO[nivel] >= PESO.ERROR) this.erros?.escrever(linha);
    }
  }

  debug(mensagem: unknown, contexto?: string) {
    this.escrever('DEBUG', this.texto(mensagem, contexto));
  }
  verbose(mensagem: unknown, contexto?: string) {
    this.escrever('DEBUG', this.texto(mensagem, contexto));
  }
  log(mensagem: unknown, contexto?: string) {
    const nivel: Nivel = contexto && CONTEXTOS_DE_BOOT.includes(contexto) ? 'DEBUG' : 'INFO';
    this.escrever(nivel, this.texto(mensagem, contexto));
  }
  warn(mensagem: unknown, contexto?: string) {
    this.escrever('WARN', this.texto(mensagem, contexto));
  }
  error(mensagem: unknown, pilha?: string, contexto?: string) {
    this.escrever('ERROR', this.texto(mensagem, contexto));
    // Pilha só em desenvolvimento: em produção ela revela caminho de arquivo
    // e estrutura interna do servidor.
    if (pilha && this.obterConfig().desenvolvimento) {
      this.escrever('ERROR', `stack: ${String(pilha).split('\n').slice(0, 12).join(' | ')}`);
    }
  }
  fatal(mensagem: unknown, contexto?: string) {
    this.escrever('FATAL', this.texto(mensagem, contexto));
  }

  private texto(mensagem: unknown, contexto?: string): string {
    const corpo = typeof mensagem === 'string' ? mensagem : JSON.stringify(limparDados(mensagem));
    return contexto ? `[${contexto}] ${corpo}` : corpo;
  }
}

/** Instância única: middleware, filtro e bootstrap escrevem no mesmo arquivo. */
export const logger = new NutriCareLogger();
