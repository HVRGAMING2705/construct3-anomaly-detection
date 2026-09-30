# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: qa.spec.js >> Construct3 Full QA Sweep >> Threshold Playground (/threshold) - loads without console errors
- Location: qa.spec.js:68:5

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  - 1
+ Received  + 4

- Array []
+ Array [
+   "Failed to load resource: the server responded with a status of 500 (Internal Server Error)",
+   "Failed to load resource: the server responded with a status of 500 (Internal Server Error)",
+ ]
```

# Test source

```ts
  1   | import { test, expect, chromium } from '@playwright/test';
  2   | import fs from 'fs';
  3   | import path from 'path';
  4   | 
  5   | const SCREENSHOT_DIR = 'qa-screenshots';
  6   | const routes = [
  7   |   { path: '/', name: 'Home' },
  8   |   { path: '/detect', name: 'Anomaly Detector' },
  9   |   { path: '/train', name: 'Train Studio' },
  10  |   { path: '/threshold', name: 'Threshold Playground' },
  11  |   { path: '/latent', name: 'Latent Explorer' },
  12  |   { path: '/denoise', name: 'Denoiser' },
  13  |   { path: '/experiments', name: 'Experiments' },
  14  |   { path: '/research', name: 'Research' },
  15  | ];
  16  | 
  17  | // Ensure screenshot directory exists
  18  | if (!fs.existsSync(SCREENSHOT_DIR)) {
  19  |   fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  20  | }
  21  | 
  22  | test.describe('Construct3 Full QA Sweep', () => {
  23  |   let browser;
  24  |   let page;
  25  |   let consoleErrors = [];
  26  |   let apiResponses = [];
  27  | 
  28  |   test.beforeAll(async () => {
  29  |     browser = await chromium.launch({ headless: true });
  30  |   });
  31  | 
  32  |   test.afterAll(async () => {
  33  |     await browser.close();
  34  |   });
  35  | 
  36  |   test.beforeEach(async () => {
  37  |     page = await browser.newPage();
  38  |     consoleErrors = [];
  39  |     apiResponses = [];
  40  | 
  41  |     page.on('console', msg => {
  42  |       if (msg.type() === 'error') {
  43  |         consoleErrors.push(msg.text());
  44  |       }
  45  |     });
  46  | 
  47  |     page.on('response', async response => {
  48  |       const url = response.url();
  49  |       if (url.includes('/api/')) {
  50  |         apiResponses.push({
  51  |           url,
  52  |           status: response.status(),
  53  |           ok: response.ok(),
  54  |         });
  55  |       }
  56  |     });
  57  |   });
  58  | 
  59  |   test.afterEach(async () => {
  60  |     // Check for console errors
  61  |     if (consoleErrors.length > 0) {
  62  |       console.log('Console errors:', consoleErrors);
  63  |     }
  64  |     await page.close();
  65  |   });
  66  | 
  67  |   for (const route of routes) {
  68  |     test(`${route.name} (${route.path}) - loads without console errors`, async () => {
  69  |       await page.goto(`http://localhost:3000${route.path}`, { waitUntil: 'networkidle', timeout: 30000 });
  70  |       await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${route.name.replace(/\s+/g, '-').toLowerCase()}-load.png`), fullPage: true });
  71  |       
> 72  |       expect(consoleErrors).toEqual([]);
      |                             ^ Error: expect(received).toEqual(expected) // deep equality
  73  |     });
  74  | 
  75  |     test(`${route.name} (${route.path}) - all buttons clickable`, async () => {
  76  |       await page.goto(`http://localhost:3000${route.path}`, { waitUntil: 'networkidle', timeout: 30000 });
  77  |       
  78  |       const buttons = await page.locator('button:visible, a[href^="/"]:visible').all();
  79  |       for (const btn of buttons) {
  80  |         try {
  81  |           await btn.click({ timeout: 2000, trial: true });
  82  |           await btn.click({ timeout: 2000 });
  83  |           await page.waitForTimeout(100);
  84  |         } catch (e) {
  85  |           // Some buttons might navigate, that's OK
  86  |         }
  87  |       }
  88  |       
  89  |       await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${route.name.replace(/\s+/g, '-').toLowerCase()}-buttons.png`), fullPage: true });
  90  |     });
  91  | 
  92  |     test(`${route.name} (${route.path}) - all forms submittable`, async () => {
  93  |       await page.goto(`http://localhost:3000${route.path}`, { waitUntil: 'networkidle', timeout: 30000 });
  94  |       
  95  |       const forms = await page.locator('form').all();
  96  |       for (const form of forms) {
  97  |         const inputs = await form.locator('input, select, textarea').all();
  98  |         for (const input of inputs) {
  99  |           const type = await input.getAttribute('type');
  100 |           const tagName = await input.evaluate(el => el.tagName.toLowerCase());
  101 |           
  102 |           if (type === 'text' || type === 'email' || tagName === 'textarea') {
  103 |             await input.fill('test');
  104 |           } else if (type === 'number') {
  105 |             // Number inputs need valid numeric values
  106 |             await input.fill('1');
  107 |           } else if (type === 'file') {
  108 |             const testFile = path.resolve('test-fashion.png');
  109 |             if (fs.existsSync(testFile)) {
  110 |               await input.setInputFiles(testFile);
  111 |             }
  112 |           } else if (tagName === 'select') {
  113 |             const options = await input.locator('option').all();
  114 |             if (options.length > 1) {
  115 |               await input.selectOption({ index: 1 });
  116 |             }
  117 |           }
  118 |         }
  119 |         
  120 |         const submitBtn = await form.locator('button[type="submit"], button:has-text("Start"), button:has-text("Detect"), button:has-text("Denoise")').first();
  121 |         if (await submitBtn.isVisible()) {
  122 |           await submitBtn.click({ timeout: 5000 });
  123 |           await page.waitForTimeout(1000);
  124 |         }
  125 |       }
  126 |       
  127 |       await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${route.name.replace(/\s+/g, '-').toLowerCase()}-forms.png`), fullPage: true });
  128 |     });
  129 | 
  130 |     test(`${route.name} (${route.path}) - API calls return 200`, async () => {
  131 |       await page.goto(`http://localhost:3000${route.path}`, { waitUntil: 'networkidle', timeout: 30000 });
  132 |       await page.waitForTimeout(2000);
  133 |       
  134 |       // Check all API responses
  135 |       const failedApis = apiResponses.filter(r => !r.ok || r.status >= 400);
  136 |       if (failedApis.length > 0) {
  137 |         console.log(`Failed APIs for ${route.name}:`, failedApis);
  138 |       }
  139 |       
  140 |       // Only assert on APIs that were actually called
  141 |       for (const api of apiResponses) {
  142 |         expect(api.status).toBeLessThan(400);
  143 |       }
  144 |     });
  145 |   }
  146 | 
  147 |   // Specific test for /latent page to check the canvas
  148 |   test('Latent Explorer - canvas renders', async () => {
  149 |     await page.goto('http://localhost:3000/latent', { waitUntil: 'networkidle', timeout: 30000 });
  150 |     await page.waitForTimeout(3000);
  151 |     
  152 |     const canvas = page.locator('canvas');
  153 |     await expect(canvas).toBeVisible();
  154 |     
  155 |     await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'latent-canvas.png'), fullPage: true });
  156 |   });
  157 | 
  158 |   // Specific test for /train WebSocket
  159 |   test('Train Studio - WebSocket connection', async () => {
  160 |     await page.goto('http://localhost:3000/train', { waitUntil: 'networkidle', timeout: 30000 });
  161 |     
  162 |     // Check if WebSocket connection attempt happens
  163 |     const wsUrl = 'ws://localhost:8000/ws/train/';
  164 |     let wsConnected = false;
  165 |     
  166 |     page.on('websocket', ws => {
  167 |       if (ws.url().includes('/ws/train/')) {
  168 |         wsConnected = true;
  169 |       }
  170 |     });
  171 |     
  172 |     // Try to start a training run
```