# Project Memory

Durable context for agents working on this repository. Follows the REMEMBER mode in
[`SKILL.md`](./SKILL.md). Store durable facts and decisions, not transcripts. **No secrets.**

## Intent

Edward Kwinane's personal portfolio and blog: AI engineer / digital architect positioning.
Content lives in Sanity so it is editable without a deploy. The site is deployed to Vercel
from `main`.

## Current State

As of `c1accfb`, the site is fully CMS-driven. Sanity (`78vf85td` / `production`) is the
**only** runtime source of content — there is no local fallback.

- **Seeded dataset:** 22 technology, 5 capability, 5 project, 6 post, 1 siteSettings
  (41 content documents including drafts).
- `siteSettings` is the single source for hero copy, availability text, owner name, role
  line, hero tags, footer copy, social URLs and default SEO metadata.
- All list items carry a `_key`, so Studio can edit every seeded document.
- Placeholder content is clearly labelled (`status: "placeholder"`, `placeholder: true`) and
  **has not been replaced with real work yet.**

## Architecture

```
src/lib/sanity/client.ts    @sanity/client, useCdn, perspective: "published"
src/lib/sanity/queries.ts   GROQ + mappers to the site's own domain types
src/data/*.ts(x)            fetchers (CMS only) AND the seed source arrays
src/data/site.tsx           siteDefaults + fetchSiteSettings + provider + hook
scripts/seed-documents.mjs  pure document builder, exported for the verifier
scripts/seed-sanity.mjs     authenticated CLI wrapper
scripts/verify-seed.mjs     26-check mapping regression harness
scripts/repair-keys.mjs     adds missing _key to documents already in the dataset
src/components/layout/Navbar.tsx  the site's only navigation
```

`Navbar.tsx` is the single source of truth for main navigation. It is a centred
floating pill that collapses to a 48px menu button after ~150px of downward
scroll and re-expands after ~80px upward, using `framer-motion`'s `useScroll` /
`useMotionValueEvent`. `sanity/` contains a real, pre-existing Studio. **Never
scaffold or overwrite it.**

## Decisions

- **The navbar animates its width from a measured pixel value, never `"auto"`.**
  The pill holds an inner `w-max` row whose border-box width is tracked with a
  `ResizeObserver`, and the pill animates to that number.
  *Reason:* three separate defects came from animating `width` to `"auto"` or
  measuring the wrong box. Resolving `"auto"` mid-animation reads the element's
  current (possibly already-clipped) width, so the pill never re-opened;
  `ResizeObserverEntry.contentRect` is the content box, so the row's own padding
  was missing and children were squeezed (the availability label wrapped to three
  lines, the theme toggle collapsed to 20px); and with the row shrinkable, the
  pill's `max-width` clamp squeezed the row, the observer measured the squeezed
  width and the pill locked at the clamp. `shrink-0` on the row breaks that loop,
  and `document.fonts.ready` triggers a re-measure because the webfont lands
  after first layout.
  *Consequence:* the pill is never `auto`; the header must stay
  `display: flex; justify-center` or the pill falls back to being left-aligned.
  *Date:* 2026-10-04

- **The collapsed row is hidden with `visibility`, not `display`.** It keeps its
  measured width stable and still removes itself from the tab order, the
  accessibility tree and hit testing. Because hiding a focused control drops
  focus to `<body>`, focus is handed to whichever control survives the transition
  (menu button when collapsing, brand link when expanding).
  *Reason:* `display: none` would change the row's measured width and re-trigger
  the measurement loop; blocking collapse while focus was inside the pill meant a
  mouse user who clicked the theme toggle could never collapse it again.
  *Date:* 2026-10-04

- **Sanity is the only runtime source.** Previously a failed fetch silently served local
  copy. Now a failure yields an empty list plus a console error.
  *Reason:* silent stale content reads as success and hides CMS outages.
  *Consequence:* if Sanity is unreachable, content pages go empty.
  *Date:* 2026-10-04, `445ddf0`

- **Local arrays in `src/data/` are retained as the seed source only.** Deleting them would
  break `npm run seed` and the verifier's expected values.
  *Date:* 2026-10-04, `445ddf0`

- **Deterministic, hyphenated `_id`s** (`technology-<slug>`, `capability-<id>`,
  `project-<slug>`, `post-<slug>`).
  *Reason:* a controlled probe showed dotted IDs were not visible to anonymous reads in this
  project, so 38 seeded documents were invisible on the live site. Re-seeded as hyphens and
  the dotted documents were deleted.
  *Caution:* that visibility behaviour was observed empirically here, not confirmed as
  general Sanity behaviour. Treat it as a project constraint, not a platform rule.

- **Seed defaults to `createIfNotExists`.** `--overwrite` discards Studio edits.
  *Date:* 2026-10-04

- **Auth comes from the Sanity CLI** (`~/.config/sanity/config.json`), not a flag. A
  `seed:studio` script using `--with-user-token` was inert and has been removed.

- **Posts require `publishedAt`, and both list queries filter on it.** An earlier post had no
  `publishedAt` and appeared publicly while Studio showed it as a draft.
  *Date:* 2026-10-04, `3e27204`

- **Public client is pinned to `perspective: "published"`** so drafts cannot leak.

- **Social links render only when a URL is set**, and the footer mailto is hidden while
  `email` is empty. No placeholder profile URLs or invented email address are shipped.

- **Placeholder content is never to be replaced with invented professional claims.** Real
  project narratives, metrics and articles must come from the user.
  *Date:* 2026-10-04

## Constraints

- `main` is the production branch. Branch, commit, push — Vercel deploys automatically. Never
  run `vercel --prod`.
- npm only. `package-lock.json` is the committed lockfile.
- Never commit `.env` or any token.
- Do not scaffold, overwrite or restructure the existing `sanity/` Studio.
- The page is Sanity-driven, so any navbar copy comes from `useSiteSettings()` — do not
  hard-code the owner name, role line or availability text.
- GSAP (already used for scroll reveals) and Framer Motion (navbar only) coexist. Keep it
  that way: GSAP owns page animations, Framer Motion owns the navbar. Measured bundle cost
  of adding Framer Motion was ~1.5 kB gzip.
- Preserve the lossless Portable Text mapping. Earlier hardcoded mappers silently dropped
  fields (`slug` was returned as an object, capability fields were unused, `featured` was
  ignored).
- Every object item in a schema list needs `_key` or Studio refuses to edit the list.
- Keep `siteDefaults` in `src/data/site.tsx` as the single definition of the copy: the seed
  writes it and the runtime falls back to it per field, so a partial document cannot blank
  the site.

## Known Risks

- **Both Sanity's CDN and the browser cache can hold stale content for minutes after a Studio
  edit.** This caused a false "sentinel bug" hunt. Before believing a content bug, re-check
  the raw dataset, then the exact GROQ URL, then a browser with a fresh `--user-data-dir`.
- **`scripts/verify-seed.mjs` uses hand-written stubs keyed on exact query strings.** Any
  change to a GROQ query must be mirrored there or the harness silently verifies the wrong
  thing.
- The verifier compares projected fields, so it is blind to anything the queries do not
  project. The `_key` assertion exists precisely because of this.
- A Sanity dataset write can take 2–5+ minutes to appear through the CDN.
- There is no lint script and no unit test runner. `typecheck`, `build` and `verify:seed` are
  the available checks.

## Verification

Last run on `c1accfb`: `npm run typecheck`, `npm run build`, `npm run verify:seed` (26 checks)
and `npm run seed -- --dry-run` all passed. All 9 routes rendered byte-identical to the
pre-change baseline on desktop and mobile.

## Open Questions

- Real project case studies and blog posts are still placeholders and need the user's real
  content.
- `siteSettings.email` is unset, so the footer contact link is intentionally hidden.
- The GitHub and LinkedIn URLs currently in the dataset are unverified guesses.

## Next Action

Replace the placeholder projects and articles with real content supplied by the user, in
Studio (`npm run studio`). If the user prefers, delete the six placeholder posts instead.