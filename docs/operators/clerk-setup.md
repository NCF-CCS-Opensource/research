# Clerk instance setup

Operator steps for the Clerk instance behind Registration (ADR 0005, issue #91).
The API is the authority for who may register; these steps make the Clerk
instance match that policy, they do not replace it.

## 1. Google as the only sign-in method

In the Clerk Dashboard, under **User & Authentication → Social Connections**,
enable **Google** and disable every other sign-in method (email/password,
other OAuth providers, phone). Registration only accepts a Google identity.

## 2. Add the `email` session-token claim

The API reads the signed-in person's email from a custom claim on the
session token, not from a separate Clerk API call. Under **Sessions →
Customize session token**, add:

```json
{
  "email": "{{user.primary_email_address}}"
}
```

## 3. NCF domain allowlist

Registration only accepts `gbox.ncf.edu.ph` (students) and `ncf.edu.ph`
(faculty and staff); the API rejects every other domain regardless of what
Clerk allows. As a convenience that turns away obviously wrong sign-ins
earlier, add both domains under **User & Authentication → Restrictions →
Allowlist**.

## 4. API configuration

Set `CLERK_SECRET_KEY` (from **API Keys** in the Clerk Dashboard) in the
API's environment — see `.env.example`. The API verifies tokens against this
instance's signing keys and accepts only tokens issued for `WEB_ORIGIN`.
