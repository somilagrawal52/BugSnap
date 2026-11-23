import { describe, it, expect } from 'vitest';
import { reportSchema, safeLocation, normalizeOrigin } from '../packages/shared/src';
import { imageType, sanitizeImage } from '../apps/web/src/lib/images';
import sharp from '../apps/web/node_modules/sharp';
import { sign, verify, webhookValid, boundedBody } from '../apps/web/src/lib/security';
import {
  issueBody,
  exportMarker,
  uncertainGithubFailure,
} from '../apps/web/src/lib/github-content';
import { createHmac } from 'node:crypto';
const context = {
  origin: 'https://app.example.com',
  pathname: '/checkout',
  browser: 'Firefox 130',
  os: 'Windows',
  viewport: { width: 1200, height: 800 },
  timestamp: new Date().toISOString(),
};
describe('submission contracts and privacy', () => {
  it('strips URL query and fragment', () =>
    expect(safeLocation('https://app.example.com/orders?token=secret#password')).toEqual({
      origin: 'https://app.example.com',
      pathname: '/orders',
    }));
  it('rejects short and overlong fields and unknown context', () => {
    expect(reportSchema.safeParse({ title: 'x', description: 'x', context }).success).toBe(false);
    expect(
      reportSchema.safeParse({
        title: 'Bug report',
        description: 'Something is broken',
        context: { ...context, cookies: 'secret' },
      }).success,
    ).toBe(false);
    expect(
      reportSchema.safeParse({
        title: 'x'.repeat(181),
        description: 'Something is broken',
        context,
      }).success,
    ).toBe(false);
  });
  it('rejects context query strings', () =>
    expect(
      reportSchema.safeParse({
        title: 'Bug report',
        description: 'Something is broken',
        context: { ...context, pathname: '/checkout?token=secret' },
      }).success,
    ).toBe(false));
  it('normalizes exact origins and limits local development', () => {
    expect(normalizeOrigin('https://APP.example.com')).toBe('https://app.example.com');
    expect(normalizeOrigin('http://localhost:3000', true)).toBe('http://localhost:3000');
    expect(() => normalizeOrigin('http://localhost:3000')).toThrow();
    expect(() => normalizeOrigin('https://app.example.com/path')).toThrow();
    expect(() => normalizeOrigin('https://user:password@app.example.com')).toThrow();
  });
  it('rejects honeypot submissions', () =>
    expect(
      reportSchema.safeParse({
        title: 'Bug report',
        description: 'Something is broken',
        context,
        website: 'bot.example',
      }).success,
    ).toBe(false));
});
describe('screenshots', () => {
  it('rejects unsupported bytes despite a file extension', () =>
    expect(() => imageType(Buffer.from('<svg onload="alert(1)">'))).toThrow());
  it('rejects oversized uploads', async () =>
    await expect(sanitizeImage(Buffer.alloc(5242881))).rejects.toThrow('5 MB'));
  it('decodes and re-encodes image content without EXIF', async () => {
    const original = await sharp({
      create: { width: 4, height: 4, channels: 3, background: '#ffffff' },
    })
      .jpeg()
      .withMetadata()
      .toBuffer();
    const result = await sanitizeImage(original);
    expect(imageType(result.data)).toBe('webp');
    expect((await sharp(result.data).metadata()).exif).toBeUndefined();
  });
  it('rejects corrupt files with a valid PNG signature', async () =>
    await expect(
      sanitizeImage(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 1])),
    ).rejects.toThrow());
});
describe('tokens, bounds and GitHub safety', () => {
  it('rejects tampered and expired tokens', () => {
    process.env.SUBMISSION_SECRET = 'unit-test-secret-not-a-real-credential';
    const token = sign({ project: 'one' });
    expect(verify<{ project: string }>(token).project).toBe('one');
    expect(() => verify(token + 'x')).toThrow();
    expect(() => verify(sign({ project: 'one' }, -2))).toThrow();
  });
  it('validates webhook signatures against raw bytes', () => {
    const body = '{"action":"deleted"}';
    const sig = 'sha256=' + createHmac('sha256', 'test').update(body).digest('hex');
    expect(webhookValid(body, sig, 'test')).toBe(true);
    expect(webhookValid(body + ' ', sig, 'test')).toBe(false);
    expect(webhookValid(body, 'x', 'test')).toBe(false);
  });
  it('bounds streamed bodies without trusting Content-Length', async () =>
    await expect(
      boundedBody(new Request('http://localhost', { method: 'POST', body: 'a'.repeat(100) }), 50),
    ).rejects.toThrow('too large'));
  it('includes a stable marker and authenticated report link without screenshot URLs', () => {
    const body = issueBody(
      {
        id: 'r1',
        reference: 'ACME-1',
        description: 'Bug detail',
        steps: 'Click',
        expected: 'Success',
        actual: 'Error',
        context: { ...context, environment: 'production' },
      } as any,
      'https://bugsnap.example',
      'export1',
    );
    expect(body).toContain(exportMarker('export1'));
    expect(body).toContain('https://bugsnap.example/dashboard/reports/r1');
    expect(body).not.toContain('/storage/');
  });
  it('treats timeouts and server errors as uncertain, access and rate failures as definite', () => {
    expect(uncertainGithubFailure({ status: 500 })).toBe(true);
    expect(uncertainGithubFailure(new Error('timeout'))).toBe(true);
    expect(uncertainGithubFailure({ status: 403 })).toBe(false);
    expect(uncertainGithubFailure({ status: 429 })).toBe(false);
  });
});
