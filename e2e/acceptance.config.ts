import { fileURLToPath } from 'node:url'
import { defineConfig, devices } from '@playwright/test'

// Runs the acceptance criteria (acceptance.spec.ts) in installed Google Chrome, Playwright's Chromium and
// WebKit (Safari's engine), at desktop and phone sizes, across both themes. Firefox is not included: it
// would not launch in the environment these were developed in. It builds into its own folder and serves on
// its own port, so it can run alongside the main suite or a dev server.
const PORT = 4400
const OUT_DIR = 'node_modules/.acceptance-dist'
const desktop = { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } }
const phone = devices['Pixel 7']

export default defineConfig({
  testDir: '.',
  testMatch: 'acceptance.spec.ts',
  outputDir: '../test-results/acceptance',
  fullyParallel: true,
  reporter: [['list'], ['json', { outputFile: '../test-results/acceptance.json' }]],
  use: { baseURL: `http://localhost:${PORT}` },
  projects: [
    { name: 'Chrome, desktop, dark', use: { ...desktop, channel: 'chrome', colorScheme: 'dark' } },
    { name: 'Chrome, phone, light', use: { ...phone, channel: 'chrome', colorScheme: 'light' } },
    { name: 'Chromium, desktop, light', use: { ...desktop, colorScheme: 'light' } },
    { name: 'Chromium, phone, dark', use: { ...phone, colorScheme: 'dark' } },
    { name: 'WebKit, desktop, light', use: { ...devices['Desktop Safari'], viewport: { width: 1440, height: 900 }, colorScheme: 'light' } },
    { name: 'WebKit, iPhone, dark', use: { ...devices['iPhone 13'], colorScheme: 'dark' } },
  ],
  webServer: {
    command: `npx vite build --outDir ${OUT_DIR} --emptyOutDir && npx vite preview --outDir ${OUT_DIR} --port ${PORT} --strictPort`,
    cwd: fileURLToPath(new URL('..', import.meta.url)),
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
  },
})
