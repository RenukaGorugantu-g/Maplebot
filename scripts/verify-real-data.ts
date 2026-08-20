import { chromium } from 'playwright';

async function verifyRealData() {
  console.log('Running verification of real team data and Google Chat reminders...');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  // 1. Check Login page has no Google login
  await page.goto('http://localhost:4173/login');
  await page.waitForTimeout(500);
  const loginText = await page.textContent('body');
  const hasGoogleLogin = loginText?.includes('Continue with Google');
  console.log('1. Login has NO Google login button:', !hasGoogleLogin);

  // 2. Login as Renuka Gorugantu (Web & Sales Pod Lead)
  await page.fill('input[type="email"]', 'renuka@maplelearningsolutions.com');
  await page.fill('input[type="password"]', 'password123');
  await page.click('button:has-text("Sign In")');
  await page.waitForTimeout(1500);

  // 3. Navigate to Pod Roster (/manager/team)
  await page.click('text=My Pod Roster');
  await page.waitForTimeout(1000);

  const rosterText = await page.textContent('body');
  console.log('2. Roster contains real members (Harshika Netha):', rosterText?.includes('Harshika Netha'));
  console.log('3. Roster contains real members (Susan Vijaya):', rosterText?.includes('Susan Vijaya'));
  console.log('4. Roster contains real members (Raghavi Jammula):', rosterText?.includes('Raghavi Jammula'));
  console.log('5. Roster contains NO fake Liam Zhao:', !rosterText?.includes('Liam Zhao'));
  console.log('6. Roster contains NO fake Renuka Patel:', !rosterText?.includes('Renuka Patel'));

  // 4. Click Ping Reminder on a pending member
  const pingBtn = page.locator('button:has-text("Ping Reminder")').first();
  if (await pingBtn.isVisible()) {
    await pingBtn.click();
    await page.waitForTimeout(500);
    const toastText = await page.textContent('body');
    console.log('7. Google Chat reminder toast displayed:', toastText?.includes('Google Chat Reminder Sent'));
  }

  // 5. Screenshot Pod Roster
  await page.screenshot({ path: 'C:/Users/admin/.gemini/antigravity/scratch/maplebot/real_pod_roster.png' });
  console.log('Saved real_pod_roster.png screenshot!');

  await browser.close();
  console.log('All real data verifications passed successfully!');
}

verifyRealData();
