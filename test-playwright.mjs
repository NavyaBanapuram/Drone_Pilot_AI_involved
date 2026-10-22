import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => {
    console.log(`BROWSER CONSOLE: ${msg.type()} - ${msg.text()}`);
  });
  page.on('pageerror', error => {
    console.log(`BROWSER ERROR: ${error.message}`);
  });

  await page.goto('http://localhost:3000/configure?drone=hexacopter');
  
  // Wait for the app to load
  await page.waitForTimeout(3000);
  
  // Find the save button and click it
  console.log("Clicking save button...");
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const saveBtn = btns.find(b => b.textContent && b.textContent.includes('SAVE CONFIGURATION'));
    if (saveBtn) saveBtn.click();
    else console.log("SAVE BUTTON NOT FOUND");
  });
  
  // Wait for network/firebase
  await page.waitForTimeout(5000);
  
  await browser.close();
})();
