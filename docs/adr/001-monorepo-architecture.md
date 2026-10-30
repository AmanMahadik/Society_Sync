# ADR 001: Adoption of Enterprise Turborepo & pnpm Monorepo

## Status
Accepted

## Context
SocietySync supports two production clients (Next.js 14 Web Portal and React Native Expo Mobile Client) operating over a shared Supabase PostgreSQL backend. Previously, code, types, and business logic were duplicated across the root mobile directory and the web portal directory (`portal/`), creating technical drift, duplicate code reviews, and fragmented release pipelines.

## Decision
Adopt an enterprise monorepo architecture standard consistent with tier-1 digital service companies (TCS, Infosys, Accenture):
1. **Tooling:** Turborepo for build graph orchestration, task caching, and parallel execution.
2. **Package Manager:** `pnpm` workspaces for strict dependency isolation, symlink-based code sharing, and disk optimization.
3. **Workspace Division:**
   - `apps/web`: Next.js 14 App Router portal for administration & municipal view.
   - `apps/mobile`: React Native Expo client for residents and guards.
   - `packages/*`: Reusable internal libraries (`@societysync/types`, `@societysync/utils`, `@societysync/config`, `@societysync/api-client`, `@societysync/ui`, and base configs).

## Consequences
- **Positive:** Single command build (`pnpm build`), unified linting and typecheck, zero type drift between mobile and web.
- **Positive:** CI/CD pipelines can intelligently run only for modified workspaces.
- **Requires:** Developers must run commands from monorepo root using `pnpm --filter <package>`.
