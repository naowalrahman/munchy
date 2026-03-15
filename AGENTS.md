## Code Style

- Default to Server Components; use `'use client'` only when needed (hooks, browser APIs)
- Fetch data in Server Components or Server Actions, not `useEffect`
- Use Server Actions for forms/mutations
- Keep files under 400 lines; split large components if it aids clarity
- No `any`; prefer type inference where possible, otherwise define types with interfaces or Zod schemas
- Comments only when high-value; don't narrate to the user

## Structure

- Follow Next.js App Router conventions
- `src/utils` for reusable logic; `src/components` organized by page/feature

## Performance

- Keep client bundle lean; avoid large client-side libraries
- Use `loading.tsx` and Suspense for streaming

## Stack

- **Next.js/React** – use React Compiler + latest Server Action patterns
- **Chakra UI v3** – follow latest styling/theming patterns
- **Supabase** – use `@supabase/ssr` for auth and DB
  - use `bun supabase` command to make any necessary changes to auth/DB config
- **Bun** – runtime and package manager; use `bun run` for scripts

## Cursor Cloud specific instructions

### Services

| Service | Command | Notes |
|---|---|---|
| Next.js dev server | `bun run dev` | Runs on port 3000 |
| Lint | `bun run lint` | ESLint; pre-existing warnings/errors exist in the codebase |
| Build | `bun run build` | Production build via Turbopack |
| Format | `bun run format` | Prettier |

### Environment

- The app connects to a **hosted Supabase** instance (not local). Secrets `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `USDA_API_KEY` must be injected as environment variables.
- A `.env.local` file must be created from those env vars for Next.js to pick them up at runtime. The update script handles this automatically.
- Bun is installed at `~/.bun/bin/bun`; the update script ensures it is on `PATH`.

### Gotchas

- The hosted Supabase instance enforces email confirmation on sign-up. To test auth flows, either confirm users via the Supabase MCP/dashboard or use an already-confirmed account.
- `bun run lint` exits non-zero due to pre-existing `@typescript-eslint/no-explicit-any` and `react/no-unescaped-entities` errors — this is expected and not caused by new changes.
