import { test, expect } from '@playwright/test';
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
test.describe('real local Supabase workflow', () => {
  test.skip(
    process.env.E2E_BACKEND !== '1',
    'Set E2E_BACKEND=1 with local Supabase to exercise real persistence.',
  );
  test('signup → workspace → project → external screenshot report → triage → private access', async ({
    page,
    browser,
    request,
  }) => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    expect(['localhost', '127.0.0.1']).toContain(new URL(url).hostname);
    const headers = {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
      Authorization: 'Bearer ' + process.env.SUPABASE_SERVICE_ROLE_KEY!,
      'Content-Type': 'application/json',
    };
    const api = async (path: string, options: RequestInit = {}) => {
      const response = await fetch(url + path, { ...options, headers });
      expect(response.ok).toBe(true);
      return response.json();
    };
    const emailLink = async (email: string, type: string) => {
      let id: string | undefined;
      await expect
        .poll(
          async () => {
            const mailbox = await fetch('http://127.0.0.1:54324/api/v1/messages').then((r) =>
              r.json(),
            );
            for (const message of mailbox.messages) {
              if (!message.To.some((to: { Address: string }) => to.Address === email)) continue;
              const detail = await fetch(
                'http://127.0.0.1:54324/api/v1/message/' + message.ID,
              ).then((r) => r.json());
              const links = [...detail.HTML.matchAll(/href="([^"]+)"/g)].map(
                (m: RegExpMatchArray) => m[1].replaceAll('&amp;', '&'),
              );
              const link = links.find(
                (v: string) =>
                  v.startsWith(url + '/auth/v1/verify') &&
                  new URL(v).searchParams.get('type') === type,
              );
              if (link) {
                id = link;
                break;
              }
            }
            return !!id;
          },
          { timeout: 15000 },
        )
        .toBe(true);
      return id!;
    };
    const email = `e2e-${Date.now()}@example.test`,
      password = randomBytes(18).toString('base64url');
    await page.goto('/signup');
    await page.getByRole('textbox', { name: 'Full name' }).fill('Taylor Engineer');
    await page.getByRole('textbox', { name: 'Work email' }).fill(email);
    await page.getByLabel(/^Password/).fill(password);
    await page.getByRole('button', { name: 'Create your account' }).click();
    await expect(page.getByRole('status')).toContainText('Check your email');
    await page.goto(await emailLink(email, 'signup'));
    await expect(page).toHaveURL(/onboarding/);
    await page.goto('/login');
    await page.getByRole('textbox', { name: 'Work email' }).fill(email);
    await page.getByLabel(/^Password/).fill(password);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page).toHaveURL(/onboarding/);
    await page.getByRole('textbox', { name: 'Workspace name' }).fill('E2E Studio');
    await page.getByRole('button', { name: 'Create workspace' }).click();
    await expect(page).toHaveURL(/projects\/new/);
    await page.getByRole('textbox', { name: 'Project name' }).fill('External Checkout');
    await page.getByRole('textbox', { name: /^Slug/ }).fill('checkout');
    await page
      .getByRole('combobox', { name: 'Environment', exact: true })
      .selectOption('development');
    await page
      .getByRole('textbox', { name: 'Authorized origins' })
      .fill('http://127.0.0.1:3210\nhttp://127.0.0.1:3211');
    await page.getByRole('button', { name: 'Create project', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'External Checkout', exact: true }),
    ).toBeVisible();
    const project = {
      data: (
        await api(
          '/rest/v1/projects?select=*&name=eq.External%20Checkout&order=created_at.desc&limit=1',
        )
      )[0],
    };
    const host = await browser.newPage();
    await host.goto(
      `http://127.0.0.1:3211/?key=${project.data.public_key}&private-token=should-not-be-collected#secret`,
    );
    const launcher = host.locator('#bugsnap-widget').getByRole('button', { name: 'Report a bug' });
    await expect(launcher).toBeVisible();
    await launcher.click();
    const widget = host.frameLocator('iframe[title="BugSnap bug report"]');
    await expect(widget.getByRole('heading', { name: 'Found a bug?' })).toBeVisible();
    await widget.getByRole('button', { name: 'Send bug report' }).click();
    await expect(widget.getByText('Add a title with at least 3 characters.')).toBeVisible();
    await widget
      .getByRole('textbox', { name: /What went wrong/ })
      .fill('External checkout click fails');
    await widget
      .getByRole('textbox', { name: /Tell us a little more/ })
      .fill('Clicking the checkout button does not open the order screen.');
    const image = readFileSync('tests/fixtures/screenshot.png');
    await widget
      .locator('input[type=file]')
      .setInputFiles({ name: 'checkout.png', mimeType: 'image/png', buffer: image });
    await expect(widget.getByAltText('Screenshot preview')).toBeVisible();
    await widget.getByRole('button', { name: 'Send bug report' }).click();
    await expect(widget.getByRole('heading', { name: 'You’re on the team.' })).toBeVisible();
    const report = {
      data: (await api('/rest/v1/reports?select=*&project_id=eq.' + project.data.id))[0],
    };
    expect(report.data.context.pathname).toBe('/');
    expect(JSON.stringify(report.data.context)).not.toContain('should-not-be-collected');
    const attachments = await api(
      '/rest/v1/report_attachments?select=*&report_id=eq.' + report.data.id,
    );
    expect(attachments).toHaveLength(1);
    const attachment = attachments[0];
    expect((await request.get(`/api/attachments/${attachment.id}`)).status()).toBe(401);
    const publicFile = await request.get(
      `${url}/storage/v1/object/public/screenshots/${attachment.object_path}`,
    );
    expect(publicFile.ok()).toBe(false);
    await page.goto('/dashboard/reports');
    await page.getByRole('link', { name: 'External checkout click fails' }).click();
    await expect(
      page.getByRole('heading', { name: 'External checkout click fails' }),
    ).toBeVisible();
    await page.getByRole('combobox', { name: 'Status', exact: true }).selectOption('in_progress');
    await page.getByRole('combobox', { name: 'Priority', exact: true }).selectOption('high');
    await page.getByRole('button', { name: 'Update report' }).click();
    await expect(page.getByRole('status')).toContainText('Report updated');
    await page
      .getByRole('textbox', { name: 'Comment', exact: true })
      .fill('Reproduced from a separate origin. Investigating.');
    await page.getByRole('button', { name: 'Add comment' }).click();
    await expect(
      page.getByText('Reproduced from a separate origin. Investigating.', { exact: true }),
    ).toBeVisible();
    await page.reload();
    await expect(page.getByRole('combobox', { name: 'Status', exact: true })).toHaveValue(
      'in_progress',
    );
    await expect(page.locator('.report-screenshot')).toBeVisible();
    const authenticatedAttachment = await page.request.get(`/api/attachments/${attachment.id}`);
    expect(authenticatedAttachment.status()).toBe(200);
    expect(authenticatedAttachment.headers()['content-type']).toBe('image/webp');
    await page.goto('/dashboard/reports');
    await page.getByRole('combobox', { name: 'Status', exact: true }).selectOption('resolved');
    await page.getByRole('button', { name: 'Apply' }).click();
    await expect(page.getByRole('link', { name: 'External checkout click fails' })).toHaveCount(0);
    await page.getByRole('combobox', { name: 'Status', exact: true }).selectOption('in_progress');
    await page.getByRole('button', { name: 'Apply' }).click();
    await expect(page.getByRole('link', { name: 'External checkout click fails' })).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: 'test-results/dashboard-mobile.png', fullPage: true });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.screenshot({ path: 'test-results/dashboard-desktop.png', fullPage: true });
    await host.close();
    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page).toHaveURL(/login/);
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/login/);
    await page.goto('/forgot-password');
    await page.getByRole('textbox', { name: 'Work email' }).fill(email);
    await page.getByRole('button', { name: 'Send reset link' }).click();
    await expect(page.getByRole('status')).toContainText('reset link');
    await page.goto(await emailLink(email, 'recovery'));
    await expect(page).toHaveURL(/reset-password/);
    const nextPassword = randomBytes(18).toString('base64url');
    await page.getByLabel(/^Password/).fill(nextPassword);
    await page.getByRole('button', { name: 'Update password' }).click();
    await expect(page).toHaveURL(/dashboard/);
    await page.getByRole('button', { name: 'Sign out' }).click();
    await page.getByRole('textbox', { name: 'Work email' }).fill(email);
    await page.getByLabel(/^Password/).fill(nextPassword);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page).toHaveURL(/dashboard/);
  });
});
