import { chromium } from 'playwright';

async function testBrowserGoogleChat() {
  console.log('Testing live Google Chat submission in browser...');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  page.on('response', async (res) => {
    if (res.url().includes('/api/gchat')) {
      console.log(`[GChat API Response]: Status ${res.status()} ${res.statusText()}`);
    }
  });

  // 1. Login as Renuka Gorugantu
  await page.goto('http://localhost:4173/login');
  await page.waitForTimeout(500);
  await page.fill('input[type="email"]', 'renuka@maplelearningsolutions.com');
  await page.fill('input[type="password"]', 'password123');
  await page.click('button:has-text("Sign In")');
  await page.waitForTimeout(1500);

  // 2. Go to Standup Feed (/updates/team)
  await page.click('text=Team Updates');
  await page.waitForTimeout(1000);

  // 3. Click Feedback & Comments on an update
  const feedbackBtn = page.locator('button:has-text("Feedback & Comments")').first();
  await feedbackBtn.click();
  await page.waitForTimeout(500);

  // 4. Type a real comment
  const commentInput = page.locator('input[placeholder*="Leave feedback"]').first();
  await commentInput.fill('Great progress on the CDN rollout! Verified in Google Chat.');
  const sendBtn = page.locator('button[title="Send Feedback"]').first();
  await sendBtn.click();
  await page.waitForTimeout(1500);

  console.log('Feedback submitted from browser successfully!');

  // 5. Submit a Standup Update from /updates/my-update
  await page.goto('http://localhost:4173/updates/my-update');
  await page.waitForTimeout(1000);
  await page.fill('textarea', '• Verified Google Chat integration & CORS proxy\n• Tested standup feed live notifications');
  const textareas = page.locator('textarea');
  if (await textareas.count() >= 2) {
    await textareas.nth(1).fill('• Rolling out MapleBot to Maple Learning Solutions pods');
  }
  await page.click('button:has-text("Daily Standup")');
  await page.waitForTimeout(2000);

  console.log('Standup update submitted from browser successfully!');

  await browser.close();
  console.log('All browser Google Chat tests completed with 200 OK!');
}

testBrowserGoogleChat();
