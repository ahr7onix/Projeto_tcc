import { chromium } from 'playwright';

const WEB = 'http://localhost:5173';
const API = 'http://127.0.0.1:3000';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

await page.goto(`${WEB}/login`, { waitUntil: 'domcontentloaded' });
await page.getByPlaceholder('Endereço de e-mail').fill('camila.souza@nutri.com');
await page.getByPlaceholder(/^Senha$/).last().fill('Senha123!');
await page.locator('button[type="submit"]').filter({ hasText: /^Entrar$/i }).click();
await page.waitForURL(/\/(inicio|pacientes|admin)/, { timeout: 25000 });
console.log('PASS web login', page.url());

await page.goto(`${WEB}/pacientes`, { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);
const body = await page.locator('body').innerText();
const hits = [
  ...body.matchAll(
    /Paciente Demo Mobile|E2E Mobile|E2E UI|Teste Auto|Preview Onboarding|e2e\.(mobile|ui)/gi,
  ),
].map((m) => m[0]);
if (hits.length) {
  console.log('PASS pacientes UI:', [...new Set(hits)].join(', '));
} else {
  console.log('FAIL pacientes UI:', body.slice(0, 400).replace(/\s+/g, ' '));
}

const nutri = await fetch(`${API}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'camila.souza@nutri.com', senha: 'Senha123!' }),
}).then((r) => r.json());
const list = await fetch(`${API}/pacientes`, {
  headers: { Authorization: `Bearer ${nutri.accessToken}` },
}).then((r) => r.json());
console.log(
  'API count',
  list.data?.length,
  'mobile-ish',
  (list.data || [])
    .filter((p) => /e2e|demo|preview|auto/i.test(p.email + p.nome))
    .map((p) => `${p.nome}<${p.email}>`)
    .join(' | '),
);

await browser.close();
