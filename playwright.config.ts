import { defineConfig, devices } from '@playwright/test'

const PORT = 4321

// End-to-end tests run against the production build, in Chromium, at desktop and phone sizes.
export default defineConfig({
  testDir: 'e2e',
  testIgnore: '**/qa/**', // the independent QA suite runs separately: npm run test:qa
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
  },
})
