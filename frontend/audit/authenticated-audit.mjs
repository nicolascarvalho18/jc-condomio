import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const baseURL = process.env.AUDIT_BASE_URL || 'http://localhost:5173';
const email = process.env.AUDIT_EMAIL;
const password = process.env.AUDIT_PASSWORD;
const executablePath = process.env.AUDIT_BROWSER || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const artifactDir = fileURLToPath(new URL('./artifacts/', import.meta.url));

if (!email || !password) throw new Error('AUDIT_EMAIL e AUDIT_PASSWORD são obrigatórios e devem ser fornecidos somente pelo ambiente.');
await mkdir(artifactDir, { recursive: true });

const browser = await chromium.launch({ headless: true, executablePath });
const result = { login: false, invalidLogin: false, logout: false, sessionExpiry: false, pages: [], consoleErrors: [], failedRequests: [], keyboard: false };

const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
const page = await context.newPage();
page.on('console', message => { if (message.type() === 'error') result.consoleErrors.push(message.text()); });
page.on('requestfailed', request => result.failedRequests.push(`${request.method()} ${request.url()} :: ${request.failure()?.errorText || 'failed'}`));

await page.goto(baseURL, { waitUntil: 'networkidle' });
await page.screenshot({ path: `${artifactDir}/authenticated-before-login.png`, fullPage: true });

// Login incorreto: preserva o formulário e exibe feedback de validação.
await page.locator('#login-email').fill(email);
await page.locator('#login-password').fill('senha-ficticia-incorreta');
await page.getByRole('button', { name: 'Entrar' }).click();
await page.getByRole('alert').waitFor({ state: 'visible', timeout: 5000 });
result.invalidLogin = true;

// Login válido da conta de teste isolada.
await page.locator('#login-password').fill(password);
await page.getByRole('button', { name: 'Entrar' }).click();
await page.getByRole('button', { name: /Menu do usuário/ }).waitFor({ state: 'visible', timeout: 10000 });
result.login = true;
await page.screenshot({ path: `${artifactDir}/authenticated-dashboard-1440.png`, fullPage: true });

// Verifica navegação principal sem criar dados no banco.
for (const item of ['Condomínios', 'Moradores e clientes', 'Contratos', 'Financeiro', 'Relatórios', 'Auditoria', 'Configurações']) {
  const button = page.getByRole('button', { name: item, exact: true }).first();
  if (await button.count()) {
    await button.click();
    await page.waitForTimeout(350);
    result.pages.push({ item, loaded: true, hash: new URL(page.url()).hash });
  } else {
    result.pages.push({ item, loaded: false });
  }
}
await page.screenshot({ path: `${artifactDir}/authenticated-financial-1440.png`, fullPage: true });

// Ações do menu do usuário: perfil abre, Esc fecha e logout retorna ao login.
await page.getByRole('button', { name: /Menu do usuário/ }).click();
await page.getByText('Sair do Sistema', { exact: true }).waitFor({ state: 'visible' });
await page.keyboard.press('Escape');
result.keyboard = !(await page.getByText('Sair do Sistema', { exact: true }).isVisible());
await page.getByRole('button', { name: /Menu do usuário/ }).click();
await page.getByText('Sair do Sistema', { exact: true }).click();
await page.locator('#login-email').waitFor({ state: 'visible', timeout: 5000 });
result.logout = true;

// Expiração: remove somente a sessão da conta fictícia no contexto do teste e confirma retorno ao login.
await page.evaluate(() => localStorage.removeItem('jc_access_token'));
await page.reload({ waitUntil: 'networkidle' });
result.sessionExpiry = await page.locator('#login-email').isVisible();
await page.screenshot({ path: `${artifactDir}/authenticated-after-logout.png`, fullPage: true });

await context.tracing.stop({ path: `${artifactDir}/authenticated-desktop.zip` });
await context.close();
await browser.close();
await writeFile(`${artifactDir}/authenticated-summary.json`, JSON.stringify(result, null, 2));
console.log(JSON.stringify({ ...result, consoleErrors: result.consoleErrors.length, failedRequests: result.failedRequests.length }, null, 2));
