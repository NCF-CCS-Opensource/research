# Setup guide

## Clerk instance (ADR 0001)

Create one Clerk application per environment, then configure it:

1. **Sign-in methods**: enable *Google* and *Email verification code*. Disable password, username, and phone. The web app has no password forms.
2. **Allowlist**: under *Restrictions*, restrict sign-up to the domains `gbox.ncf.edu.ph` and `ncf.edu.ph`. The API repeats this check at Registration and is the authority.
3. **Session token claims**: under *Sessions > Customize session token*, add the `email` claim:

   ```json
   { "email": "{{user.primary_email_address}}" }
   ```

   The API rejects tokens without it.
4. **Keys**: copy them into the environment (`.env.example` lists the names).
   - API: `CLERK_SECRET_KEY` (or `CLERK_JWT_KEY`, the instance's public key). `WEB_ORIGIN` must equal the web app's origin; the API accepts only tokens issued for it.
   - Web: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`.

## Promoting the first Coordinator

Coordinators are not self-service. After the person has completed Registration, promote them in the database, then record it:

```sql
WITH promoted AS (
  UPDATE accounts SET role = 'COORDINATOR'
  WHERE lower(email) = lower('dean@ncf.edu.ph')
  RETURNING id
)
INSERT INTO audit_events (actor_account_id, action, subject_type, subject_id, details)
SELECT id, 'ACCOUNT_PROMOTED_TO_COORDINATOR', 'ACCOUNT', id, '{"by": "manual SQL"}'
FROM promoted;
```
