# Technical Decision Records - Techdon Solutions

---

## TDR-001: PostgreSQL Outbox Pattern vs Message Queue

**Date**: June 3, 2026  
**Status**: DECIDED  
**Priority**: CRITICAL  

### Problem
Need reliable event publishing for asynchronous operations without adding infrastructure complexity.

### Decision
**Implement PostgreSQL Outbox Pattern** instead of RabbitMQ or AWS SQS.

### Rationale
1. **Single Source of Truth** - Events stored in same database as business data
2. **Transaction Atomicity** - Business operations + event creation in one transaction
3. **Cost** - No additional infrastructure required
4. **Operational Simplicity** - Works on weak machines
5. **Debugging** - Easy to query event history
6. **Evolution** - Clear path to Kafka when scale demands

### Implementation
```sql
CREATE TABLE outbox_events (
  id UUID PRIMARY KEY,
  aggregate_id UUID NOT NULL,
  aggregate_type VARCHAR NOT NULL,
  event_type VARCHAR NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  published_at TIMESTAMPTZ,
  published_by VARCHAR
);

CREATE INDEX idx_outbox_published ON outbox_events(published_at)
WHERE published_at IS NULL;
```

### Processing
- Background process runs every 100ms
- Selects unpublished events in batches
- Publishes to in-memory subscribers
- Marks as published
- Deletes after retention period (90 days)

### Guarantees
- **At-Least-Once**: Event persisted before processing
- **Idempotency**: Handlers must be idempotent
- **Ordering**: Per-aggregate guaranteed ordering

### Upgrade Path
When scale exceeds 10k events/sec:
1. Implement read replicas for polling
2. Add Kafka bridge (events → Kafka topics)
3. Maintain dual-write temporarily
4. Migrate consumers to Kafka

---

## TDR-002: BetterAuth vs Auth0 vs Clerk

**Date**: June 3, 2026  
**Status**: DECIDED  
**Priority**: CRITICAL

### Problem
Need authentication system that is self-hosted, lightweight, and PostgreSQL-native.

### Decision
**BetterAuth** - Open-source, self-hosted authentication framework.

### Alternatives Considered
| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| **BetterAuth** | Self-hosted, PostgreSQL, lightweight, open-source | Smaller community | ✅ CHOSEN |
| Auth0 | Proven, features-rich, hosted | Expensive at scale, vendor lock-in | ❌ |
| Clerk | Modern, good DX | Proprietary, expensive | ❌ |
| Supabase Auth | Built on Postgres | Limited customization | ⚠️ Backup |

### Implementation
```typescript
// packages/api/src/config/auth.config.ts
import { betterAuth } from "better-auth";

export const auth = betterAuth({
  database: {
    type: "postgres",
    client: databaseClient,
  },
  appName: "Techdon",
  baseURL: "https://api.techdon.dev",
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 12,
    hashAlgorithm: "argon2",
  },
  session: {
    expiresIn: 60 * 60 * 24, // 24 hours
    updateAge: 60 * 60, // Update every hour
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    },
  },
  plugins: [
    twoFactorPlugin(),
    multiSessionPlugin(),
  ],
});
```

### Integration with NestJS
```typescript
// Middleware for request authentication
export const AuthMiddleware = async (req, res, next) => {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  req.user = session.user;
  req.session = session.session;
  next();
};
```

### Security Measures
1. Passwords hashed with Argon2 (not bcrypt)
2. Email verification required
3. Rate limiting on auth endpoints
4. MFA support built-in
5. Session revocation on logout
6. CSRF protection via tokens

---

## TDR-003: Modular Monolith Architecture

**Date**: June 3, 2026  
**Status**: DECIDED  
**Priority**: CRITICAL

### Problem
Balance between operational simplicity (monolith) and future scalability (microservices).

### Decision
**Start with modular monolith**, extract services only when justified.

### Criteria for Monolith (Months 1-12)
- Single deployment unit
- Shared database (PostgreSQL)
- Event-driven communication between modules
- No HTTP calls between modules
- Shared transaction boundaries where appropriate

### Criteria for Extraction
Extract to separate service when **ANY** of these are true:
1. **Team ownership** - Dedicated team (2-pizza rule)
2. **Scaling** - Needs independent scaling (e.g., 10x load)
3. **Frequency** - Deploys 5+ times per week independently
4. **Failure isolation** - Critical to isolate failures
5. **Technology** - Different tech stack required

### Module Boundaries (Enforced)
```typescript
// ❌ FORBIDDEN: Direct imports between modules
import { ProjectService } from '../project/project.service';

// ✅ ALLOWED: Event-based communication
@EventHandler(ProjectCreatedEvent)
async handleProjectCreated(event: ProjectCreatedEvent) {
  // React to project creation
}
```

### Evolution Path

**Phase 1 (Months 0-6): Modular Monolith**
```
Single Process
├── Identity Module
├── Project Module
├── Delivery Module
├── Analytics Module
└── ...

Single Database (PostgreSQL)
└── Per-module schemas (isolation)
```

**Phase 2 (Months 6-12): Service Readiness**
```
Code is structured so extraction is straightforward
- Module A: Extractable (low coupling)
- Module B: Extractable (low coupling)
- Module C: Monolith (highly coupled)
```

**Phase 3 (Months 12+): Selective Extraction**
```
If high-load modules need extraction:

Service A (Identity)    Service B (Analytics)    Service C (Monolith)
    ↓                          ↓                         ↓
  DB-A                      DB-B                      DB-C
    ↓                          ↓                         ↓
    └──────────────┬───────────────────┬─────────────┘
                   ↓
         Event Bus (Kafka/RabbitMQ)
```

### Database Strategy
- Single PostgreSQL instance (initial)
- Per-module schemas for isolation
- Shared tables for multi-tenant data (users, teams)
- Event/Outbox tables in shared schema

### Deployment Strategy
1. **Months 0-6**: Single deployment
2. **Months 6-12**: Prepare extraction (CI/CD ready)
3. **Months 12+**: Extract high-load services
4. **Months 18+**: Full microservices (if needed)

---

## TDR-004: Next.js App Router with Server Components

**Date**: June 3, 2026  
**Status**: DECIDED  
**Priority**: HIGH

### Decision
Use Next.js 14+ with App Router and React Server Components.

### Rationale
1. **Type Safety** - TypeScript throughout
2. **SEO** - Server-side rendering out of box
3. **Performance** - Automatic code splitting
4. **ISR** - Incremental static regeneration
5. **Deployment** - Vercel integration seamless
6. **API Routes** - Webhook handling built-in

### Directory Structure
```
apps/web/
├── src/app/                   # App Router pages
│   ├── (auth)/               # Auth group
│   ├── (dashboard)/          # Dashboard group
│   ├── api/                  # API routes
│   └── middleware.ts         # Auth middleware
├── src/components/           # Shared components
├── src/lib/                  # Utilities
└── src/store/                # State management (Zustand)
```

### Server vs Client Components

**Server Components** (default):
```typescript
// app/projects/page.tsx
export default async function ProjectsPage() {
  const projects = await db.project.findMany();
  return <ProjectList projects={projects} />;
}
```

**Client Components** (interactive):
```typescript
// components/project-form.tsx
'use client';

export function ProjectForm() {
  const [name, setName] = useState('');
  return <form>...</form>;
}
```

---

## TDR-005: Payload CMS for Multi-Language Content

**Date**: June 3, 2026  
**Status**: DECIDED  
**Priority**: MEDIUM

### Decision
Use Payload CMS for content management and localization.

### Why Payload CMS
1. **Self-hosted** - Runs on own infrastructure
2. **PostgreSQL-native** - Uses our database
3. **Headless** - Content via API, not tied to frontend
4. **Localization** - Built-in multi-language support
5. **TypeScript** - Type-safe content schemas
6. **Role-based Access** - Granular permissions

### Collections
```typescript
// Collections
├── Articles
│   ├── title
│   ├── slug
│   ├── content
│   ├── category
│   ├── author
│   └── locale (en, es, fr, de, etc.)
├── FAQ
├── Case Studies
└── Resources
```

### Localization Strategy
```typescript
// Schema
export const Article: CollectionConfig = {
  slug: 'articles',
  fields: [
    {
      name: 'title',
      type: 'text',
      localized: true, // Translatable
    },
    {
      name: 'content',
      type: 'richText',
      localized: true,
    },
  ],
};
```

---

## TDR-006: Meilisearch for Full-Text Search

**Date**: June 3, 2026  
**Status**: DECIDED  
**Priority**: MEDIUM

### Decision
Use Meilisearch instead of Elasticsearch for full-text search.

### Why Meilisearch
1. **Lightweight** - 20MB binary, runs on weak machines
2. **Simple** - REST API, no complex DSLs
3. **Fast** - Sub-100ms response times
4. **Multi-language** - Built-in language support
5. **Docker** - Easy deployment
6. **Cost** - Free and self-hosted

### Indexes
```
meilisearch/
├── projects (indexed: name, description, client)
├── documents (indexed: title, content)
├── leads (indexed: company, email, notes)
└── faqs (indexed: question, answer)
```

### Indexing Strategy
- Real-time updates via event handlers
- Batch indexing for large imports
- 24-hour retention for search logs
- Faceted search for filtering

---

## TDR-007: Redis for Caching & Sessions

**Date**: June 3, 2026  
**Status**: DECIDED  
**Priority**: HIGH

### Decision
Use Redis for caching, sessions, rate limiting, and real-time features.

### Cache Strategy

**Level 1: Browser Cache**
- Static assets: 1 year
- API responses: 5 minutes

**Level 2: Redis Cache**
- User sessions: 24 hours
- Permissions cache: 1 hour
- Feature flags: 30 seconds
- Rate limit counters: 1 minute

**Level 3: Database Cache**
- Materialized views: 1 hour
- Aggregated metrics: 1 day

### Session Storage
```typescript
// .env
REDIS_URL=redis://localhost:6379/0

// Usage
app.use(session({
  store: new RedisStore({ client: redis }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
}));
```

### Rate Limiting
```typescript
// Implement with Redis
const limiter = rateLimit({
  store: new RedisStore({ client: redis }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
});

app.use('/api/', limiter);
```

---

## TDR-008: PostHog for Product Analytics

**Date**: June 3, 2026  
**Status**: DECIDED  
**Priority**: MEDIUM

### Decision
Use PostHog for analytics, feature flags, and session recording.

### Why PostHog
1. **Self-hostable** - Can run on own infrastructure
2. **All-in-one** - Analytics + feature flags + recordings
3. **Event-driven** - Integrates with domain events
4. **Privacy** - GDPR compliant, no third-party trackers
5. **Cost** - Free open-source version available

### Integration Architecture
```
Domain Events (Outbox)
    ↓
Event Handler
    ↓
PostHog SDK
    ↓
PostHog Instance
    ↓
Real-time Dashboards
```

### Tracked Events
```typescript
posthog.capture({
  distinctId: userId,
  event: 'project.created',
  properties: {
    projectId: id,
    category: 'WEB_DEV',
    budget: 10000,
    teamSize: 5,
  },
});
```

---

## TDR-009: Bull Queue for Background Jobs

**Date**: June 3, 2026  
**Status**: DECIDED  
**Priority**: MEDIUM

### Decision
Use Bull Queue (Redis-backed) for asynchronous job processing.

### Job Types
```typescript
enum JobType {
  SEND_EMAIL = 'send-email',
  PROCESS_DEPLOYMENT = 'process-deployment',
  GENERATE_REPORT = 'generate-report',
  AGGREGATE_METRICS = 'aggregate-metrics',
  INDEX_DOCUMENT = 'index-document',
  WARMUP_CACHE = 'warmup-cache',
  SEND_REMINDER = 'send-reminder',
}
```

### Queue Configuration
```typescript
// packages/api/src/queue/queue.service.ts
import Queue from 'bull';

export class QueueService {
  private emailQueue = new Queue('email', {
    redis: {
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT),
    },
  });

  async sendEmail(data: EmailJob) {
    return this.emailQueue.add(data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: true,
      removeOnFail: false,
    });
  }

  registerEmailProcessor() {
    this.emailQueue.process(async (job) => {
      await sendgridService.send(job.data);
    });
  }
}
```

---

## TDR-010: TypeScript End-to-End

**Date**: June 3, 2026  
**Status**: DECIDED  
**Priority**: CRITICAL

### Decision
Use TypeScript in all layers: frontend, backend, shared utilities.

### Rationale
1. **Single Language** - Reduces cognitive load
2. **Type Safety** - Catches errors at compile-time
3. **Shared Types** - Frontend & backend use same definitions
4. **Auto-documentation** - Types serve as documentation
5. **Better IDE Support** - Autocomplete, refactoring tools
6. **Runtime Safety** - Combined with Zod validation

### Shared Type Package
```typescript
// packages/shared/src/types/api.ts
export interface Project {
  id: string;
  name: string;
  status: 'ACTIVE' | 'PAUSED' | 'DELIVERED';
  budget: number;
  createdAt: Date;
}

export interface CreateProjectRequest {
  name: string;
  description: string;
  category: ServiceCategory;
  budget: number;
}
```

### Validation with Zod
```typescript
import { z } from 'zod';

const CreateProjectSchema = z.object({
  name: z.string().min(3).max(100),
  budget: z.number().positive(),
  status: z.enum(['ACTIVE', 'PAUSED', 'DELIVERED']),
});

type CreateProjectRequest = z.infer<typeof CreateProjectSchema>;
```

### Strict Configuration
```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noImplicitThis": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true
  }
}
```

---

## TDR-011: Docker & Docker Compose for Local Development

**Date**: June 3, 2026  
**Status**: DECIDED  
**Priority**: MEDIUM

### Decision
Use Docker Compose for consistent local development environment.

### Services
```yaml
version: '3.9'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: techdon
  
  redis:
    image: redis:7-alpine
  
  meilisearch:
    image: getmeili/meilisearch:latest
    environment:
      MEILI_MASTER_KEY: dev-key
  
  api:
    build: ./packages/api
    ports:
      - "3001:3000"
    depends_on:
      - postgres
      - redis
    environment:
      DATABASE_URL: postgres://postgres:postgres@postgres/techdon
      REDIS_URL: redis://redis:6379
      NODE_ENV: development
  
  web:
    build: ./apps/web
    ports:
      - "3000:3000"
    depends_on:
      - api
```

---

## TDR-012: Supabase for Deployment & Functions

**Date**: June 3, 2026  
**Status**: DECIDED  
**Priority**: MEDIUM

### Decision
Use Supabase for managed PostgreSQL and serverless functions in production.

### Deployment Strategy

**Development**: Docker Compose (local)
```
- PostgreSQL (local)
- Redis (local)
- Meilisearch (local)
```

**Production**: Supabase + Vercel
```
Frontend (Next.js)       →  Vercel (CDN, Edge Functions)
Backend (NestJS)         →  Supabase Edge Functions or VPS
Database (PostgreSQL)    →  Supabase Managed DB
Cache (Redis)            →  Upstash Redis
Search (Meilisearch)     →  Self-hosted or managed
```

### Supabase Benefits
1. **Managed PostgreSQL** - Automatic backups, replication
2. **Migrations** - Easy schema management
3. **Edge Functions** - Serverless TypeScript
4. **Real-time** - WebSocket API for live updates
5. **Vector Search** - pgvector for AI embeddings
6. **Storage** - S3-compatible file storage

---

## TDR-013: Vercel for Frontend Deployment

**Date**: June 3, 2026  
**Status**: DECIDED  
**Priority**: MEDIUM

### Decision
Deploy Next.js frontend to Vercel.

### Why Vercel
1. **Zero-config** - Automatic builds and deployments
2. **Edge Functions** - Run code closer to users
3. **Preview Deployments** - Test branches before merge
4. **Performance** - Optimized for Next.js
5. **Cost** - Reasonable pricing, free tier available
6. **Analytics** - Built-in Web Analytics

### Deployment
```bash
# Connected to GitHub
- Push to main → Automatic production deployment
- Push to feature branch → Preview deployment
- Pull request → Automatic preview
```

---

## TDR-014: GitHub Actions for CI/CD

**Date**: June 3, 2026  
**Status**: DECIDED  
**Priority**: HIGH

### Decision
Use GitHub Actions for continuous integration and deployment.

### Workflow Pipeline
```
Commit → Lint → Type Check → Test → Build → Deploy
```

### Workflow Files
```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm run lint
      - run: npm run type-check
      - run: npm run test
```

---

## TDR-015: Feature Flags for Safe Deployments

**Date**: June 3, 2026  
**Status**: DECIDED  
**Priority**: MEDIUM

### Decision
Implement feature flags to decouple deployment from release.

### Flag Levels
```typescript
// Deployment Flags - Route to service
FLAG: IDENTITY_SERVICE_ENABLED

// Feature Flags - Enable/disable functionality
FLAG: NEW_DASHBOARD_UI
FLAG: AI_INFERENCE_V2

// Configuration Flags - Tune behavior
FLAG: MAX_PROJECT_SIZE = 1000
FLAG: AI_RATE_LIMIT = 100

// Experiment Flags - A/B testing
FLAG: NEW_PRICING_EXPERIMENT (25% of users)
```

### Implementation
```typescript
// Usage in code
const newUIEnabled = await featureFlags.isEnabled(
  'NEW_DASHBOARD_UI',
  userId,
  { teamId }
);

if (newUIEnabled) {
  return renderNewUI();
} else {
  return renderLegacyUI();
}
```

### Feature Flag Service
- Stored in PostgreSQL (not external)
- Cached in Redis (30-second TTL)
- PostHog integration for experiments
- Percentage rollout support

---

## Summary Table

| Decision | Choice | Alternative | Rationale |
|----------|--------|-------------|-----------|
| Event Publishing | Outbox Pattern | RabbitMQ | Single database, no extra infra |
| Authentication | BetterAuth | Auth0 | Self-hosted, PostgreSQL |
| Architecture | Modular Monolith | Microservices | Simpler initially, extraction path |
| Frontend | Next.js App Router | Remix | Better Vercel integration |
| CMS | Payload CMS | Contentful | Self-hosted, TypeScript |
| Search | Meilisearch | Elasticsearch | Lightweight, simple |
| Caching | Redis | Memcached | Session storage, Pub/Sub |
| Analytics | PostHog | Segment | Self-hosted, all-in-one |
| Jobs | Bull Queue | Bullmq | Redis-backed, reliable |
| Language | TypeScript | JavaScript | Type safety |
| Deployment | Vercel + Supabase | AWS | Integrated, simpler |
| CI/CD | GitHub Actions | CircleCI | GitHub native |

---

**Last Updated**: June 3, 2026  
**Status**: All TDRs APPROVED  
**Next Review**: December 3, 2026  

