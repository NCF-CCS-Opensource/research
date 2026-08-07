# Deployment

NCF Research Nexus runs as a Next.js application on Vercel, with Supabase for
Postgres, Row Level Security, and Edge Functions, Clerk for Google authentication,
Cloudflare R2 for private PDFs, and Resend for optional application email. Use
Node.js 20 or newer and pnpm.

## Environment keys

### Vercel

Set these for the Production environment before building:

| Key | Required | Value |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | Supabase publishable key |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes | Clerk publishable key |
| `CLERK_SECRET_KEY` | Yes | Clerk secret key (server-only) |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | Yes | `/login` |

These values are intentionally public and are embedded at build time. Redeploy
after changing either value. Never add service-role, R2, or Resend secrets to
Vercel variables prefixed with `NEXT_PUBLIC_`.

### Supabase Edge Function

| Key | Required | Value |
| --- | --- | --- |
| `R2_ENDPOINT` | Yes | `https://ACCOUNT_ID.r2.cloudflarestorage.com` |
| `R2_ACCESS_KEY_ID` | Yes | R2 API-token access key |
| `R2_SECRET_ACCESS_KEY` | Yes | R2 API-token secret |
| `R2_BUCKET_NAME` | Yes | Private bucket name |
| `RESEND_API_KEY` | No | Enables PDF-access notification email |
| `EMAIL_FROM` | With Resend | Verified sender, such as `NCF Research Nexus <research@example.edu>` |

Supabase provides `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and
`SUPABASE_SERVICE_ROLE_KEY`; do not set or expose them manually.

## 1. Prepare Supabase

Create a project, then apply the committed migrations:

```bash
pnpm exec supabase login
pnpm exec supabase link --project-ref YOUR_PROJECT_REF
pnpm exec supabase db push
```

In Clerk, enable Google as the sole connection and disable Clerk account
self-deletion. Use Clerk's **Connect with Supabase** flow, then add Clerk under
Supabase **Authentication → Third-Party Auth**. This native integration must
issue the `authenticated` role in Clerk session tokens; do not create a legacy
Supabase JWT template. Use separate Clerk development and production instances.

## 2. Configure R2 and the Edge Function

Create a private R2 bucket and an API token with object read/write access to
that bucket. Its CORS policy must allow the production origin to send `PUT`
requests with the `Content-Type` header.

```bash
pnpm exec supabase secrets set \
  R2_ENDPOINT=https://ACCOUNT_ID.r2.cloudflarestorage.com \
  R2_ACCESS_KEY_ID=... \
  R2_SECRET_ACCESS_KEY=... \
  R2_BUCKET_NAME=... \
  RESEND_API_KEY=... \
  EMAIL_FROM="NCF Research Nexus <research@example.edu>"

pnpm exec supabase functions deploy r2 --no-verify-jwt
```

Omit the two Resend values if application notifications are not required. The
function validates the caller itself; keep `--no-verify-jwt` as configured in
`supabase/config.toml`.

## 3. Verify and deploy Next.js

Run the production checks locally:

```bash
pnpm install --frozen-lockfile
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

Import the repository into Vercel. `vercel.json` already sets the framework,
install command, and build command. Add the two Vercel environment keys above,
then deploy.

## 4. Create the first Admin

After the intended Admin signs in with Google and has a Profile, run once
in the Supabase SQL editor:

```sql
select public.bootstrap_first_admin('admin@example.edu');
```

The function refuses to run after an Admin exists. Manage later role and
account-status changes in the Admin dashboard.

## Post-deploy checks

Confirm Google login and sign-out, public discovery, intended-route redirects,
missing and suspended Profile routing, Owner PDF upload/download, Admin
moderation, and PDF-access request, approval, download, and revocation. If
uploads fail in the browser, check R2 CORS first.

Supabase Free projects may pause after inactivity. Resume the project in the
Supabase dashboard and wait for a healthy database before retrying the app.
Before risky schema changes, create a logical backup and store it outside Git:

```bash
mkdir -p supabase/backups
pnpm exec supabase db dump --linked --file supabase/backups/$(date +%Y-%m-%d).sql
```
