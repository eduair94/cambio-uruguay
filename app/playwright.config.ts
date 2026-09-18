import { defineConfig } from '@playwright/test'

// e2e using the system Chrome (no browser download).
//
// Locally it drives the dev server: start it yourself (npm run dev) or let Playwright start it.
//
// CI sets E2E_PROD_SERVER=1 and builds first, so the suite runs against `node .output/server/index.mjs`
// — what people actually get. The dev server compiles every route on its first visit, and on a CI
// runner that cold compile outgrew both vite-node's hardcoded 10 s module-request timeout and the
// 60 s test timeout: 50 of 251 tests went red on 2026-09-18 with the site healthy in production, and
// the half-rendered pages that timeout leaves behind were indistinguishable from real regressions.
const prodServer = process.env.E2E_PROD_SERVER === '1'
const baseURL = process.env.E2E_BASE_URL || 'http://localhost:3311'

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL,
    channel: 'chrome',
    headless: true,
    actionTimeout: 15_000,
  },
  webServer: {
    command: prodServer ? 'node .output/server/index.mjs' : 'npm run dev',
    url: baseURL,
    reuseExistingServer: true,
    timeout: 180_000,
    env: prodServer ? { PORT: '3311', NITRO_PORT: '3311' } : undefined,
  },
})
