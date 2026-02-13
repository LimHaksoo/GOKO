import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e', // e2e 폴더에 테스트를 둔다고 가정
  use: {
    baseURL: 'http://localhost:5173',
  },
  webServer: {
    // 웹 앱이 apps/web에 있다면 이대로, 아니면 경로만 맞춰주세요.
    command: 'pnpm -C apps/web dev --host --port 5173',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
