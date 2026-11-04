import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npx vite build && npx vite preview --port 3000 --strictPort',
    url: 'http://localhost:3000',
    reuseExistingServer: false,
    timeout: 180_000,
    env: { E2E: '1', API_DELAY_MS: '50' },
  },
})
