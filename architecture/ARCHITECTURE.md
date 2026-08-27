# Techdon Solutions - Complete Software Architecture

**Version**: 1.0  
**Status**: Approved  
**Last Updated**: June 3, 2026  
**Architect**: Staff+ Technical Authority  

---

## 1. ARCHITECTURAL VISION

### Mission
Techdon Solutions platform is a unified, cloud-agnostic B2B SaaS infrastructure enabling comprehensive digital services delivery across web development, mobile apps, AI systems, IoT platforms, and enterprise integrations.

### Core Principles
1. **Modular Monolith First** - Start monolithic, extract services by context boundary
2. **Event-Driven by Default** - Asynchronous operations reduce coupling
3. **PostgreSQL Everywhere** - Single source of truth with Outbox Pattern
4. **Type Safety** - TypeScript end-to-end eliminates runtime surprises
5. **Cloud Agnostic** - Container-native, runs anywhere (Supabase, Vercel, self-hosted)
6. **Developer Velocity** - Single codebase, unified deployment, rapid iteration
7. **Security First** - BetterAuth for identity, encryption at rest/transit
8. **Performance by Design** - Redis caching, Meilisearch for FTS, CDN ready

### Target User Matrix
```
Customer Type         | Platform Access      | Integration Level
Software Companies    | Full Dashboard       | API + Webhooks
Enterprise Clients    | Service Portal       | Custom Integrations
End Users            | Service Interface    | Limited Access
Internal Teams       | Admin Tools          | Full System Access
```

### Expected Scale (Year 1-3)
- 10M+ API requests/day
- 1000+ concurrent users peak
- 50+ simultaneous projects
- Multi-tenant (single-database, row-level security)
- 99.9% uptime SLA

---

## 2. BOUNDED CONTEXTS (Domain-Driven Design)

### Context Map
```
┌─────────────────────────────────────────────────────────────┐
│                  Techdon Platform (Monolith)                │
├──────────┬──────────┬──────────┬──────────┬──────────┬───────┤
│ Identity │ Project  │ Delivery │ Analytics│ Content  │ System│
│ Context  │ Context  │ Context  │ Context  │ Context  │Config │
└──────────┴──────────┴──────────┴──────────┴──────────┴───────┘
       ↓         ↓         ↓           ↓          ↓        ↓
   Event Store with PostgreSQL Outbox Pattern
       ↓
External Systems: Stripe, SendGrid, Slack, Cal.com, PostHog
```

### 2.1 Identity & Authorization Context
**Responsibility**: User authentication, authorization, team management  
**Owner**: Authentication Module  
**Key Entities**:
- User
- Team
- Organization
- Role
- Permission
- Session

**Bounded Operations**:
- Register/Login (BetterAuth)
- OAuth2 Social Auth (Google, GitHub)
- Team Invitation
- RBAC Management
- API Key Management
- MFA/2FA

**Events Published**:
- `user.registered`
- `user.email_verified`
- `team.created`
- `team.member_invited`
- `team.member_removed`
- `session.created`
- `session.revoked`

**External Dependencies**: BetterAuth, Resend, SendGrid

---

### 2.2 Project Management Context
**Responsibility**: Project lifecycle, configuration, resource allocation  
**Owner**: Project Module  
**Key Entities**:
- Project
- Service (Web Dev, App Dev, AI System, etc.)
- ProjectConfiguration
- Deliverable
- Milestone
- TeamMember (ProjectRole)

**Bounded Operations**:
- Create/Update/Delete Project
- Define Services
- Assign Team Members
- Track Deliverables
- Manage Milestones
- Generate Project Quotes

**Events Published**:
- `project.created`
- `project.configuration_updated`
- `project.team_assigned`
- `project.milestone_created`
- `project.deliverable_completed`
- `project.status_changed`

**External Dependencies**: Cal.com (consultation booking)

---

### 2.3 Delivery Context
**Responsibility**: Service delivery execution, artifact management, quality gates  
**Owner**: Delivery Module  
**Key Entities**:
- Service
- Deployment
- Environment
- Artifact
- QualityGate
- ReleaseNote

**Bounded Operations**:
- Create Deployment
- Execute Quality Gates
- Manage Artifacts
- Version Control Integration
- Rollback Management
- Performance Monitoring

**Events Published**:
- `deployment.initiated`
- `deployment.quality_check_passed`
- `deployment.failed`
- `deployment.completed`
- `artifact.created`
- `environment.updated`

**External Dependencies**: Vercel API, GitHub API, Supabase API

---

### 2.4 Analytics Context
**Responsibility**: Metrics collection, insights generation, reporting  
**Owner**: Analytics Module  
**Key Entities**:
- Event
- Metric
- Dashboard
- Report
- Alert

**Bounded Operations**:
- Capture Events
- Aggregate Metrics
- Generate Reports
- Alert on Thresholds
- Export Analytics

**Events Published**:
- `analytics.event_tracked`
- `analytics.report_generated`
- `analytics.alert_triggered`

**External Dependencies**: PostHog, Prometheus, Grafana

---

### 2.5 Content Management Context
**Responsibility**: Multi-language content, knowledge base, documentation  
**Owner**: Content Module  
**Key Entities**:
- Document
- Article
- Locale
- Translation
- MediaAsset
- FAQ

**Bounded Operations**:
- Create/Update Content
- Manage Translations
- Asset Management
- Publishing Workflow
- Version Control

**Events Published**:
- `content.published`
- `content.updated`
- `content.translated`
- `asset.uploaded`

**External Dependencies**: Payload CMS, AWS S3/Cloudinary

---

### 2.6 Consultation Booking Context
**Responsibility**: Scheduling, availability management, meeting coordination  
**Owner**: Booking Module  
**Key Entities**:
- Slot
- Consultation
- Availability
- Attendee
- CalendarIntegration

**Bounded Operations**:
- Check Availability
- Create Booking
- Send Reminders
- Update Attendees
- Cancel Consultation
- Generate Meeting Link

**Events Published**:
- `booking.created`
- `booking.confirmed`
- `booking.cancelled`
- `booking.reminder_sent`
- `consultation.completed`

**External Dependencies**: Cal.com, Zoom API, SendGrid

---

### 2.7 AI Services Context
**Responsibility**: AI model management, inference, fine-tuning  
**Owner**: AI Module  
**Key Entities**:
- AIModel
- InferenceRequest
- TrainingJob
- APIKey
- UsageQuota

**Bounded Operations**:
- Create Inference Request
- Manage Models
- Track Usage
- Enforce Quotas
- Generate Billing Events

**Events Published**:
- `ai.inference_requested`
- `ai.inference_completed`
- `ai.training_started`
- `ai.usage_recorded`
- `ai.quota_exceeded`

**External Dependencies**: OpenAI API, Anthropic API, Hugging Face

---

### 2.8 CRM Context
**Responsibility**: Customer relationship, pipeline, interaction tracking  
**Owner**: CRM Module  
**Key Entities**:
- Lead
- Contact
- Deal
- Interaction
- Pipeline
- Activity

**Bounded Operations**:
- Create/Update Lead
- Manage Pipeline
- Track Interactions
- Generate Forecasts
- Export Reports

**Events Published**:
- `crm.lead_created`
- `crm.deal_updated`
- `crm.interaction_logged`
- `crm.pipeline_changed`

**External Dependencies**: Stripe (Payment), SendGrid (Email)

---

### 2.9 Notification Context
**Responsibility**: Multi-channel notifications, delivery tracking  
**Owner**: Notification Module  
**Key Entities**:
- NotificationTemplate
- Notification
- Channel (Email, SMS, In-App, Slack)
- Delivery

**Bounded Operations**:
- Send Email
- Send In-App Notification
- Send SMS
- Send Slack Message
- Track Delivery
- Manage Templates

**Events Published**:
- `notification.sent`
- `notification.delivered`
- `notification.failed`

**External Dependencies**: SendGrid, Twilio, Slack API

---

### 2.10 System Configuration Context
**Responsibility**: Feature flags, configuration, secrets management  
**Owner**: Config Module  
**Key Entities**:
- FeatureFlag
- Configuration
- Environment
- Secret

**Bounded Operations**:
- Toggle Features
- Update Configuration
- Manage Secrets
- Rotate Credentials

**Events Published**:
- `config.flag_toggled`
- `config.updated`
- `secret.rotated`

**External Dependencies**: Vault (Secrets), LaunchDarkly (FF)

---

## 3. DOMAIN MODEL

### Core Entities & Relationships

```
User (Identity Context)
├── id: UUID
├── email: String (unique)
├── passwordHash: String (bcrypt)
├── firstName: String
├── lastName: String
├── avatar: String (URL)
├── locale: String (en, es, fr, de, etc.)
├── timezone: String
├── emailVerified: Boolean
├── mfaEnabled: Boolean
├── status: ACTIVE | SUSPENDED | DELETED
├── createdAt: DateTime
└── updatedAt: DateTime

Team (Identity Context)
├── id: UUID
├── name: String
├── slug: String (unique)
├── description: String
├── ownerId: FK→User
├── avatar: String
├── billingEmail: String
├── status: ACTIVE | SUSPENDED | DELETED
├── subscription: FK→Subscription
├── createdAt: DateTime
└── updatedAt: DateTime

TeamMember (Identity Context)
├── id: UUID
├── teamId: FK→Team
├── userId: FK→User
├── role: OWNER | ADMIN | MEMBER | VIEWER
├── invitedAt: DateTime
├── acceptedAt: DateTime
├── joinedAt: DateTime
└── status: PENDING | ACTIVE | REMOVED

Project (Project Context)
├── id: UUID
├── teamId: FK→Team
├── name: String
├── description: String
├── status: SCOPING | ACTIVE | PAUSED | DELIVERED | ARCHIVED
├── category: WEB_DEV | APP_DEV | AI_SYSTEM | IOT | POS | CCTV | ENTERPRISE_INTEGRATION
├── budget: Decimal
├── startDate: DateTime
├── estimatedEndDate: DateTime
├── actualEndDate: DateTime
├── clientName: String
├── clientEmail: String
├── projectManagerId: FK→User
├── createdAt: DateTime
├── updatedAt: DateTime
└── deletedAt: DateTime (soft delete)

Service (Project Context)
├── id: UUID
├── projectId: FK→Project
├── type: String (Web Frontend, Mobile App, Backend API, etc.)
├── description: String
├── status: PLANNED | IN_PROGRESS | REVIEW | COMPLETED
├── priority: LOW | MEDIUM | HIGH | CRITICAL
├── assignedTeamId: FK→Team
├── estimatedHours: Integer
├── actualHours: Integer
├── createdAt: DateTime
└── updatedAt: DateTime

Deliverable (Project Context)
├── id: UUID
├── serviceId: FK→Service
├── title: String
├── description: String
├── acceptance_criteria: String[]
├── status: PENDING | IN_PROGRESS | SUBMITTED | ACCEPTED | REJECTED
├── dueDate: DateTime
├── submittedAt: DateTime
├── completedAt: DateTime
└── notes: String

Consultation (Booking Context)
├── id: UUID
├── projectId: FK→Project
├── userId: FK→User (the consultant)
├── clientId: FK→User (the client/team)
├── type: DISCOVERY | TECHNICAL_REVIEW | PLANNING | REVIEW
├── startTime: DateTime
├── endTime: DateTime
├── status: SCHEDULED | COMPLETED | CANCELLED | NO_SHOW
├── meetingLink: String
├── notes: String
├── createdAt: DateTime
└── cancelledAt: DateTime

Deployment (Delivery Context)
├── id: UUID
├── serviceId: FK→Service
├── environment: DEVELOPMENT | STAGING | PRODUCTION
├── status: PENDING | IN_PROGRESS | SUCCESS | FAILED | ROLLED_BACK
├── commitHash: String (Git reference)
├── version: String (Semantic versioning)
├── artifactId: FK→Artifact
├── deployedBy: FK→User
├── deployedAt: DateTime
├── logs: String (JSON structured logs)
├── metrics: JSON (Performance data)
└── errorDetails: String

Document (Content Context)
├── id: UUID
├── title: String
├── slug: String (unique per locale)
├── content: String (markdown)
├── locale: String
├── status: DRAFT | PUBLISHED | ARCHIVED
├── author: FK→User
├── category: String
├── tags: String[]
├── viewCount: Integer
├── createdAt: DateTime
├── publishedAt: DateTime
└── updatedAt: DateTime

AIInference (AI Context)
├── id: UUID
├── projectId: FK→Project
├── modelId: String (OpenAI, Anthropic, etc.)
├── prompt: String
├── response: String (JSON)
├── usage: Object (tokens, cost)
├── status: PENDING | PROCESSING | COMPLETED | FAILED
├── error: String
├── createdAt: DateTime
└── completedAt: DateTime

Notification (Notification Context)
├── id: UUID
├── recipientId: FK→User (or Team)
├── type: EMAIL | SMS | IN_APP | SLACK
├── subject: String
├── body: String
├── templateId: FK→NotificationTemplate
├── variables: JSON
├── status: PENDING | SENT | DELIVERED | FAILED | BOUNCED
├── deliveryDetails: JSON (provider response)
├── createdAt: DateTime
├── sentAt: DateTime
└── deliveredAt: DateTime

Metric (Analytics Context)
├── id: UUID
├── name: String (e.g., "deployment_success_rate", "api_latency_p99")
├── value: Decimal
├── unit: String (%, ms, count, etc.)
├── dimension: JSON (projectId, environment, service, etc.)
├── timestamp: DateTime
├── aggregationLevel: RAW | HOUR | DAY | MONTH
└── expiresAt: DateTime (for retention)
```

### Entity Relationships Diagram
```
User ←→ Team (Many-to-Many via TeamMember)
Team ←→ Project (One-to-Many)
Project ←→ Service (One-to-Many)
Service ←→ Deliverable (One-to-Many)
Service ←→ Deployment (One-to-Many)
Project ←→ Consultation (One-to-Many)
Project ←→ AIInference (One-to-Many)
User ←→ Notification (One-to-Many)
NotificationTemplate ← Notification (Many-to-One)
```

---

## 4. EVENT MODEL

### Event Taxonomy

#### 4.1 Core Events (System-Critical)
```typescript
interface DomainEvent {
  id: UUID;
  type: string;
  aggregateId: UUID;
  aggregateType: string;
  timestamp: DateTime;
  version: number;
  payload: Record<string, unknown>;
  userId: UUID;
  tenantId: UUID;
  traceId: UUID;
  causationId: UUID;
  correlationId: UUID;
}
```

#### 4.2 Event Stream (Ordered by Bounded Context)

**Identity Events**:
- `user.registered` → Trigger: Welcome email, Init analytics
- `user.email_verified` → Trigger: Unlock features, Send email
- `user.password_reset_requested` → Trigger: Send reset link
- `team.created` → Trigger: Create default roles, Init billing
- `team.member_invited` → Trigger: Send invitation email
- `team.member_accepted` → Trigger: Grant permissions, Log event
- `team.member_removed` → Trigger: Revoke access, Archive data
- `user.mfa_enabled` → Trigger: Send confirmation
- `user.deleted` → Trigger: Data retention policy

**Project Events**:
- `project.created` → Trigger: Send confirmation, Create tasks
- `project.status_changed` → Trigger: Notify stakeholders
- `project.configuration_updated` → Trigger: Invalidate caches
- `project.team_assigned` → Trigger: Grant access, Send notification
- `project.milestone_created` → Trigger: Set reminders
- `project.deliverable_submitted` → Trigger: Notify PM, Create review task
- `project.deliverable_accepted` → Trigger: Update status, Trigger next phase
- `project.budget_exceeded` → Trigger: Alert PM, Send notification

**Delivery Events**:
- `deployment.initiated` → Trigger: Start monitoring
- `deployment.quality_check_started` → Trigger: Run tests
- `deployment.quality_check_passed` → Trigger: Proceed to next gate
- `deployment.quality_check_failed` → Trigger: Notify, Create incident
- `deployment.approval_requested` → Trigger: Notify approvers
- `deployment.approved` → Trigger: Begin deployment
- `deployment.started` → Trigger: Lock environment
- `deployment.completed` → Trigger: Update status, Run smoke tests
- `deployment.failed` → Trigger: Rollback, Create incident, Notify team
- `deployment.rolled_back` → Trigger: Notify team, Log incident

**Booking Events**:
- `booking.created` → Trigger: Send confirmation, Update calendar
- `booking.confirmed` → Trigger: Send reminder email, Add to CRM
- `booking.reminder_sent` → Trigger: Track delivery
- `booking.meeting_completed` → Trigger: Send follow-up, Update CRM
- `booking.cancelled` → Trigger: Free slot, Send notification

**AI Events**:
- `ai.inference_requested` → Trigger: Queue job, Start tracking
- `ai.inference_processing` → Trigger: Update status
- `ai.inference_completed` → Trigger: Store result, Record usage
- `ai.inference_failed` → Trigger: Retry logic, Alert user
- `ai.usage_recorded` → Trigger: Update quota, Track billing
- `ai.quota_exceeded` → Trigger: Block requests, Alert user

**Notification Events**:
- `notification.queued` → Trigger: Enter delivery queue
- `notification.sent` → Trigger: Log delivery, Update status
- `notification.delivered` → Trigger: Mark as delivered
- `notification.failed` → Trigger: Retry/DLQ, Alert
- `notification.bounced` → Trigger: Unsubscribe, Notify user

**Analytics Events**:
- `analytics.event_tracked` → Trigger: PostHog ingestion
- `analytics.metric_aggregated` → Trigger: Dashboard update
- `analytics.report_generated` → Trigger: Send email, Archive
- `analytics.alert_triggered` → Trigger: Notify on-call

**Content Events**:
- `content.published` → Trigger: Invalidate cache, Index for search
- `content.updated` → Trigger: Update translations, Cache invalidation
- `content.translated` → Trigger: Update locale status

**CRM Events**:
- `crm.lead_created` → Trigger: Send welcome sequence
- `crm.deal_updated` → Trigger: Update pipeline, Trigger workflows
- `crm.interaction_logged` → Trigger: Update last contact

**System Events**:
- `feature_flag.toggled` → Trigger: Cache invalidation
- `system.health_check_failed` → Trigger: Alert ops
- `system.error_threshold_exceeded` → Trigger: Escalate

#### 4.3 Event Publishing Strategy

**Synchronous Events** (Immediate consistency required):
- User authentication/authorization
- Permission checks
- Constraint violations
- Critical security events

**Asynchronous Events** (PostgreSQL Outbox Pattern):
- Notifications
- Analytics tracking
- External integrations
- Cross-context communication
- Reporting

**Event Channels**:
```
PostgreSQL Outbox Table
    ↓
Background Worker (Every 100ms)
    ↓
┌─────────────────────────┬──────────────────┬─────────────────┐
│ Event Bus (In-Memory)   │ Webhook Queue    │ Analytics Queue │
│ for Internal Events     │ for External     │ for PostHog     │
└─────────────────────────┴──────────────────┴─────────────────┘
    ↓                          ↓                      ↓
Event Subscribers         External Systems      PostHog, Sentry
(Handlers in Memory)      (Webhooks, APIs)      (Batch & Real-time)
```

#### 4.4 Event Versioning
```typescript
interface EventVersion {
  current: 2;
  migrations: {
    1: { from: 'old_field', to: 'new_field' }
  };
  deprecated: [];
}
```

---

## 5. FOLDER STRUCTURE

### Root-Level Organization
```
techdon/
├── apps/
│   ├── web/                          # Next.js frontend
│   ├── dashboard/                    # Tenant dashboard
│   └── mobile/                       # React Native (future)
├── packages/
│   ├── api/                          # NestJS backend
│   ├── database/                     # Database schema & migrations
│   ├── shared/                       # Shared utilities & types
│   ├── ui/                           # Component library
│   └── config/                       # Configuration management
├── services/                         # Future microservices (placeholder)
├── docker/                           # Container configurations
├── infrastructure/                   # IaC (Terraform, K8s)
├── scripts/                          # Build & automation scripts
├── tests/                            # E2E & integration tests
├── docs/                             # Architecture & guides
└── .github/                          # CI/CD workflows
```

### Backend Structure (packages/api/src)
```
packages/api/src/
├── main.ts                           # NestJS entry point
├── app.module.ts                     # Root module
├── common/
│   ├── decorators/                   # Custom decorators (@Auth, @Roles, etc)
│   ├── filters/                      # Exception filters
│   ├── guards/                       # Auth guards
│   ├── interceptors/                 # Logging, performance, etc
│   ├── pipes/                        # Validation pipes
│   ├── middleware/                   # Global middleware
│   ├── constants.ts                  # App constants
│   ├── types.ts                      # Global types
│   └── utils.ts                      # Helper functions
├── config/
│   ├── app.config.ts                 # App configuration (from env)
│   ├── database.config.ts            # Database configuration
│   ├── cache.config.ts               # Redis configuration
│   ├── auth.config.ts                # BetterAuth setup
│   └── external.config.ts            # External API keys
├── database/
│   ├── entities/
│   │   ├── identity/                 # User, Team, Role entities
│   │   ├── project/                  # Project, Service entities
│   │   ├── delivery/                 # Deployment entities
│   │   ├── booking/                  # Consultation entities
│   │   ├── ai/                       # AI model entities
│   │   ├── notification/             # Notification entities
│   │   ├── analytics/                # Event, Metric entities
│   │   ├── content/                  # Document, Article entities
│   │   ├── crm/                      # Lead, Deal entities
│   │   └── shared/                   # Audit, OutboxEvent entities
│   ├── migrations/
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_indexes.sql
│   │   └── 003_outbox_pattern.sql
│   ├── seeds/
│   │   ├── seed-users.ts
│   │   ├── seed-roles.ts
│   │   └── seed-feature-flags.ts
│   └── database.module.ts            # Database module
├── modules/
│   ├── identity/
│   │   ├── controllers/
│   │   │   ├── auth.controller.ts
│   │   │   └── team.controller.ts
│   │   ├── services/
│   │   │   ├── auth.service.ts
│   │   │   ├── user.service.ts
│   │   │   └── team.service.ts
│   │   ├── dto/
│   │   │   ├── register.dto.ts
│   │   │   ├── login.dto.ts
│   │   │   └── create-team.dto.ts
│   │   ├── events/
│   │   │   ├── user-registered.event.ts
│   │   │   ├── team-created.event.ts
│   │   │   └── handlers/
│   │   ├── identity.module.ts
│   │   └── identity.constants.ts
│   ├── project/
│   │   ├── controllers/
│   │   │   ├── project.controller.ts
│   │   │   ├── service.controller.ts
│   │   │   └── deliverable.controller.ts
│   │   ├── services/
│   │   │   ├── project.service.ts
│   │   │   ├── service.service.ts
│   │   │   └── deliverable.service.ts
│   │   ├── dto/
│   │   ├── events/
│   │   │   ├── project-created.event.ts
│   │   │   └── handlers/
│   │   ├── project.module.ts
│   │   └── project.constants.ts
│   ├── delivery/
│   │   ├── controllers/
│   │   ├── services/
│   │   │   ├── deployment.service.ts
│   │   │   ├── quality-gate.service.ts
│   │   │   └── artifact.service.ts
│   │   ├── events/
│   │   │   ├── deployment-initiated.event.ts
│   │   │   └── handlers/
│   │   ├── delivery.module.ts
│   │   └── integrations/
│   │       ├── vercel.integration.ts
│   │       ├── github.integration.ts
│   │       └── supabase.integration.ts
│   ├── booking/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── events/
│   │   ├── booking.module.ts
│   │   └── integrations/
│   │       └── cal-com.integration.ts
│   ├── ai/
│   │   ├── controllers/
│   │   ├── services/
│   │   │   ├── inference.service.ts
│   │   │   ├── model.service.ts
│   │   │   └── usage-tracking.service.ts
│   │   ├── events/
│   │   ├── ai.module.ts
│   │   └── integrations/
│   │       ├── openai.integration.ts
│   │       ├── anthropic.integration.ts
│   │       └── huggingface.integration.ts
│   ├── notification/
│   │   ├── controllers/
│   │   ├── services/
│   │   │   ├── notification.service.ts
│   │   │   ├── email.service.ts
│   │   │   ├── sms.service.ts
│   │   │   └── in-app.service.ts
│   │   ├── events/
│   │   ├── notification.module.ts
│   │   └── integrations/
│   │       ├── sendgrid.integration.ts
│   │       └── twilio.integration.ts
│   ├── analytics/
│   │   ├── controllers/
│   │   ├── services/
│   │   │   ├── event.service.ts
│   │   │   ├── metric.service.ts
│   │   │   └── dashboard.service.ts
│   │   ├── events/
│   │   ├── analytics.module.ts
│   │   └── integrations/
│   │       └── posthog.integration.ts
│   ├── content/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── events/
│   │   ├── content.module.ts
│   │   └── integrations/
│   │       └── payload-cms.integration.ts
│   ├── crm/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── events/
│   │   └── crm.module.ts
│   ├── config/
│   │   ├── controllers/
│   │   ├── services/
│   │   │   ├── feature-flag.service.ts
│   │   │   └── secret.service.ts
│   │   └── config.module.ts
│   └── health/
│       └── health.controller.ts
├── events/
│   ├── domain/                       # Domain events
│   ├── infrastructure/               # Outbox pattern implementation
│   │   ├── event.processor.ts        # Outbox event processor
│   │   ├── event.publisher.ts        # Event publishing
│   │   ├── outbox.entity.ts          # Outbox table entity
│   │   └── event.queue.ts            # In-memory event queue
│   ├── event-bus.ts                  # Central event bus
│   └── event.constants.ts
├── integrations/
│   ├── external/
│   │   ├── stripe.ts
│   │   ├── sendgrid.ts
│   │   ├── slack.ts
│   │   ├── cal-com.ts
│   │   ├── zoom.ts
│   │   └── github.ts
│   ├── observability/
│   │   ├── posthog.ts
│   │   ├── sentry.ts
│   │   └── prometheus.ts
│   └── cache/
│       ├── redis.ts
│       └── cache.strategies.ts
├── security/
│   ├── encryption.ts                 # Encryption/decryption
│   ├── hashing.ts                    # Bcrypt, Argon2
│   ├── jwt.ts                        # JWT token handling
│   └── rate-limit.ts                 # Rate limiting
├── search/
│   ├── meilisearch.ts                # Meilisearch client
│   ├── indexes/
│   │   ├── project.index.ts
│   │   ├── document.index.ts
│   │   └── lead.index.ts
│   └── search.service.ts
├── queue/
│   ├── queue.service.ts              # Bull queue management
│   ├── jobs/
│   │   ├── send-email.job.ts
│   │   ├── process-deployment.job.ts
│   │   ├── generate-report.job.ts
│   │   └── aggregate-metrics.job.ts
│   └── consumers/
│       └── job.consumer.ts
└── app.service.ts                    # Root service
```

### Frontend Structure (apps/web)
```
apps/web/
├── src/
│   ├── app/                          # Next.js app directory
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   ├── register/page.tsx
│   │   │   └── forgot-password/page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx
│   │   │   ├── projects/
│   │   │   ├── team/
│   │   │   ├── analytics/
│   │   │   ├── content/
│   │   │   ├── consultations/
│   │   │   └── settings/
│   │   ├── api/
│   │   │   ├── auth/[...auth]/route.ts
│   │   │   ├── projects/route.ts
│   │   │   └── webhooks/stripe/route.ts
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── not-found.tsx
│   ├── components/
│   │   ├── ui/                       # Atomic UI components
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── modal.tsx
│   │   │   ├── table.tsx
│   │   │   └── ...
│   │   ├── layout/                   # Layout components
│   │   │   ├── header.tsx
│   │   │   ├── sidebar.tsx
│   │   │   └── footer.tsx
│   │   ├── forms/                    # Form components
│   │   │   ├── project-form.tsx
│   │   │   ├── service-form.tsx
│   │   │   └── team-form.tsx
│   │   ├── sections/                 # Page sections
│   │   │   ├── hero.tsx
│   │   │   ├── features.tsx
│   │   │   └── pricing.tsx
│   │   └── providers/                # Context providers
│   │       ├── theme-provider.tsx
│   │       ├── auth-provider.tsx
│   │       └── query-provider.tsx
│   ├── hooks/                        # Custom hooks
│   │   ├── useAuth.ts
│   │   ├── useProject.ts
│   │   ├── useLocalStorage.ts
│   │   └── useAsync.ts
│   ├── lib/
│   │   ├── api-client.ts             # API client setup
│   │   ├── validators.ts             # Form validators
│   │   ├── utils.ts                  # Utility functions
│   │   └── constants.ts              # App constants
│   ├── store/                        # State management (Zustand)
│   │   ├── auth-store.ts
│   │   ├── project-store.ts
│   │   └── ui-store.ts
│   ├── styles/                       # Global styles
│   │   ├── globals.css
│   │   └── variables.css
│   ├── types/
│   │   ├── api.ts
│   │   ├── domain.ts
│   │   └── next.ts
│   └── env.ts                        # Type-safe env variables
├── public/
│   ├── images/
│   ├── icons/
│   └── favicon.ico
├── .env.example
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

### Database Migrations
```
packages/database/migrations/
├── 001_initial_schema.sql            # Core tables
├── 002_indexes.sql                   # Performance indexes
├── 003_outbox_pattern.sql            # Outbox + Inbox tables
├── 004_rls_policies.sql              # Row-level security
├── 005_functions.sql                 # Postgres functions
├── 006_views.sql                     # Materialized views
├── 007_full_text_search.sql          # FTS indexes
└── 008_audit_logging.sql             # Audit trails
```

### Shared Package
```
packages/shared/
├── src/
│   ├── types/
│   │   ├── domain/                   # Domain types
│   │   ├── api/                      # API types
│   │   └── dto/                      # Data transfer objects
│   ├── utils/
│   │   ├── validators.ts
│   │   ├── formatters.ts
│   │   ├── date-utils.ts
│   │   └── string-utils.ts
│   ├── constants/
│   │   ├── roles.ts
│   │   ├── permissions.ts
│   │   ├── statuses.ts
│   │   └── error-codes.ts
│   ├── errors/
│   │   ├── AppError.ts
│   │   ├── ValidationError.ts
│   │   └── NotFoundError.ts
│   └── index.ts                      # Re-exports
└── package.json
```

---

## 6. SERVICE RESPONSIBILITIES

### 6.1 Identity Service (Authentication & Authorization)
**Port**: 3001  
**Database**: PostgreSQL  
**Cache**: Redis (Sessions, Permissions)  
**External**: BetterAuth, SendGrid, Google OAuth, GitHub OAuth

**Responsibilities**:
- User registration and email verification
- Password management with bcrypt/Argon2
- Session management (JWT + HTTP-only cookies)
- RBAC implementation
- Team and organization management
- API key generation and validation
- MFA/2FA implementation
- SSO/OAuth integration

**Key Endpoints**:
```
POST   /auth/register
POST   /auth/login
POST   /auth/logout
POST   /auth/verify-email
POST   /auth/reset-password
POST   /auth/refresh-token
GET    /teams
POST   /teams
POST   /teams/{id}/members
DELETE /teams/{id}/members/{userId}
GET    /users/me
PATCH  /users/me
```

**Outbound Events**:
- `user.registered` → Trigger onboarding
- `user.email_verified` → Unlock features
- `team.created` → Initialize team resources
- `team.member_invited` → Send invitation
- `team.member_removed` → Revoke access

---

### 6.2 Project Service
**Port**: 3002  
**Database**: PostgreSQL  
**Cache**: Redis (Project cache)  
**External**: Cal.com (Consultations)

**Responsibilities**:
- Project CRUD operations
- Service management within projects
- Milestone and deliverable tracking
- Team assignment to projects
- Status management
- Quote generation

**Key Endpoints**:
```
POST   /projects
GET    /projects
GET    /projects/{id}
PATCH  /projects/{id}
DELETE /projects/{id}
POST   /projects/{id}/services
GET    /projects/{id}/deliverables
POST   /projects/{id}/deliverables
PATCH  /projects/{id}/deliverables/{delivId}
GET    /projects/{id}/consultations
```

**Outbound Events**:
- `project.created` → Initialize tracking
- `project.status_changed` → Notify stakeholders
- `project.deliverable_submitted` → Trigger review

---

### 6.3 Delivery Service
**Port**: 3003  
**Database**: PostgreSQL  
**Cache**: Redis (Deployment status)  
**External**: Vercel API, GitHub API, Supabase API

**Responsibilities**:
- Deployment pipeline orchestration
- Environment management
- Quality gate execution
- Rollback management
- Artifact versioning
- Integration with CI/CD platforms

**Key Endpoints**:
```
POST   /deployments
GET    /deployments/{id}
PATCH  /deployments/{id}/approve
POST   /deployments/{id}/quality-checks
POST   /deployments/{id}/rollback
GET    /environments
PATCH  /environments/{id}/configuration
```

**Deployment Pipeline**:
```
Initiated → Quality Checks → Approval → Deployment → Monitoring → Complete/Rollback
```

**Outbound Events**:
- `deployment.initiated` → Start monitoring
- `deployment.quality_check_passed` → Proceed
- `deployment.failed` → Alert and create incident

---

### 6.4 Booking Service
**Port**: 3004  
**Database**: PostgreSQL  
**Cache**: Redis (Availability slots)  
**External**: Cal.com, Zoom, SendGrid

**Responsibilities**:
- Consultation scheduling
- Availability management
- Meeting coordinate
- Reminder delivery
- Integration with video conferencing

**Key Endpoints**:
```
GET    /consultations/availability
POST   /consultations
GET    /consultations/{id}
PATCH  /consultations/{id}
DELETE /consultations/{id}
POST   /consultations/{id}/reminder
```

**Outbound Events**:
- `booking.created` → Send confirmation
- `booking.confirmed` → Update calendar
- `consultation.completed` → Send follow-up

---

### 6.5 AI Service
**Port**: 3005  
**Database**: PostgreSQL  
**Cache**: Redis (Model cache, rate limiting)  
**External**: OpenAI, Anthropic, Hugging Face

**Responsibilities**:
- Model management
- Inference request handling
- Usage tracking and billing
- Quota enforcement
- Response caching
- Fine-tuning orchestration

**Key Endpoints**:
```
POST   /ai/inferences
GET    /ai/inferences/{id}
GET    /ai/models
POST   /ai/models/{id}/fine-tune
GET    /ai/usage
GET    /ai/quotas
```

**Outbound Events**:
- `ai.inference_requested` → Start tracking
- `ai.inference_completed` → Update quota
- `ai.quota_exceeded` → Alert user

---

### 6.6 Notification Service
**Port**: 3006  
**Database**: PostgreSQL  
**Queue**: Bull Queue (background jobs)  
**External**: SendGrid, Twilio, Slack

**Responsibilities**:
- Multi-channel notification delivery
- Template management
- Delivery tracking
- Retry logic
- Subscription management

**Key Endpoints**:
```
POST   /notifications/send
GET    /notifications/{id}
GET    /notification-templates
POST   /notification-templates
```

**Notification Channels**:
- Email (SendGrid)
- SMS (Twilio)
- In-App (WebSocket)
- Slack (for teams)

**Outbound Events**:
- `notification.sent` → Update status
- `notification.failed` → Log and alert

---

### 6.7 Analytics Service
**Port**: 3007  
**Database**: PostgreSQL (for stored data)  
**Cache**: Redis (real-time metrics)  
**External**: PostHog, Prometheus, Grafana

**Responsibilities**:
- Event tracking
- Metric aggregation
- Dashboard generation
- Report generation
- Alert management
- Data retention

**Key Endpoints**:
```
POST   /analytics/events
GET    /analytics/metrics
GET    /analytics/dashboards
POST   /analytics/reports
GET    /analytics/alerts
```

**Outbound Events**:
- `analytics.event_tracked` → Ingest to PostHog
- `analytics.report_generated` → Email report

---

### 6.8 Content Service (Payload CMS Integration)
**Port**: 3008  
**Database**: PostgreSQL  
**Cache**: Redis (Content cache, FTS results)  
**Search**: Meilisearch  
**External**: Payload CMS, AWS S3

**Responsibilities**:
- Content management
- Multi-language support
- Asset management
- Publishing workflow
- Full-text search indexing

**Key Endpoints**:
```
GET    /content/documents
POST   /content/documents
PATCH  /content/documents/{id}
GET    /content/search?q=...
GET    /content/documents/{slug}
POST   /content/assets/upload
```

**Outbound Events**:
- `content.published` → Invalidate cache, index
- `content.translated` → Update all locales

---

### 6.9 CRM Service
**Port**: 3009  
**Database**: PostgreSQL  
**Cache**: Redis  
**Search**: Meilisearch  
**External**: Stripe (for deal values)

**Responsibilities**:
- Lead management
- Deal pipeline
- Contact management
- Interaction logging
- Pipeline analytics

**Key Endpoints**:
```
POST   /crm/leads
GET    /crm/leads
PATCH  /crm/leads/{id}
POST   /crm/deals
PATCH  /crm/deals/{id}
GET    /crm/pipeline
```

**Outbound Events**:
- `crm.lead_created` → Send welcome sequence
- `crm.deal_updated` → Update pipeline

---

### 6.10 Configuration Service
**Port**: 3010  
**Database**: PostgreSQL  
**Cache**: Redis (aggressive caching)  
**External**: HashiCorp Vault (for secrets)

**Responsibilities**:
- Feature flag management
- Configuration management
- Secrets management
- Environment-specific settings

**Key Endpoints**:
```
GET    /config/features
PATCH  /config/features/{flag}
GET    /config/settings
GET    /config/secrets/{name}
```

**Outbound Events**:
- `config.flag_toggled` → Invalidate caches
- `secret.rotated` → Notify services

---

### 6.11 API Gateway (Central Orchestrator)
**Port**: 3000  
**External**: All services

**Responsibilities**:
- Route requests to services
- Authentication check
- Rate limiting
- Request logging
- Response aggregation
- Error handling
- CORS management

**Core Middleware**:
```
1. Log request
2. Check feature flags
3. Authenticate (BetterAuth)
4. Authorize (RBAC)
5. Rate limit (Redis)
6. Route to service
7. Log response
8. Track metrics
9. Send response
```

---

## 7. EXTENSION STRATEGY

### 7.1 From Monolith to Microservices

**Phase 1 (Months 0-6)**: Modular Monolith
```
Single NestJS application with feature modules
├── Identity Module (Exportable)
├── Project Module (Exportable)
├── Delivery Module (Exportable)
├── Analytics Module (Exportable)
└── Others...
```

**Phase 2 (Months 6-12)**: Service Extraction
```
Extract high-load services:
1. Identity Service (if user scale > 100k)
2. Analytics Service (if events > 1M/day)
3. AI Service (if inference > 10k/day)
4. Notification Service (if messages > 100k/day)
```

**Phase 3 (Months 12+)**: Full Distributed System
```
- Independent deployable services
- Service mesh (Istio)
- Distributed tracing (Jaeger)
- Circuit breakers (Polly)
- Event streaming (Kafka upgrade from Outbox)
```

**Extraction Criteria**:
- Team can own service (2-pizza rule)
- Independent scaling needs
- Distinct deployment schedule
- Clear boundaries (DDD context)
- Performance impact

### 7.2 Adding New Bounded Context

**Process**:
1. Define context within monolith (`packages/api/src/modules/new-context/`)
2. Create entity, service, controller, events
3. Publish domain events
4. Subscribe to required events
5. Implement API endpoints
6. Add database migrations
7. Create tests
8. Deploy with feature flag
9. Extract to service when scale demands

**Template**:
```typescript
// Module structure
src/modules/new-context/
├── controllers/
├── services/
├── dto/
├── entities/
├── events/
│   ├── domain-events.ts
│   └── event-handlers/
├── new-context.module.ts
└── new-context.constants.ts
```

### 7.3 Adding New Integrations

**Process**:
1. Create integration wrapper in `packages/api/src/integrations/external/`
2. Implement provider-specific logic
3. Create abstraction layer (interface)
4. Handle errors and retries
5. Add observability (logging, metrics)
6. Document API usage
7. Add to configuration

**Example (New Payment Provider)**:
```typescript
// packages/api/src/integrations/external/new-provider.ts
export interface PaymentProvider {
  processPayment(payment: PaymentRequest): Promise<PaymentResult>;
  refund(transactionId: string): Promise<RefundResult>;
}

export class NewProviderAdapter implements PaymentProvider {
  // Implementation
}
```

### 7.4 Database Evolution

**Adding New Table**:
1. Create migration file: `migrations/NNN_add_feature.sql`
2. Create TypeORM entity: `database/entities/*/new-entity.ts`
3. Add to module exports
4. Create fixtures in seed data
5. Add to API service
6. Deploy migration separately from code

**Schema Evolution Strategy**:
- Forward-compatible migrations only
- No breaking schema changes
- Blue-green deployment for critical migrations
- Rollback plan for each migration

### 7.5 Feature Flag Strategy

**Levels**:
1. **Deployment Flags** - Route to service
2. **Feature Flags** - Enable/disable features
3. **Configuration Flags** - Tune behavior
4. **Experiment Flags** - A/B testing

**Implementation**:
```typescript
// Usage in code
const featureEnabled = await this.configService.isFeatureEnabled(
  'new_ai_model',
  userId
);

if (featureEnabled) {
  // New behavior
} else {
  // Legacy behavior
}
```

---

## 8. TECHNICAL DECISION RECORDS

### TDR-001: PostgreSQL Outbox Pattern vs RabbitMQ

**Status**: DECIDED  
**Date**: June 3, 2026  

**Decision**: Use PostgreSQL Outbox Pattern for event publishing instead of RabbitMQ.

**Rationale**:
- Single source of truth (database)
- Guaranteed delivery (transaction semantics)
- No infrastructure complexity
- Cost-effective (no extra services)
- Works on weak machines
- Easy debugging and troubleshooting
- Natural upgrade path to Kafka if needed

**Implementation**:
```
Transaction committed:
├── Business operation (INSERT into tables)
├── Event published (INSERT into outbox)
└── Transaction COMMIT

Background process every 100ms:
├── SELECT from outbox (unpublished events)
├── Publish to subscribers
├── Mark as published (UPDATE outbox)
└── Delete processed events (retention policy)
```

**Risks Mitigated**:
- Duplicate processing: Idempotent handlers
- Lost events: Outbox audit trail
- Slow polling: Batch processing, 100ms interval

---

### TDR-002: BetterAuth for Authentication

**Status**: DECIDED  
**Date**: June 3, 2026

**Decision**: Use BetterAuth as the authentication framework instead of Auth0 or Clerk.

**Rationale**:
- Self-hosted capability (works on own infrastructure)
- Open-source and lightweight
- PostgreSQL-native (single database)
- Multi-tenant support built-in
- Social auth integrations (Google, GitHub, etc.)
- Session management included
- Cost-effective for scale

**Implementation**:
```typescript
// packages/api/src/config/auth.config.ts
export const auth = betterAuth({
  database: {
    type: 'postgres',
    client: prismaClient,
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 12,
    hashAlgorithm: 'argon2',
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    },
  },
});
```

---

### TDR-003: Modular Monolith Architecture

**Status**: DECIDED  
**Date**: June 3, 2026

**Decision**: Start with modular monolith, not microservices.

**Rationale**:
- Simpler operational requirements
- Easier debugging and tracing
- Shared transaction boundaries
- Faster feature development
- Reduced network latency
- Deployment simplicity
- Natural evolution path

**Constraints**:
- Module independence: No direct imports between modules
- Event-based communication only
- Database schema isolation per context
- Service-ready packaging

**Migration Path**:
- Phase 1: Single deployment (all modules)
- Phase 2: Selective extraction (high-scale modules)
- Phase 3: Full microservices (if needed)

---

### TDR-004: Next.js Frontend with Server Components

**Status**: DECIDED  
**Date**: June 3, 2026

**Decision**: Use Next.js 14+ with App Router and Server Components.

**Rationale**:
- Type-safe frontend (TypeScript)
- Server rendering for SEO
- API routes for backend communication
- Automatic code splitting
- Incremental static regeneration
- Middleware for authentication
- Edge deployment ready (Vercel)

**Implementation**:
- App Router (not Pages Router)
- Server Components for data fetching
- Client Components for interactivity
- API routes for webhook handling

---

### TDR-005: Payload CMS for Content Management

**Status**: DECIDED  
**Date**: June 3, 2026

**Decision**: Use Payload CMS for multi-language content.

**Rationale**:
- Self-hosted on PostgreSQL
- Headless CMS (API-first)
- Built-in localization
- TypeScript-native
- Role-based access control
- Open-source (no licensing)

**Implementation**:
- Document collection (Articles, FAQs, Case studies)
- Locale management (en, es, fr, de, pt, ja, zh)
- Asset collection (Images, Videos, Downloads)
- Publish workflow with drafts

---

### TDR-006: Meilisearch for Full-Text Search

**Status**: DECIDED  
**Date**: June 3, 2026

**Decision**: Use Meilisearch instead of Elasticsearch for FTS and faceted search.

**Rationale**:
- Lightweight (low resource usage on weak machines)
- Fast out-of-the-box
- Simple API
- Multi-language support
- Faceted search built-in
- Runs anywhere (self-hosted)
- Docker-ready

**Indexes**:
- Projects (searchable: name, description, client)
- Documents (searchable: title, content, tags)
- Leads (searchable: company, contact, notes)

---

### TDR-007: Redis for Caching and Session Storage

**Status**: DECIDED  
**Date**: June 3, 2026

**Decision**: Use Redis for caching, sessions, and rate limiting.

**Rationale**:
- Fast in-memory storage
- Session persistence
- Atomic operations
- Pub/Sub for real-time updates
- TTL support for cache expiration
- Works on weak machines (with memory optimization)

**Caching Strategy**:
```
Level 1: Browser cache (static assets)
Level 2: Redis cache (API responses, config)
Level 3: Database cache (views, aggregates)
```

**TTLs by Use Case**:
- User permissions: 1 hour
- Configuration: 5 minutes
- Feature flags: 30 seconds
- Analytics aggregates: 1 day
- Session: 24 hours

---

### TDR-008: PostHog for Product Analytics

**Status**: DECIDED  
**Date**: June 3, 2026

**Decision**: Use PostHog for product analytics and feature flags.

**Rationale**:
- Self-hosted capability
- Product analytics + feature flags + session recording
- Event-driven architecture
- Integrates with event system
- Privacy-focused (GDPR compliant)
- Real-time dashboards

**Integration**:
- Track domain events via PostHog SDK
- Feature flags managed in PostHog
- Real-time dashboards for operations
- User behavior cohorts for targeting

---

### TDR-009: Bull Queue for Background Jobs

**Status**: DECIDED  
**Date**: June 3, 2026

**Decision**: Use Bull Queue (Redis-backed) for asynchronous job processing.

**Rationale**:
- No additional infrastructure (Redis only)
- Reliable job processing
- Retry logic built-in
- Job scheduling support
- Progress tracking
- Works on weak machines

**Job Types**:
- SendEmail (from notifications)
- ProcessDeployment (from delivery)
- GenerateReport (from analytics)
- AggregateMetrics (from analytics)
- IndexDocument (from content)
- CacheWarmup (periodic)

---

### TDR-010: TypeScript End-to-End

**Status**: DECIDED  
**Date**: June 3, 2026

**Decision**: TypeScript in all layers (frontend, backend, shared).

**Rationale**:
- Single language across stack
- Type safety catches errors
- Shared types between frontend/backend
- Better IDE support
- Easier onboarding for new developers
- Auto-documentation via types
- Runtime safety with libraries like Zod

**Constraints**:
- No any types without explanation
- Enable strict mode in tsconfig
- Shared type definitions in `packages/shared`
- Runtime validation with Zod/class-validator

---

## 9. RISKS & MITIGATION

### Critical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| **Outbox pattern bottleneck** | Medium | High | Batch processing, sharded outbox, eventual upgrade to Kafka |
| **Single database becomes bottleneck** | Medium | Critical | Read replicas, partitioning, selective service extraction |
| **Redis memory exhaustion** | Low | High | Cache eviction policies, monitoring, separate Redis instances |
| **Multi-tenant data isolation failure** | Low | Critical | Row-level security, audit logging, automated tests |
| **Deployment coordination complexity** | Medium | Medium | Blue-green deployments, feature flags, canary releases |
| **PostgreSQL migration downtime** | Low | High | Zero-downtime migration strategy, read replicas |
| **External API failures** (OpenAI, Stripe) | Medium | High | Circuit breakers, fallbacks, queuing |
| **Authentication security breach** | Low | Critical | Regular security audits, rate limiting, MFA enforcement |
| **Weak machine performance** | High | Medium | Aggressive caching, query optimization, horizontal scaling |
| **Cost explosion** | Medium | High | Usage quotas, rate limiting, resource monitoring |

### Operational Risks

| Risk | Mitigation |
|------|-----------|
| No observability | Structured logging, metrics via Prometheus, tracing via Jaeger |
| Deployment failures | Automated testing, canary releases, quick rollback |
| Data loss | Automated backups (point-in-time recovery), pgbackrest |
| Service degradation | Load testing, circuit breakers, graceful degradation |
| Security vulnerabilities | OWASP compliance, regular audits, dependency scanning |

### Monitoring & Alerting

**Key Metrics**:
- API response latency (p50, p95, p99)
- Error rate by service
- Database query latency
- Redis memory usage
- Outbox event processing lag
- Deployment success rate
- User authentication failures

**Alerts**:
- Error rate > 1%
- Latency p99 > 1s
- Outbox lag > 5 minutes
- Database connections > 80%
- Redis memory > 80%
- Deployment failure

---

## 10. FUTURE EVOLUTION PLAN

### Roadmap (12-36 months)

#### Quarter 1-2 (Months 1-6): MVP Platform
**Deliverables**:
- Public website + marketing site
- Identity service (auth, teams)
- Project management core
- Basic analytics
- Email notifications
- Booking system integration
- Initial Payload CMS setup

**Scale Target**: 1,000 users, 10 projects

#### Quarter 3-4 (Months 7-12): Feature Expansion
**Deliverables**:
- AI services integration (OpenAI, Anthropic)
- CRM module
- Content platform with multi-language
- Delivery pipeline with quality gates
- Advanced analytics dashboards
- Consultation video integration (Zoom)

**Scale Target**: 10,000 users, 500 projects

#### Year 2: Microservices Preparation
**Deliverables**:
- Selective service extraction (if scale demands)
- Service mesh investigation
- Kubernetes readiness
- Advanced security features (encryption, SAML)
- Mobile app (React Native)
- POS system integration

**Scale Target**: 100,000 users

#### Year 3: Enterprise Features
**Deliverables**:
- Dedicated infrastructure support
- Custom integrations framework
- Advanced reporting and BI
- White-label capabilities
- Compliance certifications (SOC2, ISO27001)

---

## Appendix A: Assumptions & Constraints

### Assumptions
1. **Single-tenant initially** - Database per organization added in Phase 2
2. **Synchronous deployments** - API requests expect immediate response
3. **Moderate data volume** - PostgreSQL sufficient until 100M+ records
4. **Team size < 50** - Direct monolith acceptable, evolution path clear
5. **Development on Windows** - All tools Windows-compatible

### Constraints
1. **Budget-conscious** - Prefer self-hosted over SaaS
2. **Weak machines** - Optimize for low CPU/memory
3. **PostgreSQL-first** - All data in single RDBMS initially
4. **Cloud-agnostic** - No AWS-specific services
5. **Open-source preference** - Minimize proprietary licenses

### Technology Stack Summary
```
Frontend:       Next.js 14, React 18, TypeScript, Tailwind CSS, Zustand
Backend:        NestJS, TypeScript, Express.js
Database:       PostgreSQL, Redis, Meilisearch
CMS:            Payload CMS
Authentication: BetterAuth
Analytics:      PostHog
Observability:  Prometheus, Grafana, Sentry
Search:         Meilisearch
Queue:          Bull (Redis)
Deployment:     Vercel (frontend), Supabase (backend functions)
Container:      Docker, Docker Compose
IaC:            Terraform
CI/CD:          GitHub Actions
```

---

**Document Version**: 1.0  
**Last Review**: June 3, 2026  
**Next Review**: September 3, 2026  
**Owner**: Staff+ Technical Authority  

