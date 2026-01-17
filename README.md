# CueLens

Real-time memory aid scaffold - helping users remember people and places through camera feed analysis and intelligent memory prompts.

## Project Overview

**CueLens** is a real-time memory aid application that leverages phone camera feeds (and eventually smart glasses) to help users remember people and places. The MVP vision includes:

- **Camera feed analysis** via the Overshoot web SDK
- **Short spoken prompts** (TTS) to remind users about people/places
- **Caregiver dashboard** for approving suggested memory updates (people, relationships, places)

This repository currently contains **ONLY a scaffold** — no features have been implemented yet. This is a base repository with monorepo structure, tooling, and documentation to support future development.

## Repository Layout

This is a **pnpm workspaces + Turborepo monorepo** with the following structure:

### `/apps`

- **`web`** - Next.js 14+ application with App Router and TypeScript
  - Future home to the user-facing web interface, camera feed integration, and caregiver dashboard
  - Runs on port 3000 by default

- **`api`** - Express-based Node.js API with TypeScript
  - Future home to REST/GraphQL endpoints for memory data, user management, and Overshoot integration
  - Runs on port 3001 by default
  - Currently exposes only `GET /health`

### `/packages`

- **`shared`** - Shared TypeScript types and Zod schemas (data contracts)
  - Contains data contracts in `src/contracts/` that define the shape of data exchanged between `web` and `api`
  - Both frontend and backend must use these contracts to prevent type drift
  - Contracts include `Person`, `Place`, `VisionEvent`, and `Suggestion` with Zod schemas for runtime validation

- **`eslint-config`** - Shared ESLint configuration
  - Enforces consistent code style across all packages and apps

- **`tsconfig`** - Shared TypeScript configurations
  - Base configs for Node.js and Next.js projects

## Architecture

```
┌─────────────┐
│   apps/web  │  Next.js app (user interface, camera feed)
│  (Next.js)  │
└──────┬──────┘
       │ HTTP requests
       ▼
┌─────────────┐
│  apps/api   │  Express API (memory data, integrations)
│  (Express)  │
└──────┬──────┘
       │
       │ Future integrations:
       ├──► Overshoot SDK (camera analysis)
       ├──► STT/TTS services (voice prompts)
       ├──► Database (TBD - memory graph storage)
       └──► Authentication/User management (TBD)
```

**Data Flow (Future):**
1. Web app captures camera feed → sends to API
2. API processes with Overshoot SDK → generates memory suggestions
3. API returns suggestions → Web app displays to user/caregiver
4. Caregiver approves → API stores in database (TBD)

## Setup (Fresh Machine)

### Prerequisites

- **Node.js** >= 18.0.0
- **pnpm** >= 8.0.0 ([install pnpm](https://pnpm.io/installation))

### Step-by-Step Setup

1. **Install pnpm** (if not already installed):
   ```bash
   npm install -g pnpm
   # or using standalone script:
   curl -fsSL https://get.pnpm.io/install.sh | sh -
   ```

2. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd nexhacks-2026
   ```

3. **Install dependencies**:
   ```bash
   pnpm install
   ```

4. **Copy environment example files**:
   ```bash
   # For web app
   cp apps/web/.env.example apps/web/.env.local

   # For API
   cp apps/api/.env.example apps/api/.env
   ```

5. **Start development servers**:
   ```bash
   pnpm dev
   ```
   - Web app: http://localhost:3000
   - API: http://localhost:3001

6. **Run linting and type checking**:
   ```bash
   pnpm lint
   pnpm typecheck
   ```

7. **Build all packages and apps**:
   ```bash
   pnpm build
   ```

## Scripts Reference

| Script | Description |
|--------|-------------|
| `pnpm dev` | Starts development servers for web and api concurrently |
| `pnpm lint` | Runs ESLint across all packages and apps |
| `pnpm typecheck` | Runs TypeScript type checking across all packages and apps |
| `pnpm build` | Builds all packages and apps for production |
| `pnpm format` | Formats code with Prettier |
| `pnpm format:check` | Checks code formatting with Prettier |

## Troubleshooting

### pnpm not found

If you get `pnpm: command not found`:
- Install pnpm: `npm install -g pnpm` or use the standalone installer
- Verify installation: `pnpm --version`
- Make sure pnpm is in your PATH

### Port conflicts

If ports 3000 or 3001 are already in use:
- Web app: Set `PORT` environment variable in `apps/web/.env.local` or stop the conflicting process
- API: Set `PORT` environment variable in `apps/api/.env` or stop the conflicting process
- Alternatively, change the ports in the respective app configuration files

### Environment variable issues

- Ensure `.env.local` (web) and `.env` (api) files exist (copy from `.env.example` files)
- Check that environment variables are prefixed correctly (`NEXT_PUBLIC_` for client-side variables in Next.js)
- Restart dev servers after changing environment variables

### Type errors after `pnpm install`

- Run `pnpm build` to build shared packages first
- Clear `.turbo` cache: `rm -rf .turbo`
- Clear all node_modules: `rm -rf node_modules apps/*/node_modules packages/*/node_modules && pnpm install`

## Next Steps (Future Development)

### Where features will live:

- **Overshoot SDK integration** → `apps/api/src/integrations/overshoot.ts` (or similar)
- **STT/TTS services** → `apps/api/src/services/stt.ts` and `apps/api/src/services/tts.ts`
- **Camera capture logic** → `apps/web/src/components/camera/` (when implementing features)
- **Memory graph logic** → `apps/api/src/services/memory/` and `packages/shared/src/memory/`
- **Database choice** → TBD (PostgreSQL, MongoDB, or graph database depending on requirements)

### Current State

- ✅ Monorepo structure with pnpm workspaces
- ✅ Turborepo for build orchestration
- ✅ TypeScript strict mode enabled
- ✅ ESLint + Prettier configured
- ✅ GitHub Actions CI pipeline
- ✅ Base Next.js app (placeholder page)
- ✅ Base Express API (`GET /health` endpoint)
- ✅ Shared types package with data contracts (Person, Place, VisionEvent, Suggestion)
- ⏳ **No features implemented** — ready for feature development

## License

[Add your license here]
