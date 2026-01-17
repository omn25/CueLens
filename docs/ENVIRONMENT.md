# Environment Variables

This document describes all environment variables used across the CueLens project, where they live, and what they're for.

## Overview

Environment variables are used to configure the application without hardcoding values. Each app (`web` and `api`) has its own environment file(s).

## Environment File Locations

### Web App (`apps/web`)

- **`.env.local`** - Local development (not committed to git)
- **`.env.example`** - Template file (committed to git, shows required variables)

### API Server (`apps/api`)

- **`.env`** - Environment variables (not committed to git)
- **`.env.example`** - Template file (committed to git, shows required variables)

## Web App Environment Variables

Location: `apps/web/.env.local`

### Current Variables

None currently required (scaffold only).

### Future Variables (Planned)

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | `http://localhost:3001` | Yes (future) |
| `NEXT_PUBLIC_OVERSHOOT_API_KEY` | Overshoot SDK API key | `sk_...` | Yes (future) |
| `NEXT_PUBLIC_WS_URL` | WebSocket URL for real-time updates | `ws://localhost:3001` | Optional |

### Important Notes

- **`NEXT_PUBLIC_` prefix**: All client-side environment variables must be prefixed with `NEXT_PUBLIC_` to be accessible in the browser
- **Security**: Never put secrets in `NEXT_PUBLIC_` variables (they're exposed to the client)
- **Next.js behavior**: Only variables prefixed with `NEXT_PUBLIC_` are available in the browser
- **Server-side**: Non-prefixed variables are only available in Next.js API routes and server components

### Example File (`apps/web/.env.example`)

```env
# Next.js Environment Variables
# Copy this file to .env.local and fill in the values

# Example: API endpoint for the backend API
# NEXT_PUBLIC_API_URL=http://localhost:3001

# Example: Future Overshoot SDK configuration
# NEXT_PUBLIC_OVERSHOOT_API_KEY=your_overshoot_api_key_here
```

## API Server Environment Variables

Location: `apps/api/.env`

### Current Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `PORT` | Server port | `3001` | No |
| `HOST` | Server host | `0.0.0.0` | No |

### Future Variables (Planned)

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `DATABASE_URL` | Database connection string | `postgresql://...` | Yes (future) |
| `JWT_SECRET` | Secret for JWT token signing | `your_secret_here` | Yes (future) |
| `OVERSHOOT_API_KEY` | Overshoot SDK API key | `sk_...` | Yes (future) |
| `STT_API_KEY` | Speech-to-text service API key | `...` | Optional |
| `TTS_API_KEY` | Text-to-speech service API key | `...` | Optional |
| `NODE_ENV` | Node environment | `development`, `production` | Yes (future) |
| `LOG_LEVEL` | Logging level | `info`, `debug`, `error` | No |

### Important Notes

- **Server-only**: These variables are never exposed to the client
- **Secrets**: Store API keys, database credentials, and other secrets here
- **Never commit**: `.env` files are gitignored, never commit them

### Example File (`apps/api/.env.example`)

```env
# API Environment Variables
# Copy this file to .env and fill in the values

# Server configuration
# PORT=3001
# HOST=0.0.0.0

# Example: Future database connection
# DATABASE_URL=postgresql://user:password@localhost:5432/cuelens

# Example: Future API keys/secrets
# JWT_SECRET=your_jwt_secret_here
```

## Setting Up Environment Variables

### Initial Setup

1. **Copy example files**:
   ```bash
   cp apps/web/.env.example apps/web/.env.local
   cp apps/api/.env.example apps/api/.env
   ```

2. **Fill in values**:
   - Open `.env.local` (web) and `.env` (api)
   - Replace placeholder values with actual values
   - Uncomment variables you need

3. **Verify setup**:
   - Restart dev servers after creating/modifying env files
   - Check that variables are loaded correctly

### Development

- **Local development**: Use `.env.local` (web) and `.env` (api)
- **Hot reload**: Changes to env files require server restart
- **Default values**: Some variables have defaults (check code for defaults)

### Production

- **Environment variables**: Set via hosting platform (Vercel, Railway, etc.)
- **Never commit**: `.env` and `.env.local` files are gitignored
- **Secrets management**: Use platform secrets management (e.g., Vercel env vars, Railway secrets)

## Environment Variable Validation (Future)

When features are implemented, we'll add environment variable validation:

```typescript
// Example: apps/api/src/config/env.ts
import { z } from 'zod';

const envSchema = z.object({
  PORT: z.string().default('3001'),
  HOST: z.string().default('0.0.0.0'),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
});

export const env = envSchema.parse(process.env);
```

This ensures:
- Required variables are present
- Variables have correct types/format
- Errors are caught at startup (not runtime)

## Environment-Specific Configuration

### Development

- **API URL**: `http://localhost:3001`
- **Web URL**: `http://localhost:3000`
- **Logging**: Verbose (debug level)
- **Database**: Local database or Docker container

### Production

- **API URL**: Production domain (e.g., `https://api.cuelens.com`)
- **Web URL**: Production domain (e.g., `https://cuelens.com`)
- **Logging**: Info/error level only
- **Database**: Managed database service

### Staging (Future)

- **API URL**: Staging domain
- **Web URL**: Staging domain
- **Logging**: Debug level
- **Database**: Staging database instance

## Troubleshooting

### Variables Not Loading

1. **Check file location**: Ensure `.env.local` (web) or `.env` (api) exists in the correct directory
2. **Restart servers**: Restart dev servers after creating/modifying env files
3. **Check naming**: Ensure variable names match exactly (case-sensitive)

### Next.js Client-Side Variables

- **`NEXT_PUBLIC_` prefix**: Required for browser access
- **Build time**: Client-side variables are embedded at build time
- **Restart**: Restart dev server after adding new `NEXT_PUBLIC_` variables

### API Server Variables

- **Server-only**: Non-prefixed variables are server-only (never exposed to client)
- **Startup**: Variables are read when the server starts
- **Restart**: Restart server after changing variables

### Port Conflicts

- **Change PORT**: Set `PORT=3002` (or another port) in `apps/api/.env`
- **Next.js port**: Use `pnpm dev -- -p 3002` or set `PORT` in env (Next.js respects it)

## Security Best Practices

1. **Never commit secrets**: `.env` and `.env.local` are gitignored
2. **Use `NEXT_PUBLIC_` wisely**: Only prefix public configuration, never secrets
3. **Rotate secrets**: Regularly rotate API keys and secrets
4. **Use platform secrets**: Use hosting platform secrets management in production
5. **Validate input**: Use Zod schemas to validate environment variables at startup

## Future: Environment Variable Schema

When implementing features, we'll create environment variable schemas in `packages/shared`:

```typescript
// packages/shared/src/config/env.ts
import { z } from 'zod';

export const WebEnvSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url(),
  NEXT_PUBLIC_OVERSHOOT_API_KEY: z.string().optional(),
});

export const ApiEnvSchema = z.object({
  PORT: z.string().default('3001'),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
});
```

This ensures type safety and validation across the entire stack.
