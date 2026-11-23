'use client';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Script from 'next/script';
import { X, ImagePlus, Check, ShieldCheck, Loader2, Bug, ChevronDown } from 'lucide-react';
import { contextSchema, MAX_IMAGE_BYTES, type SafeContext } from '@bugsnap/shared';
const schema = z.object({
  title: z.string().trim().min(3, 'Add a title with at least 3 characters.').max(180),
  description: z
    .string()
    .trim()
    .min(10, 'Tell us a little more (at least 10 characters).')
    .max(10000),
  steps: z.string().max(5000),
  expected: z.string().max(3000),
  actual: z.string().max(3000),
  email: z.union([z.email('Enter a valid email.'), z.literal('')]),
  website: z.string().max(0),
});
type Form = z.infer<typeof schema>;
declare global {
  interface Window {
    turnstile?: {
      render: (element: HTMLElement, options: Record<string, unknown>) => string;
      reset: (id: string) => void;
      remove: (id: string) => void;
    };
  }
}
export function WidgetForm({ host, channel }: { host: string; channel: string }) {
  const [context, setContext] = useState<SafeContext | null>(null),
    [token, setToken] = useState(''),
    [file, setFile] = useState<File | null>(null),
    [preview, setPreview] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [reference, setReference] = useState(''),
    [challenge, setChallenge] = useState('');
  const turnstileId = useRef<string | undefined>(undefined),
    challengeNode = useRef<HTMLDivElement>(null),
    key = useRef(crypto.randomUUID()),
    sent = useRef(false),
    lockedContext = useRef<SafeContext | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      description: '',
      steps: '',
      expected: '',
      actual: '',
      email: '',
      website: '',
    },
  });
  const message = (type: string) =>
    window.parent.postMessage({ protocol: 'bugsnap:v1', type, channel }, host);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (
        event.source !== window.parent ||
        event.origin !== host ||
        event.data?.protocol !== 'bugsnap:v1' ||
        event.data?.channel !== channel ||
        event.data?.type !== 'context' ||
        typeof event.data?.token !== 'string' ||
        event.data.token.length > 3000
      )
        return;
      const result = contextSchema.safeParse(event.data.context);
      if (result.success && result.data.origin === host) {
        setContext(result.data);
        setToken(event.data.token);
      }
    };
    window.addEventListener('message', receive);
    window.parent.postMessage({ protocol: 'bugsnap:v1', type: 'ready', channel }, host);
    const keyboard = (e: KeyboardEvent) => {
      if (e.key === 'Escape')
        window.parent.postMessage({ protocol: 'bugsnap:v1', type: 'close', channel }, host);
    };
    window.addEventListener('keydown', keyboard);
    return () => {
      window.removeEventListener('message', receive);
      window.removeEventListener('keydown', keyboard);
    };
  }, [host, channel]);
  useEffect(() => {
    if (!file) {
      setPreview('');
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  const chooseFile = (image: File) => {
    if (sent.current) {
      setError('Retry the original report, or close and reopen to start a new one.');
      return;
    }
    if (image.size > MAX_IMAGE_BYTES) {
      setError('Choose an image smaller than 5 MB.');
      return;
    }
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(image.type)) {
      setError('Use a PNG, JPEG, or WebP image.');
      return;
    }
    setFile(image);
    setError('');
  };
  const mountChallenge = () => {
    if (challengeNode.current && window.turnstile && !turnstileId.current)
      turnstileId.current = window.turnstile.render(challengeNode.current, {
        sitekey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
        callback: (value: string) => setChallenge(value),
        'expired-callback': () => setChallenge(''),
      });
  };
  useEffect(
    () => () => {
      if (turnstileId.current) window.turnstile?.remove(turnstileId.current);
    },
    [],
  );
  const submit = handleSubmit(async (values) => {
    if (!context || !token) {
      setError('Waiting for page context. Close and reopen if this continues.');
      return;
    }
    setBusy(true);
    setError('');
    lockedContext.current ??= context;
    sent.current = true;
    const form = new FormData();
    form.set(
      'report',
      JSON.stringify({ ...values, context: lockedContext.current, turnstileToken: challenge }),
    );
    if (file) form.set('screenshot', file);
    try {
      const response = await fetch('/api/public/reports', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Idempotency-Key': key.current },
        body: form,
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || 'Couldn’t send your report. Try again.');
        if (response.status !== 502 && response.status !== 503) {
          sent.current = false;
          lockedContext.current = null;
        }
        if (turnstileId.current) window.turnstile?.reset(turnstileId.current);
        return;
      }
      setReference(result.reference);
      message('submitted');
    } catch {
      setError('Connection interrupted. Retry to safely check and submit this same report.');
    } finally {
      setBusy(false);
    }
  });
  if (reference)
    return (
      <main className="widget-success">
        <span className="success-check">
          <Check size={32} />
        </span>
        <h1>You’re on the team.</h1>
        <p>Your report is in the right hands. Thanks for helping make this product better.</p>
        <span className="badge">{reference}</span>
        <button className="button button-primary" onClick={() => message('close')}>
          Done
        </button>
        <span className="widget-credit">Sent with BugSnap</span>
      </main>
    );
  return (
    <main
      className="widget-shell"
      onPaste={(e) => {
        const image = Array.from(e.clipboardData.files).find((f) => f.type.startsWith('image/'));
        if (image) {
          e.preventDefault();
          chooseFile(image);
        }
      }}
    >
      <header className="widget-header">
        <span className="widget-bug">
          <Bug size={20} />
        </span>
        <div>
          <h1>Found a bug?</h1>
          <p>Let’s make it better.</p>
        </div>
        <button
          className="icon-button"
          aria-label="Close report form"
          onClick={() => message('close')}
        >
          <X size={19} />
        </button>
      </header>
      <form className="widget-fields" onSubmit={submit}>
        <fieldset disabled={busy || sent.current} className="widget-fieldset">
          <label>
            What went wrong? <span className="required-mark">*</span>
            <input
              className="input"
              placeholder="A short, descriptive title"
              maxLength={180}
              {...register('title')}
            />
            {errors.title && <span className="field-error">{errors.title.message}</span>}
          </label>
          <label>
            Tell us a little more <span className="required-mark">*</span>
            <textarea
              className="input textarea"
              placeholder="What happened? What were you trying to do?"
              rows={4}
              maxLength={10000}
              {...register('description')}
            />
            {errors.description && (
              <span className="field-error">{errors.description.message}</span>
            )}
          </label>
          <details className="widget-extra">
            <summary>
              Add steps & expected behavior <ChevronDown size={14} />
            </summary>
            <label>
              Steps to reproduce
              <textarea className="input textarea" maxLength={5000} {...register('steps')} />
            </label>
            <label>
              Expected behavior
              <textarea className="input textarea" maxLength={3000} {...register('expected')} />
            </label>
            <label>
              Actual behavior
              <textarea className="input textarea" maxLength={3000} {...register('actual')} />
            </label>
          </details>
          <label>
            Screenshot <span className="optional">optional</span>
          </label>
          {preview ? (
            <div className="image-preview">
              <img src={preview} alt="Screenshot preview" />
              <button
                type="button"
                className="icon-button"
                aria-label="Remove screenshot"
                onClick={() => setFile(null)}
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <label className="upload-zone">
              <ImagePlus size={22} />
              <span>Choose an image or paste it here</span>
              <small>PNG, JPEG, WebP · up to 5 MB</small>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => {
                  if (e.target.files?.[0]) chooseFile(e.target.files[0]);
                }}
              />
            </label>
          )}
          <label>
            Your email <span className="optional">optional</span>
            <input
              className="input"
              placeholder="For a follow-up, if you’d like"
              type="email"
              {...register('email')}
            />
            {errors.email && <span className="field-error">{errors.email.message}</span>}
          </label>
          <label className="honeypot" aria-hidden="true">
            Website
            <input tabIndex={-1} autoComplete="off" {...register('website')} />
          </label>
        </fieldset>
        <details className="privacy-details">
          <summary>
            <ShieldCheck size={15} />
            What’s included in your report?
          </summary>
          {context ? (
            <p>
              Page: {context.origin}
              {context.pathname}
              <br />
              {context.browser} · {context.os}
              <br />
              Viewport: {context.viewport.width} × {context.viewport.height}
              <br />
              Time: {context.timestamp}
              {context.appVersion && (
                <>
                  <br />
                  App version: {context.appVersion}
                </>
              )}
              <br />
              No query strings, cookies, passwords, or form values are captured.
            </p>
          ) : (
            <p>Loading safe page context…</p>
          )}
        </details>
        {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && (
          <>
            <Script
              src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
              onReady={mountChallenge}
            />
            <div ref={challengeNode} />
          </>
        )}
        {error && (
          <p className="notice error" role="alert">
            {error}
          </p>
        )}
        <button
          className="button button-primary widget-submit"
          disabled={
            busy || !context || (!!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !challenge)
          }
          type="submit"
        >
          {busy ? (
            <>
              <Loader2 className="spin" size={16} />
              Sending report…
            </>
          ) : sent.current ? (
            'Retry this report'
          ) : (
            'Send bug report'
          )}
        </button>
        <span className="widget-credit">
          <Bug size={13} />
          Powered by <strong>BugSnap</strong>
        </span>
      </form>
    </main>
  );
}
