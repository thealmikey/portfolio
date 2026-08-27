# Implementation Guide - Techdon Solutions

---

## 1. PROJECT SETUP (Phase 1: Days 1-5)

### Prerequisites
- Node.js 20+
- Docker & Docker Compose
- Git
- PostgreSQL 15+
- Redis 7+

### Initialize Monorepo

**Step 1: Repository Setup**
```bash
# Clone and setup
git clone <repo>
cd techdon

# Initialize pnpm workspace (faster than npm)
pnpm install

# Create workspace structure
mkdir -p apps/web apps/dashboard packages/api packages/database packages/shared packages/ui packages/config
```

**Step 2: Create pnpm-workspace.yaml**
```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

**Step 3: Package Initialization**
```bash
# Backend API (NestJS)
cd packages/api
npm init -y
npm install @nestjs/core @nestjs/common express
npm install -D @nestjs/cli typescript

# Frontend (Next.js)
cd ../../apps/web
npx create-next-app@latest . --typescript --tailwind
```

---

## 2. BACKEND SETUP (Phase 1: Days 6-10)

### NestJS Project Structure

```bash
packages/api/
├── src/
│   ├── main.ts                    # Entry point
│   ├── app.module.ts              # Root module
│   ├── common/
│   │   ├── decorators/
│   │   ├── filters/
│   │   ├── guards/
│   │   ├── interceptors/
│   │   └── middleware/
│   ├── config/
│   │   ├── database.config.ts
│   │   ├── auth.config.ts
│   │   └── cache.config.ts
│   ├── database/
│   │   ├── entities/
│   │   ├── migrations/
│   │   └── database.module.ts
│   ├── modules/
│   │   ├── identity/
│   │   ├── project/
│   │   ├── delivery/
│   │   └── ...
│   └── events/
│       ├── domain/
│       └── infrastructure/
├── .env.example
├── docker-compose.yml
└── package.json
```

### Core Configuration Files

**docker-compose.yml**:
```yaml
version: '3.9'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: techdon
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  meilisearch:
    image: getmeili/meilisearch:latest
    environment:
      MEILI_MASTER_KEY: dev-key
    ports:
      - "7700:7700"

  api:
    build: .
    ports:
      - "3001:3000"
    depends_on:
      - postgres
      - redis
    environment:
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/techdon
      REDIS_URL: redis://redis:6379
      NODE_ENV: development

volumes:
  postgres_data:
```

**.env.example**:
```env
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/techdon
DATABASE_POOL_SIZE=20

# Redis
REDIS_URL=redis://localhost:6379/0

# Authentication
JWT_SECRET=dev-secret-key-change-in-prod
JWT_EXPIRATION=24h
BCRYPT_ROUNDS=10

# External Services
STRIPE_SECRET_KEY=sk_test_...
SENDGRID_API_KEY=SG.xxx

# Google OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# OpenAI
OPENAI_API_KEY=sk-...

# Sentry
SENTRY_DSN=https://...

# Environment
NODE_ENV=development
LOG_LEVEL=debug
```

**tsconfig.json** (strict mode):
```json
{
  "compilerOptions": {
    "module": "commonjs",
    "target": "ES2020",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### Initialize Database

**Schema Creation** (migrations/001_initial_schema.sql):
```sql
-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  avatar_url TEXT,
  locale VARCHAR(10) DEFAULT 'en',
  timezone VARCHAR(50) DEFAULT 'UTC',
  email_verified BOOLEAN DEFAULT FALSE,
  mfa_enabled BOOLEAN DEFAULT FALSE,
  status VARCHAR(50) DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Teams table
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL REFERENCES users(id),
  avatar_url TEXT,
  billing_email VARCHAR(255),
  status VARCHAR(50) DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Team members table
CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'MEMBER',
  status VARCHAR(50) DEFAULT 'PENDING',
  invited_at TIMESTAMPTZ DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  removed_at TIMESTAMPTZ,
  UNIQUE(team_id, user_id)
);

-- Projects table
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'SCOPING',
  category VARCHAR(100) NOT NULL,
  budget DECIMAL(15,2),
  start_date DATE,
  estimated_end_date DATE,
  actual_end_date DATE,
  client_name VARCHAR(255),
  client_email VARCHAR(255),
  project_manager_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Outbox pattern table (for event publishing)
CREATE TABLE outbox_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  aggregate_id UUID NOT NULL,
  aggregate_type VARCHAR NOT NULL,
  event_type VARCHAR NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  published_at TIMESTAMPTZ,
  published_by VARCHAR
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_teams_owner_id ON teams(owner_id);
CREATE INDEX idx_team_members_team_id ON team_members(team_id);
CREATE INDEX idx_projects_team_id ON projects(team_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_outbox_published ON outbox_events(published_at) 
  WHERE published_at IS NULL;
```

---

## 3. AUTHENTICATION SETUP (Phase 2: Days 11-15)

### BetterAuth Integration

**packages/api/src/config/auth.config.ts**:
```typescript
import { betterAuth } from "better-auth";
import { db } from "@/database";

export const auth = betterAuth({
  database: {
    type: "postgres",
    client: db,
  },
  appName: "Techdon",
  baseURL: process.env.API_URL || "http://localhost:3001",
  secret: process.env.JWT_SECRET || "dev-secret",
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 12,
    hashAlgorithm: "argon2",
  },
  session: {
    expiresIn: 24 * 60 * 60, // 24 hours
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
      scope: ["email", "profile"],
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

**packages/api/src/common/guards/auth.guard.ts**:
```typescript
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { auth } from '@/config/auth.config';

@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    try {
      const session = await auth.api.getSession({ headers: request.headers });
      if (!session) {
        throw new UnauthorizedException('No session found');
      }
      
      request.user = session.user;
      request.session = session.session;
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid session');
    }
  }
}
```

---

## 4. FRONTEND SETUP (Phase 2: Days 16-20)

### Next.js 14 Configuration

**apps/web/app/layout.tsx**:
```typescript
import type { Metadata } from "next";
import { AuthProvider } from "@/components/providers/auth-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";

export const metadata: Metadata = {
  title: "Techdon Solutions",
  description: "Web & AI Development Platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

**apps/web/lib/api-client.ts**:
```typescript
import axios from "axios";

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001",
  withCredentials: true,
});

// Intercept requests to add auth token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Intercept errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Redirect to login
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

**apps/web/store/auth-store.ts** (Zustand):
```typescript
import { create } from "zustand";

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthStore {
  user: User | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isLoading: true,
  setUser: (user) => set({ user, isLoading: false }),
  logout: () => set({ user: null }),
}));
```

---

## 5. EVENT-DRIVEN ARCHITECTURE SETUP (Phase 3: Days 21-25)

### Outbox Pattern Implementation

**packages/api/src/events/infrastructure/event.processor.ts**:
```typescript
import { Injectable } from '@nestjs/common';
import { db } from '@/database';

@Injectable()
export class OutboxEventProcessor {
  async processUnpublishedEvents(): Promise<void> {
    const unpublished = await db.query(`
      SELECT * FROM outbox_events 
      WHERE published_at IS NULL 
      LIMIT 100
      FOR UPDATE
    `);

    for (const event of unpublished) {
      try {
        // Publish to subscribers
        await this.publishEvent(event);

        // Mark as published
        await db.query(`
          UPDATE outbox_events 
          SET published_at = now(), published_by = $1
          WHERE id = $2
        `, ['event_processor', event.id]);
      } catch (error) {
        console.error(`Failed to publish event ${event.id}`, error);
      }
    }

    // Cleanup old published events (retention: 90 days)
    await db.query(`
      DELETE FROM outbox_events 
      WHERE published_at < now() - interval '90 days'
    `);
  }

  private async publishEvent(event: any): Promise<void> {
    // Emit to subscribers
    eventBus.emit(event.event_type, event);

    // Send to PostHog
    posthog.capture({
      distinctId: event.aggregate_id,
      event: event.event_type,
      properties: event.payload,
    });
  }
}
```

**packages/api/src/events/event-bus.ts**:
```typescript
import { EventEmitter } from 'events';

class EventBus extends EventEmitter {
  private handlers: Map<string, Function[]> = new Map();

  subscribe(eventType: string, handler: Function) {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler);
  }

  async emit(eventType: string, event: any) {
    const handlers = this.handlers.get(eventType) || [];
    
    for (const handler of handlers) {
      try {
        await handler(event);
      } catch (error) {
        console.error(`Handler error for ${eventType}`, error);
      }
    }
  }
}

export const eventBus = new EventBus();
```

### Event Handler Example

**packages/api/src/modules/identity/events/handlers/user-registered.handler.ts**:
```typescript
import { Injectable } from '@nestjs/common';
import { eventBus } from '@/events/event-bus';
import { SendgridService } from '@/integrations/external/sendgrid';

@Injectable()
export class UserRegisteredHandler {
  constructor(private sendgridService: SendgridService) {
    // Subscribe to user.registered event
    eventBus.subscribe('user.registered', this.handle.bind(this));
  }

  async handle(event: any) {
    const { payload } = event;
    const { email, firstName } = payload;

    // Send welcome email
    await this.sendgridService.send({
      to: email,
      subject: 'Welcome to Techdon',
      template: 'welcome',
      variables: { firstName },
    });

    // Track in analytics
    posthog.capture({
      distinctId: payload.userId,
      event: 'user.registered',
      properties: { email },
    });
  }
}
```

---

## 6. API ENDPOINTS IMPLEMENTATION (Phase 3: Days 26-30)

### Authentication Endpoints

**packages/api/src/modules/identity/controllers/auth.controller.ts**:
```typescript
import { Controller, Post, Body, Get, Req, UseGuards } from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { AuthGuard } from '@/common/guards/auth.guard';
import { RegisterDto, LoginDto } from '../dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('logout')
  @UseGuards(AuthGuard)
  async logout(@Req() req) {
    return this.authService.logout(req.session.id);
  }

  @Get('me')
  @UseGuards(AuthGuard)
  async getCurrentUser(@Req() req) {
    return req.user;
  }

  @Post('refresh-token')
  async refreshToken(@Req() req) {
    return this.authService.refreshToken(req.cookies['refreshToken']);
  }

  @Post('verify-email')
  async verifyEmail(@Body('token') token: string) {
    return this.authService.verifyEmail(token);
  }
}
```

### Project Endpoints

**packages/api/src/modules/project/controllers/project.controller.ts**:
```typescript
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ProjectService } from '../services/project.service';
import { CreateProjectDto, UpdateProjectDto } from '../dto';
import { AuthGuard } from '@/common/guards/auth.guard';

@Controller('projects')
@UseGuards(AuthGuard)
export class ProjectController {
  constructor(private projectService: ProjectService) {}

  @Post()
  async create(@Body() dto: CreateProjectDto, @Req() req) {
    return this.projectService.create(dto, req.user.id);
  }

  @Get()
  async list(@Query() query: any, @Req() req) {
    return this.projectService.list(req.user.id, query);
  }

  @Get(':id')
  async get(@Param('id') id: string, @Req() req) {
    return this.projectService.get(id, req.user.id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
    @Req() req
  ) {
    return this.projectService.update(id, dto, req.user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Req() req) {
    return this.projectService.delete(id, req.user.id);
  }
}
```

---

## 7. TESTING SETUP (Phase 4: Days 31-35)

### Unit Tests

**packages/api/src/modules/identity/services/auth.service.spec.ts**:
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthService],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should hash passwords correctly', async () => {
    const password = 'TestPassword123!@#';
    const hash = await service.hashPassword(password);
    const isValid = await service.verifyPassword(password, hash);
    expect(isValid).toBe(true);
  });

  it('should register user with valid data', async () => {
    const result = await service.register({
      email: 'test@example.com',
      password: 'ValidPassword123!@#',
    });
    expect(result).toHaveProperty('id');
    expect(result.email).toBe('test@example.com');
  });
});
```

### Integration Tests

**packages/api/src/modules/identity/auth.e2e.spec.ts**:
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '@/app.module';

describe('Auth Endpoints (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /auth/register', () => {
    it('should create new user', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'ValidPassword123!@#',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.email).toBe('test@example.com');
        });
    });

    it('should reject invalid email', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'invalid-email',
          password: 'ValidPassword123!@#',
        })
        .expect(400);
    });
  });

  describe('POST /auth/login', () => {
    it('should return auth token on valid credentials', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'ValidPassword123!@#',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('token');
        });
    });

    it('should reject invalid credentials', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'WrongPassword',
        })
        .expect(401);
    });
  });
});
```

---

## 8. DEPLOYMENT SETUP (Phase 4: Days 36-40)

### GitHub Actions Workflow

**.github/workflows/ci-cd.yml**:
```yaml
name: CI/CD

on:
  push:
    branches: [main, staging, develop]
  pull_request:
    branches: [develop]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: techdon_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v3
      
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'pnpm'
      
      - run: pnpm install
      - run: pnpm run lint
      - run: pnpm run type-check
      - run: pnpm run test
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        if: always()

  deploy-staging:
    needs: test
    if: github.ref == 'refs/heads/staging'
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to Vercel (Staging)
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
        run: |
          npx vercel --token $VERCEL_TOKEN --prod

  deploy-production:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy Database Migrations
        env:
          DATABASE_URL: ${{ secrets.PROD_DATABASE_URL }}
        run: |
          pnpm run db:migrate:prod
      
      - name: Deploy to Vercel (Production)
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
        run: |
          npx vercel --token $VERCEL_TOKEN --prod
```

### Vercel Configuration

**vercel.json**:
```json
{
  "buildCommand": "pnpm run build",
  "outputDirectory": ".next",
  "installCommand": "pnpm install",
  "env": {
    "NEXT_PUBLIC_API_URL": "@api_url"
  },
  "envs": {
    "preview": {
      "NEXT_PUBLIC_API_URL": "https://api-staging.techdon.dev"
    },
    "production": {
      "NEXT_PUBLIC_API_URL": "https://api.techdon.dev"
    }
  }
}
```

---

## 9. QUICK START COMMANDS

```bash
# Setup
pnpm install
docker-compose up -d

# Development
pnpm dev                 # All services
pnpm dev --filter=api   # Backend only
pnpm dev --filter=web   # Frontend only

# Testing
pnpm test              # All tests
pnpm test --watch      # Watch mode

# Database
pnpm db:migrate        # Run migrations
pnpm db:seed          # Seed data

# Build & Deploy
pnpm build            # Build all
pnpm deploy:staging   # Deploy to staging
pnpm deploy:prod      # Deploy to production

# Linting & Formatting
pnpm lint             # Lint all
pnpm format           # Format all
pnpm type-check       # TypeScript check

# Cleaning
pnpm clean            # Remove builds & node_modules
docker-compose down   # Stop all services
```

---

**Last Updated**: June 3, 2026  
**Implementation Status**: Ready for Phase 1 execution  
**Estimated Timeline**: 40 days for MVP  

