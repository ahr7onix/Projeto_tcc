// Teste de carga da API, sem dependências (Node 20+). Resultados e método em
// docs/ANALISE_DESEMPENHO.md.
//
// Só rode contra uma API ligada a banco DESCARTÁVEL, populado com
// scripts/carga/popular-carga.sql: o teste grava glicemias e mensagens.
//
//   node scripts/carga/teste-carga.mjs endpoints  [--url http://127.0.0.1:3020] [--niveis 1,10,50] [--segundos 10] [--so a,b] [--sem a,b]
//   node scripts/carga/teste-carga.mjs sessoes    [--url ...] [--mix 2:20,5:50] [--segundos 60] [--central-ms 5000] [--inicio-ms 30000] [--tela inicio|outra]
//   node scripts/carga/teste-carga.mjs sse        [--url ...] [--conexoes 100,300]
//   node scripts/carga/teste-carga.mjs travamento [--url ...] [--n 15]
//
// --mix é nutricionistas:pacientes. --json <arquivo> grava os resultados.

const args = process.argv.slice(2);
const modo = args[0] ?? 'endpoints';
const opcao = (nome, padrao) => {
  const i = args.indexOf(`--${nome}`);
  return i >= 0 ? args[i + 1] : padrao;
};
const lista = (texto) => texto.split(',').map(Number);

const URL_API = opcao('url', 'http://127.0.0.1:3020').replace(/\/+$/, '');
const SENHA = 'Senha123!';
const PACIENTES_POR_NUTRI = 50;

// ---------- infraestrutura ----------

async function chamar(metodo, caminho, { token, corpo, timeoutMs = 30_000 } = {}) {
  const inicio = performance.now();
  try {
    const res = await fetch(URL_API + caminho, {
      method: metodo,
      headers: {
        ...(corpo ? { 'content-type': 'application/json' } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: corpo ? JSON.stringify(corpo) : undefined,
      signal: AbortSignal.timeout(timeoutMs),
    });
    const texto = await res.text();
    return { status: res.status, ms: performance.now() - inicio, inicio, texto };
  } catch (err) {
    return { status: err?.name === 'TimeoutError' ? 'timeout' : 'falha', ms: performance.now() - inicio, inicio };
  }
}

function percentil(ordenados, p) {
  if (!ordenados.length) return 0;
  return ordenados[Math.min(ordenados.length - 1, Math.ceil((p / 100) * ordenados.length) - 1)];
}

function resumir(amostras, segundos) {
  const ms = amostras.map((a) => a.ms).sort((a, b) => a - b);
  const erros = {};
  for (const a of amostras) {
    const ok = typeof a.status === 'number' && a.status < 400;
    if (!ok) erros[a.status] = (erros[a.status] ?? 0) + 1;
  }
  return {
    n: amostras.length,
    rps: +(amostras.length / segundos).toFixed(1),
    p50: Math.round(percentil(ms, 50)),
    p95: Math.round(percentil(ms, 95)),
    p99: Math.round(percentil(ms, 99)),
    max: Math.round(ms.at(-1) ?? 0),
    erros,
  };
}

const sessoes = new Map();
async function entrar(email) {
  if (sessoes.has(email)) return sessoes.get(email);
  const r = await chamar('POST', '/auth/login', { corpo: { email, senha: SENHA }, timeoutMs: 120_000 });
  if (r.status !== 200 && r.status !== 201) throw new Error(`login de ${email} falhou: ${r.status}`);
  const { accessToken, user } = JSON.parse(r.texto);
  const s = { token: accessToken, id: user.id };
  sessoes.set(email, s);
  return s;
}

const emailPaciente = (n) => `pac${n}@carga.local`;
const emailNutri = (n) => `nutri${n}@carga.local`;

// Paciente n é acompanhado pelo nutricionista ((n - 1) / 50) + 1.
const nutriDoPaciente = (n) => Math.floor((n - 1) / PACIENTES_POR_NUTRI) + 1;

async function prepararUsuarios(qtdPacientes, qtdNutris) {
  const pacientes = [];
  for (let n = 1; n <= qtdPacientes; n++) pacientes.push({ n, ...(await entrar(emailPaciente(n))) });
  const nutris = [];
  for (let n = 1; n <= qtdNutris; n++) nutris.push({ n, ...(await entrar(emailNutri(n))) });
  // Um paciente vinculado de verdade a cada nutricionista, para as rotas clínicas.
  for (const nutri of nutris) {
    const r = await chamar('GET', '/pacientes', { token: nutri.token, timeoutMs: 120_000 });
    nutri.alvoId = JSON.parse(r.texto).data?.[0]?.id;
  }
  return { pacientes, nutris };
}

// ---------- modo endpoints: uma rota por vez, N chamadas simultâneas ----------

function cenarios(u) {
  const pac = (w) => u.pacientes[w % u.pacientes.length];
  const nutri = (w) => u.nutris[w % u.nutris.length];
  const alvo = (w) => ({ id: nutri(w).alvoId });
  let loginSeq = 0;

  return {
    'status (sem banco pesado)': () => ['GET', '/status'],
    'login (bcrypt)': () => ['POST', '/auth/login', null, { email: emailPaciente((loginSeq++ % 1000) + 1), senha: SENHA }],
    'paciente: GET /registros (30 dias)': (w) => ['GET', '/registros', pac(w).token],
    'paciente: GET /registros/glicemia/ultimo': (w) => ['GET', '/registros/glicemia/ultimo', pac(w).token],
    'paciente: POST /registros/glicemia': (w) => ['POST', '/registros/glicemia', pac(w).token, { valor: 100 + Math.round(Math.random() * 80), momento: 'jejum' }],
    'paciente: GET /planos/ativo': (w) => ['GET', '/planos/ativo', pac(w).token],
    'paciente: GET /lembretes/hoje': (w) => ['GET', '/lembretes/hoje', pac(w).token],
    'nutri: GET /pacientes (50 pacientes)': (w) => ['GET', '/pacientes', nutri(w).token],
    'nutri: GET /alertas (7 dias)': (w) => ['GET', '/alertas', nutri(w).token],
    'nutri: GET /alertas/resumo (7 dias)': (w) => ['GET', '/alertas/resumo', nutri(w).token],
    'nutri: GET /registros (todos, 30 dias)': (w) => ['GET', '/registros', nutri(w).token],
    'nutri: GET /relatorios (90 dias)': (w) => ['GET', `/relatorios?pacienteId=${alvo(w).id}&dias=90`, nutri(w).token],
    'nutri: GET /notificacoes?limite=100': (w) => ['GET', '/notificacoes?limite=100', nutri(w).token],
    'nutri: GET /registros?dias=90&tipo=glicemia (Início)': (w) => ['GET', '/registros?dias=90&tipo=glicemia', nutri(w).token],
    'nutri: GET /relatorios completo (Relatório)': (w) => ['GET', `/relatorios?pacienteId=${alvo(w).id}&dias=3650&completo=true`, nutri(w).token],
    'nutri: GET /mensagens (conversas)': (w) => ['GET', '/mensagens', nutri(w).token],
    'nutri: GET /mensagens/nao-lidas': (w) => ['GET', '/mensagens/nao-lidas', nutri(w).token],
  };
}

async function rodarEndpoint(gerar, concorrencia, segundos) {
  const fim = Date.now() + segundos * 1000;
  const amostras = [];
  await Promise.all(
    Array.from({ length: concorrencia }, async (_, w) => {
      while (Date.now() < fim) {
        const [metodo, caminho, token, corpo] = gerar(w);
        amostras.push(await chamar(metodo, caminho, { token, corpo }));
      }
    }),
  );
  return resumir(amostras, segundos);
}

async function modoEndpoints() {
  const niveis = lista(opcao('niveis', '1,10,50'));
  const segundos = Number(opcao('segundos', '10'));
  const so = opcao('so', '');
  const sem = opcao('sem', '');
  const u = await prepararUsuarios(Math.max(...niveis, 20), 20);
  const todos = cenarios(u);
  const nomes = Object.keys(todos)
    .filter((n) => !so || so.split(',').some((s) => n.includes(s)))
    .filter((n) => !sem || !sem.split(',').some((s) => n.includes(s)));

  const resultados = [];
  for (const nome of nomes) {
    for (const c of niveis) {
      const r = await rodarEndpoint(todos[nome], c, segundos);
      resultados.push({ cenario: nome, concorrencia: c, ...r });
      console.log(`${nome.padEnd(44)} c=${String(c).padStart(3)}  ${String(r.rps).padStart(7)} req/s  p50 ${r.p50} ms  p95 ${r.p95} ms  p99 ${r.p99} ms  max ${r.max} ms  ${JSON.stringify(r.erros)}`);
    }
  }
  return resultados;
}

// ---------- modo sessões: pessoas usando o painel e o app ao mesmo tempo ----------
//
// Reproduz o tráfego que o código dos clientes gera de verdade:
//   - painel (nutricionista): a central de notificações busca 3 rotas a cada
//     5 s em qualquer tela (NotificationCenter.tsx) e a tela Início busca mais
//     4 a cada 30 s (HomePage.tsx). Os dois são setInterval: não esperam a
//     rodada anterior terminar — igual aqui;
//   - app (paciente em uso): abre uma tela, lê por 10 a 30 s, abre outra.
// Todos ficam com o canal de mensagens (SSE) aberto, como nos clientes.

const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const entre = (a, b) => a + Math.random() * (b - a);

const TELAS_PACIENTE = [
  ['início', () => [['GET', '/perfil/paciente'], ['GET', '/registros/glicemia/ultimo'], ['GET', '/registros?dias=7'], ['GET', '/vinculos/convites']]],
  ['registros', () => [['GET', '/registros?dias=30'], ['GET', '/registros?dias=30']]],
  ['registrar glicemia', () => [['POST', '/registros/glicemia', { valor: 100 + Math.round(Math.random() * 80), momento: 'jejum' }]]],
  ['alimentação', () => [['GET', '/planos/ativo'], ['GET', '/restricoes']]],
  ['conversa', (p) => [['GET', '/mensagens'], ['GET', `/mensagens/${p.nutriId}`]]],
];

const CENTRAL_DE_NOTIFICACOES = [['GET', '/notificacoes?limite=100'], ['GET', '/alertas?dias=7'], ['GET', '/pacientes']];
const TELA_INICIO = [['GET', '/pacientes'], ['GET', '/alertas/resumo?dias=7'], ['GET', '/registros?dias=90&tipo=glicemia'], ['GET', '/mensagens/nao-lidas']];

async function modoSessoes() {
  const mix = opcao('mix', '2:20,5:50,10:100').split(',').map((par) => par.split(':').map(Number));
  const segundos = Number(opcao('segundos', '60'));
  // Para projetar mudanças no painel: intervalo da central (padrão 5 s, como hoje),
  // da tela Início (30 s) e se o nutricionista está nela (--tela inicio|outra).
  const centralMs = Number(opcao('central-ms', '5000'));
  const inicioMs = Number(opcao('inicio-ms', '30000'));
  const naTelaInicio = opcao('tela', 'inicio') === 'inicio';
  const maxPac = Math.max(...mix.map(([, p]) => p));
  const u = await prepararUsuarios(Math.max(maxPac, 1), 20);
  for (const p of u.pacientes) p.nutriId = u.nutris[nutriDoPaciente(p.n) - 1].id;

  const resultados = [];
  for (const [qtdNutris, qtdPacientes] of mix) {
    const fim = Date.now() + segundos * 1000;
    const amostras = [];
    const telas = [];
    const ciclos = [];
    const ciclosInicio = [];
    let emVoo = 0;
    let picoEmVoo = 0;
    const comeco = performance.now();
    const lote = async (perfil, chamadas, destino) => {
      emVoo += chamadas.length;
      picoEmVoo = Math.max(picoEmVoo, emVoo);
      const inicio = performance.now();
      const rs = await Promise.all(chamadas.map(([m, c, corpo]) => chamar(m, c, { token: perfil.token, corpo })));
      emVoo -= chamadas.length;
      amostras.push(...rs);
      destino.push({ ms: performance.now() - inicio, inicio });
    };
    const fechar = [];
    const pendentes = [];

    const nutricionista = async (nutri) => {
      fechar.push(await abrirStream(nutri.token, () => {}));
      await pausa(entre(0, 5000));
      const timers = [
        setInterval(() => pendentes.push(lote(nutri, CENTRAL_DE_NOTIFICACOES, ciclos)), centralMs),
        ...(naTelaInicio ? [setInterval(() => pendentes.push(lote(nutri, TELA_INICIO, ciclosInicio)), inicioMs)] : []),
      ];
      pendentes.push(lote(nutri, CENTRAL_DE_NOTIFICACOES, ciclos));
      if (naTelaInicio) pendentes.push(lote(nutri, TELA_INICIO, ciclosInicio));
      await pausa(Math.max(0, fim - Date.now()));
      timers.forEach(clearInterval);
    };
    const paciente = async (p) => {
      fechar.push(await abrirStream(p.token, () => {}));
      await pausa(entre(0, 10000));
      while (Date.now() < fim) {
        const [, chamadas] = TELAS_PACIENTE[Math.floor(Math.random() * TELAS_PACIENTE.length)];
        await lote(p, chamadas(p), telas);
        await pausa(entre(10000, 30000));
      }
    };

    await Promise.all([
      ...u.nutris.slice(0, qtdNutris).map(nutricionista),
      ...u.pacientes.slice(0, qtdPacientes).map(paciente),
    ]);
    // O que foi disparado perto do fim ainda conta.
    await Promise.all(pendentes);
    fechar.forEach((f) => f());

    const r = resumir(amostras, segundos);
    // Os primeiros 20 s são a rajada de entrada (todo mundo abrindo o app e o
    // painel); o "regime" é o que vem depois.
    const regime = (lista) => lista.filter((x) => x.inicio - comeco > 20_000).map((x) => x.ms).sort((a, b) => a - b);
    const ordTelas = regime(telas);
    const ordCiclos = regime(ciclos);
    const ordInicio = regime(ciclosInicio);
    const ordRegime = regime(amostras);
    const entrada = telas.filter((x) => x.inicio - comeco <= 20_000).map((x) => x.ms).sort((a, b) => a - b);
    const linha = {
      nutricionistas: qtdNutris,
      pacientes: qtdPacientes,
      ...r,
      regimeP50: Math.round(percentil(ordRegime, 50)),
      regimeP95: Math.round(percentil(ordRegime, 95)),
      telaNaEntradaP95: Math.round(percentil(entrada, 95)),
      telaPacienteP50: Math.round(percentil(ordTelas, 50)),
      telaPacienteP95: Math.round(percentil(ordTelas, 95)),
      painelP50: Math.round(percentil(ordCiclos, 50)),
      painelP95: Math.round(percentil(ordCiclos, 95)),
      inicioP50: Math.round(percentil(ordInicio, 50)),
      inicioP95: Math.round(percentil(ordInicio, 95)),
      picoEmVoo,
    };
    resultados.push(linha);
    console.log(
      `nutris=${String(qtdNutris).padStart(3)} pacientes=${String(qtdPacientes).padStart(4)}  ${String(r.rps).padStart(6)} req/s  ` +
        `req p50 ${r.p50} p95 ${r.p95} (regime p50 ${linha.regimeP50} p95 ${linha.regimeP95}) ms | tela na entrada p95 ${linha.telaNaEntradaP95} | em regime: tela do app p50 ${linha.telaPacienteP50} p95 ${linha.telaPacienteP95} ms | ` +
        `central p50 ${linha.painelP50} p95 ${linha.painelP95} ms | início p50 ${linha.inicioP50} p95 ${linha.inicioP95} ms | pico em voo ${picoEmVoo} ${JSON.stringify(r.erros)}`,
    );
    await pausa(3000);
  }
  return resultados;
}

// ---------- modo SSE: muitas conexões abertas e o tempo de entrega ----------

async function abrirStream(token, aoEvento) {
  const ctrl = new AbortController();
  const res = await fetch(`${URL_API}/mensagens/stream`, {
    headers: { authorization: `Bearer ${token}`, accept: 'text/event-stream' },
    signal: ctrl.signal,
  });
  (async () => {
    const decoder = new TextDecoder();
    let buffer = '';
    try {
      for await (const pedaco of res.body) {
        buffer += decoder.decode(pedaco, { stream: true });
        let i;
        while ((i = buffer.indexOf('\n\n')) >= 0) {
          aoEvento(buffer.slice(0, i));
          buffer = buffer.slice(i + 2);
        }
      }
    } catch {
      // abortado no fim do teste
    }
  })();
  return () => ctrl.abort();
}

async function modoSse() {
  const niveis = lista(opcao('conexoes', '100,300'));
  const max = Math.max(...niveis);
  const u = await prepararUsuarios(max, 20);
  const resultados = [];
  for (const total of niveis) {
    const esperando = new Map();
    const fechar = [];
    for (let i = 0; i < total; i++) {
      const p = u.pacientes[i];
      fechar.push(
        await abrirStream(p.token, (evento) => {
          if (!evento.includes('event: mensagem')) return;
          const resolver = esperando.get(p.id);
          if (resolver) resolver(performance.now());
        }),
      );
    }
    await pausa(2000);
    const saude = await chamar('GET', '/health');
    // 20 mensagens do nutricionista para pacientes com o stream aberto.
    const entregas = [];
    for (let k = 0; k < 20; k++) {
      const p = u.pacientes[(k * 7) % total];
      const nutri = u.nutris[nutriDoPaciente(p.n) - 1];
      const recebido = new Promise((r) => esperando.set(p.id, r));
      const inicio = performance.now();
      const envio = await chamar('POST', '/mensagens', { token: nutri.token, corpo: { destinatarioId: p.id, conteudo: `teste de entrega ${k}` } });
      const chegou = await Promise.race([recebido, pausa(10_000).then(() => null)]);
      entregas.push({ envio: envio.status, ms: chegou ? chegou - inicio : null });
      esperando.delete(p.id);
    }
    fechar.forEach((f) => f());
    const ms = entregas.filter((e) => e.ms != null).map((e) => e.ms).sort((a, b) => a - b);
    const linha = {
      conexoes: total,
      entregues: `${ms.length}/${entregas.length}`,
      statusEnvio: [...new Set(entregas.map((e) => e.envio))],
      entregaP50: Math.round(percentil(ms, 50)),
      entregaMax: Math.round(ms.at(-1) ?? 0),
      health: saude.texto?.slice(0, 400),
    };
    resultados.push(linha);
    console.log(JSON.stringify(linha));
    await pausa(2000);
  }
  return resultados;
}

// ---------- modo travamento: N logins e N renovações de sessão ao mesmo tempo ----------
//
// O login e o refresh seguravam uma conexão do pool e pediam outra antes de
// soltar a primeira. Com o pool (10) inteiro preso assim, ninguém andava: a API
// parava de falar com o banco até ser reiniciada. Ver docs/ANALISE_DESEMPENHO.md.

async function modoTravamento() {
  const n = Number(opcao('n', '15'));
  const contar = (lista) => lista.reduce((a, s) => ((a[s] = (a[s] ?? 0) + 1), a), {});
  const banco = async () => JSON.parse((await chamar('GET', '/status')).texto ?? '{}').banco;

  let inicio = performance.now();
  const logins = await Promise.all(
    Array.from({ length: n }, (_, i) =>
      chamar('POST', '/auth/login', { corpo: { email: emailPaciente(900 + (i % 100)), senha: SENHA }, timeoutMs: 120_000 }),
    ),
  );
  const resultado = {
    logins: contar(logins.map((r) => r.status)),
    loginsMs: Math.round(performance.now() - inicio),
    bancoDepoisDosLogins: await banco(),
  };
  console.log(JSON.stringify(resultado));
  if (resultado.bancoDepoisDosLogins !== 'ok') return resultado;

  // Sessões criadas uma a uma, sem disputa; só as renovações vão juntas.
  const refresh = [];
  for (let i = 0; i < n; i++) {
    const r = await chamar('POST', '/auth/login', { corpo: { email: emailPaciente(800 + (i % 100)), senha: SENHA }, timeoutMs: 120_000 });
    refresh.push(JSON.parse(r.texto).refreshToken);
  }
  inicio = performance.now();
  const renovacoes = await Promise.all(
    refresh.map((refreshToken) => chamar('POST', '/auth/refresh', { corpo: { refreshToken }, timeoutMs: 120_000 })),
  );
  resultado.renovacoes = contar(renovacoes.map((r) => r.status));
  resultado.renovacoesMs = Math.round(performance.now() - inicio);
  resultado.bancoDepoisDasRenovacoes = await banco();
  console.log(JSON.stringify(resultado));
  return resultado;
}

const modos = { endpoints: modoEndpoints, sessoes: modoSessoes, sse: modoSse, travamento: modoTravamento };
if (!modos[modo]) {
  console.error(`modo desconhecido: ${modo} (use ${Object.keys(modos).join(', ')})`);
  process.exit(1);
}
const resultado = await modos[modo]();
const saida = opcao('json', '');
if (saida) {
  const { writeFileSync } = await import('node:fs');
  writeFileSync(saida, JSON.stringify(resultado, null, 2));
}
