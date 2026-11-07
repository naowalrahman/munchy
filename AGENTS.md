## Style

- The build is a static export, so there is no server runtime: no Server Components with data, no Server Actions, no route handlers
- `src/app` is the static shell only (`layout.tsx`, `page.tsx`, `loading.tsx`); every interactive component below it is `'use client'`, because the diary lives in on-device SQLite that only the browser can reach
- Read state from `useStore()` in `src/components/shell/Store.tsx`; never fetch app data in `useEffect`
- Mutate with `run(() => statements)`, building the statements with the validating builders in `src/utils/db/operations.ts` (never inline SQL in components); the worker replies with a fresh `Snapshot` that replaces state, so don't hand-patch local copies. `run` reports failures itself and resolves to whether the change was saved
- Validate anything crossing a boundary (worker rows, proxy responses, imported backups) with the Zod schemas in `src/utils/model.ts`
- Style with plain CSS classes in `src/styles/*.css`, imported via `src/app/globals.css`; no CSS-in-JS and no component library
- Keep files under 400 lines; split large components if it aids clarity
- Comments only when high-value; don't narrate to the user
- Don't use commit message descriptions

## TypeScript

- Simplest correct code wins: no speculative abstractions, wrappers, or options nobody uses yet
- Follow the existing patterns in neighboring files before introducing a new one
- No `any`, no non-null `!`, no casts to silence errors; prefer inference, otherwise interfaces or Zod schemas
- Encode invariants in types (e.g. non-empty tuples in `model.ts`) instead of re-checking them at every use
- Validate at boundaries only; inside the app, trust the types and skip defensive checks for impossible states
- Extract shared logic once it is duplicated; delete dead code rather than leaving it exported
- `tsconfig.json` runs `strict`, `noUncheckedIndexedAccess`, and `exactOptionalPropertyTypes`: handle the `undefined` from index access, and type optional props as `?: T | undefined` when callers pass `undefined` explicitly
- Suppress a lint rule only inline with `biome-ignore` and a reason
- For React/Next.js work, use the `vercel-react-best-practices` skill in `.claude/skills/`

## Structure

- Follow Next.js App Router conventions
- `src/utils` for reusable logic; `src/components` organized by page/feature

## Performance

- Keep client bundle lean; avoid large client-side libraries
- First paint is covered by `src/app/loading.tsx` and the boot state in `Store.tsx`; static export means there is no server streaming to lean on

## Stack

- **Next.js/React** – App Router with React Compiler; `output: "export"` in `next.config.ts`
- **SQLite** – `sql.js` running in a worker (`src/utils/db/worker.ts`, built to `public/db-worker.js` by `bun run assets`), persisted to IndexedDB; reach it through `src/utils/db/`
- **FatSecret** – food search and details via the Bun proxy in `proxy/`; the client calls only that proxy, configured in Settings
- **Bun** – runtime and package manager; use `bun run` for scripts

## Verification

- Biome formats, organizes imports, and lints; ESLint adds Next.js, React Hooks, type-aware promise rules, and blank-line spacing around declarations and multi-line statements (`bun run format` applies it); Knip finds unused files, exports, and dependencies
- Separate CSS rules with a blank line, and in component bodies separate the hooks from the values derived after them
- After changes, run `bun run format`, then `bun run check` (Biome, ESLint, `tsc`, Knip, tests); it must pass before you finish
- Narrower scripts: `bun run lint`, `bun run typecheck`, `bun run knip`, `bun run test`
