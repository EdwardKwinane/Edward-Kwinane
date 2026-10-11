# Project Memory

Durable context for agents working on this repository. Follows the REMEMBER mode in
[`SKILL.md`](./SKILL.md). Store durable facts and decisions, not transcripts. **No secrets.**

## Intent

Edward Kwinane's personal portfolio and blog: AI engineer / digital architect positioning.
Content lives in Sanity so it is editable without a deploy. The site is deployed to Vercel
from `main`.

## Current State

As of `9ed4516` the site is fully CMS-driven. Sanity (`78vf85td` / `production`) is the
**only** runtime source of content — there is no local fallback.

- **Seeded dataset:** 22 technology, 5 capability, 5 project, 7 post, 1 siteSettings
  (40 content documents including drafts). The dataset also holds a 7th post that is not in
  `src/data/blog.ts`, so `blogFilterCategories` and the seed array are already behind the CMS.
- `siteSettings` is the single source for hero copy, availability text, owner name, role
  line, hero tags, footer copy, social URLs and default SEO metadata.
- All list items carry a `_key`, so Studio can edit every seeded document.
- Placeholder content is clearly labelled and **has not been replaced with real work yet:**
  all 5 projects are `status: "placeholder"` with a null `fullDescription`, and 6 of 7 posts
  carry `placeholder: true`. Note the flag is `status: "placeholder"` on projects, not the
  `placeholder: true` boolean — querying only the boolean reports 0 and looks like progress
  that has not happened.

**Live at** `https://edward-kwinane.vercel.app`. `edwardkwinane.com` does **not** resolve;
`robots.txt` and `sitemap.xml` still point at it until PR #4 merges.

Four PRs are open against `main`:
- **#4 `feat/seo-foundations`** — canonical URLs, `og:image`, JSON-LD, sitemap/robots domain.
- **#5 `fix/a11y-contrast-and-targets`** — WCAG contrast, footer tap targets, skip link,
  heading skip, dead-code removal. Now also carries the site-wide contrast sweep (see below).
- **#6 `docs/project-memory`** — this file.
- **#10 `docs/vercel-deploy-guard`** — records the hand-promotion hazard in the README.

PRs #7 (Tools & Technologies marquee), #8 (About glassmorphism + profile photo) and #9
(LinkedIn URL) are merged and deployed.

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
src/data/tool-stack.ts     typed, vendored brand marks for the marquee (no CMS, no network)
src/components/ui/LogoMarquee.tsx  reusable children-based infinite marquee
src/components/home/ToolsSection.tsx  "Tools & Technologies" block on the homepage
public/images/profile.png   About profile photo (transparent cut-out, recomposed)
```

`Navbar.tsx` is the single source of truth for main navigation. It is a centred
floating pill that collapses to a 48px menu button after ~150px of downward
scroll and re-expands after ~80px upward, using `framer-motion`'s `useScroll` /
`useMotionValueEvent`. `BlogCard` likewise serves all three of its call sites
(blog grid, related posts, homepage preview) because those contexts differ only in
their parent grid.

`LogoMarquee` is deliberately **generic and children-based**: the caller passes the logo row
once and the component renders it twice internally to make the loop seamless, so callers must
not duplicate the array. Position is integrated from the frame delta rather than driven by a
repeating tween, so changing speed on hover never restarts or re-seeks the animation. Under
`prefers-reduced-motion` it renders a static wrapped row instead. It measures one copy with a
`ResizeObserver` and translates by exactly that width, which is why the trailing padding of a
copy must equal the gap between its items.

`tool-stack.ts` is **not** CMS-backed and deliberately so. The 22 `technology` documents in
Sanity are placeholder concepts derived from placeholder projects (`WebRTC`, `STT`, `Vector
DB`), not real brands, so the marquee ships verified brands vendored from Simple Icons and
rendered with `currentColor` so one fill covers both themes.

`sanity/` contains a real, pre-existing Studio. **Never scaffold or overwrite it.**

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

- **Accent has three roles and cannot be one colour.** `--c-accent` (#FE5900) cannot both
  carry white text as a fill (needs 4.5:1) and be readable as text on a surface: darkening
  helps on light backgrounds and *hurts* on dark ones. So `--c-accent-fill` (#C74300, both
  themes) carries white text, `--c-accent-dark` (#C44500 light / #FF6A1A dark) is accent
  text, and `--c-accent` stays decorative. Do not collapse these back into one token.
  *Reason:* white on #FE5900 measured 3.16:1 and accent text on `--surface` 3.01:1.
  *Date:* 2026-10-04, PR #5

- **SEO metadata is injected by `Seo.tsx` in a `useEffect`, so it is absent from the initial
  HTML.** Social tags are therefore also declared statically in `index.html`. Canonical and
  `og:url` derive from `window.location.origin`, so attaching a custom domain later only
  requires editing `robots.txt` and `sitemap.xml`.
  *Date:* 2026-10-04, PR #4

- **Muted text uses a single ink opacity, `text-ink/65`.** An audit that alpha-composites
  every translucent ancestor found 165 AA failures site-wide, almost all from four utility
  steps — `text-ink/40`, `/45`, `/50`, `/55`, `/60` — measuring 2.5–4.4:1 against the 4.5:1
  required for body text. Solving for the minimum passing alpha per element, in **both**
  themes, gave one consistent answer: everything needs the ink token at ≥ 0.62. All four
  steps collapse to `/65`, which the expertise copy already used, so no new value is
  introduced. 57 occurrences across 26 files.
  *Reason:* the same fix at one value clears both themes, so no per-theme branching is needed.
  Four cases could not use any ink alpha and took individual values: the big index numerals
  (`text-ink/50`, 3:1 bar for 30–72px bold), the ProjectCard placeholder badge (white, it
  overlays a cover that composites to dark navy in both themes), and ArchitectureNode's active
  detail (full white).
  *Consequence:* do not reintroduce sub-0.62 ink opacities for text. Borders, dividers and
  `bg-`/`ring-` uses of the pale tokens are unaffected — only `text-ink/NN` is constrained.
  *Date:* 2026-10-11, PR #5

- **Glassmorphism lives as four CSS utilities, not a component library.** `.glass-field`
  (the wash), `.glass-panel`, `.glass-card` and an `@supports not (backdrop-filter)`
  fallback live in `@layer components` beside `.card-surface`. Every colour is a token, with
  separate `.dark` values because a full-strength white top-edge reads as a seam on a dark
  panel.
  *Reason:* a backdrop-blurred panel is invisible over a flat fill, so the field has to supply
  something to blur. Shadows use `--c-navy-deep` because `--c-navy` inverts to near-white in
  dark, which would produce a glow rather than a shadow.
  *Consequence:* the project uses **no `dark:` Tailwind variants anywhere** — dark mode is done
  with `.dark` selector rules. Do not introduce `dark:` variants; they are not the convention.
  *Date:* 2026-10-10, PR #8

- **The About profile photo is a transparent-background cut-out, so padding must stay
  transparent.** `man.png` has alpha 0 in its corners; the head already touches the top edge
  (y=4), so no crop can create headroom. `public/images/profile.png` is that same image
  recomposed on a **transparent** canvas with headroom above the head, cropped
  head-and-shoulders from measured alpha bounds (head y 4–360, widest x 292–553) and
  downsampled to 256px — 4× the 64px display tile.
  *Reason:* padding with white would render as a white box on the dark theme.
  *Consequence:* regenerate with that method if the photo is ever replaced. `man.png` itself
  is a local working file and stays untracked.
  *Date:* 2026-10-10, PR #8

## Constraints

- `main` is the production branch. Branch, commit, push — Vercel deploys automatically. **Never
  promote a deployment to production by hand**, and that means *both* `vercel --prod` and
  `vercel redeploy <url>`.
  *Reason:* on 2026-10-11 `vercel redeploy` re-promoted the preview built from
  `feat/seo-foundations` (open, unmerged PR #4) to production, silently dropping the
  already-merged Tools & Technologies section. The deployment carried
  `meta.githubCommitRef: feat/seo-foundations` and `meta.action: "redeploy"`.
  *Corroboration:* the Vercel Git integration is **not** at fault — every feature branch
  auto-deploys as a preview, verified across all recent deployments. So there is no project
  setting to change; the control is process. Do not "fix" this by altering production or Git
  settings, which would risk a correctly-configured auto-deploy.
  *Recovery:* `git checkout main && git pull && vercel --prod`, though the next merge to
  `main` overwrites any hand-made deployment anyway.
  *Date:* 2026-10-11, PR #10
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
- **The global `* { border-color: var(--surface-pale-3) }` rule in `index.css` masks missing
  border-colour tokens.** Any element that sets a border width without a colour silently
  inherits pale-3 instead of failing visibly. Removing it would surface future omissions but
  changes appearance everywhere; untested.
- **`fetchArray` / `fetchOne` swallow errors and return `[]` / `null`.** A CMS outage is
  therefore indistinguishable from genuinely empty content — pages render "no items" with no
  error state. `console.warn` is the only signal.
- **The `vercel.json` SPA rewrite returns HTTP 200 for unknown paths**, so every 404 is a
  soft 404.
- **`experience`, `testimonial` and `technology` schemas are registered in Studio but nothing
  renders them.** `getSanityExperience()`, `getSanityTestimonials()` and
  `getSanityTechnologies()` have working GROQ and no consumers, and `src/data/technologies.ts`
  has no CMS fetcher at all. Content entered in Studio for these types is invisible on the site.
- **Outbound Sanity access from the agent sandbox is intermittent** (proxy 404s, no ICMP).
  A failed fetch looks identical to a code bug; check `curl` the GROQ URL before investigating.
- A contrast checker must **alpha-composite translucent backgrounds** before computing a
  ratio. Comparing raw RGB of `bg-accent/10` against same-coloured text yields a spurious
  ratio of exactly 1.0.
- **A contrast checker must also start the background walk at the element itself, not its
  parent.** A button carries its own `bg-accent`, so skipping it makes white button text read
  1.0:1 against the page and every accent button looks broken.
- **A contrast checker must read theme tokens inside the themed page.** Reading `--c-ink` once
  and reusing it for both themes silently applies light-theme ink to dark surfaces and reports
  ~1.03:1 for values that actually pass.
- **Toggling Tailwind classes at runtime to test candidates does not work.** Tailwind only
  emits classes it found in the source, so an injected `text-ink/25` is a no-op and every
  candidate measures identically. Set `element.style.color` with explicit RGB instead.
- **Dead modules confirmed:** `src/hooks/use-reduced-motion.ts` and `src/components/ui/Card.tsx`
  have no importers, and `.card-surface` / `.card-pale` in `index.css` are referenced by no
  component. Note `.flow-line` looks unused in JSX but *is* live — `gsap.ts` selects it via
  `querySelector`, so grepping className in `.tsx` files alone will produce false positives.
- **During the hero architecture's orange pulse, the 10px node detail dips to ~3.9:1.** It is a
  decorative 0.4s animation frame, clean under `prefers-reduced-motion`, and removing it would
  mean snapping the cross-fade instead of tweening it. Accepted deliberately.

## Verification

On `9ed4516` (`npm run typecheck`, `npm run build`, `npm run verify:seed`) all pass.

Browser behaviour was verified by driving the locally installed Chrome with `playwright-core`
from a scratch directory outside the repo, so no test dependency is added to the project.
Suites used: 216 navigation checks, 42 responsive/theme smoke checks, 41 SEO assertions,
and an alpha-composited contrast sweep. All green against dev, dev-with-env, and production.

Note: `vite preview` serves a build **without** the Sanity env vars, so CMS-dependent pages
render empty there. For those, either run `set -a; . ./.env; set +a` before `npm run build`, or
test against the dev server.

**The contrast sweep is the reusable tool here.** Walk every route in both themes, require
`networkidle` first (a Sanity outage renders empty content and would look like a regression),
then for each element that directly renders text: composite its translucent background stack,
compute the ratio, and skip anything below 4.5:1 (3:1 for ≥24px or ≥18.66px bold). Run it once
with `reducedMotion: "reduce"` for the steady state and once with animation running — the
difference is the transient frame described under Known Risks. Scan `main` before starting:
it produced 165 failures; PR #5 brings that to 0.

## Open Questions

- Real project case studies and blog posts are still placeholders and need the user's real
  content.
- `siteSettings.email` is unset, so the footer contact link is intentionally hidden.

- **The contact form cannot receive anything.** `ContactForm.tsx` simulates submission with a
  `setTimeout`, and it says so in its own success message and helper text. Every primary CTA
  funnels there, so no leads can be captured. A destination endpoint must be chosen by the
  user; do not guess a provider.
- `sitemap.xml` is hand-maintained and has already drifted once (a post was missing). It holds
  17 URLs against 9 routes today; PR #4 verified all of them, but nothing prevents future drift.
- **LinkedIn and GitHub URLs are now resolved.** `linkedinUrl` is
  `https://www.linkedin.com/in/edward-kwinane` (user-confirmed in a browser) and `githubUrl`
  is `https://github.com/edwardkwinane`, which the GitHub API confirms as the account
  `EdwardKwinane` named "Edward Kwinane" that owns this repo. Neither needs attention.
  *Note:* `linkedin.com` bot-challenges every request from the agent sandbox (reCAPTCHA or
  HTTP 999, including for a known-good control profile), so that URL cannot be verified
  programmatically here — only in a real browser.

## Next Action

Review and merge PR #4 and PR #5 — they touch disjoint files and can merge in either order.
PR #5 has been updated with the site-wide contrast sweep and now has `main` merged into it,
so it also carries the merged homepage work; check its 33-file diff rather than treating it
as the small a11y patch it started as. PR #10 and PR #6 are documentation and can land any
time.

Then get the user's decision on the contact-form endpoint, which blocks the single largest
conversion gap.

Beyond that, replace the placeholder projects and articles with real content in Studio
(`npm run studio`) — all five projects are still `status: "placeholder"` with empty
descriptions, and six of seven posts are placeholders, which remains the main credibility
risk on a portfolio whose job is proof.