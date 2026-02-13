// e2e/app.spec.ts
import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
  await page.goto('/');                 // webServer/baseURL 기준
  await expect(page).toHaveTitle(/GOKO/i);
});
