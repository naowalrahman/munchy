# Munchy

A calorie tracking application that helps you log meals, track nutrition, and monitor your daily calorie intake. Munchy uses AI-powered food logging and integrates with the USDA FoodData Central API for accurate nutritional information.

## Features

- AI-powered food logging with natural language descriptions (in progress)
- Food search using USDA FoodData Central API
- Daily nutrition tracking with meal organization (breakfast, lunch, dinner, snacks)
- Calorie calculation using the Mifflin-St Jeor equation
- User profile with customizable goals
- Daily summary with nutrition facts
- Authentication and user management via Supabase

## Tech Stack

- Next.js 16 (App Router)
- React 19
- TypeScript
- Chakra UI v3
- Supabase (authentication and database)
- Framer Motion (animations)
- USDA FoodData Central API

## Getting Started

### Prerequisites

- Node.js 18+
- npm, yarn, pnpm, or bun
- Supabase account and project
- USDA API key (optional, for food search)

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd munchy
```

2. Install dependencies:

```bash
npm install
# or
yarn install
# or
pnpm install
```

3. Set up environment variables:
   Create a `.env.local` file in the root directory with:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
USDA_API_KEY=your_usda_api_key
```

4. Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

- `src/app/` - Next.js app router pages and server actions
- `src/components/` - React components (dashboard, profile, UI)
- `src/utils/supabase/` - Supabase client configuration
- `src/theme.ts` - Chakra UI theme configuration

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
