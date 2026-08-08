/**
 * Retest only: web login + pacientes + mobile cadastro after logout
 */
import { chromium } from 'playwright';

const MOBILE = 'http://localhost:8082';
const WEB = 'http://localhost:5173';
const API = 'http://127.0.0.1:3000';
const stamp = Date.now();
const results = [];
const pass = (n, d = '') => { results.push({ ok: true, n, d }); console.log('PASS', n, d); };
const fail = (n, d = '') => { results.push({ ok: false, n, d }); console.log('FAIL', n, d); };

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();

// Web Camila
const web = await context.newPage();
await web.setViewportSize({ width: 1280, height: 800 });
try {
  await web.goto(`${WEB}/login`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await web.getByPlaceholder('Endereço de e-mail').fill('camila.souza@nutri.com');
  await web.getByPlaceholder(/^Senha$/).last().fill('Senha123!');
  await web.getByRole('button', { name: /^Entrar$/i }).click();
  await web.waitForURL(/\/(inicio|pacientes|admin)/, { timeout: 25000 });
  pass('Web login nutricionista', web.url());
  await web.goto(`${WEB}/pacientes`, { waitUntil: 'networkidle', timeout: 45000 });
  await web.waitForTimeout(2000);
  const body = await web.locator('body').innerText();
  if (/Paciente Demo Mobile|E2E Mobile|e2e\.mobile|Teste Auto|Preview Onboarding/i.test(body)) {
    pass('Web Pacientes lista pacientes mobile/vinculados', body.match(/Paciente Demo Mobile|E2E|Teste Auto|Preview Onboarding/i)?.[0]);
  } else {
    fail('Web Pacientes lista', body.slice(0, 400).replace(/\s+/g, ' '));
  }
} catch (e) {
  fail('Web fluxo', String(e.message || e));
}

// Mobile cadastro after logout
const page = await context.newPage();
await page.setViewportSize({ width: 420, height: 900 });
try {
  // seed session then logout via UI
  const login = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'paciente.mobile.demo@nutricare.test', senha: 'Senha123!' }),
  }).then((r) => r.json());
  await page.goto(`${MOBILE}/login/cliente`, { waitUntil: 'domcontentloaded' });
  await page.evaluate((data) => {
    localStorage.setItem('auth.token', data.accessToken);
    localStorage.setItem('auth.refreshToken', data.refreshToken);
    localStorage.setItem('auth.user', JSON.stringify(data.user));
  }, login);
  await page.goto(`${MOBILE}/perfil`, { waitUntil: 'networkidle', timeout: 45000 });
  await page.getByText(/Sair da conta/i).click();
  await page.waitForTimeout(1500);
  await page.goto(`${MOBILE}/cadastro`, { waitUntil: 'networkidle', timeout: 45000 });
  const uiEmail = `e2e.ui.${stamp}@nutricare.test`;
  await page.getByPlaceholder(/Nome completo/i).fill(`E2E UI ${stamp}`);
  await page.getByPlaceholder(/^E-mail$/i).fill(uiEmail);
  await page.getByPlaceholder(/Senha/i).fill('Senha123!');
  await page.getByText(/Li e aceito/i).click();
  await page.getByText(/^Cadastrar$/i).click();
  await page.waitForURL(/\/(home|onboarding)/, { timeout: 25000 });
  pass('Mobile cadastro UI', page.url());

  const nutri = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'camila.souza@nutri.com', senha: 'Senha123!' }),
  }).then((r) => r.json());
  const list = await fetch(`${API}/pacientes`, {
    headers: { Authorization: `Bearer ${nutri.accessToken}` },
  }).then((r) => r.json());
  const found = (list.data || []).find((p) => p.email === uiEmail);
  if (found) pass('Combinado cadastro mobile → API pacientes Camila', uiEmail);
  else fail('Combinado cadastro mobile → API pacientes Camila', JSON.stringify(list.data?.map((p) => p.email)));
} catch (e) {
  fail('Mobile cadastro/combinado', String(e.message || e));
}

await browser.close();
const failed = results.filter((r) => !r.ok).length;
console.log(JSON.stringify({ failed, results }));
process.exit(failed ? 1 : 0);
