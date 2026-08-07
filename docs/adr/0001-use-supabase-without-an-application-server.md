# Use Supabase without an application server

NCF Research Nexus will run on free tiers without an always-on NestJS server. Supabase owns authentication, PostgreSQL, RLS-protected data access, SQL migrations, and Edge Functions. PostgreSQL functions own atomic state transitions, while Edge Functions are limited to R2 signing and Resend application notifications. Cloudflare R2 remains the PDF store because its free allowance is larger than Supabase Storage.

The migration starts with an empty Supabase project, removes the backend repository, custom auth, REST compatibility, Drizzle, Gemini features, and historical analytics, and preserves the remaining user workflows in the Next.js repository. Free-tier pausing and manual resume after inactivity are accepted in exchange for zero hosting cost.
