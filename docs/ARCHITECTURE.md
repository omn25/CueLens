# Architecture Documentation

This document describes the detailed architecture of CueLens, how shared types and schemas will be used, and the planned technical approach.

## System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        User Layer                            │
│  ┌──────────────┐                ┌──────────────────────┐   │
│  │   Browser    │                │  Mobile App (Future) │   │
│  │  (Next.js)   │                │                      │   │
│  └──────┬───────┘                └──────────────────────┘   │
└─────────┼────────────────────────────────────────────────────┘
          │ HTTP/WebSocket
          ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Layer                               │
│  ┌────────────────────────────────────────────────────┐     │
│  │            Express API Server                       │     │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────┐ │     │
│  │  │   REST API   │  │  WebSockets  │  │   Auth  │ │     │
│  │  └──────────────┘  └──────────────┘  └─────────┘ │     │
│  └────────────────────────────────────────────────────┘     │
└─────────┬────────────────────────────────────────────────────┘
          │
          ├──► Integration Layer (Future)
          │    ├──► Overshoot SDK
          │    ├──► STT/TTS Services
          │    └──► External APIs
          │
          └──► Data Layer (Future)
               └──► Database (TBD)
```

## Component Breakdown

### Web Application (`apps/web`)

**Technology Stack:**
- **Framework**: Next.js 14+ with App Router
- **Language**: TypeScript (strict mode)
- **Styling**: TBD (CSS Modules, Tailwind, or styled-components)
- **State Management**: TBD (React Context, Zustand, or Redux)

**Responsibilities:**

1. **Camera Feed Capture**
   - Browser MediaStream API
   - Real-time video streaming to API
   - Frame capture and processing

2. **User Interface**
   - Memory prompt display
   - Caregiver dashboard
   - Settings and preferences

3. **Real-Time Updates**
   - WebSocket or Server-Sent Events connection
   - Live memory suggestion updates
   - Notification system

4. **Data Fetching**
   - API calls to `apps/api`
   - GraphQL or REST queries
   - Caching strategy (TBD)

**Future Structure:**
```
apps/web/src/
├── app/                    # Next.js App Router pages
│   ├── page.tsx           # Homepage
│   ├── dashboard/         # Caregiver dashboard
│   └── settings/          # Settings page
├── components/            # React components
│   ├── camera/            # Camera feed components
│   ├── memory/            # Memory display components
│   └── dashboard/         # Dashboard components
├── hooks/                 # Custom React hooks
├── lib/                   # Utilities and API clients
└── types/                 # Local types (if any, prefer shared)
```

### API Server (`apps/api`)

**Technology Stack:**
- **Framework**: Express (widely used, mature ecosystem)
- **Language**: TypeScript (strict mode)
- **Runtime**: Node.js 18+
- **Validation**: Zod (via `@cuelens/shared`)

**Responsibilities:**

1. **API Endpoints**
   - REST or GraphQL API
   - Memory CRUD operations
   - User management
   - Health checks

2. **Integration Services**
   - Overshoot SDK integration
   - STT/TTS service integration
   - External API calls

3. **Data Processing**
   - Camera feed processing
   - Memory suggestion generation
   - Graph relationship management

4. **Real-Time Communication**
   - WebSocket or SSE endpoints
   - Push notifications to clients

**Future Structure:**
```
apps/api/src/
├── index.ts               # Server entry point
├── routes/                # API route handlers
│   ├── health.ts         # Health check
│   ├── memory.ts         # Memory endpoints
│   └── users.ts          # User endpoints
├── services/              # Business logic
│   ├── overshoot.ts      # Overshoot SDK service
│   ├── stt.ts            # Speech-to-text service
│   ├── tts.ts            # Text-to-speech service
│   └── memory/           # Memory graph services
├── integrations/          # External integrations
├── middleware/            # Express middleware
└── types/                 # Local types (if any, prefer shared)
```

### Shared Package (`packages/shared`)

**Purpose:**
- Single source of truth for types and schemas
- Ensures type safety across the entire stack
- Runtime validation via Zod schemas

**Type Categories (Future):**

1. **Domain Models**
   - `Person`, `Place`, `Relationship`
   - Memory graph nodes and edges
   - User and session types

2. **API Contracts**
   - Request/response types
   - WebSocket message types
   - Error response types

3. **Integration Types**
   - Overshoot SDK response types
   - STT/TTS service types
   - External API types

4. **Validation Schemas**
   - Zod schemas matching TypeScript types
   - API request validation
   - Environment variable validation

**Usage Patterns:**

```typescript
// In apps/api (server-side validation)
import { PersonSchema } from '@cuelens/shared';

const result = PersonSchema.safeParse(req.body);
if (!result.success) {
  return res.status(400).json({ error: result.error });
}

// In apps/web (type safety)
import type { Person } from '@cuelens/shared';

const person: Person = await fetch('/api/persons/123').then(r => r.json());
```

**Benefits:**
- Type safety: TypeScript catches errors at compile time
- Runtime validation: Zod validates data at runtime
- Single source of truth: Changes propagate automatically
- No type drift: Frontend and backend stay in sync

## Data Flow (Future)

### Camera Feed → Memory Suggestion

```
1. User opens camera in web app
   ↓
2. MediaStream captured via browser API
   ↓
3. Frames sent to API via WebSocket/HTTP
   ↓
4. API sends frames to Overshoot SDK
   ↓
5. Overshoot analyzes frames → person/place detection
   ↓
6. API generates memory suggestions
   ↓
7. Suggestions sent back to web app
   ↓
8. Web app displays suggestions
   ↓
9. TTS reads prompts aloud (future)
```

### Memory Graph Updates

```
1. Caregiver approves suggestion
   ↓
2. Approval sent to API
   ↓
3. API validates data using @cuelens/shared schemas
   ↓
4. API stores in database (TBD)
   ↓
5. Memory graph updated (relationships stored)
   ↓
6. Graph changes propagated to web app (real-time)
```

### Query Flow

```
1. Web app needs memory graph data
   ↓
2. API query sent (REST/GraphQL)
   ↓
3. API queries database
   ↓
4. Data transformed to shared types
   ↓
5. Response sent to web app
   ↓
6. Web app uses typed data (TypeScript types from shared)
```

## Technology Decisions

### Why pnpm Workspaces?

- **Efficient disk usage**: Shared dependencies via symlinks
- **Fast installs**: Parallel installation
- **Strict dependency resolution**: Prevents phantom dependencies
- **Workspace protocol**: Clean internal package references

### Why Turborepo?

- **Build caching**: Significantly faster builds
- **Task orchestration**: Dependency-aware task execution
- **Parallel execution**: Runs independent tasks in parallel
- **Incremental builds**: Only rebuilds what changed

### Why Express?

- **Mature ecosystem**: Widely used with extensive middleware and community support
- **TypeScript support**: Excellent TypeScript integration with @types/express
- **Middleware**: Rich middleware ecosystem (body-parser, cors, etc.)
- **Flexibility**: Unopinionated framework that works well with Zod for validation

### Why Next.js App Router?

- **React Server Components**: Better performance
- **Streaming**: Supports streaming and Suspense
- **File-based routing**: Clear routing structure
- **API routes**: Can add API routes if needed (though we use separate API)

### Why Zod?

- **TypeScript integration**: Generate types from schemas (or vice versa)
- **Runtime validation**: Validate data at runtime
- **Error messages**: Detailed error messages
- **Type safety**: Ensures runtime data matches TypeScript types

## Future Considerations

### Database Choice (TBD)

Options under consideration:
- **PostgreSQL**: Relational database, good for structured data
- **MongoDB**: Document database, flexible schema
- **Graph Database** (Neo4j, ArangoDB): Natural fit for memory graph
- **Hybrid**: PostgreSQL for core data + graph extension

Decision factors:
- Query patterns (relationship-heavy queries favor graph DBs)
- Scalability requirements
- Team expertise
- Cost and hosting considerations

### Authentication (TBD)

Options under consideration:
- **JWT tokens**: Stateless authentication
- **Session-based**: Traditional sessions
- **OAuth 2.0**: Third-party authentication
- **Magic links**: Passwordless authentication

### Real-Time Communication (TBD)

Options under consideration:
- **WebSockets**: Bidirectional real-time communication
- **Server-Sent Events**: Server-to-client streaming
- **Polling**: Simple but less efficient

### Deployment (TBD)

- **Web app**: Vercel, Netlify, or self-hosted
- **API**: Railway, Render, AWS, or self-hosted
- **Database**: Managed service or self-hosted
- **CI/CD**: GitHub Actions (already configured)

## Security Considerations (Future)

- **API authentication**: Secure all endpoints
- **Data encryption**: Encrypt sensitive data in transit and at rest
- **CORS configuration**: Proper CORS setup for web app
- **Rate limiting**: Prevent abuse of API endpoints
- **Input validation**: Use Zod schemas for all inputs
- **Secret management**: Use environment variables (never commit secrets)

## Scalability Considerations (Future)

- **Horizontal scaling**: Stateless API design enables scaling
- **Caching**: Redis or in-memory caching for frequently accessed data
- **Database indexing**: Proper indexes on frequently queried fields
- **CDN**: Static assets served via CDN
- **Load balancing**: Multiple API instances behind load balancer

## Monitoring and Observability (Future)

- **Logging**: Structured logging (morgan, winston, or pino for Express, standard for Next.js)
- **Metrics**: Application metrics (Prometheus, DataDog, etc.)
- **Error tracking**: Sentry or similar
- **Performance monitoring**: APM tools
