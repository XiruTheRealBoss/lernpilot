import { test, expect } from '@playwright/test';

test('isolated demo works across tabs without external requests or credentials', async ({ page }, testInfo) => {
  const external: string[] = [];
  const dataRequests: string[] = [];
  const errors: string[] = [];
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.startsWith('/api/') || url.port === '54321') dataRequests.push(`${url.origin}${url.pathname}`);
    if (url.hostname !== '127.0.0.1' && url.hostname !== 'localhost') {
      external.push(url.origin);
      await route.abort();
    } else await route.continue();
  });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('seeded-test')) {
      localStorage.setItem('lernpilot_access_token', 'synthetic-expired-token');
      sessionStorage.setItem('lyr_sess', 'synthetic-session');
      sessionStorage.setItem('seeded-test', 'yes');
    }
  });
  await page.goto('/?demo&profile=demo-a');
  await expect(page.getByText('Demonstração isolada — somente dados fictícios')).toBeVisible();
  await page.getByRole('button', { name: /^Sem data / }).click();
  await expect(page.getByText('Projeto de Física - Movimento Uniforme', { exact: true })).toBeVisible();
  await page.screenshot({ path: `artifacts/demo-${testInfo.project.name}.png`, fullPage: true });
  expect(await page.evaluate(() => localStorage.getItem('lernpilot_access_token'))).toBeNull();
  expect(await page.evaluate(() => sessionStorage.getItem('lyr_sess'))).toBeNull();
  await page.getByRole('button', { name: 'Notas', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Notas · demonstração isolada' })).toBeVisible();
  await page.screenshot({ path: `artifacts/grades-${testInfo.project.name}.png`, fullPage: true });
  await expect(page.locator('input[type=password]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Ano', exact: true }).click();
  await expect(page.getByText(/estimativa parcial/)).toBeVisible();
  await page.getByRole('button', { name: 'Provas', exact: true }).click();
  await page.getByRole('button', { name: 'Marcar prova' }).click();
  await page.getByLabel('Matéria', { exact: true }).fill('Prova fictícia A');
  await page.getByLabel('Data', { exact: true }).fill('2026-12-10');
  await page.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Prova fictícia A' })).toBeVisible();
  await page.getByLabel('Perfil fictício').selectOption('demo-b');
  await page.getByRole('button', { name: 'Provas', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Prova fictícia A' })).toHaveCount(0);
  await page.getByLabel('Perfil fictício').selectOption('demo-a');
  await page.getByRole('button', { name: 'Provas', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Prova fictícia A' })).toBeVisible();
  await page.getByRole('button', { name: 'Professores', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Professores', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Privacidade', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Privacidade na demonstração' })).toBeVisible();
  expect(external).toEqual([]);
  expect(dataRequests).toEqual([]);
  expect(errors).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('home preserves status, calendar, task notes and profile isolation', async ({ page }, testInfo) => {
  const external: string[] = [];
  const dataRequests: string[] = [];
  const errors: string[] = [];
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.startsWith('/api/') || url.port === '54321') dataRequests.push(`${url.origin}${url.pathname}`);
    if (!['127.0.0.1', 'localhost'].includes(url.hostname)) {
      external.push(url.origin);
      await route.abort();
    } else await route.continue();
  });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/?demo&profile=demo-a');
  await expect(page.getByRole('region', { name: 'Painel de estudos de demonstração' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Dias de estudo' }).getByRole('button')).toHaveCount(7);
  await page.getByLabel('Status da tarefa').selectOption('sem_data');
  await page.getByRole('button', { name: /^Sem data / }).click();
  const title = 'Projeto de Física - Movimento Uniforme';
  const details = () => page.getByRole('button', { name: `Detalhes de "${title}"` });
  await details().click();
  await page.getByLabel(`Anotação de "${title}"`).fill('Somente anotação fictícia A');
  await page.getByRole('button', { name: 'Calendário', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Calendário semanal' })).toBeVisible();
  await expect(details()).toBeVisible();
  await page.screenshot({ path: `artifacts/home-${testInfo.project.name}.png`, fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByLabel('Perfil fictício').selectOption('demo-b');
  await page.getByRole('button', { name: /^Sem data / }).click();
  await details().click();
  await expect(page.getByLabel(`Anotação de "${title}"`)).toHaveValue('');
  await page.getByLabel('Perfil fictício').selectOption('demo-a');
  await page.getByRole('button', { name: /^Sem data / }).click();
  await expect(page.getByLabel(`Anotação de "${title}"`)).toHaveValue('Somente anotação fictícia A');
  await page.getByLabel('Status da tarefa').selectOption('atrasado');
  await expect(details()).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Detalhes de "Lista de exercícios - Equações de 2º grau"' })).toBeVisible();
  expect(external).toEqual([]);
  expect(dataRequests).toEqual([]);
  expect(errors).toEqual([]);
});

test('home week selection, focus completion and exam shortcut keep working', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?demo&profile=demo-a');
  const days = page.getByRole('navigation', { name: 'Dias de estudo' }).getByRole('button');
  await days.nth(1).click();
  await expect(days.nth(1)).toHaveAttribute('aria-pressed', 'true');
  await expect(days.nth(0)).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByRole('region', { name: 'Lições de Amanhã' })).toBeVisible();
  const title = 'Lista de exercícios - Equações de 2º grau';
  await page.getByRole('button', { name: `Concluir "${title}"` }).click();
  const completedGroup = page.getByRole('button', { name: /^Feitas / });
  await completedGroup.click();
  const checkbox = page.getByRole('checkbox', { name: `Marcar "${title}" como feita` });
  await expect(checkbox).toBeChecked();
  await checkbox.uncheck();
  await expect(page.getByRole('button', { name: `Concluir "${title}"` })).toBeVisible();
  await expect(page.getByRole('progressbar', { name: 'Progresso de hoje' })).toHaveAttribute('aria-valuenow', '0');
  await page.screenshot({ path: `artifacts/home-focus-${testInfo.project.name}.png`, fullPage: true });
  await page.getByRole('button', { name: /^Estudar para / }).click();
  await expect(page.getByRole('heading', { name: 'Próximas provas' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('direct legacy paths fail closed, including without demo query', async ({ page, request }) => {
  await page.goto('/');
  await expect(page.getByText('Demonstração isolada — somente dados fictícios')).toBeVisible();
  for (const path of ['/api/login', '/api/boletim']) {
    const response = await request.post(path, { data: { username: 'synthetic', password: 'synthetic' } });
    expect(response.status()).toBe(410);
    expect(await response.json()).toMatchObject({ code: 'INTEGRATION_DISABLED' });
  }
  await page.goto('/notas.html');
  await expect(page.locator('input[type=password]')).toHaveCount(0);
  await expect(page.getByRole('link')).toHaveAttribute('href', '/?demo');
});
