/**
 * Meta Pixel (fbevents.js) wrapper — consent-gated.
 *
 * This module is the single place the Pixel base code lives. It wraps the
 * official Meta snippet so that:
 *
 *   - The Pixel ID is injected from the environment variable at runtime, never
 *     hardcoded here. Changing the Pixel ID is a Vercel env-var edit only.
 *   - fbevents.js is NOT loaded and `fbq('init')` is NOT called until the
 *     visitor has granted Marketing consent via the cookie banner. Before
 *     that, every function in this module is a no-op.
 *   - The script is initialised at most once per page load, even if this
 *     module is imported from several components.
 *   - `PageView` is tracked at most once per route. Route-change tracking is
 *     delegated to the component layer, which calls `trackPageView()` again
 *     only when the URL actually changes.
 *   - When Marketing consent is withdrawn, `revoke()` flips Meta's consent
 *     mode off (fbevents stops sending), disables every wrapper function and
 *     erases the first-party Meta cookies `_fbp`/`_fbc`. The third-party
 *     `fr` cookie lives on .facebook.com and cannot be cleared by this site;
 *     Meta's own consent-revoke handling covers it on their side.
 *   - The Pixel is only loaded when a Pixel ID is configured. If the variable
 *     is missing (e.g. a local dev build without it), nothing is loaded and
 *     the helpers are no-ops — the site keeps working normally.
 *
 * The base code below is the official Meta snippet verbatim, minus the
 * hardcoded Pixel ID and the initial `fbq('track', 'PageView')`, which are
 * handled dynamically by `init()` and `trackPageView()`.
 */

/** The global Meta Pixel namespace. */
export interface MetaPixelNamespace {
  (...args: unknown[]): void;
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[];
  loaded: boolean;
  version: string;
  _fbq?: MetaPixelNamespace;
  push?: MetaPixelNamespace;
}

declare global {
  interface Window {
    _fbq?: MetaPixelNamespace;
    fbq?: MetaPixelNamespace;
  }
}

export type PixelEvent =
  | "PageView"
  | "ViewContent"
  | "Lead"
  | "Contact"
  | "AddToCart"
  | "InitiateCheckout"
  | "Purchase";

export interface PixelEventParams {
  [key: string]: unknown;
}

/** fbevents.js loaded and `fbq('init')` already run (at most once ever). */
let initialised = false;

/** Marketing consent currently active. Gates every tracking call. */
let enabled = false;

let pixelId: string | null = null;

/**
 * Erase the first-party Meta cookies this site can reach.
 * `_fbp`/`_fbc` are set on the site's own domain, so expiring them works.
 * Meta's `fr` cookie lives on .facebook.com and is NOT reachable here.
 */
function clearMetaCookies(): void {
  const names = ["_fbp", "_fbc"];
  const domains = [location.hostname, `.${location.hostname}`];
  for (const name of names) {
    for (const domain of domains) {
      document.cookie =
        `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${domain}; SameSite=Lax`;
    }
  }
}

/**
 * Inject the official Meta base script exactly once and call `fbq('init', id)`.
 *
 * Only ever called with Marketing consent present. Safe to call multiple
 * times: the second call is a no-op. If no Pixel ID is configured, nothing
 * happens and the site works normally.
 */
export function init(): void {
  if (initialised) return;

  const id = import.meta.env.VITE_META_PIXEL_ID as string | undefined;
  if (!id || typeof id !== "string" || id.trim() === "") {
    // No Pixel configured — stay silent. The site renders normally.
    return;
  }

  pixelId = id.trim();

  // --- Official Meta base code (verbatim, ID injected below) ---
  const f = window;
  const b = document;
  const e = "script";
  const v = "https://connect.facebook.net/en_US/fbevents.js";

  if (f.fbq) return;
  const n: MetaPixelNamespace = function (...args: unknown[]) {
    if (n.callMethod) {
      n.callMethod.apply(n, args);
    } else {
      n.queue.push(args);
    }
  };
  if (!f._fbq) f._fbq = n;
  n.push = n;
  n.loaded = true;
  n.version = "2.0";
  n.queue = [];

  const t = b.createElement(e);
  t.async = true;
  t.src = v;
  const s = b.getElementsByTagName(e)[0];
  if (s && s.parentNode) {
    s.parentNode.insertBefore(t, s);
  } else {
    b.head.appendChild(t);
  }

  f.fbq = n;
  // --- End base code ---

  f.fbq!("init", pixelId);
  initialised = true;
  enabled = true;
}

/**
 * Enable tracking after a withdrawal-and-regrant, without re-initialising.
 * If fbevents.js is already loaded, Meta's consent mode is flipped back on;
 * otherwise the Pixel is initialised for the first time.
 */
export function grant(): void {
  if (initialised) {
    enabled = true;
    if (typeof window.fbq === "function") {
      try {
        window.fbq!("consent", "grant");
      } catch {
        // Consent call is best-effort; tracking stays functional.
      }
    }
    return;
  }
  init();
}

/**
 * Withdraw Marketing consent: stop all tracking and clear the Meta cookies
 * this site can technically reach (`_fbp`/`_fbc` first-party).
 *
 * `fbq('consent','revoke')` puts Meta's library into consent-revoked state so
 * it stops transmitting. The third-party `fr` cookie on .facebook.com cannot
 * be cleared from this domain.
 */
export function revoke(): void {
  enabled = false;
  if (initialised && typeof window.fbq === "function") {
    try {
      window.fbq!("consent", "revoke");
    } catch {
      // Best-effort; the local gate below still stops everything.
    }
  }
  clearMetaCookies();
}

/**
 * Fire a Meta Pixel event. No-op unless Marketing consent is active, the
 * Pixel is initialised and a Pixel ID is configured.
 */
export function track(event: PixelEvent, params: PixelEventParams = {}): void {
  if (!enabled || !initialised || !pixelId || typeof window.fbq !== "function") return;
  window.fbq!("track", event, params);
}

/**
 * Track a PageView.
 *
 * Call this once on initial load and once per client-side route change.
 * The component layer guards against duplicate calls, so this function does
 * not deduplicate itself — it is intentionally idempotent at the caller level.
 */
export function trackPageView(): void {
  track("PageView");
}

/**
 * Convenience helpers for future conversion events. They are wired up to the
 * same `track()` function so behaviour is consistent and they are no-ops
 * until a Pixel ID is configured and Marketing consent is active.
 *
 * NOTE: the contact form is a demo (simulated submission, no real endpoint),
 * so Lead/Purchase events are deliberately never fired.
 */
export const metaPixel = {
  init,
  grant,
  revoke,
  track,
  trackPageView,
  viewContent: (params: PixelEventParams = {}) => track("ViewContent", params),
  lead: (params: PixelEventParams = {}) => track("Lead", params),
  contact: (params: PixelEventParams = {}) => track("Contact", params),
  addToCart: (params: PixelEventParams = {}) => track("AddToCart", params),
  initiateCheckout: (params: PixelEventParams = {}) => track("InitiateCheckout", params),
  purchase: (params: PixelEventParams = {}) => track("Purchase", params),
};

export default metaPixel;
