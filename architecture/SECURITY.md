# Security & Compliance Architecture - Techdon Solutions

---

## 1. Security Principles

### Defense in Depth
```
Layer 1: Network     → HTTPS/TLS 1.3, WAF (DDoS protection)
Layer 2: Transport   → Encrypted connections, certificate pinning
Layer 3: Auth        → BetterAuth, MFA/2FA
Layer 4: Session     → Secure HTTP-only cookies, CSRF tokens
Layer 5: Data        → Encryption at rest (pgcrypto), encrypted fields
Layer 6: Access      → Row-level security (PostgreSQL), RBAC
Layer 7: Audit       → Event logging, audit trails
```

### Security Matrix
```
Threat Level    | Control Type | Implementation
────────────────┼──────────────┼─────────────────────
User Auth       | Preventive   | MFA, rate limiting, CAPTCHA
Data at Rest    | Detective    | Encryption, audit logs
Data in Transit | Preventive   | TLS 1.3, HSTS
API Abuse       | Detective    | Rate limiting, IP blacklist
Insider Threat  | Detective    | Audit logging, alerts
Data Breach     | Corrective   | Incident response, backup
```

---

## 2. Authentication & Authorization

### Authentication Flow

**Registration**:
```
1. User submits email + password
2. Validate format (Zod schema)
3. Hash password with Argon2 (salt included)
4. Store in database
5. Send verification email
6. Mark email as unverified until click link
7. Emit user.registered event
```

**Login**:
```
1. User submits email + password
2. Lookup user by email
3. Compare password hash (Argon2 verify)
4. Generate JWT token
5. Create session (store in Redis)
6. Return JWT + HTTP-only cookie
7. Emit session.created event
```

**MFA Setup**:
```
1. User generates TOTP secret
2. QR code generated for authenticator app
3. User scans code
4. User enters 6-digit code to verify
5. Recovery codes generated
6. Store TOTP secret (encrypted)
7. Emit user.mfa_enabled event
```

### Authorization (RBAC)

**Role Hierarchy**:
```
SUPER_ADMIN (System-wide admin)
├── Can access all organizations
├── Can delete organizations
└── Can view audit logs

ORG_OWNER (Organization owner)
├── Can manage team members
├── Can update organization settings
├── Can view all projects
└── Can delete organization

ORG_ADMIN (Organization administrator)
├── Can manage team members
├── Can create projects
├── Can view organization analytics
└── Cannot delete organization

TEAM_LEAD (Project lead)
├── Can manage project team
├── Can mark deliverables complete
├── Can view project analytics
└── Cannot create new services

TEAM_MEMBER (Team member)
├── Can view assigned deliverables
├── Can submit work
└── Can comment on tasks

VIEWER (Read-only)
└── Can view projects and analytics (read-only)
```

**Permission Mapping**:
```typescript
const PERMISSIONS = {
  // User management
  'user:read': ['ORG_ADMIN', 'TEAM_LEAD'],
  'user:create': ['ORG_OWNER'],
  'user:update': ['ORG_ADMIN'],
  'user:delete': ['ORG_OWNER'],

  // Project management
  'project:create': ['ORG_ADMIN', 'ORG_OWNER'],
  'project:read': ['ORG_ADMIN', 'TEAM_LEAD', 'TEAM_MEMBER'],
  'project:update': ['ORG_ADMIN', 'TEAM_LEAD'],
  'project:delete': ['ORG_OWNER'],

  // Deployment
  'deployment:execute': ['ORG_ADMIN', 'TEAM_LEAD'],
  'deployment:approve': ['ORG_ADMIN'],
  'deployment:rollback': ['ORG_ADMIN'],

  // Analytics
  'analytics:view': ['ORG_ADMIN', 'TEAM_LEAD'],
  'analytics:export': ['ORG_OWNER'],
};
```

### Row-Level Security (RLS)

```sql
-- Ensure users only see their organization's data
CREATE POLICY select_own_projects ON projects
  FOR SELECT
  USING (
    team_id IN (
      SELECT id FROM teams 
      WHERE id IN (
        SELECT team_id FROM team_members 
        WHERE user_id = auth.uid()
      )
    )
  );

-- Prevent data leakage between organizations
CREATE POLICY prevent_org_crossover ON users
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM team_members 
      WHERE user_id = auth.uid()
    )
  );
```

---

## 3. Data Security

### Encryption at Rest

**Sensitive Fields** (pgcrypto extension):
```sql
-- Encrypted columns
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  api_key TEXT,
  api_key_encrypted BYTEA, -- Encrypted via pgcrypto
  phone_number_encrypted BYTEA,
  ssn_encrypted BYTEA,
  created_at TIMESTAMPTZ
);

-- Insert with encryption
INSERT INTO users (id, email, api_key_encrypted) 
VALUES (
  uuid_generate_v4(),
  'user@example.com',
  pgp_sym_encrypt('secret-key-value', 'encryption-password')
);

-- Query (decrypts on retrieve)
SELECT 
  id,
  email,
  pgp_sym_decrypt(api_key_encrypted, 'encryption-password') as api_key
FROM users;
```

**Sensitive Data Categories**:
- API Keys → Encrypted
- OAuth Tokens → Encrypted
- Payment Data → Encrypted (PCI-DSS)
- Social Security Numbers → Encrypted
- Phone Numbers → Encrypted when sensitive

**Database Encryption**:
- TLS 1.3 for connections
- Encrypted data at rest (Supabase managed)
- Automatic backups encrypted
- Point-in-time recovery with encryption

### Password Security

**Requirements**:
- Minimum 12 characters
- At least one uppercase letter
- At least one number
- At least one special character (!@#$%^&*)
- Not in common password list

**Hashing**:
```typescript
import argon2 from 'argon2';

// Hash password
const hash = await argon2.hash(password, {
  type: argon2.argon2id,
  memoryCost: 65540, // 64MB
  timeCost: 3,
  parallelism: 4,
});

// Verify password
const valid = await argon2.verify(hash, password);
```

---

## 4. API Security

### Rate Limiting

**Tiers**:
```
Anonymous User:     10 requests/minute
Authenticated User: 1000 requests/minute
Admin:              10000 requests/minute
```

**Implementation**:
```typescript
// Redis-based rate limiting
const limiter = rateLimit({
  store: new RedisStore({ client: redis }),
  windowMs: 60 * 1000, // 1 minute
  max: (req, res) => {
    if (req.user?.role === 'admin') return 10000;
    if (req.user) return 1000;
    return 10;
  },
  keyGenerator: (req) => req.user?.id || req.ip,
  skip: (req) => req.path.startsWith('/health'),
});

app.use('/api/', limiter);
```

### CORS & CSRF

**CORS Configuration**:
```typescript
app.use(cors({
  origin: [
    'https://techdon.app',
    'https://*.techdon.app',
    'http://localhost:3000', // Dev only
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400, // 24 hours
}));
```

**CSRF Protection**:
```typescript
// Use double-submit cookies + SameSite
app.use(csrf({
  cookie: {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
  },
}));
```

### Input Validation

**Zod Validation** (in all endpoints):
```typescript
const CreateProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(1000),
  budget: z.number().positive(),
  startDate: z.date(),
  category: z.enum([
    'WEB_DEV',
    'APP_DEV',
    'AI_SYSTEM',
    'IOT',
    'POS',
    'CCTV',
    'ENTERPRISE_INTEGRATION',
  ]),
});

// In controller
@Post('projects')
async createProject(@Body() body: unknown) {
  const validated = CreateProjectSchema.parse(body);
  // proceed with validated data
}
```

### SQL Injection Prevention

**Parametrized Queries** (TypeORM/Prisma enforces this):
```typescript
// ✅ SAFE: Parameterized query
const user = await db.user.findUnique({
  where: { email: userInput },
});

// ❌ FORBIDDEN: String interpolation
const user = await db.query(`SELECT * FROM users WHERE email = '${userInput}'`);
```

---

## 5. Audit & Compliance

### Audit Logging

**All sensitive operations logged**:
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  action VARCHAR NOT NULL,
  resource_type VARCHAR NOT NULL,
  resource_id UUID,
  changes JSONB, -- Old and new values
  status VARCHAR NOT NULL, -- SUCCESS, FAILED
  error_message TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for queries
CREATE INDEX idx_audit_logs_user_date 
ON audit_logs(user_id, created_at DESC);
```

**Logged Events**:
- User login/logout
- Permission changes
- Project creation/deletion
- Deployment approvals/rejections
- Data exports
- Password changes
- API key generation

**Retention**: 7 years (compliance)

### Incident Response Plan

**Breach Detection**:
1. Automated alerts on suspicious activity
2. Sentry integration for error tracking
3. Database query anomalies
4. Unusual API access patterns

**Response Process**:
```
Detection → Investigation → Containment → Recovery → Learning
```

**Template**:
```markdown
# Incident Response

## Detection
- Alert type
- Timestamp
- Severity (Critical/High/Medium/Low)

## Investigation
- Root cause analysis
- Affected resources
- Impact assessment

## Containment
- Immediate actions
- Access revocation
- Service isolation

## Recovery
- Restore from backup
- Verification
- Monitoring

## Learning
- Post-incident review
- Process improvements
- Documentation updates
```

---

## 6. Compliance

### GDPR Compliance

**Data Subject Rights**:
```
1. Right to be forgotten
   → DELETE operation, remove from all backups
   
2. Right to access
   → Export all user data in standard format
   
3. Right to correction
   → Ability to update personal data
   
4. Data portability
   → Export in JSON/CSV format
```

**Implementation**:
```typescript
// Export user data
@Get('users/me/export')
async exportUserData(@Req() req) {
  const data = await userService.exportData(req.user.id);
  return res
    .type('application/json')
    .attachment('user-data.json')
    .send(data);
}

// Delete all user data
@Delete('users/me')
async deleteAccount(@Req() req) {
  await userService.delete(req.user.id);
  await deleteAllUserDataFromServices(req.user.id);
  return { status: 'success' };
}
```

**Privacy Policy**:
- Data collection: What data we collect
- Usage: How we use the data
- Retention: How long we keep it
- Rights: User rights and exercises
- Contact: DPO contact information

### SOC2 Compliance

**Domains**:
1. **Security** - Access controls, encryption
2. **Availability** - Uptime SLA (99.9%)
3. **Processing Integrity** - Error handling
4. **Confidentiality** - Data privacy
5. **Privacy** - GDPR, CCPA compliance

**Audit Process**:
- Annual SOC2 Type II audit
- Third-party auditor
- 12-month observation period
- Evidence collection:
  - Configuration reviews
  - Log analysis
  - Employee interviews
  - Policy compliance checks

---

## 7. Infrastructure Security

### Network Security

**Firewall Rules**:
```
┌─────────────────────────────────┐
│      Internet                   │
└──────────────┬──────────────────┘
               │ (Port 443 HTTPS only)
┌──────────────▼──────────────────┐
│      WAF (DDoS Protection)      │
└──────────────┬──────────────────┘
               │
┌──────────────▼──────────────────┐
│  API Gateway / Load Balancer    │
├──────────────────────────────────┤
│  (Auth check, Rate limit)        │
└──────────────┬──────────────────┘
               │
        ┌──────┴────────┐
        │               │
┌───────▼────┐    ┌────▼────────┐
│ API Server │    │  Cache/DB   │
│ (Private)  │    │  (Private)  │
└────────────┘    └─────────────┘
```

**Ports**:
- 443: HTTPS traffic (public)
- 3306: MySQL (private, VPC only)
- 5432: PostgreSQL (private, VPC only)
- 6379: Redis (private, VPC only)

### Secrets Management

**Secret Rotation**:
```typescript
// Rotate secrets every 90 days
enum SecretType {
  DATABASE_PASSWORD,
  JWT_SECRET,
  API_KEY,
  ENCRYPTION_KEY,
}

// On rotation:
// 1. Generate new secret
// 2. Update in Vault
// 3. Configure with dual-secret (new + old)
// 4. After 24h TTL, remove old secret
// 5. Emit secret.rotated event
```

**Secret Storage** (Vault/HashiCorp Vault):
```
Vault Secrets:
├── Database credentials
├── API keys (Stripe, OpenAI, etc.)
├── OAuth client secrets
├── JWT signing keys
├── Encryption keys
└── Third-party credentials
```

---

## 8. Monitoring & Alerting

### Security Metrics

**Dashboard**:
```
Login Attempts    │ Failed Auth Rate │ Rate Limited Requests
──────────────────┼─────────────────┼──────────────────────
Normal: < 1000/h  │ Normal: < 1%    │ Normal: < 100/h
Alert: > 5000/h   │ Alert: > 5%     │ Alert: > 500/h

Data Exports      │ API Key Changes │ Role Changes
──────────────────┼─────────────────┼──────────────────
Normal: < 10/d    │ Normal: < 5/d   │ Normal: < 20/d
Alert: > 20/d     │ Alert: > 10/d   │ Alert: > 50/d
```

**Alert Thresholds**:
| Event | Threshold | Action |
|-------|-----------|--------|
| Failed login attempts | > 10 in 5 min | Lock account, send alert |
| Rate limit exceeded | > 100 times/hour | IP blacklist, notify |
| Unauthorized access | 1st occurrence | Log, investigate |
| Data export | > 5 per day | Audit, notify admin |
| Failed auth token | Multiple times | Revoke all sessions |

---

## 9. Incident Response Templates

### Data Breach Response

```
STEP 1 - DETECTION (T+0)
├─ Alert triggered
├─ Determine scope
└─ Notify security team

STEP 2 - CONTAINMENT (T+30min)
├─ Isolate affected systems
├─ Revoke compromised credentials
├─ Disable affected accounts
└─ Preserve evidence

STEP 3 - INVESTIGATION (T+2h)
├─ Root cause analysis
├─ Determine affected data
├─ Calculate exposure scope
└─ Document findings

STEP 4 - NOTIFICATION (T+24h)
├─ Notify affected users
├─ Notify regulators (if required)
├─ Public statement
└─ Support resources

STEP 5 - RECOVERY (T+1w)
├─ Fix vulnerability
├─ Implement controls
├─ Restore normal operation
└─ Monitor for re-occurrence

STEP 6 - LEARNING (T+2w)
├─ Post-incident review
├─ Update policies
├─ Train team
└─ Document lessons learned
```

---

## 10. Security Checklist (Pre-Production)

- [ ] TLS/HTTPS enabled (TLS 1.3 minimum)
- [ ] HSTS header configured (1 year)
- [ ] CORS properly configured (whitelist only)
- [ ] CSRF protection enabled
- [ ] Rate limiting deployed
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS protection (CSP headers)
- [ ] Input validation with Zod
- [ ] Authentication tested (login/logout/refresh)
- [ ] MFA/2FA working
- [ ] RBAC enforced (admin, user, viewer)
- [ ] Row-level security enabled
- [ ] Encryption at rest for sensitive data
- [ ] API keys rotated
- [ ] Secrets not in source code
- [ ] Audit logging enabled
- [ ] Error handling (no sensitive info leaked)
- [ ] Dependencies scanned (npm audit)
- [ ] Security headers configured
- [ ] WAF rules tested
- [ ] Incident response plan reviewed
- [ ] Backup & recovery tested
- [ ] Privacy policy published
- [ ] GDPR compliance verified
- [ ] SOC2 control evidence collected

---

**Last Updated**: June 3, 2026  
**Next Review**: December 3, 2026  
**Owner**: Security Team  

