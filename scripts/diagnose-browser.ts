import { chromium } from 'playwright';

async function diagnose() {
  console.log('Launching installed system browser to inspect http://localhost:4173/ ...');
  // Use installed Edge or Chrome
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage();

  page.on('console', (msg) => console.log(`[BROWSER CONSOLE ${msg.type()}]:`, msg.text()));
  page.on('pageerror', (err) => console.error('[BROWSER UNCAUGHT ERROR]:', err));

  try {
    const res = await page.goto('http://localhost:4173/', { waitUntil: 'networkidle', timeout: 10000 });
    console.log('HTTP Status:', res?.status());
    
    await page.waitForTimeout(2000);

    const rootHtml = await page.$eval('#root', (el) => el.innerHTML);
    console.log('--- #root INNER HTML LENGTH ---:', rootHtml.length);
    console.log('--- #root INNER HTML (first 300 chars) ---:');
    console.log(rootHtml.slice(0, 300));

    await page.screenshot({ path: 'C:/Users/admin/.gemini/antigravity/scratch/maplebot/diagnostic_screenshot.png' });
    console.log('Saved screenshot to diagnostic_screenshot.png');
  } catch (e) {
    console.error('Diagnosis error:', e);
  } finally {
    await browser.close();
  }
}

diagnose();
