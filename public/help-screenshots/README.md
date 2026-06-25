# Help screenshots

Localized screenshots shown on the in-app help detail pages
(`/help/:useCaseSlug`).

Layout: `help-screenshots/<locale>/<slug>.png`, e.g.
`help-screenshots/de/create-pool.png`.

These are **generated**, not hand-made. To (re)generate them:

1. Start the app:
   ```bash
   npm run dev          # http://localhost:5173
   # or: npm run preview (http://localhost:4173, after npm run build)
   ```
2. Run the generator against it:
   ```bash
   PLAYWRIGHT_BASE_URL=http://localhost:5173 npm run generate:help-screenshots
   ```

It walks every supported locale (`en sk pl hu it ru zh ko de es`) and every use
case from `src/data/helpUseCases.ts`. Handy flags:

- `--lang en,de` — only some locales
- `--slug create-pool,trade-screen` — only some use cases
- `--full` — full scrollable page instead of the viewport
- `SETTLE_MS=6000` — wait longer for charts/live data before the shot

The help detail page hides the image until the matching file exists, so the app
works fine before the screenshots are generated.
