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

const PORT = Number(process.env.BASIC_CHECK_PORT || 8000);
const BASE_URL = `http://127.0.0.1:${PORT}`;
const VIEWPORTS = [
  { name: '1366x768', width: 1366, height: 768 },
  { name: '1920x1080', width: 1920, height: 1080 },
  { name: '390x844', width: 390, height: 844 }
];

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

async function noScrollSnapshot(page) {
  return page.evaluate(() => {
    const root = document.documentElement;
    return {
      scrollHeight: root.scrollHeight,
      scrollWidth: root.scrollWidth,
      innerHeight: window.innerHeight,
      innerWidth: window.innerWidth,
      passHeight: root.scrollHeight <= window.innerHeight + 1,
      passWidth: root.scrollWidth <= window.innerWidth + 1
    };
  });
}

const server = spawn('python', ['-m', 'http.server', String(PORT)], {
  stdio: ['ignore', 'pipe', 'pipe']
});

let browser;
try {
  await waitForServer(BASE_URL);
  browser = await chromium.launch({ headless: true });

  for (const viewport of VIEWPORTS) {
    const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: '开始新卷' }).click();

    const panelButtons = [
      '#savePanelBtn', '#archivePanelBtn', '#endingPanelBtn', '#historyBtn'
    ];

    for (const selector of panelButtons) {
      await page.locator(selector).click();
      await page.waitForTimeout(90);
      const openSnap = await noScrollSnapshot(page);
      if (!openSnap.passHeight || !openSnap.passWidth) {
        throw new Error(`[${viewport.name}] no-scroll check failed while opening ${selector}: ${JSON.stringify(openSnap)}`);
      }
      const closeSelector = selector === '#historyBtn'
        ? '#historyClose'
        : selector === '#savePanelBtn'
          ? '#savePanelClose'
          : selector === '#archivePanelBtn'
            ? '#archivePanelClose'
            : '#endingPanelClose';
      await page.locator(closeSelector).click();
      await page.waitForTimeout(90);
    }

    const snap = await noScrollSnapshot(page);
    if (!snap.passHeight || !snap.passWidth) {
      throw new Error(`[${viewport.name}] no-scroll check failed: ${JSON.stringify(snap)}`);
    }

    console.log(`[PASS] ${viewport.name} no-scroll:`, snap);
    await page.close();
  }

  console.log('[PASS] tests/basic_check.js finished.');
} catch (error) {
  console.error('[FAIL] tests/basic_check.js failed.');
  console.error(String(error?.stack || error));
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
}
