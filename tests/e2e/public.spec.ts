import { test, expect } from '@playwright/test';
test('public navigation, honest pricing, and documentation', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('already fixed');
  await page.getByRole('link', { name: 'Pricing', exact: true }).first().click();
  await expect(page.getByText('Checkout is not available.')).toHaveCount(2);
  await page.getByRole('link', { name: 'Documentation', exact: true }).first().click();
  await expect(page.getByRole('heading', { name: 'Install your widget' })).toBeVisible();
});
test('protected dashboard and export API deny unauthenticated requests', async ({ page, request }) => {
  await page.goto('/dashboard/reports');
  await expect(page).toHaveURL(/\/(login|setup)$/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  expect([401, 503]).toContain((await request.get('/api/reports/export')).status());
  const preflight = await request.fetch('/api/widget/config', {
    method: 'OPTIONS',
    headers: { origin: 'https://app.example.com' },
  });
  expect(preflight.status()).toBe(204);
  expect(preflight.headers()['access-control-allow-origin']).toBe('https://app.example.com');
});
test('signup validation does not submit an invalid account', async ({ page }) => {
  await page.goto('/signup');
  await page.getByRole('button', { name: 'Create your account' }).click();
  await expect(page.getByRole('textbox', { name: 'Full name' })).toBeFocused();
  await expect(page).toHaveURL(/signup/);
});
test('mobile landing and demo have no horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of ['/', '/pricing', '/docs', '/demo']) {
    await page.goto(path);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  }
  await page.getByRole('button', { name: 'Try reporting a bug' }).click();
  await expect(page.getByRole('status')).toBeVisible();
});
test('SDK rejects hostile messages and remains keyboard usable', async ({ page, request }) => {
  expect(
    (await request.get('/api/widget/config?key=invalid&origin=http://localhost')).status(),
  ).toBe(400);
  expect(
    (
      await request.get(
        '/api/widget/config?key=bs_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa&origin=not-an-origin',
      )
    ).status(),
  ).toBe(400);
  await page.route('**/api/widget/config?**', (route) =>
    route.fulfill({
      json: {
        token: 'test-capability',
        label: 'Report a bug',
        accent: '#6554e8',
        position: 'bottom-right',
      },
    }),
  );
  await page.goto('/demo?key=bs_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
  const launcher = page.locator('#bugsnap-widget').getByRole('button', { name: 'Report a bug' });
  await expect(launcher).toBeVisible();
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = '/widget.js';
        script.dataset.projectKey = 'bs_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Second SDK load failed'));
        document.body.append(script);
      }),
  );
  await expect(page.locator('#bugsnap-widget')).toHaveCount(1);
  await launcher.click();
  await expect(launcher).toHaveAttribute('aria-expanded', 'true');
  await page.evaluate(() =>
    window.postMessage({ protocol: 'bugsnap:v1', type: 'close', channel: 'evil' }, location.origin),
  );
  await expect(launcher).toHaveAttribute('aria-expanded', 'true');
  await launcher.focus();
  await page.keyboard.press('Escape');
  await expect(launcher).toHaveAttribute('aria-expanded', 'false');
});
