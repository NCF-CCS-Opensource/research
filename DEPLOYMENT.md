# Deployment

NCF Research Nexus deploys as one Next.js application backed by Supabase Free, Cloudflare R2, and Resend.

## 1. Supabase

Create a Supabase project, then link and apply the committed SQL migrations:

```bash
pnpm exec supabase login
pnpm exec supabase link --project-ref YOUR_PROJECT_REF
pnpm exec supabase db push
```

Add the production application origin under **Authentication → URL Configuration** as the Site URL and add `/auth/confirm` as a redirect URL.

Configure Resend SMTP under **Authentication → SMTP Settings** for signup confirmation and password recovery. Use the Resend SMTP host, port, username, API key, sender name, and verified sender domain.

## 2. Private R2 storage

Create a private R2 bucket and an API token that can read and write that bucket. Configure bucket CORS to allow the production application origin to `PUT` `application/pdf`.

Set Edge Function secrets:

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

Supabase supplies `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` to the function. Keep the R2, Resend, and service-role secrets out of browser environment variables. Application email is best effort and contains no Request Note, Requester Identity, or download URL.

## 3. Next.js

Deploy this repository to Vercel with:

- Install command: `pnpm install --frozen-lockfile`
- Build command: `pnpm build`
- `NEXT_PUBLIC_SUPABASE_URL`: the project URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: the project publishable key

## 4. First Admin

After the intended Admin has confirmed their email and a Profile exists, run once in the Supabase SQL editor:

```sql
select public.bootstrap_first_admin('admin@example.edu');
```

The function refuses to run after an Admin already exists. Later role and account-status changes belong in the Admin dashboard.

## 5. Operations

Supabase Free projects can pause after inactivity. Resume the project manually from the Supabase dashboard, wait for the database to report healthy, then reload the application. No data migration is required after a normal resume.

Create a manual logical backup before risky schema changes:

```bash
mkdir -p supabase/backups
pnpm exec supabase db dump --linked --file supabase/backups/$(date +%Y-%m-%d).sql
```

Store dumps outside the repository in approved secure storage. Periodically verify login, public discovery, Owner upload, Admin moderation, PDF Access approval/download/revocation, and PDF Replacement.
