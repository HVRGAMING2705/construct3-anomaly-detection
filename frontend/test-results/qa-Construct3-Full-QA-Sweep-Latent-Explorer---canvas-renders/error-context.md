# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: qa.spec.js >> Construct3 Full QA Sweep >> Latent Explorer - canvas renders
- Location: qa.spec.js:148:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('canvas')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" locator('canvas') with timeout 5000ms
  - waiting for locator('canvas')

```

```yaml
- complementary:
  - img
  - text: Construct3
  - navigation "Main navigation":
    - list:
      - listitem:
        - link "Home":
          - /url: /
          - img
          - text: Home
      - listitem:
        - link "Train Studio":
          - /url: /train
          - img
          - text: Train Studio
      - listitem:
        - link "Anomaly Detector":
          - /url: /detect
          - img
          - text: Anomaly Detector
      - listitem:
        - link "Threshold Playground":
          - /url: /threshold
          - img
          - text: Threshold Playground
      - listitem:
        - link "Latent Explorer":
          - /url: /latent
          - img
          - text: Latent Explorer
      - listitem:
        - link "Denoiser":
          - /url: /denoise
          - img
          - text: Denoiser
      - listitem:
        - link "Experiments":
          - /url: /experiments
          - img
          - text: Experiments
      - listitem:
        - link "Research":
          - /url: /research
          - img
          - text: Research
  - link "GitHub":
    - /url: https://github.com
    - img
    - text: GitHub
  - link "Paper":
    - /url: "#paper"
    - img
    - text: Paper
- banner:
  - img
  - text: Search... ⌘K
  - button "Switch to dark mode":
    - img
  - button "Open command palette":
    - img
    - text: Command Palette ⌘K
- main:
  - heading "Latent Explorer" [level=1]
  - paragraph: Visualize 2D projections of the bottleneck latent space using PCA or t-SNE
  - heading "Model Selection" [level=2]
  - text: Model
  - combobox [disabled]
  - text: Projection Method
  - radio "pca Linear, fast" [checked]
  - text: pca Linear, fast
  - radio "tsne Non-linear, preserves local structure"
  - text: tsne Non-linear, preserves local structure
  - heading "Controls" [level=4]
  - button "Reset View":
    - img
    - text: Reset View
  - text: "Zoom:"
  - button:
    - img
  - button:
    - img
  - text: 100%
  - heading "Statistics" [level=2]
  - img
  - heading "No data loaded" [level=3]
  - paragraph: Select a model to visualize latent space
```

# Test source

```ts
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
  72  |       expect(consoleErrors).toEqual([]);
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
> 153 |     await expect(canvas).toBeVisible();
      |                          ^ Error: expect(locator).toBeVisible() failed
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
  173 |     const runInput = page.locator('input[name="run"], input[placeholder*="run" i]').first();
  174 |     if (await runInput.isVisible()) {
  175 |       await runInput.fill('qa_test_run_' + Date.now());
  176 |     }
  177 |     
  178 |     const startBtn = page.locator('button:has-text("Start Training")').first();
  179 |     if (await startBtn.isVisible()) {
  180 |       await startBtn.click();
  181 |       await page.waitForTimeout(3000);
  182 |     }
  183 |     
  184 |     await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'train-websocket.png'), fullPage: true });
  185 |   });
  186 | });
```