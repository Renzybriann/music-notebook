# Music Notebook

A personal music notebook: manage songs, albums, notes/lyrics, and playback with queue, shuffle, and more.

## Features

- **Auth** – Sign up / sign in with Supabase Auth
- **Songs** – Upload audio, title, duration (auto), released flag, notes/lyrics
- **Albums** – Create albums with cover art and track order (drag to reorder)
- **Player** – Play/pause, progress bar, volume, next/prev, shuffle, loop
- **Queue** – Play next, add to queue
- **Search & filter** – Search songs by title; filter by All / Released / Unreleased
- **Edit & delete** – Edit or delete songs and albums

## Getting Started

### 1. Supabase setup

1. Create a project at [Supabase](https://supabase.com).
2. In the SQL Editor, run the migrations in order: `supabase/migrations/20250217000000_initial_schema.sql` then `supabase/migrations/20250217010000_add_trim_columns.sql`.
3. In **Storage**, create two **private** buckets (`audio` and `covers`) and add RLS so users can only access their own files. **→ See [docs/SUPABASE_STORAGE_SETUP.md](docs/SUPABASE_STORAGE_SETUP.md) for step-by-step instructions and ready-to-run SQL.**
4. Copy `.env.example` to `.env.local` and set:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 2. Run the app

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
