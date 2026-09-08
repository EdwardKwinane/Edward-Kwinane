# Edward Kwinane — Portfolio

Personal portfolio and blog built with Vite, React, TypeScript, Tailwind CSS and Sanity CMS.

## Stack

- **Frontend:** React 18, Vite 5, TypeScript, Tailwind CSS
- **Routing:** React Router (SPA)
- **Animations:** GSAP
- **CMS:** Sanity Studio (`sanity` v3) + `@sanity/client` for content queries
- **Deployment:** Vercel

## Quick start

```bash
npm install
npm run dev
```

The site works without any configuration — it falls back to placeholder content in
`src/data/`. To pull real content from Sanity, add a `.env` file (see below).

## Environment variables

Copy `.env.example` to `.env` and fill in your Sanity project values:

```
VITE_SANITY_PROJECT_ID=your-project-id
VITE_SANITY_DATASET=production
# VITE_SANITY_API_VERSION=2024-06-04   # optional pin
```

Never commit `.env`. The Studio reads its own config from `sanity/.env`
(`SANITY_PROJECT_ID` / `SANITY_DATASET`).

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
  `isSanityConfigured` (false when `VITE_SANITY_PROJECT_ID` is missing).
- `src/lib/sanity/queries.ts` — GROQ queries + mappers returning the site's own
  domain types (`Project`, `BlogPost`, `Capability`, `Technology`, …).
- `src/data/*.ts` — local placeholder data plus async wrappers
  (`fetchProjects`, `fetchBlogPosts`, `fetchCapabilities`, …) that try Sanity first
  and fall back to the local data when Sanity is unconfigured or empty. This keeps
  every page working even before content is created.
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

## Project structure

```
src/
  data/            placeholder data + Sanity-backed fetch wrappers
  lib/sanity/      client, queries, types, image helpers, PortableText renderer
  pages/           route components (Portfolio, Blog, Capabilities, About, …)
  components/      layout, home sections, portfolio/blog/capability UI
sanity/
  schemaTypes/     Sanity schemas (project, post, capability, …)
  sanity.config.ts Studio config
  sanity.cli.ts    CLI config
```