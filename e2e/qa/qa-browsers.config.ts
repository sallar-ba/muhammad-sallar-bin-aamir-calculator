// The independent QA suite (e2e/qa/*.spec.ts) in Chromium (desktop and Pixel 7), WebKit (desktop Safari and
// iPhone 13) and Firefox. Needs: npx playwright install chromium webkit firefox
// Run: npm run test:qa   (or: npx playwright test -c e2e/qa/qa-browsers.config.ts --project=chromium-desktop)
import { defineConfig, devices } from '@playwright/test'

const PORT = 4322

export default defineConfig({
  testDir: '.',
  testMatch: 'qa-*.spec.ts',
  outputDir: '../../test-results/qa-browsers',
  fullyParallel: true,
  reporter: 'list',
  use: { baseURL: `http://localhost:${PORT}`, trace: 'retain-on-failure' },
  projects: [
    { name: 'chromium-desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'chromium-pixel7', use: { ...devices['Pixel 7'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'], viewport: { width: 1440, height: 900 } } },
    { name: 'webkit', use: { ...devices['Desktop Safari'], viewport: { width: 1440, height: 900 } } },
    { name: 'iphone-webkit', use: { ...devices['iPhone 13'] } },
  ],
  webServer: {
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    cwd: '../..',
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
  },
})
