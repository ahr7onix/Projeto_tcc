#!/usr/bin/env node
/**
 * Diagnóstico do NutriCare: bate nas rotas que realmente existem na API e diz,
 * em uma tabela, o que está de pé.
 *
 *   npm run health      (ou npm run diagnose)
 *
 * Credenciais são opcionais e vêm só do ambiente — nunca ficam no código e
 * nunca são impressas. Sem elas, os testes autenticados saem como SKIPPED:
 *
 *   DIAG_EMAIL / DIAG_SENHA               conta de nutricionista
 *   DIAG_ADMIN_EMAIL / DIAG_ADMIN_SENHA   conta de administrador
 *   DIAG_URL                              padrão: http://localhost:$PORT
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');

// Lê o .env sem depender de biblioteca: aqui só precisamos de PORT e das
// variáveis DIAG_*. Valor nenhum é impresso.
function carregarEnv() {
  try {
    for (const linha of readFileSync(join(raiz, '.env'), 'utf8').split(/\r?\n/)) {
      const limpa = linha.trim();
      if (!limpa || limpa.startsWith('#')) continue;
      const igual = limpa.indexOf('=');
      if (igual < 1) continue;
      const chave = limpa.slice(0, igual).trim();
      if (process.env[chave] === undefined) {
        process.env[chave] = limpa
          .slice(igual + 1)
          .trim()
          .replace(/^["']|["']$/g, '');
      }
    }
  } catch {
    // Sem .env: vale o que já estiver no ambiente.
  }
}
carregarEnv();

const BASE = (
  process.env.DIAG_URL ?? `http://localhost:${process.env.PORT ?? 3000}`
).replace(/\/$/, '');
const TEMPO_LIMITE = 8000;

const resultados = [];
function anotar(nome, estado, detalhe = '') {
  resultados.push({ nome, estado, detalhe });
}

async function chamar(caminho, opcoes = {}) {
  const controle = new AbortController();
  const relogio = setTimeout(() => controle.abort(), TEMPO_LIMITE);
  const inicio = Date.now();
  try {
    const resposta = await fetch(`${BASE}${caminho}`, { ...opcoes, signal: controle.signal });
    const texto = await resposta.text();
    let corpo = null;
    try {
      corpo = JSON.parse(texto);
    } catch {
      corpo = null;
    }
    return { ok: true, status: resposta.status, corpo, ms: Date.now() - inicio, resposta };
  } catch (erro) {
    return {
      ok: false,
      status: 0,
      corpo: null,
      ms: Date.now() - inicio,
      erro: erro?.name ?? 'Error',
    };
  } finally {
    clearTimeout(relogio);
  }
}

async function entrar(email, senha) {
  if (!email || !senha) return null;
  const r = await chamar('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, senha }),
  });
  return r.status === 200 && r.corpo?.accessToken ? r.corpo.accessToken : null;
}

const comToken = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

/** Rota autenticada: 200 é o esperado; 401/403 aqui indicam sessão ruim. */
async function verificarRota(nome, caminho, token, aceitos = [200]) {
  if (!token) return anotar(nome, 'SKIPPED', 'sem credenciais');
  const r = await chamar(caminho, comToken(token));
  if (!r.ok) return anotar(nome, 'ERROR', r.erro);
  if (aceitos.includes(r.status)) return anotar(nome, 'OK', `${r.status} ${r.ms}ms`);
  if (r.status >= 500) return anotar(nome, 'ERROR', `${r.status} ${r.ms}ms`);
  return anotar(nome, 'WARN', `${r.status} ${r.ms}ms`);
}

async function main() {
  // --- API e banco -------------------------------------------------------
  const vida = await chamar('/health/live');
  if (!vida.ok) {
    anotar('API', 'ERROR', `sem resposta em ${BASE}`);
  } else {
    anotar('API', vida.status === 200 ? 'OK' : 'ERROR', `${vida.status} ${vida.ms}ms`);
  }

  const saude = await chamar('/health');
  const banco = saude.corpo?.database;
  anotar('Database', banco === 'connected' ? 'OK' : 'ERROR', banco ?? 'sem resposta');
  anotar(
    'Health endpoint',
    saude.ok && (saude.status === 200 || saude.status === 503) ? 'OK' : 'ERROR',
    `${saude.status} ${saude.ms}ms`,
  );

  // --- Autenticação ------------------------------------------------------
  const token = await entrar(process.env.DIAG_EMAIL, process.env.DIAG_SENHA);
  const tokenAdmin = await entrar(process.env.DIAG_ADMIN_EMAIL, process.env.DIAG_ADMIN_SENHA);

  if (!process.env.DIAG_EMAIL) anotar('Login', 'SKIPPED', 'defina DIAG_EMAIL / DIAG_SENHA');
  else anotar('Login', token ? 'OK' : 'ERROR', token ? '200' : 'credenciais recusadas');

  // Credencial errada tem de ser recusada: 200 aqui seria falha grave.
  const invalido = await chamar('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'diagnostico@invalido.local', senha: 'senha-invalida-diag' }),
  });
  anotar(
    'Autenticação',
    invalido.status === 401 || invalido.status === 400 ? 'OK' : 'ERROR',
    `login inválido -> ${invalido.status}`,
  );

  // --- Controle de acesso ------------------------------------------------
  const semToken = await chamar('/pacientes');
  anotar(
    'Controle de acesso',
    semToken.status === 401 ? 'OK' : 'ERROR',
    `sem token -> ${semToken.status}`,
  );

  // --- Rotas principais --------------------------------------------------
  await verificarRota('Perfil (auth/me)', '/auth/me', token);
  await verificarRota('Pacientes', '/pacientes', token);
  await verificarRota('Nutricionista (vinculos)', '/vinculos', token);
  await verificarRota('Mensagens', '/mensagens/nao-lidas', token);
  await verificarRota('Notificacoes', '/notificacoes/nao-lidas', token);
  await verificarRota('Alertas', '/alertas/resumo', token);

  // Sem conta de administrador ainda dá para provar a barreira: uma conta
  // comum tem de tomar 403 no painel.
  if (tokenAdmin) {
    await verificarRota('Painel administrativo', '/admin/metricas', tokenAdmin);
  } else if (token) {
    const r = await chamar('/admin/metricas', comToken(token));
    anotar(
      'Painel administrativo',
      r.status === 403 ? 'OK' : r.status >= 500 ? 'ERROR' : 'WARN',
      `conta comum -> ${r.status} (esperado 403)`,
    );
  } else {
    anotar('Painel administrativo', 'SKIPPED', 'sem credenciais');
  }

  // --- Tempo real (SSE) --------------------------------------------------
  if (!token) {
    anotar('Realtime (SSE)', 'SKIPPED', 'sem credenciais');
  } else {
    const controle = new AbortController();
    const relogio = setTimeout(() => controle.abort(), TEMPO_LIMITE);
    try {
      const r = await fetch(`${BASE}/mensagens/stream`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'text/event-stream' },
        signal: controle.signal,
      });
      const tipo = r.headers.get('content-type') ?? '';
      const abriu = r.status === 200 && tipo.includes('text/event-stream');
      anotar('Realtime (SSE)', abriu ? 'OK' : 'ERROR', `${r.status} ${tipo.split(';')[0]}`);
      await r.body?.cancel();
    } catch (erro) {
      anotar('Realtime (SSE)', 'ERROR', erro?.name ?? 'Error');
    } finally {
      clearTimeout(relogio);
    }
  }

  // --- Erros -------------------------------------------------------------
  const inexistente = await chamar('/rota-que-nao-existe-diagnostico');
  anotar(
    'Rota inexistente (404)',
    inexistente.status === 404 ? 'OK' : 'WARN',
    `${inexistente.status}`,
  );

  const idDeCorrelacao = inexistente.resposta?.headers.get('x-request-id');
  anotar(
    'Request ID',
    idDeCorrelacao ? 'OK' : 'WARN',
    idDeCorrelacao ? 'X-Request-Id presente' : 'ausente',
  );

  // --- Tabela ------------------------------------------------------------
  const largura = Math.max(...resultados.map((r) => r.nome.length)) + 4;
  console.log(`\nNutriCare — diagnostico (${BASE})\n`);
  for (const { nome, estado, detalhe } of resultados) {
    const pontos = '.'.repeat(Math.max(3, largura - nome.length));
    console.log(`${nome} ${pontos} ${estado}${detalhe ? `   (${detalhe})` : ''}`);
  }

  const erros = resultados.filter((r) => r.estado === 'ERROR');
  const avisos = resultados.filter((r) => r.estado === 'WARN');
  const saudavel = erros.length === 0;
  console.log(`\nResultado: ${saudavel ? 'SYSTEM HEALTHY' : 'SYSTEM DEGRADED'}`);
  if (erros.length) console.log(`Erros: ${erros.map((r) => r.nome).join(', ')}`);
  if (avisos.length) console.log(`Avisos: ${avisos.map((r) => r.nome).join(', ')}`);
  process.exit(saudavel ? 0 : 1);
}

main().catch((erro) => {
  console.error(`Diagnostico falhou: ${erro?.name ?? 'Error'}`);
  process.exit(1);
});
