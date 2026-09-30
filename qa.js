const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  console.log("=== EMPLOYEE QA ===");
  
  // 1. Login with Invalid PIN
  console.log("1. Testing invalid employee login");
  await page.goto('http://localhost:3001/');
  await page.type('input[placeholder="e.g. EMP001"]', 'EMP001');
  await page.type('input[placeholder="Enter your 4-digit PIN"]', '9999');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);
  
  // 2. Login with Valid PIN
  console.log("2. Testing valid employee login");
  await page.goto('http://localhost:3001/');
  // clear inputs
  await page.evaluate(() => {
    document.querySelectorAll('input').forEach(i => i.value = '');
  });
  await page.type('input[placeholder="e.g. EMP001"]', 'EMP001');
  await page.type('input[placeholder="Enter your 4-digit PIN"]', '1234');
  await page.click('button[type="submit"]');
  await page.waitForNavigation();
  console.log("Current URL:", page.url());
  
  // 3. Access Control
  console.log("3. Testing access control to /admin");
  await page.goto('http://localhost:3001/admin');
  await page.waitForTimeout(2000);
  console.log("URL after trying to access /admin:", page.url());

  // Wait before continuing
  console.log("Done checking employee auth");

  await browser.close();
})();
