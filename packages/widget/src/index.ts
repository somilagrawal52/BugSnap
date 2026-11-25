type Config = {
  projectKey: string;
  appOrigin: string;
  label?: string;
  position?: 'bottom-left' | 'bottom-right';
  accent?: string;
  hideLauncher?: boolean;
  email?: string;
};
type Remote = {
  token: string;
  label: string;
  position: 'bottom-left' | 'bottom-right';
  accent: string;
  appVersion?: string;
};
declare global {
  interface Window {
    BugSnap?: {
      init: (config: Config) => Promise<void>;
      open: () => void;
      close: () => void;
      destroy: () => void;
      isOpen?: () => boolean;
      setEmail?: (email: string) => void;
    };
  }
}
let cleanup: (() => void) | undefined;
let openWidget = () => {};
let closeWidget = () => {};
let isWidgetOpen = () => false;
let setWidgetEmail = (_email: string) => {};
let generation = 0;
export function collectContext() {
  const ua = navigator.userAgent;
  const agents: [string, RegExp][] = [
    ['Edge', /Edg(?:A|iOS)?\/([\d.]+)/],
    ['Opera', /OPR\/([\d.]+)/],
    ['Firefox', /(?:Firefox|FxiOS)\/([\d.]+)/],
    ['Chrome', /(?:Chrome|CriOS)\/([\d.]+)/],
    ['Safari', /Version\/([\d.]+)/],
  ];
  const agent = agents.find(([, pattern]) => pattern.test(ua));
  const browser = agent ? `${agent[0]} ${ua.match(agent[1])![1]}` : 'Unknown';
  const os = /Windows/.test(ua)
    ? 'Windows'
    : /Android/.test(ua)
      ? 'Android'
      : /iPhone|iPad/.test(ua)
        ? 'iOS'
        : /Mac OS/.test(ua)
          ? 'macOS'
          : /Linux/.test(ua)
            ? 'Linux'
            : 'Unknown';
  return {
    origin: location.origin,
    pathname: (location.pathname || '/').slice(0, 1500),
    browser: browser.slice(0, 80),
    os: os.slice(0, 80),
    viewport: { width: innerWidth, height: innerHeight },
    timestamp: new Date().toISOString(),
  };
}
export function validMessage(
  event: MessageEvent,
  origin: string,
  source: Window | null,
  channel: string,
) {
  return (
    event.origin === origin &&
    event.source === source &&
    !!event.data &&
    typeof event.data === 'object' &&
    event.data.channel === channel &&
    event.data.protocol === 'bugsnap:v1' &&
    ['ready', 'close', 'submitted'].includes(event.data.type)
  );
}
export async function init(config: Config) {
  if (cleanup) return;
  const instance = ++generation;
  try {
    const appOrigin = new URL(config.appOrigin).origin;
    if (!/^bs_[a-f0-9]{32}$/.test(config.projectKey)) return;
    const response = await fetch(
      `${appOrigin}/api/widget/config?key=${encodeURIComponent(config.projectKey)}&origin=${encodeURIComponent(location.origin)}`,
      { credentials: 'omit', referrerPolicy: 'no-referrer' },
    );
    if (!response.ok) return;
    let remote: Remote = await response.json();
    let configuredAt = Date.now();
    if (instance !== generation || cleanup) return;
    const root = document.createElement('div');
    root.id = 'bugsnap-widget';
    const shadow = root.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    const accent = /^#[a-f0-9]{6}$/i.test(config.accent ?? '') ? config.accent! : remote.accent;
    const left = (config.position ?? remote.position) === 'bottom-left';
    const hideLauncher = !!config.hideLauncher;
    let reporterEmail = typeof config.email === 'string' ? config.email.trim().slice(0, 254) : '';
    style.textContent = `:host{all:initial}*{box-sizing:border-box}button{font:600 14px system-ui;cursor:pointer}button:focus-visible,iframe:focus-visible{outline:3px solid #a5b4fc;outline-offset:4px}.launcher{position:fixed;bottom:24px;${left ? 'left' : 'right'}:24px;border:0;border-radius:12px;background:${accent};color:white;padding:15px 20px;box-shadow:0 4px 20px #0003;z-index:2147483645}.panel{position:fixed;bottom:${hideLauncher ? '24px' : '84px'};${left ? 'left' : 'right'}:24px;width:420px;height:min(720px,calc(100dvh - ${hideLauncher ? '48px' : '110px'}));border:1px solid #e0e0eb;border-radius:18px;box-shadow:0 15px 70px #17203433;z-index:2147483646;background:white;overflow:hidden}iframe{height:100%;width:100%;border:0}[hidden]{display:none!important}@media(max-width:480px){.panel{left:12px;right:12px;bottom:${hideLauncher ? '12px' : '80px'};width:calc(100% - 24px);height:calc(100dvh - ${hideLauncher ? '24px' : '100px'})}.launcher{bottom:18px;${left ? 'left' : 'right'}:16px}}`;
    const button = document.createElement('button');
    button.className = 'launcher';
    button.hidden = hideLauncher;
    button.textContent = (config.label ?? remote.label).slice(0, 40);
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-haspopup', 'dialog');
    const panel = document.createElement('div');
    panel.className = 'panel';
    panel.hidden = true;
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Report a bug');
    const channel = crypto.randomUUID();
    const frame = document.createElement('iframe');
    frame.title = 'BugSnap bug report';
    frame.referrerPolicy = 'no-referrer';
    frame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms');
    frame.src = `${appOrigin}/widget?key=${encodeURIComponent(config.projectKey)}&host=${encodeURIComponent(location.origin)}&channel=${channel}`;
    let ready = false;
    const send = () => {
      if (ready)
        frame.contentWindow?.postMessage(
          {
            protocol: 'bugsnap:v1',
            type: 'context',
            channel,
            token: remote.token,
            ...(reporterEmail ? { email: reporterEmail } : {}),
            context: {
              ...collectContext(),
              ...(remote.appVersion ? { appVersion: remote.appVersion } : {}),
            },
          },
          appOrigin,
        );
    };
    isWidgetOpen = () => !panel.hidden;
    setWidgetEmail = (email: string) => {
      reporterEmail = typeof email === 'string' ? email.trim().slice(0, 254) : '';
      send();
    };
    openWidget = () => {
      panel.hidden = false;
      button.setAttribute('aria-expanded', 'true');
      send();
      frame.focus();
      if (Date.now() - configuredAt > 12 * 60 * 1000) {
        void fetch(
          `${appOrigin}/api/widget/config?key=${encodeURIComponent(config.projectKey)}&origin=${encodeURIComponent(location.origin)}`,
          { credentials: 'omit', referrerPolicy: 'no-referrer' },
        )
          .then(async (response) => {
            if (response.ok) {
              remote = await response.json();
              configuredAt = Date.now();
              send();
            }
          })
          .catch(() => {});
      }
    };
    closeWidget = () => {
      panel.hidden = true;
      button.setAttribute('aria-expanded', 'false');
      if (!button.hidden) button.focus();
    };
    button.onclick = () => (panel.hidden ? openWidget() : closeWidget());
    const message = (e: MessageEvent) => {
      if (!validMessage(e, appOrigin, frame.contentWindow, channel)) return;
      if (e.data.type === 'ready') {
        ready = true;
        send();
      }
      if (e.data.type === 'submitted') {
        try {
          window.dispatchEvent(new CustomEvent('bugsnap:submitted', { detail: { channel } }));
        } catch {}
      }
      if (e.data.type === 'close') closeWidget();
    };
    const keyboard = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !panel.hidden) closeWidget();
    };
    const navigation = () => send();
    const timer = window.setInterval(() => {
      if (!panel.hidden) send();
    }, 2000);
    window.addEventListener('message', message);
    window.addEventListener('keydown', keyboard);
    window.addEventListener('popstate', navigation);
    window.addEventListener('hashchange', navigation);
    panel.append(frame);
    shadow.append(style, panel, button);
    document.body.append(root);
    cleanup = () => {
      root.remove();
      window.removeEventListener('message', message);
      window.removeEventListener('keydown', keyboard);
      window.removeEventListener('popstate', navigation);
      window.removeEventListener('hashchange', navigation);
      clearInterval(timer);
      cleanup = undefined;
      openWidget = () => {};
      closeWidget = () => {};
      isWidgetOpen = () => false;
      setWidgetEmail = () => {};
    };
  } catch {
    /* SDK failure must not break the host. No host data is logged. */
  }
}
if (typeof window !== 'undefined') {
  window.BugSnap ??= {
    init,
    open: () => openWidget(),
    close: () => closeWidget(),
    destroy: () => {
      generation++;
      cleanup?.();
    },
    isOpen: () => isWidgetOpen(),
    setEmail: (email: string) => setWidgetEmail(email),
  };
  const script = document.currentScript as HTMLScriptElement | null;
  if (script?.dataset.projectKey) {
    const start = () =>
      void window.BugSnap!.init({
        projectKey: script.dataset.projectKey!,
        appOrigin: new URL(script.src).origin,
        hideLauncher: script.dataset.hideLauncher === 'true',
      });
    if (document.body) start();
    else document.addEventListener('DOMContentLoaded', start, { once: true });
  }
}
