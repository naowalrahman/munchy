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

- The hosted Supabase instance enforces email confirmation on sign-up. To test auth flows, use the pre-confirmed login
  - Username: testuser@usemunchy.com
  - Password: munchyisthebest
