# BuildList

BuildList is a React + TypeScript app for tracking car builds, modification categories, and individual mods with price ranges, links, and notes.

## Features

- Create and manage multiple car builds
- Track car pricing details (base, out-the-door, down payment)
- Organize mods into categories (with display ordering)
- Add, edit, and delete mods with:
  - `price_min` and `price_max`
  - optional product URL
  - notes
- Supabase-backed persistence with real database tables

## Tech Stack

- Vite
- React 18
- TypeScript
- Tailwind CSS
- Supabase (`@supabase/supabase-js`)
- Lucide React icons

## Project Structure

- `src/components` – UI components (`Sidebar`, `CarHeader`, `CategorySection`, `ModItem`)
- `src/hooks/useCarBuild.ts` – app data logic and CRUD operations
- `src/lib/supabase.ts` – Supabase client initialization
- `supabase/migrations` – database schema and RLS policy SQL

## Environment Variables

Create a `.env` file in the project root with:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Database Setup (Supabase)

Run the migration SQL from:

- `supabase/migrations/20260413032720_create_car_build_tracker.sql`

It creates:

- `cars`
- `mod_categories`
- `mods`

With row-level security enabled and open read/write policies for anon/authenticated roles (intended for personal/no-auth usage).

## Getting Started

```bash
npm install
npm run dev
```

Open the app at `http://localhost:5173`.

## Scripts

- `npm run dev` – start development server
- `npm run build` – production build
- `npm run preview` – preview production build
- `npm run lint` – run ESLint
- `npm run typecheck` – TypeScript type check

## Notes

- This project is currently designed as a personal tracker without authentication.
- If you plan to deploy publicly, tighten RLS policies and add auth.
