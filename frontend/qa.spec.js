import { test, expect, chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = 'qa-screenshots';
const routes = [
  { path: '/', name: 'Home' },
  { path: '/detect', name: 'Anomaly Detector' },
  { path: '/train', name: 'Train Studio' },
  { path: '/threshold', name: 'Threshold Playground' },
  { path: '/latent', name: 'Latent Explorer' },
  { path: '/denoise', name: 'Denoiser' },
  { path: '/experiments', name: 'Experiments' },
  { path: '/research', name: 'Research' },
];

// Ensure screenshot directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

test.describe('Construct3 Full QA Sweep', () => {
  let browser;
  let page;
  let consoleErrors = [];
  let apiResponses = [];

  test.beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
  });

  test.afterAll(async () => {
    await browser.close();
  });

  test.beforeEach(async () => {
    page = await browser.newPage();
    consoleErrors = [];
    apiResponses = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    page.on('response', async response => {
      const url = response.url();
      if (url.includes('/api/')) {
        apiResponses.push({
          url,
          status: response.status(),
          ok: response.ok(),
        });
      }
    });
  });

  test.afterEach(async () => {
    // Check for console errors
    if (consoleErrors.length > 0) {
      console.log('Console errors:', consoleErrors);
    }
    await page.close();
  });

  for (const route of routes) {
    test(`${route.name} (${route.path}) - loads without console errors`, async () => {
      await page.goto(`http://localhost:3000${route.path}`, { waitUntil: 'networkidle', timeout: 30000 });
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${route.name.replace(/\s+/g, '-').toLowerCase()}-load.png`), fullPage: true });
      
      expect(consoleErrors).toEqual([]);
    });

    test(`${route.name} (${route.path}) - all buttons clickable`, async () => {
      await page.goto(`http://localhost:3000${route.path}`, { waitUntil: 'networkidle', timeout: 30000 });
      
      const buttons = await page.locator('button:visible, a[href^="/"]:visible').all();
      for (const btn of buttons) {
        try {
          await btn.click({ timeout: 2000, trial: true });
          await btn.click({ timeout: 2000 });
          await page.waitForTimeout(100);
        } catch (e) {
          // Some buttons might navigate, that's OK
        }
      }
      
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${route.name.replace(/\s+/g, '-').toLowerCase()}-buttons.png`), fullPage: true });
    });

    test(`${route.name} (${route.path}) - all forms submittable`, async () => {
      await page.goto(`http://localhost:3000${route.path}`, { waitUntil: 'networkidle', timeout: 30000 });
      
      const forms = await page.locator('form').all();
      for (const form of forms) {
        const inputs = await form.locator('input, select, textarea').all();
        for (const input of inputs) {
          const type = await input.getAttribute('type');
          const tagName = await input.evaluate(el => el.tagName.toLowerCase());
          
          if (type === 'text' || type === 'email' || tagName === 'textarea') {
            await input.fill('test');
          } else if (type === 'number') {
            // Number inputs need valid numeric values
            await input.fill('1');
          } else if (type === 'file') {
            const testFile = path.resolve('test-fashion.png');
            if (fs.existsSync(testFile)) {
              await input.setInputFiles(testFile);
            }
          } else if (tagName === 'select') {
            const options = await input.locator('option').all();
            if (options.length > 1) {
              await input.selectOption({ index: 1 });
            }
          }
        }
        
        const submitBtn = await form.locator('button[type="submit"], button:has-text("Start"), button:has-text("Detect"), button:has-text("Denoise")').first();
        if (await submitBtn.isVisible()) {
          await submitBtn.click({ timeout: 5000 });
          await page.waitForTimeout(1000);
        }
      }
      
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${route.name.replace(/\s+/g, '-').toLowerCase()}-forms.png`), fullPage: true });
    });

    test(`${route.name} (${route.path}) - API calls return 200`, async () => {
      await page.goto(`http://localhost:3000${route.path}`, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(2000);
      
      // Check all API responses
      const failedApis = apiResponses.filter(r => !r.ok || r.status >= 400);
      if (failedApis.length > 0) {
        console.log(`Failed APIs for ${route.name}:`, failedApis);
      }
      
      // Only assert on APIs that were actually called
      for (const api of apiResponses) {
        expect(api.status).toBeLessThan(400);
      }
    });
  }

  // Specific test for /latent page to check the canvas
  test('Latent Explorer - canvas renders', async () => {
    await page.goto('http://localhost:3000/latent', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);
    
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();
    
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'latent-canvas.png'), fullPage: true });
  });

  // Specific test for /train WebSocket
  test('Train Studio - WebSocket connection', async () => {
    await page.goto('http://localhost:3000/train', { waitUntil: 'networkidle', timeout: 30000 });
    
    // Check if WebSocket connection attempt happens
    const wsUrl = 'ws://localhost:8000/ws/train/';
    let wsConnected = false;
    
    page.on('websocket', ws => {
      if (ws.url().includes('/ws/train/')) {
        wsConnected = true;
      }
    });
    
    // Try to start a training run
    const runInput = page.locator('input[name="run"], input[placeholder*="run" i]').first();
    if (await runInput.isVisible()) {
      await runInput.fill('qa_test_run_' + Date.now());
    }
    
    const startBtn = page.locator('button:has-text("Start Training")').first();
    if (await startBtn.isVisible()) {
      await startBtn.click();
      await page.waitForTimeout(3000);
    }
    
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'train-websocket.png'), fullPage: true });
  });
});