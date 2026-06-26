import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.type(), msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  
  try {
    await page.goto('http://localhost:8081', { waitUntil: 'networkidle' });
    console.log('Page loaded successfully');
  } catch (err) {
    console.error('Failed to load page:', err);
  }
  
  await browser.close();
})();
