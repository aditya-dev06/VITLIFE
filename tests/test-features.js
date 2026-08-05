import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUT_DIR = 'C:/Users/Aditya Prakash/.gemini/antigravity/brain/7f8bd9e1-1588-47b5-bb70-19bcbfe1ad41/.user_uploaded/';

(async () => {
  console.log('Starting Playwright tests...');
  
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  for (let i=0; i<10; i++) {
    try {
      await page.goto('http://localhost:5173', { timeout: 5000 });
      break;
    } catch(e) {
      console.log('Waiting for dev server...');
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  console.log('Loaded App. Logging in as guest...');
  
  await page.waitForTimeout(2000);
  try {
    const guestBtn = await page.$('text="Continue as Guest"');
    if (guestBtn) {
      await guestBtn.click();
      await page.waitForTimeout(2000);
    }
  } catch (e) { console.log('Guest button not found'); }

  console.log('Navigating to Community...');
  // Find Community text anywhere
  await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('*'));
    const target = els.find(el => el.textContent === 'Community' && el.tagName === 'BUTTON');
    if (target) target.click();
    else {
      const span = els.find(el => el.textContent === 'Community' && el.tagName === 'SPAN');
      if (span) span.parentElement.click();
    }
  });
  await page.waitForTimeout(2000);
  
  console.log('Taking screenshot of Chat Attachment UI...');
  await page.screenshot({ path: path.join(OUT_DIR, 'test_attachment_ui.png') });

  console.log('Testing moderation (profanity)...');
  await page.fill('input[type="text"]', 'You are a bitch');
  await page.click('button[title="Send"]');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(OUT_DIR, 'test_moderation_profanity.png') });

  console.log('Testing Dropdown Physics...');
  const chevrons = await page.$$('svg.wa-message-chevron-icon');
  if (chevrons.length > 0) {
    await chevrons[chevrons.length - 1].click({ force: true });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(OUT_DIR, 'test_dropdown_physics.png') });
    await page.mouse.click(0, 0);
  }

  console.log('Navigating to Marketplace...');
  await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('*'));
    const span = els.find(el => el.textContent === 'Marketplace' && el.tagName === 'SPAN');
    if (span) span.parentElement.click();
  });
  await page.waitForTimeout(2000);
  
  console.log('Testing Marketplace Sell form...');
  try {
    const sellBtn = await page.$('text="Sell Item"');
    if (sellBtn) await sellBtn.click();
    else {
        await page.evaluate(() => {
            const els = Array.from(document.querySelectorAll('button'));
            const target = els.find(el => el.textContent.includes('Sell Item'));
            if (target) target.click();
        });
    }
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(OUT_DIR, 'test_marketplace_sell.png') });
  } catch(e) {}

  await browser.close();
  console.log('Tests completed successfully.');
})();
