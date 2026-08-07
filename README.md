# NCF Research Nexus

The NCF College of Computer Studies research hub. This Next.js application uses Supabase for authentication, Postgres, Row Level Security, and Edge Functions, Cloudflare R2 for private Research PDFs, and Resend for optional application email.

## Local development

Requirements: Node.js 20+, pnpm, Docker, and the Supabase CLI.

```bash
pnpm install
pnpm exec supabase start
pnpm exec supabase db reset
pnpm dev
```

Copy `.env.example` to `.env.local` and use the API URL and keys printed by `supabase status -o json`.

## Verification

```bash
pnpm test
pnpm test:integration
pnpm typecheck
pnpm lint
pnpm build
```

Database changes belong in `supabase/migrations/`. `supabase/seed.sql` contains only public discovery fixtures; integration tests create their own users and private records.

See [DEPLOYMENT.md](./DEPLOYMENT.md) for production setup, manual QA, first-Admin bootstrap, the operator-only pre-release reset, pause recovery, and backups.
