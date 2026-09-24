# Use a NestJS API with clean architecture

NCF Research Nexus replaces the Supabase platform with a NestJS API in `apps/api`, because the team wants NestJS with clean architecture and a small paid host is now affordable. Each feature module keeps domain, application, infrastructure, and presentation layers with one single-action controller per use case; Drizzle and PostgreSQL hold data, Zod contracts are shared with the web app, Clerk provides Google sign-in limited to NCF Google Accounts while the database stays authoritative for roles and account status, Resend sends research notifications, and Cloudflare R2 remains the PDF store.

This supersedes ADR 0001. Clerk returns after the earlier reversal because Supabase Auth leaves together with the rest of the Supabase platform.
