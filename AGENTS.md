# Project: Munchy

## Best Practices Guidelines

- **Prefer Server Components:** Always default to Next.js Server Components. Only use `'use client'` when absolutely necessary for interactivity (hooks like `useState`, `useEffect`, or browser APIs).
- **Data Fetching:** Perform data fetching in Server Components or via Server Actions. Avoid fetching data in `useEffect` on the client whenever possible.
- **Form Handling:** Use Server Actions for all form submissions and data mutations.
- **File Sizing:** Keeping individual files under 400 lines is recommended for readability and maintainability. When implementing large components or features, consider breaking them down into smaller sub-components in different files if it makes sense for clarity.

## Performance & Optimization

- **Minimize Bundle Size:** Be cautious with large client-side libraries. Leverage Server Components to keep the client-side bundle lean.
- **Efficient Styling:** Utilize Chakra UI v3 effectively, ensuring styles are computed efficiently and avoiding unnecessary re-renders.
- **Streaming & Suspense:** Implement `loading.tsx` and React Suspense to provide a responsive user experience while server-side operations are in progress.

## Type Safety

- **TypeScript Rigor:** Maintain strict type safety across the application. Avoid `any` and ensure all data structures (especially from Supabase and external APIs like USDA) are well-defined with interfaces or Zod schemas.

## Code Structure

- **App Router:** Follow Next.js App Router conventions strictly.
- **Utility Functions:** Place reusable logic in `src/utils`.
- Components should be organized in `src/components` by the page or feature they belong to.

## Tech Stack Specifics

- **Next.js + React:** Leverage the latest features, including the React Compiler and improved Server Action support.
- **Chakra UI v3:** Follow Chakra's latest patterns for styling and theming.
- **Supabase:** Use `@supabase/ssr` for authentication and database interactions, ensuring consistent session management across server and client.
- **Bun:** The project uses Bun as the primary runtime and package manager. Use `bun run` for scripts.

## Comments policy

Only write high-value comments if at all. Avoid talking to the user through comments.
