/**
 * Fluxo completo da demonstração, de ponta a ponta, no navegador.
 *
 * Cria uma nutricionista e um paciente novos e passa por tudo o que a banca vai
 * ver: cadastro e aprovação, convite e aceite, glicemia virando alerta, plano
 * alimentar, mensagens, importação de alimentos, receita, conteúdo educativo,
 * relatório, humor, medidas, medicamento, anotação e o paciente encerrando o
 * acompanhamento.
 *
 * Precisa da API, do painel e do app em modo web rodando, num banco de
 * desenvolvimento: o script cria contas e entra como o administrador do seed.
 *   API_URL     padrão http://localhost:3000
 *   PAINEL_URL  padrão http://localhost:5173
 *   APP_URL     padrão http://localhost:8081 (o `npm run web` do app, com o
 *               EXPO_PUBLIC_API_URL apontando para a mesma API)
 *   MOSTRAR=1   abre o navegador na tela; sem isso roda escondido.
 *
 * Rodar: npm run e2e:fluxo (na raiz). Os passos que falham deixam um print em
 * scripts/e2e-falhas/.
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const API = process.env.API_URL ?? 'http://localhost:3000';
const PAINEL = process.env.PAINEL_URL ?? 'http://localhost:5173';
const APP = process.env.APP_URL ?? 'http://localhost:8081';
const ADMIN = {
  email: process.env.ADMIN_EMAIL ?? 'admin@nutricare.local',
  senha: process.env.ADMIN_SENHA ?? 'NutriCare@2026',
};

// O script cria contas de teste: nunca rodar contra o ambiente publicado.
if (/onrender\.com/.test(API + PAINEL + APP)) {
  console.error('Este teste cria contas e não deve rodar no ambiente publicado.');
  process.exit(1);
}

const PASTA_FALHAS = new URL('./e2e-falhas/', import.meta.url);
const id = Date.now().toString().slice(-6);
const NUTRI = { nome: `Nutri Teste ${id}`, email: `nutri.${id}@exemplo.com`, senha: 'Senha123!', crn: `CRN-3/${id}` };
const PAC = { nome: `Paciente Teste ${id}`, email: `paciente.${id}@exemplo.com`, senha: 'Senha123!' };
const ALIMENTO = `Tapioca Teste ${id}`;
const RECEITA = `Panqueca Teste ${id}`;
const CONTEUDO = `Hidratação e glicemia ${id}`;

const resultados = [];
async function passo(nome, pagina, fn) {
  try {
    await fn();
    resultados.push({ ok: true, nome });
    console.log(`PASS  ${nome}`);
  } catch (e) {
    const detalhe = String(e.message || e).split('\n')[0];
    resultados.push({ ok: false, nome, detalhe });
    console.log(`FAIL  ${nome} — ${detalhe}`);
    mkdirSync(PASTA_FALHAS, { recursive: true });
    const arquivo = `${resultados.length}-${nome.normalize('NFD').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.png`;
    await pagina.screenshot({ path: new URL(arquivo, PASTA_FALHAS) }).catch(() => {});
  }
}

// O app em modo web ainda se monta logo depois de aparecer: digitar antes disso
// perde o texto. E ele mantém a conexão das mensagens aberta, então esperar a
// rede ficar parada não funciona; o jeito é dar um tempo depois do "load".
async function abrirNoApp(pagina, rota) {
  await pagina.goto(APP + rota, { waitUntil: 'load', timeout: 300000 });
  await pagina.waitForTimeout(2500);
}

async function entrarNoPainel(pagina, email, senha) {
  await pagina.goto(`${PAINEL}/login`, { waitUntil: 'domcontentloaded' });
  await pagina.getByPlaceholder('Endereço de e-mail').fill(email);
  await pagina.getByPlaceholder(/^Senha$/).last().fill(senha);
  await pagina.getByPlaceholder(/^Senha$/).last().press('Enter');
}

async function main() {
  const browser = await chromium.launch({ headless: !process.env.MOSTRAR });
  // Um contexto por pessoa: o login fica no localStorage, que é por contexto.
  const nutri = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  const admin = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  const app = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  for (const p of [nutri, admin, app]) p.on('dialog', (d) => d.accept());

  // --- Entrada: cadastro, aprovação, convite e aceite ---

  await passo('Nutricionista se cadastra no painel', nutri, async () => {
    await nutri.goto(`${PAINEL}/login`, { waitUntil: 'domcontentloaded' });
    // O "Cadastrar" do formulário fica transparente por baixo; o clicável é o do painel azul.
    await nutri.locator('button[class*="btnGhost"]', { hasText: /^Cadastrar$/ }).click();
    await nutri.waitForTimeout(800);
    await nutri.getByPlaceholder('Nome completo').fill(NUTRI.nome);
    await nutri.getByPlaceholder('E-mail profissional').fill(NUTRI.email);
    await nutri.getByPlaceholder('Senha (mín. 8 caracteres)').fill(NUTRI.senha);
    await nutri.getByPlaceholder('CRN (ex.: CRN-3/12345)').fill(NUTRI.crn);
    await nutri.getByPlaceholder('CRN (ex.: CRN-3/12345)').press('Enter');
    await nutri.getByText(/aguardando|aprova/i).first().waitFor({ timeout: 15000 });
  });

  await passo('Nutricionista não entra antes da aprovação', nutri, async () => {
    await entrarNoPainel(nutri, NUTRI.email, NUTRI.senha);
    await nutri.getByText(/aguardando a aprovação/i).first().waitFor({ timeout: 15000 });
  });

  await passo('Administrador aprova a nutricionista', admin, async () => {
    await entrarNoPainel(admin, ADMIN.email, ADMIN.senha);
    await admin.waitForURL(/inicio|admin/, { timeout: 30000 });
    await admin.goto(`${PAINEL}/admin`, { waitUntil: 'domcontentloaded' });
    const linha = admin.locator('div').filter({ hasText: NUTRI.email }).filter({ has: admin.getByRole('button', { name: 'Aprovar' }) }).last();
    await linha.getByRole('button', { name: 'Aprovar' }).click({ timeout: 20000 });
    await admin.waitForTimeout(1500);
  });

  await passo('Nutricionista entra depois de aprovada', nutri, async () => {
    await entrarNoPainel(nutri, NUTRI.email, NUTRI.senha);
    await nutri.waitForURL(/inicio/, { timeout: 30000 });
  });

  await passo('Paciente cria conta no app', app, async () => {
    await abrirNoApp(app, '/cadastro');
    await app.getByPlaceholder('Nome completo').fill(PAC.nome);
    await app.getByPlaceholder('E-mail').fill(PAC.email);
    await app.getByPlaceholder('Senha (mín. 8 caracteres)').fill(PAC.senha);
    await app.getByText('Li e aceito').click();
    await app.getByText('Cadastrar', { exact: true }).last().click();
    await app.waitForURL(/onboarding|home/, { timeout: 30000 });
  });

  await passo('Paciente completa o primeiro acesso', app, async () => {
    if (!/onboarding/.test(app.url())) return;
    await app.getByPlaceholder('DD/MM/AAAA').fill('15/03/1980');
    await app.getByText('Selecione').first().click();
    await app.getByText(/^Masculino$/).last().click();
    await app.getByText('Selecione').first().click();
    await app.getByText(/Diabetes tipo 2/i).last().click();
    await app.getByPlaceholder('72,5').fill('80');
    await app.getByPlaceholder('1,74').fill('1,75');
    await app.getByText('Concluir cadastro').click();
    await app.waitForURL(/home/, { timeout: 30000 });
  });

  await passo('Nutricionista convida o paciente pelo e-mail', nutri, async () => {
    await nutri.goto(`${PAINEL}/pacientes`, { waitUntil: 'domcontentloaded' });
    await nutri.getByRole('button', { name: /Convidar paciente/ }).click();
    await nutri.getByPlaceholder('O mesmo usado no aplicativo').fill(PAC.email);
    await nutri.getByRole('button', { name: 'Enviar convite' }).click();
    await nutri.getByText(/convite|enviado|pendente/i).first().waitFor({ timeout: 15000 });
  });

  await passo('Paciente vê e aceita o convite', app, async () => {
    await abrirNoApp(app, '/home');
    await app.getByLabel(`Aceitar o acompanhamento de ${NUTRI.nome}`).click({ timeout: 60000 });
    await app.getByText('Sim, aceitar').click();
    await app.getByText(`${NUTRI.nome} quer acompanhar você`).waitFor({ state: 'detached', timeout: 20000 });
  });

  await passo('Paciente aparece na lista da nutricionista', nutri, async () => {
    await nutri.goto(`${PAINEL}/pacientes`, { waitUntil: 'domcontentloaded' });
    // O nome aparece também em "Convites aguardando resposta"; o que vale é sair de lá.
    await nutri.getByText(PAC.nome).first().waitFor({ timeout: 20000 });
    await nutri.getByText(/Convites aguardando resposta/i).waitFor({ state: 'detached', timeout: 20000 });
  });

  // --- Acompanhamento ---

  await passo('Glicemia alta no app vira aviso no app', app, async () => {
    await abrirNoApp(app, '/registros/glicemia');
    await app.getByPlaceholder('Ex.: 110').fill('320');
    await app.getByText('Salvar registro').click();
    await app.waitForTimeout(2500);
    await abrirNoApp(app, '/home');
    await app.getByText(/320/).first().waitFor({ timeout: 20000 });
  });

  await passo('Painel mostra o alerta com o nome do paciente', nutri, async () => {
    await nutri.goto(`${PAINEL}/inicio`, { waitUntil: 'domcontentloaded' });
    await nutri.getByText('Alertas glicêmicos').waitFor({ timeout: 30000 });
    await nutri.locator('button[aria-label*="otifica"]').first().click();
    await nutri.getByText(`${PAC.nome} registrou 320`).first().waitFor({ timeout: 15000 });
  });

  await passo('Plano alimentar criado no painel aparece no app', app, async () => {
    await nutri.goto(`${PAINEL}/alimentacao`, { waitUntil: 'domcontentloaded' });
    await nutri.getByRole('button', { name: '+ Novo plano' }).click();
    await nutri.getByPlaceholder('Buscar paciente...').fill(PAC.nome.slice(0, 12));
    await nutri.getByText(PAC.nome).last().click();
    const itens = ['1 tapioca com queijo branco, café sem açúcar', 'Arroz, feijão, frango grelhado e salada',
      '1 iogurte natural', 'Sopa de legumes'];
    for (let i = 0; i < itens.length; i++) {
      await nutri.getByPlaceholder(/1 fatia de pão integral/).nth(i).fill(itens[i]);
    }
    await nutri.getByRole('button', { name: 'Criar plano' }).click();
    await nutri.getByRole('button', { name: 'Criar plano' }).waitFor({ state: 'detached', timeout: 15000 });
    await abrirNoApp(app, '/alimentacao');
    await app.getByText(/tapioca com queijo branco/i).first().waitFor({ timeout: 30000 });
  });

  await passo('Mensagens nos dois sentidos, em tempo real', nutri, async () => {
    await nutri.goto(`${PAINEL}/mensagens`, { waitUntil: 'domcontentloaded' });
    await nutri.getByText(PAC.nome).first().click({ timeout: 20000 });
    await nutri.getByPlaceholder('Escreva sua mensagem…').fill(`Vi sua glicemia de 320. Como está? (${id})`);
    await nutri.getByPlaceholder('Escreva sua mensagem…').press('Enter');
    await abrirNoApp(app, '/mensagens');
    await app.getByText(NUTRI.nome).first().click({ timeout: 30000 });
    await app.getByText(`(${id})`).first().waitFor({ timeout: 20000 });
    await app.getByPlaceholder('Escreva sua mensagem...').fill(`Estou bem, comi doce. [${id}]`);
    await app.getByLabel('Enviar mensagem').click();
    // Sem recarregar o painel: a resposta tem que chegar sozinha.
    await nutri.getByText(`[${id}]`).first().waitFor({ timeout: 20000 });
  });

  await passo('Planilha importada no painel aparece na busca do app', nutri, async () => {
    const csv = join(tmpdir(), `nutricare-alimentos-${id}.csv`);
    writeFileSync(csv, 'nome;grupo;porcao_g;kcal;carboidratos_g;proteinas_g;lipidios_g;fibras_g;indice_glicemico;medida_caseira;medida_caseira_g\n'
      + `${ALIMENTO};Cereais;100;240;60;0,5;0,2;0;;1 unidade;50\n`);
    await nutri.goto(`${PAINEL}/alimentos`, { waitUntil: 'domcontentloaded' });
    await nutri.getByRole('button', { name: 'Importar planilha' }).click();
    await nutri.getByPlaceholder('Ex: TACO 4ª edição').fill(`Planilha de teste ${id}`);
    await nutri.locator('input[type="file"]').setInputFiles(csv);
    await nutri.getByRole('button', { name: /Importar 1 alimento/ }).click({ timeout: 15000 });
    await nutri.getByRole('button', { name: 'Concluir' }).click({ timeout: 30000 });
    await abrirNoApp(app, '/registros/refeicao');
    await app.getByText('Escolher da tabela').click();
    await app.getByPlaceholder('Buscar alimento').fill(ALIMENTO.slice(0, 13));
    await app.getByText(ALIMENTO).first().waitFor({ timeout: 20000 });
  });

  await passo('Receita publicada no painel aparece no app', nutri, async () => {
    await nutri.goto(`${PAINEL}/receitas`, { waitUntil: 'domcontentloaded' });
    await nutri.getByRole('button', { name: '+ Nova receita' }).click();
    await nutri.getByPlaceholder('Ex: Panqueca de aveia com banana').fill(RECEITA);
    await nutri.getByPlaceholder('Ex: Café da manhã').fill('Café da manhã');
    await nutri.getByPlaceholder(/2 ovos/).fill('2 ovos\n1 banana\n3 colheres de aveia');
    await nutri.getByPlaceholder('Descreva o passo a passo.').fill('Misture tudo e leve à frigideira.');
    await nutri.locator('label').filter({ has: nutri.locator('input[type="checkbox"]') }).last().click();
    await nutri.getByRole('button', { name: 'Cadastrar receita' }).click();
    await nutri.getByText(RECEITA).first().waitFor({ timeout: 15000 });
    await abrirNoApp(app, '/alimentacao/receitas');
    await app.getByText(RECEITA).first().waitFor({ timeout: 30000 });
  });

  await passo('Conteúdo educativo publicado aparece no app', nutri, async () => {
    await nutri.goto(`${PAINEL}/conteudos`, { waitUntil: 'domcontentloaded' });
    await nutri.getByRole('button', { name: '+ Novo conteúdo' }).click();
    await nutri.getByLabel('Título').fill(CONTEUDO);
    await nutri.getByLabel('Situação').selectOption('sim');
    await nutri.getByLabel('Conteúdo').fill('Beber água ao longo do dia ajuda no controle da glicemia.');
    await nutri.getByRole('button', { name: 'Criar' }).click();
    await nutri.getByText(CONTEUDO).first().waitFor({ timeout: 15000 });
    await abrirNoApp(app, '/alimentacao/conteudos');
    await app.getByText(CONTEUDO).first().waitFor({ timeout: 30000 });
  });

  await passo('Relatório do paciente abre com a glicemia', nutri, async () => {
    await nutri.goto(`${PAINEL}/pacientes`, { waitUntil: 'domcontentloaded' });
    const linha = nutri.locator('div', { hasText: PAC.email }).filter({ has: nutri.getByRole('button', { name: 'Ver Relatório' }) }).last();
    await linha.getByRole('button', { name: 'Ver Relatório' }).click({ timeout: 20000 });
    await nutri.getByText(/320/).first().waitFor({ timeout: 30000 });
  });

  await passo('Humor, medidas e medicamento do app chegam ao painel', app, async () => {
    await abrirNoApp(app, '/saude/humor');
    await app.getByText('Mal', { exact: true }).click();
    await app.getByText('3', { exact: true }).first().click();
    await app.getByText('Sono', { exact: true }).click();
    await app.getByText('Salvar registro').click();
    await app.waitForTimeout(2500);
    await abrirNoApp(app, '/saude/medidas');
    await app.getByPlaceholder('Ex.: 72,5').fill('79,4');
    await app.getByPlaceholder('Ex.: 1,72').fill('1,75');
    await app.getByPlaceholder('Ex.: 84').fill('96');
    await app.getByText('Salvar medidas').click();
    await app.waitForTimeout(2500);
    await abrirNoApp(app, '/saude/medicamentos');
    await app.getByPlaceholder('Ex.: Metformina').fill('Metformina');
    await app.getByPlaceholder('Ex.: 500').fill('850');
    await app.getByPlaceholder('Ex.: 8 em 8h').fill('12 em 12h');
    await app.getByPlaceholder('Ex.: 08:00').fill('08:00');
    await app.getByText('Adicionar', { exact: true }).last().click();
    // O nome digitado fica no campo; o que vale é o item na lista de baixo.
    await app.getByText(/850 mg/).first().waitFor({ timeout: 15000 });

    await nutri.goto(`${PAINEL}/pacientes`, { waitUntil: 'domcontentloaded' });
    await nutri.getByText(PAC.nome).first().click();
    await nutri.waitForURL(/informacoes/, { timeout: 15000 });
    const faltando = [];
    for (const [rotulo, texto] of [['medidas', /79[,.]4/], ['medicamento', /Metformina/], ['humor', /Mal|Sono/]]) {
      let achou = false;
      for (const aba of ['informacoes', 'saude', 'medidas', 'medicamentos', 'emocional', 'humor']) {
        await nutri.goto(nutri.url().replace(/\/[^/]+$/, `/${aba}`), { waitUntil: 'domcontentloaded' });
        await nutri.waitForTimeout(1200);
        if (await nutri.getByText(texto).count()) { achou = true; break; }
      }
      if (!achou) faltando.push(rotulo);
    }
    if (faltando.length) throw new Error(`não apareceu no painel: ${faltando.join(', ')}`);
  });

  await passo('Nutricionista registra uma anotação', nutri, async () => {
    await nutri.goto(`${PAINEL}/pacientes`, { waitUntil: 'domcontentloaded' });
    const linha = nutri.locator('div', { hasText: PAC.email }).filter({ has: nutri.getByRole('button', { name: 'Registrar Nova Informação' }) }).last();
    await linha.getByRole('button', { name: 'Registrar Nova Informação' }).click();
    await nutri.getByLabel('Informação', { exact: true }).fill(`Evitar doces no lanche da tarde (${id}).`);
    await nutri.getByRole('button', { name: 'Salvar informação' }).click();
    await nutri.getByText(`(${id})`).first().waitFor({ timeout: 15000 });
  });

  // --- Saída ---

  await passo('Paciente encerra o acompanhamento e some da lista', app, async () => {
    await abrirNoApp(app, '/perfil');
    await app.getByLabel(`Encerrar o acompanhamento com ${NUTRI.nome}`).click({ timeout: 20000 });
    await app.getByText('Sim, encerrar').click();
    await app.getByLabel(`Encerrar o acompanhamento com ${NUTRI.nome}`).waitFor({ state: 'detached', timeout: 15000 });
    await nutri.goto(`${PAINEL}/pacientes`, { waitUntil: 'domcontentloaded' });
    await nutri.waitForTimeout(2500);
    if (await nutri.getByText(PAC.nome).count()) throw new Error('o paciente continua na lista');
  });

  await passo('Nutricionista perde o acesso aos dados dele', nutri, async () => {
    const login = await fetch(`${API}/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: PAC.email, senha: PAC.senha }),
    }).then((r) => r.json());
    const token = await nutri.evaluate(() => localStorage.getItem('@NutriCare:accessToken'));
    const r = await fetch(`${API}/registros?pacienteId=${login.user.id}`, { headers: { Authorization: `Bearer ${token}` } });
    if (r.status === 200) throw new Error('a nutricionista ainda lê os registros');
  });

  await browser.close();

  const falhas = resultados.filter((r) => !r.ok);
  console.log('\n=== RESUMO ===');
  console.log(`PASS: ${resultados.length - falhas.length}  FAIL: ${falhas.length}`);
  console.log(`Contas criadas: ${NUTRI.email} e ${PAC.email}`);
  if (falhas.length) {
    for (const f of falhas) console.log(` - ${f.nome}: ${f.detalhe}`);
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
