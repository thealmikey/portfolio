# Deployment & Operations Guide - Techdon Solutions

---

## 1. DEPLOYMENT ARCHITECTURE

### Multi-Environment Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                    CODE REPOSITORY (GitHub)                 │
│                                                              │
│  main (production) ─────────┐                              │
│  staging ──────────────────┼─→ Deployment                  │
│  develop (development) ────┘                              │
│  feature/* (local) ────────→ Preview Deployments           │
└─────────────────────────────────────────────────────────────┘
        ↓               ↓                     ↓
    ┌───────┐      ┌────────┐           ┌──────────┐
    │  Dev  │      │ Staging│           │   Prod  │
    ├───────┤      ├────────┤           ├─────────┤
    │Docker │      │Supabase│           │Supabase │
    │Compose│      │ + Vercel           │+ Vercel │
    │ Local │      │ Edge Fn│           │Edge Fn  │
    └───────┘      └────────┘           └─────────┘
```

### Environment Configuration

**Development**:
- Docker Compose (all services)
- SQLite or PostgreSQL local
- Redis local
- No rate limiting
- Verbose logging
- Hot reload enabled

**Staging**:
- Supabase PostgreSQL (staging DB)
- Upstash Redis (staging)
- Vercel (staging domain)
- 99% feature parity with production
- Email sandbox (no real sends)
- Full monitoring enabled

**Production**:
- Supabase PostgreSQL (production DB, replicated)
- Upstash Redis (production, HA)
- Vercel (global CDN)
- All monitoring enabled
- Rate limiting active
- Incident response active

---

## 2. CONTINUOUS INTEGRATION / CONTINUOUS DEPLOYMENT

### GitHub Actions Workflows

**Branch Strategy** (Git Flow):
```
main          → Production releases
  ↑
release/*     → Release candidate
  ↑
staging       → Staging environment
  ↑
develop       → Integration branch
  ↑
feature/*     → Feature branches
hotfix/*      → Hotfixes to main
```

**CI Pipeline** (on every push):
```yaml
name: CI

on: [push, pull_request]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check

  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test

  build:
    runs-on: ubuntu-latest
    needs: [lint, test]
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run build

  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm audit
```

**CD Pipeline** (on merge to main):
```yaml
name: CD

on:
  push:
    branches: [main]

jobs:
  deploy-staging:
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/staging'
    steps:
      - uses: actions/checkout@v3
      - run: |
          curl -X POST ${{ secrets.VERCEL_DEPLOY_STAGING }} \
            -d "{\"ref\":\"staging\"}"

  deploy-production:
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    needs: [test-e2e]
    environment: production
    steps:
      - uses: actions/checkout@v3
      - run: |
          curl -X POST ${{ secrets.VERCEL_DEPLOY_PROD }} \
            -d "{\"ref\":\"main\"}"
      - run: npm run migrations:deploy:prod

  migrations:
    runs-on: ubuntu-latest
    needs: [deploy-production]
    steps:
      - uses: actions/checkout@v3
      - run: npm run db:migrate:prod
```

### Deployment Checklist

**Pre-Deployment**:
- [ ] All tests passing
- [ ] Code review approved
- [ ] Migrations tested locally
- [ ] Feature flags configured
- [ ] Rollback plan documented
- [ ] Team notified

**Deployment**:
- [ ] Run database migrations
- [ ] Deploy code to Vercel
- [ ] Verify deployment health check
- [ ] Monitor error rates (< 1%)
- [ ] Monitor latency (p99 < 1s)
- [ ] Verify critical functionality

**Post-Deployment**:
- [ ] Monitor for 1 hour
- [ ] Check user feedback
- [ ] Review analytics
- [ ] Rollback if issues detected
- [ ] Document any incidents

---

## 3. DATABASE MIGRATIONS

### Migration Strategy

**Zero-Downtime Migrations**:
1. Create new column/index
2. Deploy code (with feature flag)
3. Backfill data (async if large)
4. Switch to new column/index
5. Remove old column after 1 week

**Migration Files**:
```
migrations/
├── 001_initial_schema.sql        (100 MB, 50 tables)
├── 002_indexes.sql               (Performance)
├── 003_outbox_pattern.sql        (Event sourcing)
├── 004_rls_policies.sql          (Security)
├── 005_functions.sql             (Database functions)
├── 006_views.sql                 (Materialized views)
├── 007_full_text_search.sql      (FTS indexes)
└── 008_audit_logging.sql         (Audit trails)
```

**Execution**:
```bash
# Local development
npm run db:migrate:dev

# Staging
npm run db:migrate:staging

# Production (with approval)
npm run db:migrate:prod
```

**Example Migration**:
```sql
-- 009_add_project_tags.sql
BEGIN;

-- Add new column
ALTER TABLE projects 
ADD COLUMN tags TEXT[] DEFAULT '{}';

-- Create index
CREATE INDEX idx_projects_tags 
ON projects USING GIN (tags);

-- Backfill data (async trigger)
UPDATE projects 
SET tags = string_to_array(category, ',') 
WHERE tags = '{}';

COMMIT;
```

**Rollback**:
```sql
BEGIN;

-- Drop index
DROP INDEX idx_projects_tags;

-- Remove column
ALTER TABLE projects DROP COLUMN tags;

COMMIT;
```

---

## 4. MONITORING & OBSERVABILITY

### Metrics Collection

**Application Metrics** (Prometheus):
```
# API Endpoints
http_requests_total{endpoint="/projects", method="GET", status="200"}
http_request_duration_seconds{endpoint="/projects", method="GET"}
http_request_size_bytes{endpoint="/projects", method="GET"}
http_response_size_bytes{endpoint="/projects", method="GET"}

# Database
db_query_duration_seconds{query_type="SELECT", table="projects"}
db_connections_active{pool="read", state="active"}
db_transactions_committed_total{}
db_transactions_rolled_back_total{}

# Cache
redis_hits_total{key_prefix="user_session"}
redis_misses_total{key_prefix="user_session"}
redis_memory_bytes{}

# Business
projects_created_total{}
deployments_completed_total{status="success|failed"}
ai_inferences_total{model="gpt-4"}
```

**Application Logs** (Structured JSON):
```json
{
  "timestamp": "2026-06-03T10:30:45.123Z",
  "level": "ERROR",
  "service": "api",
  "userId": "user-123",
  "traceId": "trace-456",
  "correlationId": "corr-789",
  "message": "Failed to create project",
  "error": {
    "name": "ValidationError",
    "message": "Budget must be positive",
    "stack": "..."
  },
  "context": {
    "projectName": "New Website",
    "requestId": "req-123",
    "duration": 245
  }
}
```

**User Analytics** (PostHog):
```
Events tracked:
- page_view
- api_request (sampled)
- feature_flag_evaluated
- error_occurred
- performance_metric
```

### Alerting Rules

**Critical Alerts** (PagerDuty):
| Alert | Threshold | Action |
|-------|-----------|--------|
| Error Rate > 5% | 10 minutes | Page on-call engineer |
| API Latency p99 > 5s | 5 minutes | Page SRE |
| Database CPU > 90% | 5 minutes | Page DBA |
| Redis Memory > 90% | 5 minutes | Investigate & scale |
| Outbox Lag > 30 minutes | 5 minutes | Investigate event processor |
| Deployment Failed | Immediately | Rollback + investigate |

**Warning Alerts** (Slack):
| Alert | Threshold | Action |
|-------|-----------|--------|
| Error Rate 1-5% | 15 minutes | Notify #ops |
| API Latency p99 > 1s | 20 minutes | Notify #ops |
| Database CPU 70-90% | 15 minutes | Monitor |
| Failed Job Rate > 1% | 30 minutes | Investigate |

### Dashboards

**Operations Dashboard** (Grafana):
```
┌──────────────────────────────────────┐
│ Request Rate         │  Error Rate    │
│ 1,200 req/s          │  0.2%          │
├──────────────────────────────────────┤
│ Latency (p99)        │  Database CPU  │
│ 245 ms               │  45%           │
├──────────────────────────────────────┤
│ Active Connections   │  Redis Memory  │
│ 450 / 1000           │  60% / 8GB     │
├──────────────────────────────────────┤
│ Deployment Status    │  Last 5 Errors │
│ ✅ Production v1.2.3 │ (Listed below) │
└──────────────────────────────────────┘
```

**Business Dashboard** (PostHog):
```
Key Metrics:
├─ Daily Active Users: 2,450
├─ Projects Created Today: 23
├─ Deployments Completed: 156
├─ AI Inferences: 12,345
├─ Consultation Bookings: 34
└─ Customer Satisfaction: 4.7/5
```

---

## 5. DISASTER RECOVERY

### Backup Strategy

**Automated Backups**:
```
PostgreSQL:
├─ Continuous WAL archiving (every 5 min)
├─ Full backup daily at 2 AM UTC
├─ Retention: 30 days
└─ Geographic replication (multi-region)

Redis:
├─ RDB snapshots hourly
├─ AOF (append-only file) enabled
├─ Retention: 7 days
└─ Replicated to standby

Application:
├─ Source code: GitHub (infinite)
├─ Database: Supabase managed backups
├─ Configuration: Vault (encrypted)
└─ Secrets: HashiCorp Vault backup
```

**Recovery Test** (Monthly):
```bash
# Simulate database failure
1. Restore from backup to test database
2. Verify data integrity
3. Test application connectivity
4. Verify critical business functions
5. Document recovery time (RTO)
6. Document data loss window (RPO)
```

**RPO/RTO Targets**:
| Component | RPO | RTO |
|-----------|-----|-----|
| Database | 5 minutes | 30 minutes |
| Cache | 0 minutes (ephemeral) | 5 minutes |
| Application | 0 minutes (stateless) | 5 minutes |
| Overall | 5 minutes | 30 minutes |

### Disaster Recovery Plan

**Scenario: Database Corruption**
```
Detection:
- Automated health check failure
- Alert triggered

Response (T+0-5 min):
1. Isolate production database
2. Notify on-call team
3. Switch to read-only mode
4. Check backup integrity

Recovery (T+5-30 min):
1. Restore from latest backup
2. Run consistency checks
3. Verify data integrity
4. Switch back to read-write

Verification (T+30-60 min):
1. Run smoke tests
2. Monitor error rate
3. Check user-facing functionality
4. Review audit logs

Post-Incident (T+1h+):
1. Root cause analysis
2. Prevention measures
3. Backup verification improvements
4. Team debriefing
```

---

## 6. PERFORMANCE OPTIMIZATION

### Caching Strategy

**Cache Hierarchy**:
```
Request → Browser Cache (1 year for static assets)
          ↓ (MISS)
          Redis Cache (5 min for API responses)
          ↓ (MISS)
          Database Query (with materialized views)
          ↓ (UPDATE)
          Redis Cache (STORE)
          ↓
          Browser Cache (STORE)
```

**Cache Invalidation**:
```typescript
// Strategies:
1. Time-based (TTL): Permissions (1h), Config (5min)
2. Event-based: On project update, invalidate project cache
3. Manual: Admin invalidates cache for critical updates

// Implementation:
cache.set('project:123', projectData, { ttl: 300 }); // 5 min
cache.invalidate('project:*'); // All projects
cache.del('project:123'); // Specific project
```

### Database Optimization

**Indexes**:
```sql
-- By table
users:        id (PK), email (UNIQUE), organization_id
projects:     id (PK), team_id, status, created_at
deployments:  id (PK), service_id, environment, status
orders:       id (PK), team_id, created_at, status

-- Full text search
documents:    id (PK), title_fts (GIN), content_fts (GIN)

-- Partial indexes (for common queries)
CREATE INDEX idx_active_projects ON projects(id) 
WHERE status = 'ACTIVE';
```

**Query Optimization**:
```typescript
// ❌ SLOW: N+1 query problem
projects.forEach(p => {
  p.team = Team.findById(p.teamId); // N queries
});

// ✅ FAST: Join or eager loading
const projects = Project.query()
  .with('team') // Eager load
  .get();

// ✅ FAST: Single join query
const projects = db.query(`
  SELECT p.*, t.* FROM projects p
  JOIN teams t ON p.team_id = t.id
`);
```

**N+1 Query Prevention**:
```typescript
// Always use relations/joins
const projects = await db.project.findMany({
  include: {
    team: true,
    services: true,
    deployments: {
      take: 5, // Limit related records
    },
  },
});
```

### Frontend Performance

**Optimization**:
```typescript
// Next.js features
1. Image optimization (next/image)
2. Code splitting (automatic)
3. Server-side rendering (default)
4. Static generation (for documents)
5. Incremental Static Regeneration (ISR)

// Implementation:
export const revalidate = 3600; // Revalidate every hour
```

---

## 7. SCALABILITY ROADMAP

### Phase 1 (Months 1-6): Single Database
```
API Instances: 1-2
Database: PostgreSQL (Single instance)
Cache: Redis (Single instance)
Load: < 1,000 concurrent users
```

### Phase 2 (Months 6-12): Read Replicas
```
API Instances: 3-5 (Load balanced)
Database: Primary (writes) + 2x Read Replicas
Cache: Redis (replicated, failover)
Load: 1,000-10,000 concurrent users
```

### Phase 3 (Months 12-18): Service Extraction
```
API Instances: 10-20 (multiple services)
Database: 3+ instances (per service + shared)
Cache: Redis cluster (multiple nodes)
Load: 10,000-100,000 concurrent users
```

### Phase 4 (Months 18+): Full Microservices
```
API Instances: 50+ (distributed)
Database: Multiple (sharded by tenant)
Cache: Redis cluster with multiple instances
Queue: Kafka (instead of Outbox)
Load: 100,000+ concurrent users
```

---

## 8. RUNBOOK EXAMPLES

### Responding to High Error Rate

**Alert**: Error rate > 5% for 10 minutes

**Steps**:
```
1. Verify alert is not false positive
   - Check Sentry for actual errors
   - Check infrastructure health
   
2. Identify error source
   - Check recent deployments
   - Check database status
   - Check external service health
   
3. Respond based on root cause
   
   If new deployment:
   - Roll back immediately
   - Investigate in staging
   - Re-deploy after fix
   
   If database issue:
   - Check disk space
   - Check connection pool
   - Check slow queries
   - Scale database if needed
   
   If external service (e.g., Stripe):
   - Switch to fallback
   - Notify users
   - Create incident ticket
   
4. Monitor recovery
   - Verify error rate drops below 1%
   - Check user impact
   - Document incident
```

### Responding to Database Performance Degradation

**Alert**: Query latency p99 > 5 seconds

**Steps**:
```
1. Identify slow queries
   - Query PostgreSQL slow_log
   - Check which tables affected
   
2. Analyze root cause
   - Missing index?
   - N+1 query problem?
   - Locking issue?
   - Hardware constraints?
   
3. Immediate mitigation
   - Add missing index (if applicable)
   - Scale read replicas
   - Clear cache
   
4. Permanent fix
   - Optimize query
   - Add indexes
   - Archive old data
   - Partition table
   
5. Prevention
   - Add query monitoring
   - Set up alerts
   - Add integration test
```

### Responding to Out-of-Memory Error

**Alert**: Redis memory > 90%

**Steps**:
```
1. Check memory usage
   - Identify largest keys
   - Check for memory leaks
   
2. Immediate action
   - Increase Redis memory limit
   - Enable memory eviction policy
   - Clear old sessions
   
3. Root cause analysis
   - Check cache TTL settings
   - Verify eviction policy is working
   - Check for new large features
   
4. Permanent fix
   - Optimize cache keys
   - Reduce TTL for less-critical data
   - Scale Redis to multiple nodes
   - Archive old data
```

---

## 9. Production Checklist

### Pre-Production Checklist
- [ ] All tests passing (unit, integration, e2e)
- [ ] Code coverage > 80%
- [ ] Security scan complete
- [ ] Database migrations tested
- [ ] Backup & recovery verified
- [ ] Monitoring alerts configured
- [ ] On-call rotation established
- [ ] Incident response plan reviewed
- [ ] Runbooks documented
- [ ] Team trained on operations

### Release Checklist
- [ ] Version bumped (semantic versioning)
- [ ] Changelog updated
- [ ] Feature flags configured (if needed)
- [ ] Rollback plan documented
- [ ] Team notified of deployment window
- [ ] Staging environment verified
- [ ] All dependencies updated
- [ ] Security keys rotated

### Post-Deployment Checklist
- [ ] Health checks passing
- [ ] Error rate < 1%
- [ ] Response time p99 < 1 second
- [ ] Database replication healthy
- [ ] Cache hit rate > 80%
- [ ] No critical errors in Sentry
- [ ] User feedback positive
- [ ] Analytics showing expected behavior
- [ ] All services responding
- [ ] Monitoring active

---

**Last Updated**: June 3, 2026  
**Next Review**: September 3, 2026  
**Owner**: DevOps/SRE Team  

