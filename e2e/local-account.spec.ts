import { expect, test } from '@playwright/test';

test('unconfigured local account stays closed and returns to the isolated demo', async ({ page }, testInfo) => {
  const external: string[] = [];
  const errors: string[] = [];
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (!['127.0.0.1', 'localhost'].includes(url.hostname)) {
      external.push(url.origin); await route.abort();
    } else await route.continue();
  });
  page.on('pageerror', error => errors.push(error.message));
  const blocked = page.waitForResponse(response => response.url().endsWith('/api/v1/auth/me'));
  await page.goto('/account');
  expect((await blocked).status()).toBe(503);
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Área protegida' })).toHaveCount(0);
  await expect(page.getByLabel('E-mail fictício terminado em .test')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: `artifacts/account-unconfigured-${testInfo.project.name}.png`, fullPage: true });
  await page.getByRole('link', { name: 'Abrir demonstração offline separada' }).click();
  await expect(page.getByText('Demonstração isolada — somente dados fictícios')).toBeVisible();
  await expect(page.locator('input[type=password]')).toHaveCount(0);
  expect(external).toEqual([]);
  expect(errors).toEqual([]);
});
