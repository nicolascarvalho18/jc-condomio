import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const baseUrl = process.env.AUDIT_BASE_URL || 'http://localhost:5173';
const browserPath = process.env.AUDIT_BROWSER || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const artifactDir = fileURLToPath(new URL('./artifacts/', import.meta.url));
await fs.mkdir(artifactDir, { recursive: true });

const browser = await chromium.launch({ headless: true, executablePath: browserPath });
const results = [];

for (const viewport of [
  { name: 'mobile-375', width: 375, height: 812 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'desktop-1440', width: 1440, height: 900 },
]) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
  });
  const page = await context.newPage();
  const consoleErrors = [];
  const failedRequests = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('requestfailed', (request) => failedRequests.push(`${request.method()} ${request.url()} ${request.failure()?.errorText || ''}`));
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.screenshot({ path: `${artifactDir}/${viewport.name}-login.png`, fullPage: true });
  const title = await page.title();
  const protectedUrl = `${baseUrl}/financeiro`;
  await page.goto(protectedUrl, { waitUntil: 'networkidle' });
  const redirectedUrl = page.url();
  const loginVisibleOnProtectedRoute = await page.locator('input[type="email"]').isVisible().catch(() => false);
  results.push({
    viewport: viewport.name,
    title,
    protectedUrl: redirectedUrl,
    protectedRouteBlocked: loginVisibleOnProtectedRoute,
    consoleErrors,
    failedRequests,
  });
  await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.locator('input[type="email"]').fill('invalid-audit@example.test');
  await page.locator('input[type="password"]').fill('invalid-password');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${artifactDir}/${viewport.name}-invalid-login.png`, fullPage: true });
  await context.tracing.stop({ path: `${artifactDir}/${viewport.name}.zip` });
  await page.close();
  await context.close();
}

await browser.close();
await fs.writeFile(`${artifactDir}/summary.json`, JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));
