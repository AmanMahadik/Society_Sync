# 🏢 SocietySync Enterprise Monorepo

Enterprise-grade digital governance, basic-service assurance, and early-warning policy platform for cooperative housing and rehabilitation societies (SRA, MHADA, PMAY).

---

## 🏛️ Monorepo Architecture Overview

This monorepo follows the standard enterprise architecture adopted by top technology organizations (TCS, Infosys, Accenture Digital):

```
my-project/
├── apps/
│   ├── web/                      # Next.js 14 (App Router) Administration & Municipal Portal
│   │   ├── src/
│   │   │   ├── app/              # Routes, layouts, and server actions
│   │   │   ├── components/       # Web-specific UI components
│   │   │   └── lib/              # Web-specific libraries
│   │   └── package.json          # @societysync/web
│   │
│   └── mobile/                   # Expo + React Native Mobile Application
│       ├── app/                  # Expo Router screens
│       ├── src/
│       │   ├── components/       # Mobile-specific UI components
│       │   └── hooks/            # Mobile-specific hooks
│       └── package.json          # @societysync/mobile
│
├── packages/
│   ├── ui/                       # Design tokens, color palettes, and badge styles
│   ├── api-client/               # Type-safe API client for SocietySync services
│   ├── types/                    # Core enterprise TypeScript domain definitions
│   ├── utils/                    # Pure business logic, currency formatters, BHS algorithm
│   ├── config/                   # System constants, SLA thresholds, RTO codes
│   ├── eslint-config/            # Centralized corporate linting rules
│   └── typescript-config/        # Base, Next.js, and React Native tsconfig presets
│
├── .github/
│   ├── workflows/                # Enterprise CI, Web Deployment, EAS Mobile Build
│   ├── PULL_REQUEST_TEMPLATE.md  # Standardized PR quality checklist
│   └── CODEOWNERS                # Mandatory code review gatekeepers
│
├── docs/
│   └── adr/                      # Architecture Decision Records (ADRs)
├── pnpm-workspace.yaml           # pnpm workspace configuration
├── turbo.json                    # Turborepo task graph & caching configuration
├── tsconfig.json                 # Monorepo root TypeScript path mappings
└── README.md
```

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js**: `>=18.0.0`
- **pnpm**: `>=9.0.0`
- **Turborepo**: `>=2.0.0`

### Installation
```bash
# Clone the repository
git clone https://github.com/AmanMahadik/Society_Sync.git
cd Society_Sync

# Switch to monorepo branch
git checkout feature/enterprise-monorepo

# Install all workspace dependencies
pnpm install
```

### Development Workflows
```bash
# Run all applications simultaneously (Web + Mobile)
pnpm dev

# Run only the Next.js Web Portal
pnpm --filter @societysync/web dev

# Run only the Expo Mobile App
pnpm --filter @societysync/mobile start
```

### Quality Assurance & Verification
```bash
# Typecheck all packages and applications in parallel
pnpm typecheck

# Lint entire codebase
pnpm lint

# Build all applications with Turborepo caching
pnpm build
```

---

## 🛡️ Enterprise Engineering Governance

| Standard | Implementation |
|---|---|
| **Package Manager** | `pnpm` workspaces with strict peer dependency resolution |
| **Orchestration** | `Turborepo` with content-aware remote caching support |
| **Type Safety** | Zero-drift shared models in `@societysync/types` |
| **Business Logic** | Standardized algorithms (e.g. Building Health Score) in `@societysync/utils` |
| **CI/CD** | Automated GitHub Actions for quality gates, Vercel deployments, and Expo EAS builds |
