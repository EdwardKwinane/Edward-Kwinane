# Edward Kwinane — Portfolio

Personal portfolio and blog built with Vite, React, TypeScript, Tailwind CSS and Sanity CMS.

> Working on this repo as an agent? Read [`PROJECT_MEMORY.md`](./PROJECT_MEMORY.md) first — it
> records the decisions and constraints that are easy to get wrong.

## Stack

- **Frontend:** React 18, Vite 5, TypeScript, Tailwind CSS
- **Routing:** React Router (SPA)
- **Animations:** GSAP
- **CMS:** Sanity Studio (`sanity` v3) + `@sanity/client` for content queries
- **Deployment:** Vercel

## Developer setup (macOS)

Full setup from a clean MacBook. GitHub is the source of truth; Vercel builds from GitHub.

```bash
# 1. Requirements — Node 24 LTS (matches the Vercel project's Node 24.x) and npm
#    The official installer also adds nvm to your shell profile:
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
nvm install 24 && nvm alias default 24
node --version    # v24.x — open a new terminal afterwards

# 2. Clone the existing repository (never re-initialise it)
cd ~/Developer
gh repo clone EdwardKwinane/Edward-Kwinane
cd Edward-Kwinane

# 3. Install dependencies with the repo's package manager (package-lock.json → npm)
npm ci

# 4. Create local env file
cp .env.example .env    # then fill in VITE_SANITY_PROJECT_ID

# 5. Run
npm run dev             # site  → http://localhost:5173
npm run studio          # Studio → http://localhost:3333
```

`npm run dev` uses Vite's default port (5173). The only package manager this repo uses is
npm — do not introduce pnpm/yarn, as `package-lock.json` is the committed lockfile.

### Checks

There is no lint script and no unit test runner. The available checks are:

```bash
npm run typecheck   # tsc for the app and the Sanity Studio
npm run build       # typecheck + production build to dist/
npm run preview     # serve the production build locally
npm run verify:seed # 26 checks that the seeded documents map onto the site correctly
```

`verify:seed` is not a unit test suite — it builds the expected documents with
`scripts/seed-documents.mjs`, serves them through a stub of `src/lib/sanity/queries.ts`, and
asserts the mappers output the site's domain types unchanged. It compares only the fields the
queries project, so it cannot see anything they drop.

### Day-to-day workflow

`main` is the production branch. Branch, commit, push — Vercel deploys automatically.

```bash
git pull                                  # sync before starting
git checkout -b feature/sanity-content     # feature/<short-description>
npm run dev
npm run typecheck && npm run build
git add -A && git commit -m "feat: …"
git push -u origin feature/sanity-content  # → Vercel preview deployment
# test the preview URL, then open a PR and merge to main → production deploy
```

### How GitHub connects to Vercel

`EdwardKwinane/Edward-Kwinane` is linked to the Vercel project `edward-kwinane`
(team `eddiction-ai`). Pushing to `main` builds on Vercel and updates
<https://edward-kwinane.vercel.app>; other branches get preview deployments. Never run
`vercel --prod` — GitHub stays the source of truth.

To inspect the Vercel project locally:

```bash
vercel link --project edward-kwinane --scope eddiction-ai
vercel project inspect edward-kwinane --scope eddiction-ai
vercel env ls --scope eddiction-ai
```

Build command is `npm run build`, framework preset Vite, Node 24.x, and the Sanity
environment variables are configured on the Vercel project (not in the repo).

## Quick start

```bash
npm ci
npm run dev
```

Content is fetched from Sanity on every page load. Set `VITE_SANITY_PROJECT_ID` (see below) to
see real content; without it the pages render empty, because the local arrays in `src/data/`
are the seed source only and are never served as a runtime fallback.

## Environment variables

Copy `.env.example` to `.env` and fill in your Sanity project values:

```
VITE_SANITY_PROJECT_ID=your-project-id
VITE_SANITY_DATASET=production
# VITE_SANITY_API_VERSION=2024-06-04   # optional pin
```

Never commit `.env`. The Studio reads its own config from `sanity/.env`
(`SANITY_STUDIO_PROJECT_ID` / `SANITY_STUDIO_DATASET`), which is generated from the root
`.env` by `scripts/prepare-env.mjs` every time you run a `studio` script.

## Content management (Sanity CMS)

The site's projects, blog posts, capabilities, technologies, experience, testimonials
and site settings are managed through Sanity Studio.

### Run the Studio locally

```bash
npm run studio
```

### Deploy the Studio

```bash
npm run studio:build   # local production build preview
npm run studio:deploy  # deploy to manage.sanity.io studio host
```

### Editing content

1. Open the Studio (see above) and sign in.
2. Content collections, in order:
   - **Site Settings** — global metadata, hero copy, availability, social/contact URLs.
   - **Projects** — case studies. Each project has card fields (title, category,
     status, technologies, cover image) plus detailed case-study sections
     (problem, requirements, solution, architecture, implementation, challenges,
     results, lessons learned) and related projects.
   - **Blog Posts** — rich-text body (headings, lists, quotes, code blocks, images),
     table of contents is generated automatically from `H2` headings, reading time is
     estimated from word count.
   - **Capabilities, Technologies, Experience, Testimonials** — supporting content.
3. Publish. Changes appear on the deployed site automatically (Content Lake CDN
   cache TTL applies); the site fetches fresh content on each page load.

### How content flows to the site

- `src/lib/sanity/client.ts` — configured `@sanity/client` instance guarded by
  `isSanityConfigured`, pinned to `perspective: "published"` so drafts cannot leak.
- `src/lib/sanity/queries.ts` — GROQ queries + mappers returning the site's own
  domain types (`Project`, `BlogPost`, `Capability`, `Technology`, …).
- `src/data/*.ts` — async fetchers (`fetchProjects`, `fetchBlogPosts`, `fetchCapabilities`,
  …) that read Sanity and nothing else. The local arrays in these files are the **seed source**
  for `npm run seed`, not a runtime fallback: a failed fetch returns an empty list and logs
  the error rather than quietly serving stale content.
- `src/data/site.tsx` — `siteDefaults` plus `fetchSiteSettings`, a context provider and a
  hook. Fetched once at app root and consumed by the hero, navbar, final CTA, footer and SEO
  components. `siteDefaults` is also what the seed writes, so the copy is defined once and a
  partially filled document cannot blank the site.
- Pages and home sections load via `useEffect` + `useState` with light loading
  states, so nothing blocks on the network.

### Schema / model notes

- A `Project` maps its status (`shipped`, `in-production`, `building`) to the site's
  `SHIPPED` / `IN PRODUCTION` / `BUILDING` / `PLACEHOLDER` badges. Pick "placeholder"
  to show a "Placeholder content" badge until the real work is added.
- Blog `body` is Portable Text (`@portabletext/react`); the code-block object type
  is rendered as a `<pre><code>` block.
- No secrets should ever be stored in Sanity. Contact-email etc. are plain strings.

## Scripts

| Script               | Description                                   |
| -------------------- | --------------------------------------------- |
| `npm run dev`        | Start the Vite dev server                     |
| `npm run build`      | Typecheck + production build                  |
| `npm run typecheck`  | Typecheck app + Sanity Studio                 |
| `npm run preview`    | Preview the production build                  |
| `npm run studio`     | Run Sanity Studio locally                     |
| `npm run studio:build` | Build the Studio for production            |
| `npm run studio:deploy` | Deploy the Studio to Sanity               |
| `npm run seed`       | Write the seeded documents to Sanity          |
| `npm run verify:seed` | Check the seeded documents map to site types |
| `npm run repair:keys` | Add missing `_key` to list items in the dataset |

### Seeding content

The dataset was seeded from the local arrays in `src/data/`:

```bash
npm run seed -- --dry-run   # report what would be written
npm run seed                # create missing documents only
npm run seed -- --overwrite # rewrite every seeded document — discards Studio edits
```

Documents get deterministic IDs (`technology-<slug>`, `capability-<id>`, `project-<slug>`,
`post-<slug>`) so re-seeding updates rather than duplicates. Dotted IDs are avoided on
purpose; see [`PROJECT_MEMORY.md`](./PROJECT_MEMORY.md).

Two rules the seed enforces, because breaking them breaks the Studio or the site:

- **Every object item in a list needs a `_key`.** Documents created through the mutations API
  do not get one automatically, and Studio then refuses to edit the list ("Missing keys").
  `ensureArrayKeys` in `scripts/seed-documents.mjs` adds them. For documents already in the
  dataset use `npm run repair:keys` (`--dry-run` supported).
- **A post needs `publishedAt`** to appear publicly. Both post queries filter on it, so a
  post without it is a draft that never shows up.

## Project structure

```
src/
  data/            Sanity fetchers, site defaults, and the seed source arrays
  lib/sanity/      client, queries, types, image helpers, PortableText renderer
  pages/           route components (Portfolio, Blog, Capabilities, About, …)
  components/      layout, home sections, portfolio/blog/capability UI
sanity/
  schemaTypes/     Sanity schemas (project, post, capability, …)
  sanity.config.ts Studio config
  sanity.cli.ts    CLI config
scripts/
  seed-*.mjs       document builder and authenticated seeding CLI
  verify-seed.mjs  mapping regression harness
  repair-keys.mjs  adds missing _key to existing documents
  prepare-env.mjs  generates sanity/.env for the Studio
PROJECT_MEMORY.md  durable context and decisions for agents
```