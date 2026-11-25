// @vitest-environment jsdom
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { init, validMessage, collectContext } from '../packages/widget/src';
beforeEach(() => {
  window.BugSnap?.destroy();
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        token: 'signed',
        label: 'Report a bug',
        position: 'bottom-right',
        accent: '#6554e8',
      }),
    }),
  );
});
afterEach(() => {
  window.BugSnap?.destroy();
  vi.unstubAllGlobals();
});
describe('host SDK', () => {
  it('initializes once and opens/closes the iframe', async () => {
    await init({ projectKey: 'bs_' + 'a'.repeat(32), appOrigin: 'https://bugsnap.example' });
    await init({ projectKey: 'bs_' + 'a'.repeat(32), appOrigin: 'https://bugsnap.example' });
    expect(document.querySelectorAll('#bugsnap-widget')).toHaveLength(1);
    const shadow = document.querySelector('#bugsnap-widget')!.shadowRoot!;
    const button = shadow.querySelector('button')!;
    button.click();
    expect(button.getAttribute('aria-expanded')).toBe('true');
    button.click();
    expect(button.getAttribute('aria-expanded')).toBe('false');
    window.BugSnap?.destroy();
    expect(document.querySelector('#bugsnap-widget')).toBeNull();
  });
  it('ignores invalid origins, sources, protocols and channels', () => {
    const source = window;
    const good = { protocol: 'bugsnap:v1', channel: 'channel', type: 'close' };
    expect(
      validMessage(
        new MessageEvent('message', { origin: 'https://good.example', source, data: good }),
        'https://good.example',
        source,
        'channel',
      ),
    ).toBe(true);
    for (const event of [
      new MessageEvent('message', { origin: 'https://evil.example', source, data: good }),
      new MessageEvent('message', { origin: 'https://good.example', source: null, data: good }),
      new MessageEvent('message', {
        origin: 'https://good.example',
        source,
        data: { ...good, type: 'evil' },
      }),
      new MessageEvent('message', {
        origin: 'https://good.example',
        source,
        data: { ...good, channel: 'other' },
      }),
    ])
      expect(validMessage(event, 'https://good.example', source, 'channel')).toBe(false);
  });
  it('network failures do not throw or mount a broken button', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('offline'));
    await expect(
      init({ projectKey: 'bs_' + 'a'.repeat(32), appOrigin: 'https://bugsnap.example' }),
    ).resolves.toBeUndefined();
    expect(document.querySelector('#bugsnap-widget')).toBeNull();
  });
  it('collects no query strings, cookies, or storage', () => {
    history.replaceState(null, '', '/checkout?token=secret#password');
    localStorage.setItem('token', 'secret');
    const context = collectContext();
    expect(context.pathname).toBe('/checkout');
    expect(JSON.stringify(context)).not.toContain('secret');
    expect(Object.keys(context).sort()).toEqual(
      ['origin', 'pathname', 'browser', 'os', 'viewport', 'timestamp'].sort(),
    );
  });
  it('supports hideLauncher and programmatic open/close/isOpen', async () => {
    await init({
      projectKey: 'bs_' + 'a'.repeat(32),
      appOrigin: 'https://bugsnap.example',
      hideLauncher: true,
      email: 'user@example.com',
    });
    const shadow = document.querySelector('#bugsnap-widget')!.shadowRoot!;
    const button = shadow.querySelector('button')!;
    expect(button.hidden).toBe(true);
    expect(window.BugSnap?.isOpen?.()).toBe(false);
    window.BugSnap?.open();
    expect(window.BugSnap?.isOpen?.()).toBe(true);
    window.BugSnap?.close();
    expect(window.BugSnap?.isOpen?.()).toBe(false);
  });
});
