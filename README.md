# NCF Research Nexus

The NCF College of Computer Studies research hub. This Next.js application uses Clerk for Google authentication, Supabase for Postgres, Row Level Security, and Edge Functions, Cloudflare R2 for private Research PDFs, and Resend for optional application email.

## Local development

Requirements: Node.js 20+, pnpm, Docker, and the Supabase CLI.

```bash
pnpm install
pnpm exec supabase start
pnpm exec supabase db reset
pnpm dev
```

Copy `.env.example` to `.env.local`, use the API URL and publishable key printed by `supabase status -o json`, and add keys from a Clerk development instance configured for Google and Supabase.
Set `auth.third_party.clerk.enabled = true` in `supabase/config.toml` when testing
real Clerk sessions locally; signed database fixtures do not require a Clerk instance.

## Verification

```bash
pnpm test
pnpm test:integration
pnpm typecheck
pnpm lint
pnpm build
```

Database changes belong in `supabase/migrations/`. `supabase/seed.sql` contains only public discovery fixtures; integration tests create their own users and private records.

See [DEPLOYMENT.md](./DEPLOYMENT.md) for production setup, secrets, first-Admin bootstrap, pause recovery, and backups.
