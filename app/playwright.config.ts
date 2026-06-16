import { defineConfig } from '@playwright/test'

// e2e against the dev server using the system Chrome (no browser download).
// Start the dev server yourself (npm run dev) or let Playwright start it.
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3311',
    channel: 'chrome',
    headless: true,
    actionTimeout: 15_000,
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3311',
    reuseExistingServer: true,
    timeout: 180_000,
  },
})
