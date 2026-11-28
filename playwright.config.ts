import { defineConfig, devices } from '@playwright/test';

const preview = process.env.E2E_PREVIEW === '1';
const channel = process.platform === 'win32' ? 'msedge' : undefined;
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:5178', trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], channel } },
    { name: 'mobile', use: { ...devices['Desktop Chrome'], channel, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
  webServer: {
    command: preview ? 'npm run preview -- --port 5178' : 'npm run dev -- --port 5178',
    url: 'http://127.0.0.1:5178',
    reuseExistingServer: false,
    timeout: 60000,
  },
});
