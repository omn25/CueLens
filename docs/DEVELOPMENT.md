# Development Guide

This document outlines the local development workflow, formatting rules, branching strategy, and CI pipeline for CueLens.

## Local Development Workflow

### Initial Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd nexhacks-2026
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   # Copy example files
   cp apps/web/.env.example apps/web/.env.local
   cp apps/api/.env.example apps/api/.env
   ```

4. **Start development servers**
   ```bash
   pnpm dev
   ```
   This runs both `apps/web` (port 3000) and `apps/api` (port 3001) concurrently.

### Daily Development

1. **Start dev servers**
   ```bash
   pnpm dev
   ```

2. **Make changes** to code in `apps/web`, `apps/api`, or `packages/shared`

3. **Verify changes**:
   - Web app hot-reloads automatically
   - API server restarts on file changes (via `tsx watch`)
   - Shared package changes may require restart if not picked up

4. **Before committing**:
   ```bash
   pnpm lint          # Check linting
   pnpm typecheck     # Check TypeScript types
   pnpm format:check  # Check formatting (optional)
   ```

5. **Format code** (if needed):
   ```bash
   pnpm format
   ```

### Working with Shared Package

When modifying `packages/shared`:

1. **Make changes** to types/schemas in `packages/shared/src/`

2. **Build the package** (if TypeScript compilation is needed):
   ```bash
   cd packages/shared
   pnpm build
   ```
   Or build all packages:
   ```bash
   pnpm build
   ```

3. **Apps using `@cuelens/shared`** will pick up changes via TypeScript path resolution

4. **Restart dev servers** if changes aren't detected automatically

## Code Formatting

### Prettier

- **Configuration**: `.prettierrc` in root
- **Format on save**: Recommended to configure in your IDE
- **Manual formatting**: `pnpm format`
- **Check formatting**: `pnpm format:check`

### Formatting Rules

- **Semicolons**: Required
- **Quotes**: Double quotes
- **Trailing commas**: ES5 style
- **Print width**: 100 characters
- **Tab width**: 2 spaces
- **Arrow parens**: Always include parentheses

### Prettier Integration

Prettier is integrated with ESLint via `eslint-config-prettier`:
- Prettier handles formatting
- ESLint handles code quality
- No conflicts between the two

## Linting

### ESLint

- **Configuration**: Shared via `@cuelens/eslint-config`
- **Run linting**: `pnpm lint`
- **Auto-fix**: ESLint can auto-fix many issues (IDE integration recommended)

### ESLint Rules

- TypeScript strict rules enabled
- Unused variables/parameters are errors (prefixed with `_` to ignore)
- `any` type usage is a warning
- No conflicting rules with Prettier

### Next.js Specific

The web app extends `next/core-web-vitals` for Next.js-specific rules in addition to the shared config.

## TypeScript

### Type Checking

- **Run typecheck**: `pnpm typecheck`
- **Strict mode**: Enabled across all packages
- **Type checking in CI**: Runs automatically on push/PR

### TypeScript Configuration

- **Shared configs**: `packages/tsconfig`
- **Base config**: Strict mode with `noUncheckedIndexedAccess`
- **Next.js config**: Extends base, includes DOM types
- **Node.js config**: Extends base, for API server

### Type Safety Best Practices

- Use `@cuelens/shared` types for API contracts
- Avoid `any` type (ESLint warns)
- Use TypeScript strict mode features (never, unknown, etc.)
- Leverage Zod schemas for runtime validation

## Branching Strategy

### Recommended Workflow

1. **Main branch**: `main` (production-ready code)
2. **Development branch**: `develop` (optional, for active development)
3. **Feature branches**: `feature/description` (e.g., `feature/camera-capture`)
4. **Fix branches**: `fix/description` (e.g., `fix/api-health-endpoint`)

### Branch Naming Convention

- `feature/*` - New features
- `fix/*` - Bug fixes
- `docs/*` - Documentation updates
- `refactor/*` - Code refactoring
- `chore/*` - Maintenance tasks

### Pull Requests

- PRs should target `main` (or `develop` if using)
- CI runs automatically on PRs (lint, typecheck, build)
- All CI checks must pass before merging
- Code review recommended

## CI Pipeline

### GitHub Actions

Configuration: `.github/workflows/ci.yml`

### Pipeline Jobs

1. **Lint Job**
   - Runs `pnpm lint` across all packages and apps
   - Fails if any linting errors

2. **Typecheck Job**
   - Runs `pnpm typecheck` across all packages and apps
   - Fails if any TypeScript errors

3. **Build Job**
   - Runs `pnpm build` across all packages and apps
   - Ensures all packages build successfully
   - Caches outputs for future runs

### CI Triggers

- **Push** to `main` or `develop` branches
- **Pull requests** targeting `main` or `develop`

### CI Requirements

- Node.js 18
- pnpm 8
- All jobs run in parallel (independent of each other)
- All jobs must pass for PR to be mergeable

## Development Tips

### Hot Reload

- **Next.js app**: Hot reloads automatically on file changes
- **API server**: Restarts on file changes via `tsx watch`
- **Shared package**: May require restart if changes aren't detected

### Debugging

- **Web app**: Use browser DevTools + Next.js DevTools
- **API server**: Use Node.js debugger or `console.log` (Express)
- **TypeScript errors**: Check `tsconfig.json` extends and paths

### Dependencies

- **Adding dependencies**: Use `pnpm add <package>` in the specific app/package
- **Adding dev dependencies**: Use `pnpm add -D <package>`
- **Workspace dependencies**: Use `workspace:*` for internal packages

### Build Order

Turborepo handles build order automatically:
1. `packages/shared` builds first
2. `packages/eslint-config` and `packages/tsconfig` (no build needed)
3. `apps/web` and `apps/api` build (can run in parallel)

### Cache

Turborepo caches build outputs:
- `.turbo/` directory contains cache
- Cache is invalidated when dependencies change
- Can clear cache: `rm -rf .turbo`

## IDE Configuration

### Recommended Settings (VS Code)

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

### Recommended Extensions

- Prettier
- ESLint
- TypeScript (built-in)

## Troubleshooting

### Type Errors After `pnpm install`

1. Build shared packages: `pnpm build`
2. Clear Turborepo cache: `rm -rf .turbo`
3. Reinstall: `rm -rf node_modules && pnpm install`

### Lint Errors

1. Auto-fix what you can: `pnpm lint --fix` (if supported)
2. Check ESLint config extends in `.eslintrc.*` files
3. Verify Prettier config doesn't conflict

### Build Failures

1. Check TypeScript errors: `pnpm typecheck`
2. Verify all dependencies are installed: `pnpm install`
3. Check `turbo.json` pipeline configuration

### Port Conflicts

1. Change ports in `.env.local` (web) or `.env` (api)
2. Or stop conflicting processes on ports 3000/3001
