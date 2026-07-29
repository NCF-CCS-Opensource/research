# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Next.js 16 (App Router) frontend for NCF Research Nexus v2, consuming the NestJS backend in `../ccs-research-hub-backend`. See `CONTEXT.md` for domain vocabulary (Owner vs. Author, Research Record, Approval, Collection, etc.) — use those exact terms in code and comments.

**This Next.js version has breaking changes from your training data.** Read the relevant guide in `node_modules/next/dist/docs/` before writing routing/middleware code, and heed deprecation notices.

## Commands

```bash
npm run dev         # Dev server (port 3000)
npm run build       # Production build
npm run start       # Serve production build (port 3000)
npm run lint        # ESLint
npm run format      # Prettier (writes)
npm run typecheck   # tsc --noEmit
```

No test runner is configured.

## Architecture

- **Routing**: App Router under `app/`. Route groups: public (`research/`, `authors/`, `categories/`, `search/`), authenticated (`dashboard/`), admin-only (`admin/`), and auth flows (`login/`, `register/`, `forgot-password/`, `verify-email/`).
- **Route protection**: `proxy.ts` (Next middleware) gates `/dashboard`, `/upload`, and `/admin` by cookie presence, redirects authenticated users away from `/login` and `/register`, and bounces non-admins out of `/admin`. This is presentation-only — the backend re-enforces every check.
- **Backend proxy**: all API calls go through the same-origin route `app/api/backend/[...path]/route.ts`, which forwards to `API_ROOT` (`lib/api.ts`), attaches the access token from the httpOnly cookie, and on a `401` calls `refreshAccessToken()` (`lib/server-auth.ts`) once before retrying.
- **Auth cookies**: `lib/auth-cookies.ts` defines the cookie names; `lib/server-auth.ts` sets/clears/refreshes them (`httpOnly`, `sameSite: lax`, `secure` in production). Access token TTL 15m, refresh 7d.
- **Data fetching**:
  - Server components / route handlers call `lib/api.ts` (`getEnvelope`, `getPaginated`, `apiRequest`) directly against `API_ROOT`, with Next `fetch` caching (`next: { revalidate }` or `cache: "no-store"`) chosen per endpoint's freshness needs.
  - Client components call `lib/client-api.ts` (`clientEnvelope`, `clientPaginated`, `clientAction`, `clientPublicGet`), which always routes through `/api/backend` (same-origin, no CORS), has a 15s request timeout, and on a `401` redirects to `/login` (guarded by a module-level `redirecting` flag so concurrent requests don't loop).
  - Response envelope from the backend is `{ data }`; paginated responses are `{ data, meta: { total, page, totalPages } }`.
- **UI components**: shadcn/ui (`style: radix-nova`, `baseColor: neutral`) in `components/ui/`; feature components in `components/features/`; forms in `components/forms/`; shells/nav in `components/layout/`. Add new primitives with `npx shadcn@latest add <component>`. Import via `@/components/ui/...`.
- **Types**: shared API response shapes in `types/api.ts`.

## Code Style

- Prettier: no semicolons, double quotes, `tabWidth: 2`, `printWidth: 80`, `trailingComma: es5`, Tailwind class sorting via `prettier-plugin-tailwindcss` (`cn`/`cva` functions).

## Agent skills

### Issue tracker

Issues and PRDs are tracked in this repository's GitHub Issues. See `docs/agents/issue-tracker.md`.

### Domain docs

This is a single-context repository with `CONTEXT.md` and root-level ADRs. See `docs/agents/domain.md`.
