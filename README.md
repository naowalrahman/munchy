# Munchy

A local food diary built for fast, manual logging. One installable web app runs on Android, macOS, and other modern browsers. SQLite runs in a worker on your device; no account, Supabase, or AI service is required.

## Run

```sh
bun install
bun run dev
```

For the installable offline build:

```sh
bun run build
bun run start
```

Open [localhost:3000](http://localhost:3000). Deploy the generated `out/` directory over HTTPS to install on other devices. Android Chrome offers Install app; Safari on macOS offers File → Add to Dock. Each device stores its own diary. Full JSON backups transfer data between devices; there is no automatic synchronization.

## Food logging

- Search FatSecret, pick a recent food, or create a food from its nutrition label.
- Cmd/Ctrl K opens quick add. Fractional quantities such as `1/2` and `1 1/2` work.
- Meal-specific usuals repeat the last portion in one click. Favorites rise to the top of the food picker.
- Edit amount, serving, date, or meal; duplicate entries; delete with undo; copy the previous day.
- Rename and reorder meals per day, optionally setting the defaults for new days. Existing days retain their meals. Future dates are rejected.
- Recipes include ingredient portions, instructions, tags, batch servings, and optional prepared weight. Ingredient weights are never assumed to equal cooked yield.
- Insights include all 19 documented food-detail nutrients, reporting coverage, trends, contributors, meal averages, water, weight, and notes. Missing values remain unknown. Unlogged days do not become zero-intake days.
- Personal nutrient targets are optional; no demographic or medical assumptions are made.

## FatSecret account requirements

The included proxy uses OAuth 2.0, Basic food search v1, and food details v4. Credentials stay on the proxy VM. Only queries and food IDs leave the device.

FatSecret Basic currently grants US search, up to 5,000 calls/day. It does **not** grant caching. The account supplied during development authenticated for `basic`, but a `premier` request returned `invalid_scope`. The deployed reserved-IP proxy successfully returned live food search and details.

Persistent FatSecret nutrition snapshots and the 200-food offline cache require appropriate storage permission. Set `FATSECRET_STORAGE_PERMISSION=granted` and a permitted `FATSECRET_CACHE_SECONDS` only after verifying that permission with FatSecret. A Premier scope alone is not treated as evidence of indefinite storage rights. With permission pending, the app can search and inspect food data but prevents persisting FatSecret foods. Custom foods and custom-only recipes work fully offline now. Barcode lookup, autocomplete, food images, and FatSecret's recipe catalog are not claimed as Basic features.

Sources: [editions](https://platform.fatsecret.com/api-editions), [storable data](https://platform.fatsecret.com/docs/guides/storable-data), [food v4 nutrients](https://platform.fatsecret.com/docs/v4/food.get).

## Proxy

Live app: [Open Munchy](https://munchy.129.80.164.67.sslip.io). In Settings, save the prefilled proxy address and the token from ignored `secrets/app-access-token.txt`. See [OCI deployment](docs/oci-deployment.md). The Bun proxy provides:

- `/v1/search?q=oats&page=0`
- `/v1/foods/123`
- `/v1/capabilities`
- `/health`

All food endpoints require a private app access token. There is an exact CORS origin allowlist, a 60-request/minute limit per token, a persistent daily upstream budget (default 4,500), OAuth token reuse, one refresh retry, and bounded timeouts. The proxy has no endpoint for user data and stores only request counts by UTC date.

For local proxy development, put credentials in ignored `secrets/client-id.txt` and `secrets/client-secret.txt`, then run:

```sh
bun run scripts/dev-proxy.ts
```

This creates `secrets/app-access-token.txt` if absent. In Settings, use `http://localhost:8787` and that app token. FatSecret still requires whitelisting the outgoing address. Never put OAuth credentials in a public environment variable or the client app.

## Storage and recovery

The SQLite file is atomically persisted in IndexedDB after each transaction. A Web Lock serializes access across tabs; revision checks reject stale writes instead of silently overwriting another window. The previous saved database remains intact if a write fails. The worker performs version checks before opening a database from a newer app.

The food lookup cache holds at most 200 distinct recently logged foods. Evicting a cache entry does not delete historical diary snapshots or recipe ingredients. Logging a new recipe does not rewrite previous logged versions.

Export regular backups in Settings. Proxy tokens are deliberately omitted. Import validates dates, meal membership, serving units, and quantities; it merges records by ID. Matching imported records replace local values, other entries remain, and their meal names are preserved. Browser-managed storage can be cleared or evicted; request persistent storage in Settings and keep backups outside the browser.

The current SQLite persistence implementation exports a database image on each mutation. This keeps recovery simple and is appropriate for a personal diary; very large histories may eventually benefit from a paged OPFS VFS. The UI currently reads the complete local snapshot for analysis.

## Development

```sh
bun run typecheck
bun run lint
bun run test
bun run build
```

- `src/components/`: diary, foods, recipes, insights, settings, shell
- `src/utils/`: typed domain model, units, nutrition, backup validation, SQLite operations
- `public/db-worker.js`: SQLite execution and durable persistence
- `proxy/`: Bun FatSecret service and host configuration
- `scripts/`: assets, static hosting, offline build, local proxy
- `tests/`: unit conversion, missing nutrients, recipe yield, cache eviction, date constraints, API security

Next.js emits a static shell. Interactive components are client components because they access the on-device database; Server Actions cannot mutate storage on the user's device. Fonts and SQLite WASM are bundled locally. The service worker precaches the static shell, never API responses. Updates wait until the app closes or the user selects the update-ready reload button.

The rewrite does not migrate the previous hosted Supabase data or alter that hosted project. Export any data you want to retain from the old deployment before retiring it.
