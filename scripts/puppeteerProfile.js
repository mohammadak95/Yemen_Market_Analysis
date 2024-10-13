//scripts/puppeteerProfile.js

const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  // Enable JavaScript coverage to analyze page performance
  await page.coverage.startJSCoverage();
  
  // Navigate to your local development instance
  await page.goto('http://localhost:3000');

  // Perform actions to trigger component renders
  await page.click('button[data-testid="fetch-button"]'); // Example action

  // Stop JS coverage and get the results
  const jsCoverage = await page.coverage.stopJSCoverage();
  console.log(jsCoverage);

  await browser.close();
})();
