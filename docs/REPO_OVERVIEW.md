# Repository Overview

This document provides a deep dive into the CueLens repository structure, folder responsibilities, and intended data flow.

## Repository Structure

```
cuelens/
├── apps/
│   ├── web/          # Next.js web application
│   └── api/          # Express API server
├── packages/
│   ├── shared/       # Shared types and Zod schemas
│   ├── eslint-config/# Shared ESLint configuration
│   └── tsconfig/     # Shared TypeScript configurations
├── .github/
│   └── workflows/    # GitHub Actions CI workflows
├── docs/             # Project documentation
├── package.json      # Root package.json (pnpm workspaces)
├── turbo.json        # Turborepo configuration
└── README.md         # Main project README
```

## Folder Responsibilities

### `/apps`

#### `apps/web`

**Purpose:** User-facing web application built with Next.js 14+ (App Router)

**Current State:**
- Minimal scaffold with a single page displaying "Base scaffold running"
- Links to documentation pages
- TypeScript + App Router structure

**Future Responsibilities:**
- Camera feed capture and streaming
- User interface for viewing memory prompts
- Caregiver dashboard for approving memory updates
- Integration with Overshoot SDK (via API calls)
- Real-time updates via WebSockets or Server-Sent Events

**Key Files:**
- `src/app/page.tsx` - Homepage
- `src/app/layout.tsx` - Root layout
- `next.config.js` - Next.js configuration
- `.env.local` - Environment variables (client-side must use `NEXT_PUBLIC_` prefix)

**Dependencies:**
- Next.js, React, React DOM
- `@cuelens/shared` - For shared types

#### `apps/api`

**Purpose:** Backend API server built with Express and TypeScript

**Current State:**
- Single health check endpoint: `GET /health` → `{ status: "ok" }`
- Basic Express server setup

**Future Responsibilities:**
- REST/GraphQL API endpoints for memory data
- Overshoot SDK integration (processing camera feeds)
- STT/TTS service integration
- Database operations (TBD - memory graph storage)
- Authentication and authorization
- WebSocket/SSE endpoints for real-time updates

**Key Files:**
- `src/index.ts` - Server entry point
- `.env` - Environment variables (server-side only)

**Dependencies:**
- Express
- `@cuelens/shared` - For shared types and validation schemas

### `/packages`

#### `packages/shared`

**Purpose:** Shared TypeScript types and Zod schemas (data contracts) used across both `web` and `api`

**Current State:**
- Data contracts in `src/contracts/`: `Person`, `Place`, `VisionEvent`, `Suggestion`
- Each contract includes Zod schema + TypeScript type (inferred from schema)
- Contracts define the shape of data exchanged between frontend and backend

**Contract Structure:**
- `person.ts` - Person data contract
- `place.ts` - Place data contract
- `visionEvent.ts` - Vision analysis events
- `suggestion.ts` - Memory suggestions for caregiver approval

**Future Responsibilities:**
- Additional contracts as features are added
- API request/response types (all must use contracts)
- Shared constants and enums
- Utility functions shared between web and api

**Key Files:**
- `src/index.ts` - Main export file
- `package.json` - Package configuration with zod dependency

**Usage:**
- Import types in `apps/web`: `import type { Person } from '@cuelens/shared'`
- Import schemas in `apps/api`: `import { PersonSchema } from '@cuelens/shared'`

#### `packages/eslint-config`

**Purpose:** Shared ESLint configuration to enforce consistent code style

**Configuration:**
- TypeScript ESLint rules
- Prettier integration
- Strict linting rules for unused variables and `any` types

**Usage:**
- Each app/package extends this config in their `.eslintrc.js` or `.eslintrc.json`

#### `packages/tsconfig`

**Purpose:** Shared TypeScript compiler configurations

**Configs:**
- `base.json` - Base configuration with strict mode
- `nextjs.json` - Extends base for Next.js projects (includes DOM types)
- `node.json` - Extends base for Node.js projects (API)

**Usage:**
- Each app/package extends the appropriate config in their `tsconfig.json`

## Intended Data Flow (Future)

### Camera Feed → Memory Suggestion Flow

1. **User opens web app** (`apps/web`)
   - Camera feed is captured in browser
   - Stream is sent to API via HTTP/WebSocket

2. **API processes feed** (`apps/api`)
   - Receives camera feed data
   - Sends to Overshoot SDK for analysis
   - Generates memory suggestions (person/place recognition)

3. **API returns suggestions** (`apps/api`)
   - Suggestions include confidence scores
   - Data typed using `@cuelens/shared` types

4. **Web app displays suggestions** (`apps/web`)
   - Shows suggestions to user/caregiver
   - TTS reads prompts aloud (future)

5. **Caregiver approves** (`apps/web`)
   - Approval sent to API
   - API stores in database (TBD)

### Memory Graph Updates Flow

1. **Memory updates stored** (`apps/api`)
   - Person, place, or relationship data stored
   - Uses types from `@cuelens/shared`

2. **Graph relationships managed** (`apps/api`)
   - Maintains connections between people, places, relationships
   - Database choice TBD (PostgreSQL, MongoDB, or graph DB)

3. **Web app queries graph** (`apps/web`)
   - Fetches memory graph data via API
   - Displays relationships and connections

## Monorepo Benefits

### Code Sharing

- **Shared types** prevent type drift between frontend and backend
- **Zod schemas** provide validation that matches TypeScript types
- **Common utilities** can be shared via `packages/shared`

### Consistency

- **Shared ESLint config** enforces consistent code style
- **Shared TypeScript config** ensures type checking consistency
- **Single dependency tree** via pnpm workspaces

### Development Experience

- **Turborepo** orchestrates builds efficiently (caching, parallel execution)
- **Hot reload** works across apps during `pnpm dev`
- **Single `pnpm install`** installs all dependencies

### CI/CD

- **Single CI pipeline** (`pnpm lint`, `pnpm typecheck`, `pnpm build`)
- **Dependency-aware builds** via Turborepo
- **Shared testing** (when tests are added)

## Workspace Configuration

### pnpm Workspaces

Defined in root `package.json`:
```json
"workspaces": [
  "apps/*",
  "packages/*"
]
```

This allows:
- `@cuelens/web` to import from `@cuelens/shared`
- All packages to reference each other via `workspace:*` protocol
- Single `pnpm install` to install all dependencies

### Turborepo

Configuration in `turbo.json`:
- Build dependencies: packages build before apps
- Cache outputs: `.next/**`, `dist/**`
- Pipeline tasks: `build`, `lint`, `typecheck`, `dev`

## Environment Variables

See [ENVIRONMENT.md](./ENVIRONMENT.md) for detailed information about environment variables.

## Development Workflow

See [DEVELOPMENT.md](./DEVELOPMENT.md) for detailed development workflow information.

## Architecture Details

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed architecture documentation.
