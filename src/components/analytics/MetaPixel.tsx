import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { grant, init, revoke, trackPageView } from "@/lib/analytics/metaPixel";
import {
  isMarketingAccepted,
  onMarketingConsentChange,
} from "@/lib/consent/cookieConsent";

/**
 * Client-side component that keeps the Meta Pixel in sync with cookie consent.
 *
 * Behaviour:
 *   - Never initialises the Pixel before Marketing consent exists. fbevents.js
 *     is not even requested until then.
 *   - On mount, if Marketing consent was already granted (e.g. returning
 *     visitor with a saved `cc_cookie`), initialises the Pixel and tracks one
 *     PageView for the current route.
 *   - On every subsequent client-side navigation, tracks exactly one PageView
 *     per distinct route — but only while Marketing consent is active.
 *   - Subscribes to consent changes for the lifetime of the page: granting
 *     Marketing consent (re)starts tracking and counts the current view;
 *     withdrawing stops tracking and clears the first-party Meta cookies.
 *
 * The component renders nothing and has no visual presence; it exists only
 * for side effects. It must be placed inside a React Router context so that
 * `useLocation()` works.
 */
export function MetaPixel() {
  const location = useLocation();
  const lastTrackedKey = useRef<string | null>(null);

  // Track the current view on mount (returning visitors) and on every
  // route change. Skipped entirely while Marketing consent is absent, and
  // deduplicated by pathname + search so StrictMode re-mounts and repeat
  // effect runs never double-count.
  useEffect(() => {
    if (!isMarketingAccepted()) return;

    init(); // no-op if already initialised

    const currentKey = `${location.pathname}${location.search}`;
    if (currentKey === lastTrackedKey.current) return;

    lastTrackedKey.current = currentKey;
    trackPageView();
  }, [location]);

  // React to consent transitions for the lifetime of the page.
  useEffect(() => {
    return onMarketingConsentChange((marketingAccepted) => {
      if (marketingAccepted) {
        // Grant (including re-grant after a withdrawal): (re)start the
        // Pixel and count the current view exactly once.
        grant();
        trackPageView();
      } else {
        // Withdraw: stop tracking and clear the Meta cookies we can reach.
        revoke();
      }
    });
  }, []);

  return null;
}
