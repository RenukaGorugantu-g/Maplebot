import { chromium } from 'playwright';

async function testUpdatedHierarchyAndLayout() {
  console.log('Testing updated hierarchy and layout in browser...');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  // 1. Visit Login
  await page.goto('http://localhost:4173/login');
  await page.waitForTimeout(500);

  // 2. Login as Renuka Gorugantu (Pod Lead Web & Sales)
  await page.fill('input[type="email"]', 'renuka@maplelearningsolutions.com');
  await page.fill('input[type="password"]', 'password123');
  await page.click('button:has-text("Sign In")');
  await page.waitForTimeout(1500);

  // Take screenshot of Renuka's Pod Lead Dashboard
  await page.screenshot({ path: 'C:/Users/admin/.gemini/antigravity/scratch/maplebot/renuka_dashboard.png' });
  console.log('Renuka dashboard screenshot saved to renuka_dashboard.png');

  // Verify Pod Lead Cockpit is rendered for Renuka
  const renukaBody = await page.textContent('body');
  console.log('Renuka is Pod Lead:', renukaBody?.includes('Web & Sales — Today\'s Team Status') || renukaBody?.includes('Pod Lead Cockpit'));

  // 3. Test Admin Login (Sandeep M)
  await page.goto('http://localhost:4173/login');
  await page.evaluate(() => localStorage.clear());
  await page.goto('http://localhost:4173/login');
  await page.waitForTimeout(500);

  await page.fill('input[type="email"]', 'sandeep@maplelearningsolutions.com');
  await page.fill('input[type="password"]', 'password123');
  await page.click('button:has-text("Sign In")');
  await page.waitForTimeout(1500);

  // Take screenshot of Sandeep's Admin Dashboard
  await page.screenshot({ path: 'C:/Users/admin/.gemini/antigravity/scratch/maplebot/admin_dashboard.png' });
  console.log('Admin dashboard screenshot saved to admin_dashboard.png');

  const adminBody = await page.textContent('body');
  console.log('Sandeep is Admin:', adminBody?.includes('Company Standup Overview') || adminBody?.includes('Organization Executive View'));

  await browser.close();
  console.log('Browser tests completed successfully!');
}

testUpdatedHierarchyAndLayout();
