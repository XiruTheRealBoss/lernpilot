import assert from 'node:assert/strict';
import { test } from 'node:test';
import { chromium } from '@playwright/test';
import { createTestAccount, deleteTestAccount, localDatabaseConfig, verifyFixtureRemoval, type TestAccount } from '../database/local-fixtures.ts';

for (const [label, viewport] of [['desktop', { width: 1280, height: 900 }], ['mobile', { width: 390, height: 844 }]] as const) {
  test(`real browser -> API -> database: ${label}`, { timeout: 120_000 }, async () => {
    const config = localDatabaseConfig();
    const accounts: TestAccount[] = [];
    const browser = await chromium.launch({ channel: 'msedge', headless: true });
    let step = 'fixture setup';
    try {
      const a = await createTestAccount(config, `browser-${label}-a`); accounts.push(a);
      const b = await createTestAccount(config, `browser-${label}-b`); accounts.push(b);
      const contextA = await browser.newContext({ viewport });
      const contextB = await browser.newContext({ viewport });
      const external: string[] = [];
      const pageErrors: string[] = [];
      for (const context of [contextA, contextB]) {
        await context.route('**/*', async route => {
          const url = new URL(route.request().url());
          if (url.hostname !== '127.0.0.1') { external.push(url.origin); await route.abort(); }
          else await route.continue();
        });
      }
      const pageA = await contextA.newPage(); const pageB = await contextB.newPage();
      for (const page of [pageA, pageB]) page.on('pageerror', error => pageErrors.push(error.name));
      async function login(page: typeof pageA, account: TestAccount) {
        await page.goto('http://127.0.0.1:5174/account');
        await page.locator('#account-email').fill(account.email);
        await page.locator('#account-password').fill(account.password);
        await page.getByRole('button', { name: 'Entrar', exact: true }).click();
        await page.getByRole('region', { name: 'Área protegida' }).waitFor();
      }
      step = 'login A'; await login(pageA, a);
      const titleA = `Fiktive Browseraufgabe A ${label}`;
      step = 'create A';
      await pageA.locator('#task-title').fill(titleA);
      await pageA.getByRole('button', { name: 'Criar tarefa', exact: true }).click();
      await pageA.getByText(titleA, { exact: true }).waitFor();
      const owned = await a.client.from('tasks').select('id,title,completed_at').eq('title', titleA);
      assert.equal(owned.error, null); assert.equal(owned.data?.length, 1);
      step = 'complete A';
      const completed = pageA.waitForResponse(response => response.request().method() === 'PATCH' && new URL(response.url()).pathname.startsWith('/api/v1/tasks/'));
      await pageA.getByRole('checkbox').click();
      assert.equal((await completed).status(), 200);
      await pageA.waitForFunction(() => {
        const checkbox = document.querySelector('input[type=checkbox]') as HTMLInputElement | null;
        return checkbox?.checked && !checkbox.disabled;
      });
      assert.ok((await a.client.from('tasks').select('completed_at').eq('id', owned.data![0].id).single()).data?.completed_at);
      step = 'login B'; await login(pageB, b);
      assert.equal(await pageB.getByText(titleA, { exact: true }).count(), 0);
      const titleB = `Fiktive Browseraufgabe B ${label}`;
      await pageB.locator('#task-title').fill(titleB);
      await pageB.getByRole('button', { name: 'Criar tarefa', exact: true }).click();
      await pageB.getByText(titleB, { exact: true }).waitFor();
      assert.equal(await pageA.getByText(titleB, { exact: true }).count(), 0);
      step = 'session reload'; await pageA.reload();
      await pageA.getByText(titleA, { exact: true }).waitFor();
      const cookies = await contextA.cookies();
      assert.ok(cookies.some(cookie => cookie.name === 'lp_local_session' && cookie.httpOnly && cookie.sameSite === 'Strict'));
      assert.equal(await pageA.evaluate(() => Object.keys(localStorage).some(key => /token|session|supabase/i.test(key))), false);
      assert.equal(await pageA.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await pageA.screenshot({ path: `artifacts/phase2/live-account-${label}.png`, fullPage: true });
      step = 'delete A';
      await pageA.getByRole('button', { name: `Excluir ${titleA}`, exact: true }).click();
      await pageA.getByText(titleA, { exact: true }).waitFor({ state: 'detached' });
      assert.deepEqual((await a.client.from('tasks').select('id').eq('id', owned.data![0].id)).data, []);
      step = 'logout A';
      const loggedOut = pageA.waitForResponse(response => new URL(response.url()).pathname === '/api/v1/auth/logout');
      await pageA.getByRole('button', { name: 'Sair', exact: true }).click();
      assert.equal((await loggedOut).status(), 200);
      await pageA.getByRole('region', { name: 'Autenticação de teste' }).waitFor();
      await pageA.reload(); await pageA.getByRole('region', { name: 'Autenticação de teste' }).waitFor();
      assert.equal(await pageB.getByText(titleB, { exact: true }).count(), 1);
      assert.deepEqual(external, []); assert.deepEqual(pageErrors, []);
    } catch {
      // Never expose Playwright fill arguments (synthetic passwords) in errors or traces.
      throw new Error(`Local ${label} browser verification failed during ${step}.`);
    } finally {
      await browser.close();
      const cleanup = await Promise.allSettled(accounts.map(async account => {
        await deleteTestAccount(config, account); await verifyFixtureRemoval(config, account.id);
      }));
      assert.ok(cleanup.every(result => result.status === 'fulfilled'), 'Synthetic browser fixture cleanup failed.');
    }
  });
}
