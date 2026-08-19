import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUT_DIR = 'C:/Users/Aditya Prakash/.gemini/antigravity/brain/7f8bd9e1-1588-47b5-bb70-19bcbfe1ad41/.user_uploaded/';

// Ensure output directory exists
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

(async () => {
  console.log("Starting Exhaustive QA Playwright Script...");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.setViewportSize({ width: 1280, height: 800 });
  
  await page.goto('http://localhost:5173/');
  await page.waitForLoadState('networkidle');

  // 1. Dashboard View (Guest mode initially)
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(OUT_DIR, 'qa_01_landing.png') });
  
  // Login as Guest
  const guestBtn = page.locator('button:has-text("Continue as Guest")').first();
  if (await guestBtn.count() > 0) {
    await guestBtn.click();
    await page.waitForTimeout(2000);
  }

  // 2. Dashboard View (Logged in as Guest)
  await page.screenshot({ path: path.join(OUT_DIR, 'qa_02_dashboard.png') });

  // Navigate to Community via Sidebar
  const sidebarCommunity = page.locator('text="Student Community"').first();
  if (await sidebarCommunity.count() > 0) {
    await sidebarCommunity.click();
    await page.waitForTimeout(2000);
  } else {
    console.log("Sidebar 'Student Community' not found, trying bottom nav 'Community'");
    const bottomNav = page.locator('text="Community"').first();
    await bottomNav.click();
    await page.waitForTimeout(2000);
  }

  // 3. PYQ Hub (Default Community View)
  await page.screenshot({ path: path.join(OUT_DIR, 'qa_03_pyq_hub.png') });

  // Navigate to Student Chats
  const chatTab = page.locator('button:has-text("Student Chats")').first();
  if (await chatTab.count() > 0) {
    await chatTab.click();
    await page.waitForTimeout(2000);
    // 4. Chat Channels List View
    await page.screenshot({ path: path.join(OUT_DIR, 'qa_04_chat_channels.png') });

    // Open #general channel
    const generalChannel = page.locator('text="#general"').first();
    if (await generalChannel.count() > 0) {
        await generalChannel.click();
        await page.waitForTimeout(2000);
        
        // Handle guest name prompt if it appears
        const guestNameInput = page.locator('input[placeholder="Enter your display name"]').first();
        if (await guestNameInput.count() > 0) {
            await guestNameInput.fill('QA Tester');
            await page.locator('button:has-text("Join Chat")').first().click();
            await page.waitForTimeout(2000);
        }

        // 5. General Chat View (Inside channel)
        await page.screenshot({ path: path.join(OUT_DIR, 'qa_05_chat_inside.png') });

        // Highlight attachment button
        const attachBtn = page.locator('button[title="Attach Image or GIF"]').first();
        if (await attachBtn.count() > 0) {
            await attachBtn.screenshot({ path: path.join(OUT_DIR, 'qa_06_attachment_btn.png') });
        }

        // Send a message
        const chatInput = page.locator('input[type="text"]').last();
        if (await chatInput.count() > 0) {
            await chatInput.fill('Hello from QA!');
            await page.locator('button:has(svg)').last().click();
            await page.waitForTimeout(1000);
            
            // Check dropdown physics on the new message
            const chevron = page.locator('svg.wa-message-chevron-icon').last();
            if (await chevron.count() > 0) {
                await chevron.click({ force: true });
                await page.waitForTimeout(1000);
                await page.screenshot({ path: path.join(OUT_DIR, 'qa_07_dropdown_menu.png') });
                await page.mouse.click(0, 0); // close menu
            }
        }
    }
  } else {
    console.log("Could not find 'Student Chats' button");
  }

  // Navigate to Faculty Cabins
  const cabinsTab = page.locator('button:has-text("Faculty Cabins")').first();
  if (await cabinsTab.count() > 0) {
      await cabinsTab.click();
      await page.waitForTimeout(2000);
      // 6. Faculty Cabins View
      await page.screenshot({ path: path.join(OUT_DIR, 'qa_08_faculty_cabins.png') });
  }

  // Navigate to Buy & Sell
  const marketTab = page.locator('button:has-text("Buy & Sell")').first();
  if (await marketTab.count() > 0) {
      await marketTab.click();
      await page.waitForTimeout(2000);
      // 7. Marketplace View
      await page.screenshot({ path: path.join(OUT_DIR, 'qa_09_marketplace.png') });

      // Click Sell Item
      const sellBtn = page.locator('button:has-text("Sell Item")').first();
      if (await sellBtn.count() > 0) {
          await sellBtn.click();
          await page.waitForTimeout(1000);
          // 8. Sell Modal
          await page.screenshot({ path: path.join(OUT_DIR, 'qa_10_sell_modal.png') });
      }
  }

  await browser.close();
  console.log("Exhaustive QA Playwright Script Completed Successfully.");
})();
