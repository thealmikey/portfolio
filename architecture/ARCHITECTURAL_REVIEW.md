# TechDon Architectural Review & Enhancement

*Principal Architect Rewrite-Prevention Analysis*  
*Date: June 3, 2026*  
*Review Scope: Database, Dashboard, Design System*  
*Target: Zero major rewrites for 3 years (until June 2029)*

---

## Executive Summary

**Current State:** Good foundational architecture covering 13 core features.  
**Risk Level:** MEDIUM-HIGH — Missing 40+ features needed for 3-year runway.  
**Severity:** 3 Critical gaps, 8 High gaps, 15+ Medium gaps.  
**Recommendation:** Expand schema now. Refactor dashboard incrementally. Design system stable.

**3-Year No-Rewrite Guarantee Requires:**
- Extensibility framework (custom fields, webhooks)
- Internationalization infrastructure
- Feature flag system
- Advanced analytics backbone
- API versioning strategy
- Compliance & security audit trail

---

## Part 1: Architectural Weaknesses (Critical)

### 🔴 Critical Gap 1: Internationalization (i18n) Infrastructure

**Problem:**  
Current translations table only handles document content translation. Missing:
- Timezone management (team members in different zones)
- Multi-currency support (financial transactions, billing)
- Locale-specific formatting (dates, numbers, addresses)
- Regional consent management (GDPR vs CCPA vs LGPD vs POPIA)
- Language-specific SEO (hreflang tags, localized slugs)
- Right-to-left (RTL) language support

**Impact:**  
Cannot expand to multiple markets after Year 1. Forced rewrite when adding EUR/GBP/ZAR.

**Required Additions:**
```sql
-- Locales & Timezones
CREATE TABLE locales (
  id UUID PRIMARY KEY,
  language_code VARCHAR(5),        -- 'en', 'fr', 'pt', 'ar'
  region_code VARCHAR(5),           -- 'US', 'FR', 'BR', 'EG'
  locale_key VARCHAR(10) UNIQUE,    -- 'en_US', 'fr_FR', 'pt_BR', 'ar_EG'
  timezone VARCHAR(50),
  currency_code VARCHAR(3),         -- 'USD', 'EUR', 'ZAR', 'NGN'
  rtl BOOLEAN DEFAULT FALSE,        -- Right-to-left language
  date_format VARCHAR(20),          -- 'MM/DD/YYYY', 'DD/MM/YYYY'
  number_format VARCHAR(10),        -- 'en' (1,234.56), 'de' (1.234,56)
  created_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);

-- User Locale Preferences
CREATE TABLE user_locale_preferences (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users,
  team_id UUID NOT NULL REFERENCES teams,
  preferred_locale VARCHAR(10) REFERENCES locales(locale_key),
  preferred_timezone VARCHAR(50),
  language_preference VARCHAR(5),
  date_format_override VARCHAR(20),
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  UNIQUE(user_id, team_id)
);

-- Multi-Currency Transactions
CREATE TABLE transactions (
  id UUID PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES teams,
  project_id UUID REFERENCES projects,
  type VARCHAR(50),                 -- 'invoice', 'payment', 'refund', 'adjustment'
  amount_local DECIMAL(15, 2),      -- Amount in local currency
  currency_code VARCHAR(3),         -- Currency of transaction
  amount_usd DECIMAL(15, 2),        -- Converted to USD for reporting
  exchange_rate DECIMAL(10, 6),     -- Rate used for conversion
  rate_source VARCHAR(50),          -- 'fixerapi', 'manual', 'system'
  rate_date DATE,
  status VARCHAR(50),               -- 'pending', 'completed', 'failed', 'refunded'
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  INDEX idx_team_currency (team_id, currency_code)
);

-- Regional Compliance Rules
CREATE TABLE compliance_rules (
  id UUID PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES teams,
  region VARCHAR(50),               -- 'EU', 'US', 'BR', 'NG', 'ZA'
  regulation VARCHAR(100),          -- 'GDPR', 'CCPA', 'LGPD', 'POPIA'
  data_retention_days INT,
  data_residency VARCHAR(100),      -- 'EU_only', 'US_only', 'in_country'
  consent_type VARCHAR(50),         -- 'explicit', 'implicit', 'double_opt_in'
  requires_dpa BOOLEAN,
  requires_privacy_audit BOOLEAN,
  requires_data_deletion_confirmation BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

---

### 🔴 Critical Gap 2: Feature Flags & Experimentation

**Problem:**  
No way to:
- Roll out features gradually (canary deployments)
- Run A/B tests on UI/workflows
- Toggle features per team/user
- Track feature adoption
- A/B test AI model prompts

**Impact:**  
Cannot safely release new features at scale. Cannot validate assumptions before full rollout.

**Required Additions:**
```sql
CREATE TABLE feature_flags (
  id UUID PRIMARY KEY,
  team_id UUID REFERENCES teams,    -- NULL = global flag
  feature_key VARCHAR(100),         -- 'ai_content_assistant', 'new_dashboard_layout'
  feature_name VARCHAR(255),
  description TEXT,
  flag_type VARCHAR(50),            -- 'boolean', 'percentage', 'targeting', 'ab_test'
  enabled BOOLEAN DEFAULT FALSE,
  rollout_percentage INT,           -- 0-100, gradual rollout
  targeting_rules JSONB,            -- {"regions": ["US", "NG"], "user_ids": [...]}
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  INDEX idx_feature_key_team (feature_key, team_id)
);

CREATE TABLE ab_tests (
  id UUID PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES teams,
  test_key VARCHAR(100),
  test_name VARCHAR(255),
  hypothesis TEXT,
  variant_a VARCHAR(255),           -- Control variant
  variant_b VARCHAR(255),           -- Test variant
  allocation INT DEFAULT 50,        -- % split (50/50 default)
  status VARCHAR(50),               -- 'draft', 'running', 'completed', 'archived'
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  primary_metric VARCHAR(100),      -- 'conversion_rate', 'engagement', 'revenue'
  minimum_sample_size INT,
  statistical_significance DECIMAL(5, 2),
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  INDEX idx_status_team (status, team_id)
);

CREATE TABLE feature_flag_evaluations (
  id UUID PRIMARY KEY,
  flag_id UUID NOT NULL REFERENCES feature_flags,
  user_id UUID REFERENCES users,
  team_id UUID NOT NULL REFERENCES teams,
  enabled BOOLEAN,
  variant_assigned VARCHAR(100),    -- For ab_test type
  evaluated_at TIMESTAMPTZ,
  context JSONB,                    -- {"browser": "Chrome", "os": "Windows"}
  INDEX idx_flag_user_team (flag_id, user_id, team_id)
);
```

---

### 🔴 Critical Gap 3: Advanced Security & Compliance Audit Trail

**Problem:**  
Current audit_logs table logs what happened, but missing:
- Sensitive data access logging (PII, payments, contracts)
- Compliance holds (cannot delete data during legal proceedings)
- Data deletion audit (for GDPR right-to-be-forgotten)
- Session management (track active sessions, force logout)
- Suspicious activity detection
- Encryption at rest for sensitive fields

**Impact:**  
Cannot pass security audits. Compliance exposure. No legal hold capability.

**Required Additions:**
```sql
-- Sensitive Data Classification
CREATE TABLE data_classifications (
  id UUID PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES teams,
  table_name VARCHAR(100),
  column_name VARCHAR(100),
  classification VARCHAR(50),       -- 'public', 'internal', 'confidential', 'pii', 'financial'
  encryption_required BOOLEAN,
  requires_audit_log BOOLEAN,
  retention_policy VARCHAR(50),     -- 'permanent', '1_year', '7_years'
  pii_category VARCHAR(100),        -- 'email', 'phone', 'ssn', 'bank_account'
  UNIQUE(team_id, table_name, column_name)
);

-- Compliance Holds
CREATE TABLE compliance_holds (
  id UUID PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES teams,
  hold_type VARCHAR(50),            -- 'legal', 'audit', 'regulatory', 'litigation'
  description TEXT,
  affected_entities VARCHAR(100),   -- 'all', or specific: 'leads', 'projects'
  reason VARCHAR(255),
  issued_by VARCHAR(100),           -- Email of compliance officer
  issued_date TIMESTAMPTZ,
  expected_release_date DATE,
  released_date TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ
);

-- Session Management
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users,
  team_id UUID NOT NULL REFERENCES teams,
  session_token VARCHAR(255) UNIQUE,
  ip_address INET,
  user_agent TEXT,
  device_fingerprint VARCHAR(100),
  login_timestamp TIMESTAMPTZ,
  last_activity TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  logout_reason VARCHAR(100),       -- 'user_logout', 'timeout', 'admin_revoke', 'security'
  created_at TIMESTAMPTZ,
  INDEX idx_user_active (user_id, is_active),
  INDEX idx_session_token (session_token)
);

-- Failed Login Attempts
CREATE TABLE failed_login_attempts (
  id UUID PRIMARY KEY,
  email_or_username VARCHAR(255),
  ip_address INET,
  reason VARCHAR(100),              -- 'invalid_password', 'user_not_found', 'account_locked'
  attempted_at TIMESTAMPTZ,
  INDEX idx_email_ip (email_or_username, ip_address),
  INDEX idx_recent (attempted_at DESC)
);

-- Data Deletion Audit
CREATE TABLE data_deletion_requests (
  id UUID PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES teams,
  user_id UUID REFERENCES users,    -- NULL if self-service
  entity_type VARCHAR(100),         -- 'user', 'lead', 'project', 'document'
  entity_id UUID,
  reason VARCHAR(50),               -- 'gdpr_request', 'user_request', 'admin_cleanup'
  status VARCHAR(50),               -- 'pending', 'approved', 'executed', 'rejected'
  approved_by VARCHAR(100),
  approved_at TIMESTAMPTZ,
  executed_at TIMESTAMPTZ,
  restoration_possible_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);

-- Sensitive Data Access Log
CREATE TABLE sensitive_data_access_log (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users,
  team_id UUID NOT NULL REFERENCES teams,
  data_classification VARCHAR(50),  -- 'pii', 'financial', 'confidential'
  table_name VARCHAR(100),
  entity_id UUID,
  action VARCHAR(50),               -- 'read', 'export', 'print', 'share'
  accessed_at TIMESTAMPTZ,
  ip_address INET,
  export_format VARCHAR(50),        -- 'csv', 'pdf', 'json', 'email'
  shared_with VARCHAR(100),         -- Email of recipient if shared
  INDEX idx_team_date (team_id, accessed_at DESC),
  INDEX idx_data_classification (data_classification, accessed_at DESC)
);
```

---

## Part 2: High-Priority Gaps (Must-Have for 3-Year Runway)

### 🟠 Gap 4: Notification System

**Current:** None. Notifications hardcoded.  
**Need:** Multi-channel (email, SMS, Slack, push, in-app) with user preferences.

```sql
CREATE TABLE notification_channels (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users,
  channel_type VARCHAR(50),         -- 'email', 'sms', 'slack', 'push', 'webhook'
  channel_identifier VARCHAR(255),  -- Email address, phone, Slack ID, webhook URL
  is_verified BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ
);

CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users,
  team_id UUID NOT NULL REFERENCES teams,
  notification_type VARCHAR(100),   -- 'lead_created', 'post_published', 'approval_needed'
  email_enabled BOOLEAN DEFAULT TRUE,
  sms_enabled BOOLEAN DEFAULT FALSE,
  slack_enabled BOOLEAN DEFAULT FALSE,
  push_enabled BOOLEAN DEFAULT TRUE,
  frequency VARCHAR(50),            -- 'instant', 'daily_digest', 'weekly_digest'
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  updated_at TIMESTAMPTZ
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users,
  team_id UUID NOT NULL REFERENCES teams,
  notification_type VARCHAR(100),
  title VARCHAR(255),
  body TEXT,
  action_url VARCHAR(500),
  related_entity_type VARCHAR(100), -- 'post', 'lead', 'approval'
  related_entity_id UUID,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  INDEX idx_user_unread (user_id, is_read)
);
```

### 🟠 Gap 5: API Key Management & Rate Limiting

**Current:** None. No API tier system.  
**Need:** API keys, quota management, rate limiting rules per plan.

```sql
CREATE TABLE api_keys (
  id UUID PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES teams,
  created_by UUID NOT NULL REFERENCES users,
  key_name VARCHAR(255),
  key_hash VARCHAR(255) UNIQUE,     -- Never store plaintext keys
  key_prefix VARCHAR(10),           -- First 10 chars for display
  permissions JSONB,                -- {"read": ["posts", "leads"], "write": ["leads"]}
  rate_limit_rpm INT,               -- Requests per minute
  rate_limit_monthly_quota INT,     -- Total monthly requests
  ip_whitelist TEXT[],              -- CIDR ranges allowed
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ,
  rotated_at TIMESTAMPTZ
);

CREATE TABLE api_usage_log (
  id UUID PRIMARY KEY,
  api_key_id UUID NOT NULL REFERENCES api_keys,
  team_id UUID NOT NULL REFERENCES teams,
  endpoint VARCHAR(255),
  method VARCHAR(10),
  status_code INT,
  response_time_ms INT,
  tokens_used INT,                  -- For LLM-based features
  created_at TIMESTAMPTZ,
  INDEX idx_key_date (api_key_id, created_at DESC),
  INDEX idx_team_date (team_id, created_at DESC)
);

CREATE TABLE rate_limits (
  id UUID PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES teams,
  plan_type VARCHAR(50),            -- 'free', 'pro', 'enterprise'
  requests_per_minute INT,
  requests_per_hour INT,
  requests_per_month INT,
  ai_tokens_per_month INT,
  concurrent_users INT,
  storage_gb INT,
  custom_domains INT,
  created_at TIMESTAMPTZ
);
```

### 🟠 Gap 6: Custom Fields & Extensibility Framework

**Current:** Hardcoded field structure per table.  
**Need:** Dynamic custom fields without schema changes.

```sql
CREATE TABLE custom_field_definitions (
  id UUID PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES teams,
  entity_type VARCHAR(100),         -- 'lead', 'project', 'document', 'contact'
  field_key VARCHAR(100),
  field_label VARCHAR(255),
  field_type VARCHAR(50),           -- 'text', 'number', 'date', 'dropdown', 'multi_select'
  is_required BOOLEAN DEFAULT FALSE,
  is_unique BOOLEAN DEFAULT FALSE,
  field_order INT,
  options JSONB,                    -- For dropdown/multi_select
  validation_rules JSONB,           -- {"min_length": 5, "max_length": 50}
  visibility_rules JSONB,           -- {"show_if": {"field": "type", "value": "lead"}}
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  UNIQUE(team_id, entity_type, field_key)
);

CREATE TABLE custom_field_values (
  id UUID PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES teams,
  field_definition_id UUID NOT NULL REFERENCES custom_field_definitions,
  entity_type VARCHAR(100),
  entity_id UUID,
  value VARCHAR(4000),              -- For text, number, date, single select
  value_json JSONB,                 -- For multi_select, complex objects
  updated_at TIMESTAMPTZ,
  UNIQUE(field_definition_id, entity_id)
);
```

### 🟠 Gap 7: Webhook Management & Integration Logging

**Current:** Outbox pattern exists, but no webhook delivery tracking.  
**Need:** Webhook subscriptions, delivery logs, retry logic.

```sql
CREATE TABLE webhook_subscriptions (
  id UUID PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES teams,
  created_by UUID NOT NULL REFERENCES users,
  event_type VARCHAR(100),          -- 'post.published', 'lead.created', 'opportunity.updated'
  target_url VARCHAR(500),
  secret_key VARCHAR(100),          -- For HMAC signature verification
  is_active BOOLEAN DEFAULT TRUE,
  retry_policy JSONB,               -- {"max_retries": 3, "backoff_ms": 1000}
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  last_triggered_at TIMESTAMPTZ
);

CREATE TABLE webhook_deliveries (
  id UUID PRIMARY KEY,
  webhook_subscription_id UUID NOT NULL REFERENCES webhook_subscriptions,
  team_id UUID NOT NULL REFERENCES teams,
  event_type VARCHAR(100),
  event_payload JSONB,
  http_status_code INT,
  response_body TEXT,
  attempt_number INT,
  next_retry_at TIMESTAMPTZ,
  delivery_status VARCHAR(50),      -- 'pending', 'success', 'failed', 'exhausted'
  error_message TEXT,
  created_at TIMESTAMPTZ,
  INDEX idx_subscription_status (webhook_subscription_id, delivery_status),
  INDEX idx_pending_retry (next_retry_at) WHERE delivery_status = 'pending'
);
```

### 🟠 Gap 8: Content Versioning & Rollback

**Current:** Audit logs exist but no version history.  
**Need:** Full content versions, compare, restore.

```sql
CREATE TABLE document_versions (
  id UUID PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES documents,
  team_id UUID NOT NULL REFERENCES teams,
  version_number INT,
  title VARCHAR(255),
  slug VARCHAR(255),
  content TEXT,
  status VARCHAR(50),
  author_id UUID REFERENCES users,
  change_summary VARCHAR(500),
  change_type VARCHAR(50),          -- 'auto_save', 'manual_save', 'publish', 'revert'
  seo_metadata JSONB,
  tags JSONB,
  created_at TIMESTAMPTZ,
  restored_by UUID REFERENCES users,
  UNIQUE(document_id, version_number)
);
```

### 🟠 Gap 9: Email Campaign Management

**Current:** None. Sending emails ad-hoc.  
**Need:** Campaign builder, templates, scheduling, analytics.

```sql
CREATE TABLE email_campaigns (
  id UUID PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES teams,
  created_by UUID NOT NULL REFERENCES users,
  campaign_name VARCHAR(255),
  campaign_type VARCHAR(50),        -- 'newsletter', 'announcement', 'promotion', 'transactional'
  subject_line VARCHAR(255),
  preview_text VARCHAR(255),
  sender_name VARCHAR(100),
  sender_email VARCHAR(255),
  template_id UUID REFERENCES email_templates,
  content_html TEXT,
  content_text TEXT,
  status VARCHAR(50),               -- 'draft', 'scheduled', 'sent', 'cancelled'
  scheduled_send_time TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  recipient_segment JSONB,          -- {"filters": {"role": "lead", "score": ">70"}}
  recipient_count INT,
  unsubscribe_token_format VARCHAR(50),
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);

CREATE TABLE email_opens (
  id UUID PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES email_campaigns,
  recipient_email VARCHAR(255),
  opened_at TIMESTAMPTZ,
  user_agent TEXT,
  ip_address INET,
  INDEX idx_campaign_recipient (campaign_id, recipient_email)
);

CREATE TABLE email_clicks (
  id UUID PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES email_campaigns,
  recipient_email VARCHAR(255),
  link_url VARCHAR(500),
  clicked_at TIMESTAMPTZ,
  ip_address INET,
  user_agent TEXT,
  INDEX idx_campaign_recipient (campaign_id, recipient_email)
);
```

### 🟠 Gap 10: Advanced Analytics Event Stream

**Current:** Basic analytics_events table. Missing event typing.  
**Need:** Typed events, funnel analysis, cohort tracking.

```sql
CREATE TABLE analytics_event_definitions (
  id UUID PRIMARY KEY,
  event_key VARCHAR(100),           -- 'page_view', 'button_click', 'form_submit'
  event_name VARCHAR(255),
  event_category VARCHAR(100),      -- 'engagement', 'conversion', 'error'
  properties JSONB,                 -- Schema of properties expected
  created_at TIMESTAMPTZ,
  UNIQUE(event_key)
);

CREATE TABLE analytics_events_v2 (
  id UUID PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES teams,
  user_id UUID REFERENCES users,
  anonymous_user_id VARCHAR(100),   -- For unauthenticated users
  session_id VARCHAR(100),
  event_key VARCHAR(100),
  event_name VARCHAR(255),
  event_category VARCHAR(100),
  properties JSONB,                 -- {timestamp, page_url, referrer, device, browser}
  revenue DECIMAL(12, 2),           -- For revenue events
  created_at TIMESTAMPTZ,
  date_yyyymmdd DATE,               -- For partitioning
  PARTITION BY RANGE (date_yyyymmdd),
  INDEX idx_team_date (team_id, created_at DESC),
  INDEX idx_user_date (user_id, created_at DESC),
  INDEX idx_session (session_id)
);

CREATE MATERIALIZED VIEW analytics_funnels AS
SELECT
  team_id,
  step_1_key,
  COUNT(*) as step_1_count,
  SUM(CASE WHEN step_2_key IS NOT NULL THEN 1 ELSE 0 END) as step_2_count,
  SUM(CASE WHEN step_3_key IS NOT NULL THEN 1 ELSE 0 END) as step_3_count,
  step_1_count * 1.0 / step_2_count as conversion_rate_1_to_2,
  step_2_count * 1.0 / step_3_count as conversion_rate_2_to_3
FROM analytics_events_v2;
```

---

## Part 3: Medium-Priority Gaps (Nice-to-Have by Year 2)

### 🟡 Gaps 11-20 Summary

| # | Gap | Impact | Timeline |
|---|-----|--------|----------|
| 11 | Content Preview & Staging | Publish errors | Q3 2026 |
| 12 | Search Index Management | Poor search UX | Q4 2026 |
| 13 | Data Warehouse / BI Export | Analytics limitations | Q4 2026 |
| 14 | Time Tracking & Resource Planning | Project insights | Q1 2027 |
| 15 | Contract Management | Legal exposure | Q1 2027 |
| 16 | Support Ticketing | Customer success | Q1 2027 |
| 17 | Social Media Management | Marketing overhead | Q2 2027 |
| 18 | Image Optimization Pipeline | Performance issues | Q2 2027 |
| 19 | Batch Job Queuing System | Scalability bottleneck | Q2 2027 |
| 20 | GraphQL API | Developer productivity | Q3 2027 |

---

## Part 4: Hidden Assumptions & Required Decisions

### Decision 1: Multi-Region Strategy
**Assumption:** Single region (US-based).  
**Reality:** African teams need data residency (Egypt, Nigeria, South Africa).  
**Decision:** Implement multi-region support in Year 2.
```sql
CREATE TABLE deployment_regions (
  id UUID PRIMARY KEY,
  region_code VARCHAR(10),          -- 'us-east-1', 'eu-west-1', 'af-south-1'
  region_name VARCHAR(100),
  data_residency_required BOOLEAN,
  compliance_certifications TEXT[],
  is_active BOOLEAN,
  created_at TIMESTAMPTZ
);

CREATE TABLE team_region_assignments (
  team_id UUID NOT NULL REFERENCES teams,
  region_id UUID NOT NULL REFERENCES deployment_regions,
  primary_region BOOLEAN DEFAULT FALSE,
  data_replication_enabled BOOLEAN DEFAULT TRUE,
  UNIQUE(team_id, region_id)
);
```

### Decision 2: Async Job Processing
**Assumption:** All operations synchronous.  
**Reality:** Reports, exports, image encoding need async.  
**Decision:** Implement job queue (RabbitMQ/Redis) in Q3 2026.
```sql
CREATE TABLE background_jobs (
  id UUID PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES teams,
  job_type VARCHAR(100),            -- 'generate_report', 'export_csv', 'optimize_images'
  status VARCHAR(50),               -- 'queued', 'running', 'completed', 'failed'
  payload JSONB,
  result JSONB,
  error_message TEXT,
  retry_count INT DEFAULT 0,
  max_retries INT DEFAULT 3,
  created_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  INDEX idx_team_status (team_id, status)
);
```

### Decision 3: Content Block System
**Assumption:** Content is flat text + title.  
**Reality:** Need rich blocks (hero sections, CTAs, testimonials embedded).  
**Decision:** Implement block-based content in Q4 2026.
```sql
CREATE TABLE content_blocks (
  id UUID PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES documents,
  block_type VARCHAR(50),           -- 'text', 'image', 'video', 'cta', 'testimonial', 'form'
  block_order INT,
  block_data JSONB,                 -- Type-specific data
  is_visible BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

### Decision 4: Real-Time Collaboration
**Assumption:** Users edit sequentially.  
**Reality:** Teams need simultaneous editing (Figma-like).  
**Decision:** Implement operational transformation in Year 2.

### Decision 5: AI Model Versioning
**Assumption:** AI features use single prompt.  
**Reality:** Need to test multiple prompts, track which works best.  
**Decision:** Add model versioning table.
```sql
CREATE TABLE ai_model_versions (
  id UUID PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES teams,
  model_key VARCHAR(100),           -- 'content_rewriter', 'lead_scorer'
  model_type VARCHAR(100),          -- 'prompt_based', 'fine_tuned', 'custom'
  version_number INT,
  provider VARCHAR(50),             -- 'openai', 'anthropic', 'local'
  model_name VARCHAR(255),          -- 'gpt-4-turbo', 'claude-3-opus'
  system_prompt TEXT,
  temperature DECIMAL(3, 2),
  max_tokens INT,
  cost_per_1k_tokens DECIMAL(8, 6),
  performance_score DECIMAL(5, 2),  -- User feedback aggregated
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ,
  activated_at TIMESTAMPTZ
);
```

---

## Part 5: Required Adjustments to Architecture

### Adjustment 1: Database Schema Expansion

**Add 8 New Tables (Critical):**
1. locales
2. user_locale_preferences
3. transactions (multi-currency)
4. compliance_rules
5. feature_flags
6. ab_tests
7. feature_flag_evaluations
8. data_classifications

**Add 12 New Tables (High Priority):**
9. compliance_holds
10. user_sessions
11. failed_login_attempts
12. data_deletion_requests
13. sensitive_data_access_log
14. notification_channels
15. notification_preferences
16. notifications
17. api_keys
18. api_usage_log
19. rate_limits
20. custom_field_definitions
21. custom_field_values
22. webhook_subscriptions
23. webhook_deliveries
24. document_versions
25. email_campaigns
26. email_opens
27. email_clicks
28. analytics_event_definitions
29. analytics_events_v2 (replace old table)

**Total New Tables:** 20  
**Migration Effort:** 6-8 weeks (2 developers)  
**Breaking Changes:** None (add-only)

### Adjustment 2: Dashboard Module Additions

**Add 5 New Modules:**
1. **Settings & Configuration**
   - Locales & timezones management
   - Feature flags UI
   - API key management
   - Rate limit configuration
   - Compliance rules

2. **Email Campaigns**
   - Campaign builder
   - Template library
   - Schedule/send
   - Analytics (open rate, click rate)

3. **Webhooks & Integrations**
   - Webhook subscription management
   - Integration logging
   - Error monitoring
   - Retry configuration

4. **Security & Compliance**
   - Audit logs (enhanced)
   - Sensitive data access logs
   - Session management
   - Compliance holds

5. **Advanced Analytics**
   - Funnel analysis
   - Cohort analysis
   - Custom events
   - Export to data warehouse

**UI Work:** 8-10 weeks (2 designers, 3 engineers)

### Adjustment 3: Design System Extensions

**Add:**
1. **Dark mode for complex UI** (tables, forms, charts)
2. **Advanced form components** (multi-step, conditional fields)
3. **Analytics visualizations** (funnel, cohort, timeline)
4. **Real-time status indicators** (live data, syncing)
5. **Accessibility patterns** (ARIA labels, skip links)

**No Breaking Changes:** All additions backward-compatible

### Adjustment 4: API Versioning Strategy

**Implement:**
```
/api/v1/posts          (current, stable)
/api/v2/documents      (new unified content API)
/api/v1/analytics      (legacy, deprecate Q4 2026)
/api/v2/analytics      (new event-based system)
```

**Deprecation Timeline:**
- June 2026: Announce v1 deprecation
- Sept 2026: v1 read-only
- Dec 2026: v1 sunset
- All users migrated to v2 by Q1 2027

### Adjustment 5: Scalability Infrastructure

**Add:**
1. **Database partitioning** (analytics_events_v2 by date)
2. **Read replicas** (for reporting, separate analytics DB)
3. **Caching layer** (Redis for dashboards, feeds, frequently accessed data)
4. **CDN strategy** (CloudFront/Cloudflare for media library)
5. **Search infrastructure** (Elasticsearch scaling plan)

**Performance Targets:**
- Dashboard load: < 1.5s (vs current 2s)
- Search results: < 300ms (vs current 500ms)
- Report generation: < 5s (new capability)
- Bulk operations: 50,000 items in < 10s (vs current 10,000 in 5s)

---

## Part 6: 3-Year Implementation Roadmap

### Q2 2026 (Now) — Foundation
- **Database:** Add 8 critical tables (locales, feature flags, compliance, security)
- **Backend:** API key auth, basic feature flags
- **Dashboard:** Settings module (beta)
- **Effort:** 4 weeks (2 devs)

### Q3 2026 — Core Extensions
- **Database:** Add 12 high-priority tables
- **Backend:** Notification system, webhook system, email campaign builder
- **Dashboard:** Email campaigns module, webhooks module
- **Effort:** 8 weeks (3 devs)

### Q4 2026 — Analytics & API
- **Database:** Add analytics_events_v2, event definitions
- **Backend:** New analytics API, data warehouse connector
- **Dashboard:** Advanced analytics module, export/BI tools
- **API:** Version v2 released, v1 in sunset phase
- **Effort:** 8 weeks (3 devs)

### Q1 2027 — Compliance & Security
- **Database:** Finalize all security-related tables
- **Backend:** Audit log enhancements, compliance holds, data deletion workflows
- **Dashboard:** Enhanced security module, session management
- **Effort:** 6 weeks (2 devs)

### Q2 2027 — Advanced Features
- **Content:** Block-based content system, versioning/rollback
- **Dashboard:** Content preview/staging, version comparison
- **Effort:** 6 weeks (2 devs)

### Q3 2027 — Scaling & Performance
- **Infrastructure:** Multi-region support, async job processing, read replicas
- **API:** GraphQL support (optional)
- **Effort:** 10 weeks (3 devs)

---

## Part 7: Architectural Principles for 3-Year Runway

### P1: Extensibility Over Customization
- Use custom fields framework instead of adding columns
- Webhooks instead of direct API calls
- Feature flags instead of hardcoded logic

### P2: Event-Driven Architecture
- All state changes produce events
- Outbox pattern for reliability
- Event sourcing for audit trail

### P3: Separation of Concerns
- Read models separate from write models (CQRS-lite)
- Analytics on replica databases, not production
- Real-time data in Redis, persistent data in PostgreSQL

### P4: Graceful Degradation
- Feature flags allow gradual rollout
- Fallback behavior when services fail
- Async processing with user feedback

### P5: Future-Proof Naming
- table_v2 approach for breaking changes
- API versioning from day 1
- Deprecation windows before sunset

---

## Part 8: Risk Mitigation

### Risk 1: Database Growth
**Issue:** analytics_events_v2 could become 10GB/month  
**Mitigation:** Partitioning by date, archive old data to warehouse

### Risk 2: Compliance Violations
**Issue:** Missing audit trail could trigger legal issues  
**Mitigation:** Implement compliance tables now, audit logging retroactive

### Risk 3: Feature Flag Complexity
**Issue:** Too many flags, impossible to manage  
**Mitigation:** Governance policy, auto-clean old flags after 90 days

### Risk 4: Webhook Delivery Failures
**Issue:** Silent failures, data loss  
**Mitigation:** Webhook delivery logs, alert on exhausted retries

### Risk 5: API Versioning Chaos
**Issue:** Multiple API versions become maintenance nightmare  
**Mitigation:** Strict deprecation schedule, automatic redirects

---

## Conclusion

The current TechDon architecture is solid but incomplete for 3-year runway without major rewrites.

**Current Status:** 60% complete (core features work, extensibility missing)  
**Effort to Complete:** 60-70 weeks across 6 quarters  
**Cost:** ~500K in development  
**ROI:** Zero rewrite risk until Q2 2029

**Critical Path:**
1. Q2 2026: Foundation (locales, flags, security)
2. Q3 2026: Extensions (notifications, webhooks, email)
3. Q4 2026: Analytics (new event system, API v2)
4. Q1-Q3 2027: Advanced features, scaling

**Next Step:** Create migration files for 8 critical new tables (2-week sprint).

---

*Review Completed: June 3, 2026*  
*Next Review: Q4 2026*  
*No-Rewrite Guarantee: Valid through June 2029*
