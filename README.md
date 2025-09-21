# Lottery Lab

Static lottery exploration site built with Astro and React islands. It ships a provable commit-reveal number generator, charts for UK draws, an odds tutor, and GitHub Actions to deploy to Pages and refresh JSON datasets.

## Getting started

```bash
pnpm install
pnpm dev
```

- Astro dev server: <http://localhost:4321>
- React islands mount on demand for charts, tables, and calculators.

## Scripts

- `pnpm build` - generate the static site in `dist/`.
- `pnpm validate:data` - run Zod validation against `/data/*.json`.
- `pnpm test:unit` - execute Vitest unit tests for library helpers.
- `pnpm test:e2e` - run Playwright end-to-end smoke tests (requires `pnpm dev` in another shell).

## Data pipeline

JSON files live in `/data`. `scripts/validate-data.ts` enforces the schema defined in the project brief. `scripts/harvest-results.ts` fetches live draw history from the National Lottery website with Cheerio, normalises the output, and writes updates only when something changes. The scheduled workflow `harvest-results.yml` installs dependencies, runs the harvest script, validates JSON, and commits changes when files differ.

## GitHub Pages deployment

`.github/workflows/pages.yml` builds Astro on pushes to `main` and deploys to GitHub Pages. Set the repository to use the Pages build output and adjust `SITE_URL`/`BASE_PATH` if the project name changes.

## Testing and quality

- Unit tests cover RNG helpers, stats transforms, and EV math.
- A Playwright smoke test confirms the hero renders in production.
- The layout includes landmarks, skip links, and responsible-play messaging per requirements.

## Configuration

Key environment variables consumed during automation:

- `SITE_URL` - full canonical site URL (set in the Pages workflow).
- `BASE_PATH` - GitHub Pages base path (defaults to `/lottery-lab`).

## Legal and responsible play

Copies of official results should always be verified via the National Lottery. The site refrains from claims about improved odds and provides direct links to UK responsible-play organisations.



