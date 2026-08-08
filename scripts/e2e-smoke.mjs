/**
 * Smoke E2E: mobile Expo web + painel nutricionista
 * Run: node scripts/e2e-smoke.mjs
 */
import { chromium } from 'playwright';

const MOBILE = 'http://localhost:8082';
const WEB = 'http://localhost:5173';
const API = 'http://127.0.0.1:3000';

const results = [];
function pass(name, detail = '') {
  results.push({ ok: true, name, detail });
  console.log(`PASS  ${name}${detail ? ' — ' + detail : ''}`);
}
function fail(name, detail = '') {
  results.push({ ok: false, name, detail });
  console.log(`FAIL  ${name}${detail ? ' — ' + detail : ''}`);
}

async function waitText(page, re, ms = 15000) {
  await page.waitForFunction(
    (pattern) => new RegExp(pattern, 'i').test(document.body?.innerText || ''),
    re.source || re,
    { timeout: ms },
  );
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 420, height: 900 },
  });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('pageerror', (e) => consoleErrors.push(String(e)));
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  // --- MOBILE: login UI ---
  try {
    await page.goto(`${MOBILE}/login/cliente`, { waitUntil: 'networkidle', timeout: 60000 });
    await waitText(page, /NutriCare|Bem-vindo de volta|Entrar/i);
    pass('Mobile login UI carrega');
  } catch (e) {
    fail('Mobile login UI carrega', String(e.message || e));
  }

  // --- MOBILE: cadastro UI ---
  try {
    await page.goto(`${MOBILE}/cadastro`, { waitUntil: 'networkidle', timeout: 60000 });
    await waitText(page, /Criar conta|Cadastrar|NutriCare/i);
    pass('Mobile cadastro UI carrega');
  } catch (e) {
    fail('Mobile cadastro UI carrega', String(e.message || e));
  }

  // --- MOBILE: login flow ---
  try {
    await page.goto(`${MOBILE}/login/cliente`, { waitUntil: 'networkidle', timeout: 60000 });
    await page.getByPlaceholder(/e-mail/i).fill('paciente.mobile.demo@nutricare.test');
    await page.getByPlaceholder(/^Senha$/i).fill('Senha123!');
    await page.getByText(/^Entrar$/i).click();
    await page.waitForURL(/\/(home|onboarding)/, { timeout: 20000 });
    const url = page.url();
    if (/home/.test(url)) {
      await waitText(page, /Boa (dia|tarde|noite)|cantinho|Glicemia|Ações rápidas/i);
      pass('Mobile login paciente', `destino ${url}`);
    } else {
      pass('Mobile login paciente', `destino onboarding ${url}`);
    }
  } catch (e) {
    fail('Mobile login paciente', String(e.message || e));
  }

  // --- MOBILE: tabs ---
  const tabs = [
    { name: 'Início', path: '/home', expect: /Boa (dia|tarde|noite)|Glicemia|NutriCare/i },
    { name: 'Alimentação', path: '/alimentacao', expect: /Alimenta|Receita|Plano|alimento/i },
    { name: 'Registros', path: '/registros', expect: /Registro|Glicemia|Refei/i },
    { name: 'Mensagens', path: '/mensagens', expect: /Mensag|conversa|nutricionista/i },
    { name: 'Saúde', path: '/saude', expect: /Saúde|Humor|Medida|peso/i },
    { name: 'Perfil', path: '/perfil', expect: /Perfil|Sair|conta|Paciente Demo/i },
  ];

  for (const tab of tabs) {
    try {
      await page.goto(`${MOBILE}${tab.path}`, { waitUntil: 'networkidle', timeout: 45000 });
      await waitText(page, tab.expect, 12000);
      // Prefer clicking tab if visible
      const tabBtn = page.getByRole('tab', { name: new RegExp(tab.name, 'i') });
      if (await tabBtn.count()) {
        await tabBtn.first().click().catch(() => undefined);
        await page.waitForTimeout(400);
      }
      pass(`Mobile aba ${tab.name}`, page.url());
    } catch (e) {
      fail(`Mobile aba ${tab.name}`, String(e.message || e));
    }
  }

  // --- COMBINED: create patient via API + verify nutri list ---
  const stamp = Date.now();
  const newEmail = `e2e.mobile.${stamp}@nutricare.test`;
  let newUserId = null;
  try {
    const cadRes = await fetch(`${API}/auth/cadastro/paciente`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: `E2E Mobile ${stamp}`,
        email: newEmail,
        senha: 'Senha123!',
      }),
    });
    const cad = await cadRes.json();
    if (!cadRes.ok) throw new Error(JSON.stringify(cad));
    newUserId = cad.user?.id;
    pass('API cadastro paciente novo', newEmail);
  } catch (e) {
    fail('API cadastro paciente novo', String(e.message || e));
  }

  try {
    const loginNutri = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'camila.souza@nutri.com',
        senha: 'Senha123!',
      }),
    }).then((r) => r.json());
    const list = await fetch(`${API}/pacientes`, {
      headers: { Authorization: `Bearer ${loginNutri.accessToken}` },
    }).then((r) => r.json());
    const found = (list.data || list || []).find(
      (p) => p.email === newEmail || p.nome?.includes(`E2E Mobile ${stamp}`),
    );
    if (found) pass('API vínculo auto → lista Camila', `id=${found.id}`);
    else fail('API vínculo auto → lista Camila', 'paciente não encontrado');
  } catch (e) {
    fail('API vínculo auto → lista Camila', String(e.message || e));
  }

  // --- WEB: login Camila + Pacientes page shows new patient ---
  const web = await context.newPage();
  await web.setViewportSize({ width: 1280, height: 800 });
  try {
    await web.goto(`${WEB}/login`, { waitUntil: 'networkidle', timeout: 45000 });
    await web.getByPlaceholder('Endereço de e-mail').fill('camila.souza@nutri.com');
    await web.locator('form').filter({ has: web.getByRole('button', { name: /^Entrar$/i }) }).getByPlaceholder('Senha').fill('Senha123!');
    // Prefer sign-in form password: last visible Senha on login panel
    const senhaLogin = web.getByPlaceholder(/^Senha$/);
    if (await senhaLogin.count()) {
      await senhaLogin.last().fill('Senha123!');
    }
    await web.getByRole('button', { name: /^Entrar$/i }).click();
    await web.waitForURL(/\/(inicio|pacientes|admin)/, { timeout: 20000 });
    pass('Web login nutricionista', web.url());
  } catch (e) {
    fail('Web login nutricionista', String(e.message || e));
  }

  try {
    await web.goto(`${WEB}/pacientes`, { waitUntil: 'networkidle', timeout: 45000 });
    await web.waitForTimeout(2000);
    const body = await web.locator('body').innerText();
    const hasDemo = /Paciente Demo Mobile|paciente\.mobile\.demo/i.test(body);
    const hasNew = new RegExp(`E2E Mobile ${stamp}|e2e\\.mobile\\.${stamp}`, 'i').test(body);
    if (hasDemo || hasNew) {
      pass(
        'Web Pacientes mostra paciente mobile',
        hasNew ? `novo e2e.mobile.${stamp}` : 'demo mobile presente',
      );
    } else {
      fail(
        'Web Pacientes mostra paciente mobile',
        `texto não encontrado. Trecho: ${body.slice(0, 280).replace(/\s+/g, ' ')}`,
      );
    }
  } catch (e) {
    fail('Web Pacientes mostra paciente mobile', String(e.message || e));
  }

  // Mobile register: logout first if session exists
  try {
    await page.goto(`${MOBILE}/perfil`, { waitUntil: 'networkidle', timeout: 45000 });
    const sair = page.getByText(/Sair da conta/i);
    if (await sair.count()) {
      await sair.first().click();
      await page.waitForURL(/login|auth/, { timeout: 15000 }).catch(() => undefined);
    }
    await page.goto(`${MOBILE}/cadastro`, { waitUntil: 'networkidle', timeout: 45000 });
    const uiEmail = `e2e.ui.${stamp}@nutricare.test`;
    await page.getByPlaceholder(/Nome completo/i).fill(`E2E UI ${stamp}`);
    await page.getByPlaceholder(/^E-mail$/i).fill(uiEmail);
    await page.getByPlaceholder(/Senha/i).fill('Senha123!');
    const terms = page.getByText(/Li e aceito/i);
    if (await terms.count()) await terms.first().click();
    await page.getByText(/^Cadastrar$/i).click();
    await page.waitForURL(/\/(home|onboarding)/, { timeout: 25000 });
    pass('Mobile cadastro UI submit', page.url());

    const loginNutri2 = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'camila.souza@nutri.com',
        senha: 'Senha123!',
      }),
    }).then((r) => r.json());
    const list2 = await fetch(`${API}/pacientes`, {
      headers: { Authorization: `Bearer ${loginNutri2.accessToken}` },
    }).then((r) => r.json());
    const found2 = (list2.data || []).find((p) => p.email === uiEmail);
    if (found2) pass('Fluxo combinado: cadastro mobile → lista nutri', uiEmail);
    else fail('Fluxo combinado: cadastro mobile → lista nutri', 'não apareceu na API');
  } catch (e) {
    fail('Mobile cadastro UI / fluxo combinado', String(e.message || e));
  }

  if (consoleErrors.length) {
    const unique = [...new Set(consoleErrors)].slice(0, 8);
    fail('Console errors mobile', unique.join(' | '));
  } else {
    pass('Sem pageerror/console.error críticos capturados');
  }

  await browser.close();

  const failed = results.filter((r) => !r.ok);
  const passed = results.filter((r) => r.ok);
  console.log('\n=== RESUMO ===');
  console.log(`PASS: ${passed.length}  FAIL: ${failed.length}`);
  if (failed.length) {
    for (const f of failed) console.log(` - ${f.name}: ${f.detail}`);
    process.exitCode = 1;
  }
  // JSON for parent
  console.log('\nJSON_RESULTS=' + JSON.stringify({ passed: passed.length, failed: failed.length, results }));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
