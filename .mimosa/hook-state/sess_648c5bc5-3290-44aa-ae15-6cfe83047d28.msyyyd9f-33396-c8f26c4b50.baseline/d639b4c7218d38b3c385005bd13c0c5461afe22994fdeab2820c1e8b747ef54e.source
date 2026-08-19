import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUT_DIR = 'C:/Users/Aditya Prakash/.gemini/antigravity/brain/7f8bd9e1-1588-47b5-bb70-19bcbfe1ad41/.user_uploaded/';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:5173');
  await page.waitForLoadState('networkidle');
  
  // Login as Guest
  const guestBtn = page.locator('button:has-text("Continue as Guest")').first();
  if (await guestBtn.count() > 0) {
    await guestBtn.click();
    await page.waitForLoadState('networkidle');
  }

  // Go to Community explicitly via URL
  await page.goto('http://localhost:5173/#community');
  await page.waitForLoadState('networkidle');

  // CLICK STUDENT CHATS TAB (2nd tab)
  const chatTab = page.locator('.community-tab-btn').nth(1);
  await chatTab.waitFor({ state: 'visible', timeout: 5000 });
  await chatTab.click();
  await page.waitForTimeout(1000);

  // CLICK GENERAL CHANNEL
  const generalChannel = page.locator('.channel-item').first();
  await generalChannel.waitFor({ state: 'visible', timeout: 5000 });
  await generalChannel.click();
  await page.waitForTimeout(2000);

  // 1. ATTACHMENT BUTTON
  const attachBtn = page.locator('button[title="Attach Image or GIF"]').first();
  await attachBtn.waitFor({ state: 'visible', timeout: 5000 });
  
  // Screenshot the whole chat input area container
  const inputContainer = page.locator('.wa-chat-input-container').last();
  await inputContainer.screenshot({ path: path.join(OUT_DIR, 'test_attachment_ui.png') });

  // 2. MODERATION
  const chatInput = page.locator('.wa-chat-input').last();
  await chatInput.fill('You are a bitch');
  // Click send button
  const sendBtn = page.locator('.wa-chat-send-btn').last();
  await sendBtn.click();
  await page.waitForTimeout(1000);
  
  // Screenshot the whole page to capture the toast
  await page.screenshot({ path: path.join(OUT_DIR, 'test_moderation_profanity.png') });

  // 3. DROPDOWN PHYSICS
  const chevron = page.locator('.wa-message-chevron-icon').last();
  await chevron.waitFor({ state: 'visible', timeout: 5000 });
  await chevron.click({ force: true });
  await page.waitForTimeout(1000);
  // Screenshot the dropdown menu content
  const menu = page.locator('.dropdown-content, [role="menu"], [style*="position: fixed"]').last();
  await menu.screenshot({ path: path.join(OUT_DIR, 'test_dropdown_physics.png') });
  await page.mouse.click(0, 0); // close

  // CLICK BUY & SELL TAB (4th tab)
  const marketTab = page.locator('.community-tab-btn').nth(3);
  await marketTab.waitFor({ state: 'visible', timeout: 5000 });
  await marketTab.click();
  await page.waitForTimeout(1000);

  // 4. MARKETPLACE SELL
  const sellBtn = page.locator('button:has-text("Sell Item")').first();
  await sellBtn.waitFor({ state: 'visible', timeout: 5000 });
  await sellBtn.click();
  await page.waitForTimeout(1000);
  // Screenshot the modal
  const modal = page.locator('.modal-content, [role="dialog"], [style*="position: fixed"]').first();
  await modal.screenshot({ path: path.join(OUT_DIR, 'test_marketplace_sell.png') });

  await browser.close();
  console.log("ALL TESTS COMPLETED SUCCESSFULLY");
})();
