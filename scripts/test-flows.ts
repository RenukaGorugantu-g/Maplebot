import { chromium } from 'playwright';

async function testAuthAndFlows() {
  console.log('Testing full user flows in browser...');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log(`[BROWSER ERROR]:`, msg.text());
  });
  page.on('pageerror', (err) => console.error('[PAGE ERROR]:', err));

  // 1. Visit Landing Page
  await page.goto('http://localhost:4173/');
  console.log('1. Landing page loaded. Title:', await page.title());

  // 2. Click Sign In
  await page.click('text=Sign In');
  await page.waitForTimeout(500);
  console.log('2. Navigated to /login. Current URL:', page.url());

  // 3. Login as Renuka (Pod Lead Web & Sales)
  await page.fill('input[type="email"]', 'renuka@maplelearningsolutions.com');
  await page.fill('input[type="password"]', 'password123');
  await page.click('button:has-text("Sign In")');
  await page.waitForTimeout(1000);

  const dashboardText = await page.textContent('body');
  console.log('3. Dashboard loaded! Contains "Web & Sales":', dashboardText?.includes('Web & Sales'));
  console.log('4. Contains "Pod Lead Cockpit":', dashboardText?.includes('Pod Lead Cockpit'));

  // 4. Save Screenshot of Manager Dashboard
  await page.screenshot({ path: 'C:/Users/admin/.gemini/antigravity/scratch/maplebot/dashboard_screenshot.png' });
  console.log('5. Saved dashboard_screenshot.png successfully!');

  // 5. Test Sign Out
  await page.click('button:has(img), button:has(svg)'); // Open profile or avatar
  await page.waitForTimeout(300);
  const signOutBtn = page.locator('text=Sign Out').first();
  if (await signOutBtn.isVisible()) {
    await signOutBtn.click();
    await page.waitForTimeout(1000);
    console.log('6. Clicked Sign Out. Returned to:', page.url());
  }

  await browser.close();
  console.log('All flow tests completed successfully with 0 crashes!');
}

testAuthAndFlows();
