# Deployment

NCF Research Nexus runs as a Next.js application on Vercel, with Supabase for
authentication, Postgres, Row Level Security, and Edge Functions,
Cloudflare R2 for private PDFs, and Resend for optional application email. Use
Node.js 20 or newer and pnpm.

## Environment keys

### Vercel

Set these for the Production environment before building:

| Key                                    | Required | Value                                   |
| -------------------------------------- | -------- | --------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | Yes      | Supabase project URL                    |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes      | Supabase publishable key                |
| `SUPABASE_URL`                         | Yes      | Supabase project URL (server-only)      |
| `SUPABASE_SERVICE_ROLE_KEY`            | Yes      | Supabase service-role key (server-only) |

Only keys prefixed with `NEXT_PUBLIC_` are embedded at build time. Never prefix
the service-role key with `NEXT_PUBLIC_`.

### Supabase Edge Function

| Key                    | Required    | Value                                                                |
| ---------------------- | ----------- | -------------------------------------------------------------------- |
| `R2_ENDPOINT`          | Yes         | `https://ACCOUNT_ID.r2.cloudflarestorage.com`                        |
| `R2_ACCESS_KEY_ID`     | Yes         | R2 API-token access key                                              |
| `R2_SECRET_ACCESS_KEY` | Yes         | R2 API-token secret                                                  |
| `R2_BUCKET_NAME`       | Yes         | Private bucket name                                                  |
| `RESEND_API_KEY`       | No          | Enables PDF-access notification email                                |
| `EMAIL_FROM`           | With Resend | Verified sender, such as `NCF Research Nexus <research@example.edu>` |

Supabase provides `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and
`SUPABASE_SERVICE_ROLE_KEY`; do not set or expose them manually.

## 1. Prepare Supabase

Create a project, then apply the committed migrations:

```bash
pnpm exec supabase login
pnpm exec supabase link --project-ref YOUR_PROJECT_REF
pnpm exec supabase db push
```

In Supabase **Authentication → URL Configuration**, set the production site URL
and allow `https://YOUR_DOMAIN/auth/confirm`. Configure the email provider and
templates so confirmation and recovery links use the supplied redirect URL.

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

pnpm exec supabase functions deploy r2
```

Omit the two Resend values if application notifications are not required. The
The Edge Function validates the Supabase access token before authorizing work.

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
install command, and build command. Add the Vercel environment keys above, then
deploy.

## 4. Create the first Admin

After the intended Admin registers and confirms their email, run once
in the Supabase SQL editor:

```sql
select public.bootstrap_first_admin('admin@example.edu');
```

The function refuses to run after an Admin exists. Manage later role and
account-status changes in the Admin dashboard.

## Post-deploy checks

Run this matrix manually in local and production Supabase projects:

| Check                       | Expected result                                                          |
| --------------------------- | ------------------------------------------------------------------------ |
| First Registration          | Creates one complete Profile, confirms email, and opens `/dashboard`     |
| Returning User              | Opens the intended destination after login                               |
| Intended destination        | Login preserves it; Registration confirmation always opens `/dashboard` |
| Admin routing               | Admins reach `/admin`; non-Admins cannot                                 |
| Suspension                  | A suspended User reaches `/suspended` and cannot use protected workflows |
| Sign-out                    | Ends the Supabase session and returns to public discovery                |
| Invalid session             | Behaves as signed out without exposing protected data                    |
| Password recovery           | A valid recovery link allows setting a new password                      |
| Fresh sign-in after cleanup | A new Registration succeeds with no legacy state                         |

Also confirm public discovery, Owner PDF upload/download, Admin moderation, and
PDF-access request, approval, download, and revocation. If uploads fail in the
browser, check R2 CORS first.

Supabase Free projects may pause after inactivity. Resume the project in the
Supabase dashboard and wait for a healthy database before retrying the app.
Before risky schema changes, create a logical backup and store it outside Git:

```bash
mkdir -p supabase/backups
pnpm exec supabase db dump --linked --file supabase/backups/$(date +%Y-%m-%d).sql
```

## One-time pre-release test reset

**Forbidden after any real User or Research data exists.** Nothing in the app,
migrations, or deployment runs this reset. One operator performs each step
manually and records these exact targets before deleting anything:

```text
Supabase project name/ref: ____________________
R2 account/bucket/prefix: ____________________ / ____________________ / pdfs/
```

1. Verify all three dashboards show the recorded targets. In R2, open that
   bucket and delete every object under `pdfs/` only. Do not delete the bucket.
2. In the recorded Supabase project's SQL editor, remove application data:

   ```sql
   truncate table
     public.profiles,
     public.researches,
     public.authors,
     public.categories,
     public.keywords,
     public.institutions
   restart identity cascade;
   ```

3. In that Supabase project, open **Authentication → Users**, verify they are
   test identities, and delete them.
4. Repeat the manual matrix above, including a fresh registration.
