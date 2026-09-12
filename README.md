# Munchy

Munchy is a local food diary intentionally designed for logging at hyperspeed. You can use it as an installable web app across all of your devices and manually sync to Google Drive as needed. All interactions are instant and private thanks to [sql.js](https://sql.js.org/)!

## Food logging

- Search FatSecret, pick a recent food, or create a food from its nutrition label.
- Your usual foods are automatically detected and displayed for quick logging under each meal.
- Edit amount, serving, date, or meal; duplicate entries; delete with undo; copy the previous day.
- Rename and reorder meals per day, optionally setting the defaults for new days. Existing days retain their meals.
- Recipes include ingredient portions, instructions, tags, batch servings, and optional prepared weight. Ingredient weights are not assumed to equal cooked yield.
- See insights including 19 documented food-detail nutrients, reporting coverage, trends, contributors, meal averages, water, weight, and notes.

## FatSecret account requirements

The included proxy uses OAuth 2.0, Basic food search v1, and food details v4. Credentials are stored on proxy VM. Only queries and food IDs are sent to the proxy.

Persistent FatSecret nutrition snapshots and the offline food cache require appropriate storage permission. Set `FATSECRET_STORAGE_PERMISSION=granted` and `FATSECRET_CACHE_SECONDS` after verifying permission with FatSecret.

Sources: [editions](https://platform.fatsecret.com/api-editions), [storable data](https://platform.fatsecret.com/docs/guides/storable-data), [food v4 nutrients](https://platform.fatsecret.com/docs/v4/food.get).

## Proxy

Live app: [Open Munchy](https://munchy.129.80.164.67.sslip.io). In Settings, save the proxy address and the token from `secrets/app-access-token.txt`. `bun run deploy` publishes the current build there; see [OCI deployment](docs/oci-deployment.md) if you want to host your own proxy with Oracle. The Bun proxy provides:

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

Because FatSecret whitelists only the deployed reserved IP, a local proxy answers `/health` and `/v1/capabilities` but receives FatSecret code 21 for real lookups. For live search while developing, run:

```sh
bun run dev:full
```

This starts a loopback relay on `http://localhost:8787` that forwards `/v1/*` and `/health` to the deployed proxy and then runs `next dev`. The relay doesn't send a browser `Origin` upstream, so the production origin allowlist doesn't change, and it supplies the token from `secrets/app-access-token.txt` when the app sends none. In Settings, save `http://localhost:8787`; you can leave the token field empty. `MUNCHY_UPSTREAM`, `MUNCHY_RELAY_PORT`, `MUNCHY_APP_ORIGIN`, and `MUNCHY_APP_TOKEN` override the defaults.

## Development

```sh
bun install
bun run dev
```

For the installable offline build:

```sh
bun run build
bun run start
```

Open [localhost:3000](http://localhost:3000). Deploy the generated `out/` folder over HTTPS to install on other devices.

Other commands:

```sh
bun run typecheck
bun run lint
bun run test
bun run build
```

Repo structure:

- `src/components/`: diary, foods, recipes, insights, settings, shell
- `src/utils/`: typed domain model, units, nutrition, backup validation, SQLite operations
- `public/db-worker.js`: SQLite execution and durable persistence
- `proxy/`: Bun FatSecret service and host configuration
- `scripts/`: assets, static hosting, offline build, local proxy
- `tests/`: unit conversion, missing nutrients, recipe yield, cache eviction, date constraints, API security
