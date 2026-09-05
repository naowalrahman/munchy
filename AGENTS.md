## Code Style

- The build is a static export, so there is no server runtime: no Server Components with data, no Server Actions, no route handlers
- `src/app` is the static shell only (`layout.tsx`, `page.tsx`, `loading.tsx`); every interactive component below it is `'use client'`, because the diary lives in on-device SQLite that only the browser can reach
- Read state from `useStore()` in `src/components/shell/Store.tsx`; never fetch app data in `useEffect`
- Mutate by passing SQLite `Statement[]` to `run()`; the worker replies with a fresh `Snapshot` that replaces state, so don't hand-patch local copies
- Validate anything crossing a boundary (worker rows, proxy responses, imported backups) with the Zod schemas in `src/utils/model.ts`
- Style with plain CSS classes in `src/styles/*.css`, imported via `src/app/globals.css`; no CSS-in-JS and no component library
- Keep files under 400 lines; split large components if it aids clarity
- No `any`; prefer type inference where possible, otherwise define types with interfaces or Zod schemas
- Comments only when high-value; don't narrate to the user

## Structure

- Follow Next.js App Router conventions
- `src/utils` for reusable logic; `src/components` organized by page/feature

## Performance

- Keep client bundle lean; avoid large client-side libraries
- First paint is covered by `src/app/loading.tsx` and the boot state in `Store.tsx`; static export means there is no server streaming to lean on

## Stack

- **Next.js/React** – App Router with React Compiler; `output: "export"` in `next.config.ts`
- **SQLite** – `sql.js` running in `public/db-worker.js`, persisted to IndexedDB; reach it through `src/utils/db/`
- **FatSecret** – food search and details via the Bun proxy in `proxy/`; the client calls only that proxy, configured in Settings
- **Bun** – runtime and package manager; use `bun run` for scripts
