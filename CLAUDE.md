# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Next.js 16 (App Router) frontend for NCF Research Nexus. See `CONTEXT.md` for domain vocabulary (Owner vs. Author, Research Record, Approval, Collection, etc.) — use those exact terms in code and comments.

**This Next.js version has breaking changes from your training data.** Read the relevant guide in `node_modules/next/dist/docs/` before writing routing/middleware code, and heed deprecation notices.

## Commands

```bash
pnpm dev              # Dev server (port 3000)
pnpm build            # Production build
pnpm lint             # ESLint
pnpm typecheck        # tsc --noEmit
pnpm test:integration # Local Supabase integration tests
```

## Architecture

- **Routing**: App Router under `apps/web/app/`. Public discovery is open; `dashboard/` and `upload/` require an Active Account; `admin/` additionally requires the Admin role.
- **Authentication**: Clerk owns Google sign-in and sessions. `ClerkProvider` exposes session state, and `proxy.ts` handles routing only. Supabase RLS and security-definer functions remain authoritative.
- **Data access**: Browser and server Supabase clients pass the current Clerk session token through the supported `accessToken` callback. Domain modules in `packages/api-client` use `apps/web/lib/web-transport.ts` and access Supabase directly under RLS.
- **UI components**: shadcn/ui (`style: radix-nova`, `baseColor: neutral`) in `components/ui/`; feature components in `components/features/`; forms in `components/forms/`; shells/nav in `components/layout/`. Add new primitives with `npx shadcn@latest add <component>`. Import via `@/components/ui/...`.
- **Types**: shared API response shapes in `types/api.ts`.

## Code Style

- Prettier: no semicolons, double quotes, `tabWidth: 2`, `printWidth: 80`, `trailingComma: es5`, Tailwind class sorting via `prettier-plugin-tailwindcss` (`cn`/`cva` functions).

## Agent skills

### Issue tracker

Issues and PRDs are tracked in this repository's GitHub Issues. See `docs/agents/issue-tracker.md`.

### Domain docs

This is a single-context repository with `CONTEXT.md` and root-level ADRs. See `docs/agents/domain.md`.
