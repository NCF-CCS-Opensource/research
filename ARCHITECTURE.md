# Architecture

NCF Research Nexus is moving from Supabase to a NestJS API (ADR 0005, PRD #86). This document holds the rules for the target system. Until the web cutover lands, `CLAUDE.md` describes the running Supabase app.

## System

```
apps/web (Next.js, Vercel) --HTTPS + Clerk Bearer token--> apps/api (NestJS, Railway or Heroku)
apps/api --> PostgreSQL (Drizzle) | Cloudflare R2 (Research PDFs) | Resend (email) | Clerk (token verification)
```

- `packages/contracts`: one Zod contract per endpoint (method, path, query or body, response), shared by web and API.
- `packages/api-client`: typed `fetch` wrapper that calls an endpoint contract with its input.
- `apps/api/src/database/`: Drizzle schema and client. Migrations live in `apps/api/drizzle/`.

## API modules

Each feature lives in `apps/api/src/modules/<name>/` with singular kebab-case names:

```
modules/research-record/
├── domain/            # entities, value objects, repository interfaces, domain errors
├── application/       # one use case per HTTP request
├── infrastructure/    # Drizzle repositories and mappers, queries, external adapters
├── presentation/      # one single-action controller per use case
└── research-record.module.ts
```

`AppModule` imports each module definition directly. Modules: `account`, `research-record`, `moderation`, `pdf-access`, `discovery`, `collection`, `notification`, `engagement`, `taxonomy`.

## Layer rules

- **Domain** holds business rules and imports no NestJS, Drizzle, or Zod code.
- **Application** depends only on the domain and on interfaces. Each use case has a single `execute(input)` entry point and may use NestJS dependency injection.
- **Infrastructure** implements those interfaces with Drizzle, Clerk, R2, and Resend.
- **Presentation** holds single-action controllers, the global guard, the Zod validation pipe, and the exception filter.
- Lint import restrictions enforce these rules per layer.

## Routes and contracts

- Every HTTP request maps to exactly one use case and one controller.
- Writes use `POST /<module>/<action>` with a JSON body that carries any IDs. Reads use `GET /<module>/<action>` with query parameters.
- Routes have no path parameters, no PUT, PATCH, or DELETE, and no version or `/api` prefix.
- Controllers take their path from the endpoint contract. Schemas carry authored field messages, so browser and API validation show the same text.

## Reads, writes, and transactions

- Writes load domain entities through repositories. Reads call query interfaces that return contract response shapes straight from SQL.
- A use case wraps multi-step writes in `TransactionRunner`. The Drizzle transaction lives in async-local context, so repositories from any module join it.
- A module changes another module's data only through that module's exported interfaces. Read queries may join any tables. There is no event bus.
- Zod owns shape and format rules, the domain owns state rules, and PostgreSQL constraints and row locks back up the rules that races could break.

## Authentication and authorization

- Clerk provides Google sign-in only. Registration accepts only NCF Google Accounts, and the API enforces the domain check.
- The database is authoritative for the Admin role and Active Account status. Profiles use a UUID key plus a unique Clerk user ID.
- A global guard denies by default. Controllers opt out with `@Public()`, `@Registering()`, or `@AdminOnly()`.

## Failures and notifications

- Domain errors carry a stable code and an authored message. Validation failures return 400 with field messages; anything else returns 500 with a generic message (ADR 0004).
- In-app notices are written inside the use case's transaction. Their email copies go through Resend after commit and never fail the action.

## Testing

- Vitest with an SWC transform for NestJS decorator metadata.
- The main seam is the API over HTTP against a real PostgreSQL. Clerk token verification, R2, Resend, and the clock are replaced with fakes at their interfaces.
- Domain unit tests cover dense rules such as PDF Access Request transitions and the cooldown.

## Deployment

- One Dockerfile built from `turbo prune`; all configuration comes from environment variables and is validated at startup.
- Migrations run in Railway's pre-deploy command or Heroku's release phase and stop a release when they fail.
- Railway runs production. `master` deploys production; work merges into `develop` through pull requests.
