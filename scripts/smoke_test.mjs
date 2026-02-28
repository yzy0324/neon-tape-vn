#!/usr/bin/env node
import { spawn } from 'node:child_process';
import process from 'node:process';

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch (error) {
  console.error('[FAIL] Playwright is not installed. Run `npm install` first.');
  console.error(String(error?.message || error));
  process.exit(1);
}

const PORT = Number(process.env.SMOKE_PORT || 8000);
const BASE_URL = `http://127.0.0.1:${PORT}`;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(url, retries = 30) {
  for (let i = 0; i < retries; i += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {}
    await wait(300);
  }
  throw new Error(`Server not reachable: ${url}`);
}

const server = spawn('python', ['-m', 'http.server', String(PORT)], {
  stdio: ['ignore', 'pipe', 'pipe']
});

server.stdout.on('data', (buf) => process.stdout.write(`[http] ${buf}`));
server.stderr.on('data', (buf) => process.stderr.write(`[http-err] ${buf}`));

let browser;
try {
  await waitForServer(BASE_URL);

  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });

  const startBtn = page.getByRole('button', { name: '开始值夜' });
  await startBtn.waitFor({ timeout: 10_000 });
  await startBtn.click();

  const endingRegex = /结局[ABC]【/;
  let ended = false;
  for (let i = 0; i < 60; i += 1) {
    const storyText = await page.locator('#story').innerText();
    if (endingRegex.test(storyText)) {
      ended = true;
      break;
    }

    const choiceButtons = page.locator('#choices button');
    const count = await choiceButtons.count();
    if (!count) {
      await page.waitForTimeout(150);
      continue;
    }

    await choiceButtons.nth(0).click();
    await page.waitForTimeout(120);
  }

  if (!ended) {
    throw new Error('Smoke test did not reach an ending within 60 interactions.');
  }

  console.log('[PASS] Playwright smoke test reached a valid ending scene.');
} catch (error) {
  console.error('[FAIL] Playwright smoke test failed.');
  console.error(String(error?.stack || error));
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
}
