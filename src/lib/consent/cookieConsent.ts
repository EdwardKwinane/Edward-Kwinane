/**
 * Cookie consent management — CookieConsent v3 by Orest Bida (MIT licence).
 *
 * The library is bundled into this Vite application; there is no external
 * consent hosting, no CMP subscription and no backend. Its configuration and
 * source live in this repository and Vercel serves it with the website.
 *
 * Consent model (GDPR/ePrivacy "opt-in"):
 *
 *   - Necessary  — always enabled, read-only. The site cannot function
 *                  without it; the only cookie is `cc_cookie` itself.
 *   - Analytics  — disabled by default. Not in use yet.
 *   - Marketing  — disabled by default. The Meta Pixel lives here: the
 *                  Pixel is neither initialised nor loaded until Marketing
 *                  consent exists, and is revoked the moment it is withdrawn
 *                  (see src/lib/analytics/metaPixel.ts).
 *
 * Storage: the library writes one first-party cookie, `cc_cookie`
 * (SameSite=Lax, Secure, 182 days), containing the accepted categories,
 * timestamps and a consent ID. `acceptedCategory()` is the single read path.
 *
 * Session behaviour: the banner is shown once at the start of every browser
 * session, even when a saved choice already exists. A sessionStorage flag
 * (`ek-cc-banner-dismissed`) records that the visitor already saw and
 * answered the banner in this session, so refreshes and in-session navigation
 * do not repeat it. The flag is session-scoped (survives reloads, dies with
 * the tab/session); the saved categories in `cc_cookie` are never touched by
 * this — only the display is repeated.
 *
 * This module is the ONLY place CookieConsent is configured. Other code
 * subscribes through `onMarketingConsentChange()` — never the other way
 * around — so there is exactly one source of truth for consent state.
 */
import * as CookieConsent from "vanilla-cookieconsent";

/** Name of the cookie the library uses to persist consent. */
export const CONSENT_COOKIE_NAME = "cc_cookie";

/** Category the Meta Pixel belongs to. */
export const MARKETING_CATEGORY = "marketing";

/** Current Marketing consent, as the library sees it. */
export type MarketingConsent = boolean;

type Listener = (marketingAccepted: MarketingConsent) => void;

let started = false;
const listeners = new Set<Listener>();

/**
 * sessionStorage flag: the visitor has already seen and answered the banner
 * in this browser session. Session-scoped by design — it survives refreshes
 * but is cleared when the session (tab) ends, so every new session is asked
 * again without touching the categories saved in `cc_cookie`.
 */
export const SESSION_FLAG = "ek-cc-banner-dismissed";

function markBannerDismissed(): void {
  try {
    sessionStorage.setItem(SESSION_FLAG, "1");
  } catch {
    // Storage unavailable (private mode, disabled storage): fall back to the
    // library's default behaviour instead of throwing.
  }
}

function bannerDismissedThisSession(): boolean {
  try {
    return sessionStorage.getItem(SESSION_FLAG) === "1";
  } catch {
    // Storage unavailable — do not force a banner the visitor cannot dismiss
    // for the rest of the session.
    return true;
  }
}

function notify(marketingAccepted: MarketingConsent): void {
  listeners.forEach((listener) => {
    try {
      listener(marketingAccepted);
    } catch {
      // A listener must never break the consent flow.
    }
  });
}

/**
 * True only when the visitor has already granted Marketing consent.
 * Returns false before any choice, after "Reject optional", and after a
 * withdrawal — i.e. exactly when the Pixel must stay dormant.
 */
export function isMarketingAccepted(): boolean {
  try {
    return CookieConsent.acceptedCategory(MARKETING_CATEGORY) === true;
  } catch {
    return false;
  }
}

/**
 * Subscribe to Marketing consent changes. Fires only on real transitions
 * (grant or withdrawal), never on page load — initial state is read with
 * `isMarketingAccepted()` at mount time instead.
 *
 * Returns an unsubscribe function.
 */
export function onMarketingConsentChange(
  listener: Listener
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Current consent summary — useful for debugging and tests. */
export function getConsentState(): {
  acceptType: string;
  acceptedCategories: string[];
  rejectedCategories: string[];
} {
  try {
    const prefs = CookieConsent.getUserPreferences();
    return {
      acceptType: prefs.acceptType,
      acceptedCategories: [...prefs.acceptedCategories],
      rejectedCategories: [...prefs.rejectedCategories],
    };
  } catch {
    return { acceptType: "unknown", acceptedCategories: [], rejectedCategories: [] };
  }
}

/**
 * Reopen the preferences modal. Called by the persistent "Cookie settings"
 * control in the footer so consent can be changed or withdrawn at any time.
 */
export function openCookiePreferences(): void {
  try {
    CookieConsent.showPreferences();
  } catch {
    // Library not ready (e.g. script error) — fail silently, site keeps working.
  }
}

/**
 * Configure and start CookieConsent. Called once, synchronously, from
 * `main.tsx` before React renders, so `window.CookieConsent` and the consent
 * state exist before any component (MetaPixel included) reads them.
 *
 * Safe to call multiple times: subsequent calls are no-ops.
 */
export function initConsent(): void {
  if (started) return;
  started = true;

  CookieConsent.run({
    // Opt-in: Analytics and Marketing stay off until explicitly accepted.
    mode: "opt-in",

    // Show the banner automatically when no valid consent exists.
    autoShow: true,

    // Bump when the consent text changes so visitors are re-asked.
    revision: 1,

    // The library's bot detection keys off navigator.webdriver, which would
    // disable the banner for every Playwright/Chromium test. The site is a
    // public portfolio with nothing to hide from crawlers, so the check is
    // disabled and the banner always runs.
    hideFromBots: false,

    // Honour the browser's Global Privacy Control signal: while no choice
    // has been saved, enabled categories are treated as disabled and the
    // banner is not auto-shown. A saved choice always wins.
    respectGpc: true,

    // One first-party cookie, 182 days, Strict-adjacent defaults.
    cookie: {
      name: CONSENT_COOKIE_NAME,
      sameSite: "Lax",
      secure: true,
      expiresAfterDays: 182,
    },

    categories: {
      necessary: {
        // Always on; the toggle is disabled in the preferences modal.
        enabled: true,
        readOnly: true,
      },
      analytics: {
        // Off by default. Reserved for future, privacy-friendly analytics.
      },
      marketing: {
        // Off by default. The Meta Pixel belongs here.
        autoClear: {
          // Erase the first-party Meta cookies when Marketing is rejected.
          // (`fr` lives on .facebook.com and cannot be cleared by this site;
          // fbevents.js is additionally told to stop via consent revoke.)
          cookies: [
            { name: "_fbp", path: "/" },
            { name: "_fbc", path: "/" },
          ],
        },
      },
    },

    language: {
      default: "en",
      translations: {
        en: {
          consentModal: {
            title: "Cookies on this site",
            description:
              "We use cookies to keep the site working securely and — only with your consent — to understand how it is used and to measure marketing performance. You can change your choice at any time from the footer of any page.",
            acceptAllBtn: "Accept all",
            acceptNecessaryBtn: "Reject optional",
            showPreferencesBtn: "Customize",
            // In the "box" layout this X button rejects the optional categories.
            closeIconLabel: "Close and reject optional cookies",
          },
          preferencesModal: {
            title: "Cookie preferences",
            acceptAllBtn: "Accept all",
            acceptNecessaryBtn: "Reject optional",
            savePreferencesBtn: "Save preferences",
            closeIconLabel: "Close preferences",
            serviceCounterLabel: "1 service|{{count}} services",
            sections: [
              {
                title: "Your choices",
                description:
                  "This site uses three categories of cookies. Necessary cookies keep the site working and are always on. Analytics and marketing cookies are only set after you accept them. Your choice is stored on this device for 182 days and you can change it at any time.",
              },
              {
                title: "Necessary",
                description:
                  "Required for the site to function, including remembering your cookie choice. Always on.",
                linkedCategory: "necessary",
                cookieTable: {
                  caption: "Cookies in this category",
                  headers: {
                    name: "Name",
                    domain: "Domain",
                    expiration: "Expiration",
                    description: "Description",
                  },
                  body: [
                    {
                      name: "cc_cookie",
                      domain: "this website",
                      expiration: "182 days",
                      description:
                        "Stores your cookie preferences for 182 days. The banner is shown once per browser session so you can confirm or change them.",
                    },
                  ],
                },
              },
              {
                title: "Analytics",
                description:
                  "Help us understand how visitors use the site so we can improve it. Not in use yet — nothing is collected while this category is off.",
                linkedCategory: "analytics",
              },
              {
                title: "Marketing",
                description:
                  "Used by the Meta Pixel to measure how visitors interact with marketing content. Only set after you accept; you can withdraw at any time.",
                linkedCategory: "marketing",
                cookieTable: {
                  caption: "Cookies in this category",
                  headers: {
                    name: "Name",
                    domain: "Domain",
                    expiration: "Expiration",
                    description: "Description",
                  },
                  body: [
                    {
                      name: "_fbp",
                      domain: "this website",
                      expiration: "3 months",
                      description: "Meta Pixel browser identifier (first-party).",
                    },
                    {
                      name: "_fbc",
                      domain: "this website",
                      expiration: "3 months",
                      description: "Meta Pixel ad-click identifier (first-party).",
                    },
                    {
                      name: "fr",
                      domain: ".facebook.com",
                      expiration: "3 months",
                      description:
                        "Meta advertising cookie (third-party). Set by Meta; this site cannot erase it.",
                    },
                  ],
                },
              },
            ],
          },
        },
      },
    },

    // Fired on the VERY FIRST consent action of a visitor. The library does
    // NOT fire onChange for this interaction, so it needs its own hook or a
    // fresh accept would never reach the Pixel.
    onFirstConsent: () => {
      // The visitor has now seen and answered the banner for this session.
      markBannerDismissed();
      notify(isMarketingAccepted());
    },

    // Fired only when categories actually change on a LATER interaction —
    // never on page load and never on the very first consent.
    onChange: () => {
      markBannerDismissed();
      notify(isMarketingAccepted());
    },

    // Neither callback above fires when a returning visitor re-confirms the
    // banner without changing any category, so the session flag is also set
    // when the consent modal closes. Only the consent modal counts — closing
    // the preferences modal is not an answer to the banner.
    onModalHide: ({ modalName }) => {
      if (modalName === "consentModal") {
        markBannerDismissed();
      }
    },
  })
    // A returning visitor already has valid consent, so `autoShow` does not
    // display anything. Show the banner once at the start of each session
    // instead. `show(true)` is required here: for a visitor with valid
    // consent no modal has been generated yet, and `show()` without the
    // argument would be a no-op. Fresh visitors are still handled by
    // `autoShow` (and by the GPC rule), so this only adds the repeat display.
    .then(() => {
      if (CookieConsent.validConsent() && !bannerDismissedThisSession()) {
        CookieConsent.show(true);
      }
    })
    .catch(() => {
      // If the library cannot start, keep the site usable. Consent stays
      // unset, so the Pixel remains disabled either way.
    });
}
