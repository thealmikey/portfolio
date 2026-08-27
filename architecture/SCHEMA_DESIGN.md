# PostgreSQL Schema Design - Techdon Solutions

**Version**: 2.0 (Refactored)  
**Date**: June 11, 2026  
**Status**: Superseded by migrations 023-025  

> **MIGRATION NOTICE (2026-06-11):** The schema was simplified via migrations 023-025. Teams and team isolation were removed per the `architectural-audit-refactoring-2026-06-11.md` plan. Redundant tables (translations, seo_metadata, analytics_events, audit_logs, etc.) were dropped. New core tables added: invoices, quotes, milestones, internal_notes, files, communications. See migration files for exact schema.  

---

## ENTITY RELATIONSHIP DIAGRAM (ERD)

```
┌─────────────────────────────────────────────────────────────────┐
│                          IDENTITY LAYER                          │
├─────────────────┬─────────────────────────────┬─────────────────┤
│     users       │        teams                │   team_members  │
│  (PK: id)       │   (PK: id, FK: owner_id)   │  (PK: id)       │
│  email (UNIQUE) │   slug (UNIQUE)             │  (FK: team_id)  │
│  phone          │   organization_id           │  (FK: user_id)  │
│  password_hash  │                             │  role, status   │
└─────────────────┴──────────┬──────────────────┴─────────────────┘
                             │
        ┌────────────────────┴────────────────────┐
        │                                         │
┌───────▼──────────┐                    ┌────────▼──────────┐
│    projects      │                    │    services       │
│  (PK: id)        │                    │  (PK: id)         │
│  (FK: team_id)   │                    │  (FK: project_id) │
│  status, budget  │                    │  type, status     │
└────────┬─────────┘                    └────────┬──────────┘
         │                                       │
         │                                       │
    ┌────▼────────────┐             ┌───────────▼─────────┐
    │  deliverables   │             │   deployments       │
    │  (PK: id)       │             │  (PK: id)           │
    │  (FK: service)  │             │  (FK: service_id)   │
    │  status         │             │  environment, ver.  │
    └─────────────────┘             └─────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                      CONTENT MANAGEMENT LAYER                    │
├──────────────┬──────────────┬──────────────┬────────────────────┤
│  documents   │  blog_posts  │  books       │  case_studies      │
│ (PK: id)     │ (PK: id)     │ (PK: id)     │ (PK: id)           │
│ (FK: team)   │ (FK: team)   │ (FK: team)   │ (FK: team)         │
│ slug, status │ slug, status │ slug, status │ slug, status       │
└──────┬───────┴──────┬───────┴──────┬───────┴────────┬───────────┘
       │              │              │                │
       └──────────────┼──────────────┼────────────────┘
                      │
        ┌─────────────▼──────────────┐
        │   translations             │
        │  (PK: id)                  │
        │  (FK: document_id)         │
        │  locale, title, content    │
        └────────────────────────────┘
             (Supports all content types)

        ┌────────────────────────────┐
        │   seo_metadata             │
        │  (PK: id)                  │
        │  (FK: document_id)         │
        │  locale, slug, meta_desc   │
        └────────────────────────────┘

        ┌────────────────────────────┐
        │   media_assets             │
        │  (PK: id)                  │
        │  (FK: team_id, FK: doc_id) │
        │  filename, url, type, size │
        └────────────────────────────┘

        ┌────────────────────────────┐
        │   testimonials             │
        │  (PK: id)                  │
        │  (FK: team_id)             │
        │  author, content, status   │
        └────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                         BUSINESS LAYER                           │
├──────────────┬──────────────┬──────────────┬────────────────────┤
│    leads     │  contact_req │consultations│ publishing_workflow│
│  (PK: id)    │ (PK: id)     │ (PK: id)    │ (PK: id)          │
│  (FK: team)  │ (FK: team)   │(FK: project)│ (FK: document)    │
│  status      │  status      │  status     │ status, version   │
└──────┬───────┴──────┬───────┴──────┬──────┴────────┬──────────┘
       │              │              │               │
       │              │              │               │
    ┌──▼──────────────▼──────────────▼─────────────┐
    │    audit_logs                                 │
    │   (PK: id)                                    │
    │   action, resource_type, resource_id          │
    │   changes (JSONB), user_id, timestamp         │
    └───────────────────────────────────────────────┘

    ┌───────────────────────────────────────────────┐
    │    outbox_events (Event Sourcing)             │
    │   (PK: id)                                    │
    │   aggregate_id, event_type, payload (JSONB)  │
    │   created_at, published_at                    │
    └───────────────────────────────────────────────┘

    ┌───────────────────────────────────────────────┐
    │    analytics_events                           │
    │   (PK: id)                                    │
    │   (FK: document_id)                           │
    │   event_type, properties (JSONB), timestamp   │
    └───────────────────────────────────────────────┘
```

---

## TABLE DEFINITIONS (COMPLETE)

### 1. IDENTITY MANAGEMENT

#### users
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  avatar_url TEXT,
  phone_number_encrypted BYTEA, -- Encrypted via pgcrypto
  locale VARCHAR(10) DEFAULT 'en',
  timezone VARCHAR(50) DEFAULT 'UTC',
  email_verified BOOLEAN DEFAULT FALSE,
  email_verified_at TIMESTAMPTZ,
  mfa_enabled BOOLEAN DEFAULT FALSE,
  mfa_secret_encrypted BYTEA,
  status VARCHAR(50) DEFAULT 'ACTIVE', -- ACTIVE, SUSPENDED, DELETED
  
  -- Audit columns
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  
  -- Metadata
  last_login_at TIMESTAMPTZ,
  ip_address INET,
  user_agent TEXT
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at DESC);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_email_verified ON users(email_verified);
```

#### teams
```sql
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  organization_id UUID, -- For future multi-org support
  avatar_url TEXT,
  billing_email VARCHAR(255),
  website_url TEXT,
  status VARCHAR(50) DEFAULT 'ACTIVE', -- ACTIVE, SUSPENDED, DELETED
  
  -- Subscription
  subscription_tier VARCHAR(50) DEFAULT 'free', -- free, starter, pro, enterprise
  subscription_id VARCHAR(255), -- External subscription ID (Stripe)
  
  -- Audit columns
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX idx_teams_owner_id ON teams(owner_id);
CREATE INDEX idx_teams_slug ON teams(slug);
CREATE INDEX idx_teams_status ON teams(status);
CREATE INDEX idx_teams_created_at ON teams(created_at DESC);
```

#### team_members
```sql
CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'MEMBER', -- OWNER, ADMIN, MEMBER, VIEWER
  status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, ACTIVE, REMOVED
  
  -- Invitation tracking
  invited_at TIMESTAMPTZ DEFAULT now(),
  invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
  accepted_at TIMESTAMPTZ,
  removed_at TIMESTAMPTZ,
  
  -- Permissions (JSONB for extensibility)
  permissions JSONB DEFAULT '{}', -- Custom permissions
  
  -- Audit columns
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(team_id, user_id)
);

-- Indexes
CREATE INDEX idx_team_members_team_id ON team_members(team_id);
CREATE INDEX idx_team_members_user_id ON team_members(user_id);
CREATE INDEX idx_team_members_status ON team_members(status);
```

---

### 2. PROJECT MANAGEMENT

#### projects
```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  slug VARCHAR(255),
  
  -- Classification
  category VARCHAR(100) NOT NULL, -- WEB_DEV, APP_DEV, AI_SYSTEM, IOT, POS, CCTV, ENTERPRISE
  status VARCHAR(50) DEFAULT 'SCOPING', -- SCOPING, ACTIVE, PAUSED, DELIVERED, ARCHIVED
  priority VARCHAR(50) DEFAULT 'MEDIUM', -- LOW, MEDIUM, HIGH, CRITICAL
  
  -- Financial
  budget DECIMAL(15,2),
  actual_spent DECIMAL(15,2) DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'USD',
  
  -- Timeline
  start_date DATE,
  estimated_end_date DATE,
  actual_end_date DATE,
  
  -- Client information
  client_name VARCHAR(255),
  client_email VARCHAR(255),
  client_phone VARCHAR(20),
  client_company VARCHAR(255),
  
  -- Team assignment
  project_manager_id UUID REFERENCES users(id) ON DELETE SET NULL,
  team_lead_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Additional metadata
  tags TEXT[], -- Array of tags for filtering
  metadata JSONB DEFAULT '{}', -- Custom fields
  
  -- Audit columns
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX idx_projects_team_id ON projects(team_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_category ON projects(category);
CREATE INDEX idx_projects_created_at ON projects(created_at DESC);
CREATE INDEX idx_projects_tags ON projects USING GIN(tags);
CREATE UNIQUE INDEX idx_projects_slug_team ON projects(slug, team_id) 
  WHERE deleted_at IS NULL;
```

#### services
```sql
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Classification
  service_type VARCHAR(100) NOT NULL, -- Frontend, Backend, Mobile, AI, etc.
  status VARCHAR(50) DEFAULT 'PLANNED', -- PLANNED, IN_PROGRESS, REVIEW, COMPLETED
  priority VARCHAR(50) DEFAULT 'MEDIUM', -- LOW, MEDIUM, HIGH, CRITICAL
  
  -- Estimation & Tracking
  estimated_hours INTEGER,
  estimated_cost DECIMAL(15,2),
  actual_hours INTEGER,
  actual_cost DECIMAL(15,2),
  
  -- Assignment
  assigned_team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  lead_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Timeline
  start_date DATE,
  estimated_end_date DATE,
  actual_end_date DATE,
  
  -- Additional metadata
  requirements TEXT,
  acceptance_criteria TEXT,
  metadata JSONB DEFAULT '{}',
  
  -- Audit columns
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX idx_services_project_id ON services(project_id);
CREATE INDEX idx_services_status ON services(status);
CREATE INDEX idx_services_type ON services(service_type);
CREATE INDEX idx_services_lead_user_id ON services(lead_user_id);
```

#### deliverables
```sql
CREATE TABLE deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Status management
  status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, IN_PROGRESS, SUBMITTED, REVIEW, ACCEPTED, REJECTED
  
  -- Acceptance
  acceptance_criteria TEXT,
  definition_of_done TEXT,
  
  -- Timeline
  due_date DATE NOT NULL,
  submitted_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  
  -- Notes & Feedback
  submission_notes TEXT,
  review_notes TEXT,
  rejection_reason TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  -- Audit columns
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  submitted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX idx_deliverables_service_id ON deliverables(service_id);
CREATE INDEX idx_deliverables_project_id ON deliverables(project_id);
CREATE INDEX idx_deliverables_status ON deliverables(status);
CREATE INDEX idx_deliverables_due_date ON deliverables(due_date);
```

---

### 3. DEPLOYMENT & DELIVERY

#### deployments
```sql
CREATE TABLE deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Deployment details
  environment VARCHAR(50) NOT NULL, -- DEVELOPMENT, STAGING, PRODUCTION
  status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, IN_PROGRESS, SUCCESS, FAILED, ROLLED_BACK
  
  -- Version tracking
  version VARCHAR(50) NOT NULL, -- Semantic versioning: 1.0.0
  commit_hash VARCHAR(255),
  commit_message TEXT,
  
  -- Artifact & artifacts
  artifact_url TEXT,
  artifact_size_bytes BIGINT,
  
  -- Execution details
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  
  -- Quality gates
  quality_check_status VARCHAR(50), -- PASSED, FAILED, SKIPPED
  quality_check_details JSONB,
  
  -- Performance metrics
  performance_metrics JSONB DEFAULT '{}', -- latency, throughput, etc.
  
  -- Error handling
  error_message TEXT,
  error_details JSONB,
  
  -- Rollback tracking
  rolled_back BOOLEAN DEFAULT FALSE,
  rolled_back_at TIMESTAMPTZ,
  rollback_reason TEXT,
  
  -- Approvals
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Audit columns
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX idx_deployments_service_id ON deployments(service_id);
CREATE INDEX idx_deployments_project_id ON deployments(project_id);
CREATE INDEX idx_deployments_environment ON deployments(environment);
CREATE INDEX idx_deployments_status ON deployments(status);
CREATE INDEX idx_deployments_version ON deployments(version);
CREATE INDEX idx_deployments_created_at ON deployments(created_at DESC);
```

---

### 4. CONTENT MANAGEMENT

#### documents (Base table for all content)
```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  
  -- Identification
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  
  -- Classification
  document_type VARCHAR(100) NOT NULL, -- blog_post, book, case_study, article, testimonial, etc.
  category VARCHAR(100),
  sub_category VARCHAR(100),
  
  -- Content
  content TEXT, -- Markdown format
  excerpt TEXT,
  featured_image_url TEXT,
  
  -- Multi-language
  default_locale VARCHAR(10) DEFAULT 'en',
  available_locales TEXT[] DEFAULT '{"en"}',
  
  -- Status & Publishing
  status VARCHAR(50) DEFAULT 'DRAFT', -- DRAFT, SCHEDULED, PUBLISHED, ARCHIVED
  published_at TIMESTAMPTZ,
  scheduled_for TIMESTAMPTZ, -- Future publish date
  
  -- Metrics
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  
  -- SEO
  canonical_url TEXT,
  
  -- Author information
  author_id UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewer_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Tags & Keywords
  tags TEXT[], -- Array for filtering
  keywords TEXT[], -- For SEO
  
  -- Metadata
  metadata JSONB DEFAULT '{}', -- Custom fields per document type
  
  -- Audit columns
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX idx_documents_team_id ON documents(team_id);
CREATE INDEX idx_documents_type ON documents(document_type);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_slug ON documents(slug);
CREATE INDEX idx_documents_created_at ON documents(created_at DESC);
CREATE INDEX idx_documents_tags ON documents USING GIN(tags);
CREATE INDEX idx_documents_keywords ON documents USING GIN(keywords);
CREATE INDEX idx_documents_published_at ON documents(published_at DESC) 
  WHERE status = 'PUBLISHED';
CREATE UNIQUE INDEX idx_documents_slug_team_locale ON documents(slug, team_id, default_locale) 
  WHERE deleted_at IS NULL;
```

#### translations (Multi-language support)
```sql
CREATE TABLE translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  
  -- Locale identification
  locale VARCHAR(10) NOT NULL, -- en, es, fr, de, pt, ja, zh, etc.
  
  -- Translated content
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  excerpt TEXT,
  content TEXT,
  
  -- Status
  status VARCHAR(50) DEFAULT 'DRAFT', -- DRAFT, TRANSLATED, REVIEWED, PUBLISHED
  
  -- Translation tracking
  translated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  translated_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  
  -- Metadata
  translation_key VARCHAR(255), -- For tracking translations from external services
  
  -- Audit columns
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  
  UNIQUE(document_id, locale)
);

-- Indexes
CREATE INDEX idx_translations_document_id ON translations(document_id);
CREATE INDEX idx_translations_locale ON translations(locale);
CREATE INDEX idx_translations_slug ON translations(slug);
```

#### seo_metadata
```sql
CREATE TABLE seo_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  
  -- Locale
  locale VARCHAR(10) NOT NULL DEFAULT 'en',
  
  -- SEO Data
  meta_title VARCHAR(60),
  meta_description VARCHAR(160),
  canonical_url TEXT,
  robots VARCHAR(100), -- index, follow, etc.
  
  -- Open Graph
  og_title VARCHAR(255),
  og_description TEXT,
  og_image_url TEXT,
  og_type VARCHAR(50), -- article, book, etc.
  
  -- Twitter
  twitter_card VARCHAR(50), -- summary, summary_large_image, etc.
  twitter_title VARCHAR(255),
  twitter_description TEXT,
  twitter_image_url TEXT,
  
  -- Schema.org Markup
  schema_markup JSONB,
  
  -- Structured Data
  keywords_primary TEXT[],
  keywords_secondary TEXT[],
  
  -- Audit columns
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(document_id, locale)
);

-- Indexes
CREATE INDEX idx_seo_metadata_document_id ON seo_metadata(document_id);
CREATE INDEX idx_seo_metadata_locale ON seo_metadata(locale);
```

#### media_assets
```sql
CREATE TABLE media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL, -- Optional association
  
  -- File information
  filename VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL UNIQUE,
  mime_type VARCHAR(100),
  size_bytes BIGINT,
  
  -- URLs
  public_url TEXT NOT NULL,
  thumbnail_url TEXT,
  
  -- Media classification
  media_type VARCHAR(50) NOT NULL, -- image, video, pdf, document, etc.
  category VARCHAR(100),
  
  -- Image specific
  width INTEGER,
  height INTEGER,
  alt_text VARCHAR(255),
  
  -- Video specific
  duration_seconds INTEGER,
  video_codec VARCHAR(100),
  
  -- Storage information
  storage_provider VARCHAR(100), -- s3, cloudinary, etc.
  storage_key VARCHAR(255),
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  tags TEXT[],
  
  -- Usage tracking
  usage_count INTEGER DEFAULT 0,
  
  -- Audit columns
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX idx_media_assets_team_id ON media_assets(team_id);
CREATE INDEX idx_media_assets_document_id ON media_assets(document_id);
CREATE INDEX idx_media_assets_media_type ON media_assets(media_type);
CREATE INDEX idx_media_assets_tags ON media_assets USING GIN(tags);
CREATE INDEX idx_media_assets_created_at ON media_assets(created_at DESC);
```

#### testimonials
```sql
CREATE TABLE testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  
  -- Testimonial details
  author_name VARCHAR(255) NOT NULL,
  author_title VARCHAR(255),
  author_company VARCHAR(255),
  author_image_url TEXT,
  author_email VARCHAR(255),
  
  -- Content
  content TEXT NOT NULL,
  excerpt TEXT,
  
  -- Rating
  rating INTEGER, -- 1-5 stars
  
  -- Classification
  category VARCHAR(100), -- Service category it's about
  tags TEXT[],
  
  -- Status
  status VARCHAR(50) DEFAULT 'DRAFT', -- DRAFT, PUBLISHED, ARCHIVED
  featured BOOLEAN DEFAULT FALSE,
  
  -- Publishing
  published_at TIMESTAMPTZ,
  
  -- Verification
  verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMPTZ,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  -- Audit columns
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX idx_testimonials_team_id ON testimonials(team_id);
CREATE INDEX idx_testimonials_status ON testimonials(status);
CREATE INDEX idx_testimonials_featured ON testimonials(featured);
CREATE INDEX idx_testimonials_rating ON testimonials(rating);
CREATE INDEX idx_testimonials_published_at ON testimonials(published_at DESC);
```

---

### 5. BUSINESS INTELLIGENCE

#### leads
```sql
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  
  -- Lead information
  email VARCHAR(255) NOT NULL,
  phone_number VARCHAR(20),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  company_name VARCHAR(255),
  job_title VARCHAR(255),
  
  -- Source tracking
  source VARCHAR(100), -- website, linkedin, referral, email, etc.
  source_campaign VARCHAR(255),
  utm_source VARCHAR(100),
  utm_medium VARCHAR(100),
  utm_campaign VARCHAR(100),
  
  -- Lead scoring
  lead_score INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'NEW', -- NEW, QUALIFIED, CONTACTED, NURTURING, CONVERTED, LOST
  
  -- Service interest
  interested_services TEXT[], -- Array of service types
  budget_range VARCHAR(100),
  timeline VARCHAR(100),
  
  -- Communication
  last_contacted_at TIMESTAMPTZ,
  next_follow_up_at TIMESTAMPTZ,
  
  -- Conversion tracking
  converted_at TIMESTAMPTZ,
  converted_to_project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  
  -- Notes
  notes TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  -- Audit columns
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX idx_leads_team_id ON leads(team_id);
CREATE INDEX idx_leads_email ON leads(email);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_lead_score ON leads(lead_score DESC);
CREATE INDEX idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX idx_leads_interested_services ON leads USING GIN(interested_services);
```

#### contact_requests
```sql
CREATE TABLE contact_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  
  -- Submission information
  email VARCHAR(255) NOT NULL,
  phone_number VARCHAR(20),
  name VARCHAR(255),
  company_name VARCHAR(255),
  website_url TEXT,
  
  -- Request details
  subject VARCHAR(255),
  message TEXT NOT NULL,
  
  -- Classification
  inquiry_type VARCHAR(100), -- general, support, sales, partnership, etc.
  priority VARCHAR(50) DEFAULT 'MEDIUM',
  
  -- Status
  status VARCHAR(50) DEFAULT 'NEW', -- NEW, ACKNOWLEDGED, ASSIGNED, IN_PROGRESS, RESOLVED, CLOSED
  
  -- Assignment
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ,
  
  -- Response tracking
  first_response_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  -- Audit columns
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX idx_contact_requests_team_id ON contact_requests(team_id);
CREATE INDEX idx_contact_requests_email ON contact_requests(email);
CREATE INDEX idx_contact_requests_status ON contact_requests(status);
CREATE INDEX idx_contact_requests_created_at ON contact_requests(created_at DESC);
CREATE INDEX idx_contact_requests_priority ON contact_requests(priority);
```

#### consultations
```sql
CREATE TABLE consultations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  
  -- Participants
  consultant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  
  -- Details
  consultation_type VARCHAR(100) NOT NULL, -- DISCOVERY, TECHNICAL_REVIEW, PLANNING, RETROSPECTIVE, etc.
  title VARCHAR(255),
  description TEXT,
  
  -- Scheduling
  scheduled_for TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  time_zone VARCHAR(50),
  
  -- Status
  status VARCHAR(50) DEFAULT 'SCHEDULED', -- SCHEDULED, CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED, NO_SHOW
  
  -- Meeting details
  meeting_link TEXT, -- Zoom, Teams, etc.
  meeting_room VARCHAR(100),
  meeting_type VARCHAR(50), -- VIRTUAL, IN_PERSON, HYBRID
  
  -- Outcomes
  completed_at TIMESTAMPTZ,
  notes TEXT,
  action_items TEXT,
  follow_up_required BOOLEAN DEFAULT FALSE,
  follow_up_due_at TIMESTAMPTZ,
  
  -- Metrics
  duration_actual_minutes INTEGER,
  attendees_count INTEGER,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  -- Audit columns
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  cancelled_by UUID REFERENCES users(id) ON DELETE SET NULL,
  cancelled_reason TEXT
);

-- Indexes
CREATE INDEX idx_consultations_team_id ON consultations(team_id);
CREATE INDEX idx_consultations_project_id ON consultations(project_id);
CREATE INDEX idx_consultations_consultant_id ON consultations(consultant_id);
CREATE INDEX idx_consultations_status ON consultations(status);
CREATE INDEX idx_consultations_scheduled_for ON consultations(scheduled_for);
CREATE INDEX idx_consultations_created_at ON consultations(created_at DESC);
```

---

### 6. PUBLISHING & WORKFLOW

#### publishing_workflow
```sql
CREATE TABLE publishing_workflow (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  
  -- Workflow tracking
  workflow_type VARCHAR(100), -- editorial, review, approval, scheduling
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- PENDING, IN_REVIEW, APPROVED, REJECTED, PUBLISHED
  version_number INTEGER NOT NULL, -- Track document versions
  
  -- Submission
  submitted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  submitted_at TIMESTAMPTZ NOT NULL,
  submitted_content TEXT, -- Content at time of submission
  submitted_metadata JSONB, -- Metadata at time of submission
  
  -- Review process
  reviewer_id UUID REFERENCES users(id) ON DELETE SET NULL,
  review_started_at TIMESTAMPTZ,
  review_completed_at TIMESTAMPTZ,
  review_comments TEXT,
  
  -- Approval
  approver_id UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  approval_comments TEXT,
  
  -- Rejection (if applicable)
  rejection_reason TEXT,
  
  -- Publishing
  published_by UUID REFERENCES users(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ,
  scheduled_publish_at TIMESTAMPTZ,
  
  -- Change tracking
  changes_summary JSONB, -- Summary of changes in this version
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  -- Audit columns
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_publishing_workflow_document_id ON publishing_workflow(document_id);
CREATE INDEX idx_publishing_workflow_status ON publishing_workflow(status);
CREATE INDEX idx_publishing_workflow_version ON publishing_workflow(document_id, version_number DESC);
CREATE INDEX idx_publishing_workflow_submitted_at ON publishing_workflow(submitted_at DESC);
```

---

### 7. AUDITING & ANALYTICS

#### audit_logs
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  
  -- Action details
  action VARCHAR(255) NOT NULL, -- CREATE, UPDATE, DELETE, PUBLISH, APPROVE, etc.
  resource_type VARCHAR(100) NOT NULL, -- projects, documents, deployments, etc.
  resource_id UUID,
  resource_name VARCHAR(255),
  
  -- Changes
  old_values JSONB, -- Previous state
  new_values JSONB, -- Current state
  changed_fields TEXT[], -- List of fields that changed
  
  -- Context
  ip_address INET,
  user_agent TEXT,
  request_id UUID,
  
  -- Status
  status VARCHAR(50) DEFAULT 'SUCCESS', -- SUCCESS, FAILED, UNAUTHORIZED
  error_message TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes (Critical for compliance queries)
CREATE INDEX idx_audit_logs_team_id ON audit_logs(team_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX idx_audit_logs_resource_id ON audit_logs(resource_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);

-- Retention: 7 years (automatic cleanup job)
CREATE TABLE audit_logs_archive AS TABLE audit_logs WITH NO DATA;
```

#### analytics_events
```sql
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  
  -- Event details
  event_type VARCHAR(100) NOT NULL, -- page_view, button_click, form_submit, etc.
  event_name VARCHAR(255),
  event_category VARCHAR(100),
  
  -- Event data
  properties JSONB DEFAULT '{}', -- Custom event properties
  
  -- Session information
  session_id UUID,
  page_url TEXT,
  referrer_url TEXT,
  
  -- User information
  user_ip INET,
  user_agent TEXT,
  
  -- Metrics
  value DECIMAL(15,2), -- For numeric events (revenue, duration, etc.)
  
  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT now(),
  event_timestamp TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_analytics_events_team_id ON analytics_events(team_id);
CREATE INDEX idx_analytics_events_event_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_events_document_id ON analytics_events(document_id);
CREATE INDEX idx_analytics_events_created_at ON analytics_events(created_at DESC);
CREATE INDEX idx_analytics_events_user_id ON analytics_events(user_id);

-- Partition for performance with large data
CREATE TABLE analytics_events_2026_q2 PARTITION OF analytics_events
  FOR VALUES FROM ('2026-04-01') TO ('2026-07-01');
```

#### outbox_events (Event Sourcing)
```sql
CREATE TABLE outbox_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Event identification
  aggregate_id UUID NOT NULL,
  aggregate_type VARCHAR(100) NOT NULL, -- User, Project, Document, etc.
  event_type VARCHAR(255) NOT NULL, -- user.registered, document.published, etc.
  
  -- Event data
  payload JSONB NOT NULL, -- Complete event payload
  
  -- Correlation
  correlation_id UUID,
  causation_id UUID,
  
  -- Metadata
  tracing_metadata JSONB DEFAULT '{}',
  
  -- Publishing status
  created_at TIMESTAMPTZ DEFAULT now(),
  published_at TIMESTAMPTZ,
  published_by VARCHAR(100),
  
  -- Retention
  -- Events deleted after 90 days (automated cleanup)
  
  UNIQUE(aggregate_id, aggregate_type, event_type, created_at)
);

-- Indexes
CREATE INDEX idx_outbox_events_aggregate_id ON outbox_events(aggregate_id);
CREATE INDEX idx_outbox_events_event_type ON outbox_events(event_type);
CREATE INDEX idx_outbox_events_published_at ON outbox_events(published_at) 
  WHERE published_at IS NULL;
CREATE INDEX idx_outbox_events_created_at ON outbox_events(created_at DESC);
```

---

## COLUMNS SUMMARY

### Required Columns (ALL TABLES)
```
id UUID PRIMARY KEY
created_at TIMESTAMPTZ DEFAULT now()
updated_at TIMESTAMPTZ DEFAULT now()
deleted_at TIMESTAMPTZ (for soft deletes)
created_by UUID (audit trail)
updated_by UUID (audit trail)
```

### Status Columns (by table type)
```
users:               status (ACTIVE, SUSPENDED, DELETED)
teams:               status (ACTIVE, SUSPENDED, DELETED)
projects:            status (SCOPING, ACTIVE, PAUSED, DELIVERED, ARCHIVED)
services:            status (PLANNED, IN_PROGRESS, REVIEW, COMPLETED)
deliverables:        status (PENDING, IN_PROGRESS, SUBMITTED, REVIEW, ACCEPTED, REJECTED)
deployments:         status (PENDING, IN_PROGRESS, SUCCESS, FAILED, ROLLED_BACK)
documents:           status (DRAFT, SCHEDULED, PUBLISHED, ARCHIVED)
translations:        status (DRAFT, TRANSLATED, REVIEWED, PUBLISHED)
testimonials:        status (DRAFT, PUBLISHED, ARCHIVED)
leads:               status (NEW, QUALIFIED, CONTACTED, NURTURING, CONVERTED, LOST)
contact_requests:    status (NEW, ACKNOWLEDGED, ASSIGNED, IN_PROGRESS, RESOLVED, CLOSED)
consultations:       status (SCHEDULED, CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED, NO_SHOW)
publishing_workflow: status (PENDING, IN_REVIEW, APPROVED, REJECTED, PUBLISHED)
```

---

## INDEXES STRATEGY

### Composite Indexes (for common queries)
```sql
-- Find active projects by team and date
CREATE INDEX idx_projects_team_status_date 
ON projects(team_id, status, created_at DESC);

-- Find published documents by team and locale
CREATE INDEX idx_documents_team_status_locale 
ON documents(team_id, status, default_locale) 
WHERE status = 'PUBLISHED';

-- Find active consultations by consultant
CREATE INDEX idx_consultations_consultant_status_date 
ON consultations(consultant_id, status, scheduled_for DESC);

-- Find leads by team and lead score
CREATE INDEX idx_leads_team_score_status 
ON leads(team_id, lead_score DESC, status);
```

### Full-Text Search Indexes
```sql
-- Blog post content search
CREATE INDEX idx_documents_blog_fts 
ON documents USING GIN (to_tsvector('english', content)) 
WHERE document_type = 'blog_post' AND status = 'PUBLISHED';

-- Project name and description search
CREATE INDEX idx_projects_fts 
ON projects USING GIN (to_tsvector('english', name || ' ' || COALESCE(description, '')));
```

### Array & JSONB Indexes
```sql
-- Array indexes for tags
CREATE INDEX idx_documents_tags_gin ON documents USING GIN(tags);
CREATE INDEX idx_testimonials_tags_gin ON testimonials USING GIN(tags);

-- JSONB indexes for metadata
CREATE INDEX idx_projects_metadata_gin ON projects USING GIN(metadata);
CREATE INDEX idx_analytics_properties_gin ON analytics_events USING GIN(properties);
```

---

## CONSTRAINTS STRATEGY

### Foreign Keys (Referential Integrity)
```sql
-- All foreign keys cascade on delete (except critical ones)
-- Critical resources (users, teams) use ON DELETE RESTRICT
-- Child resources (projects, documents) use ON DELETE CASCADE
```

### Unique Constraints (Data Quality)
```sql
-- Email must be unique per user
UNIQUE(email)

-- Team slug must be unique per organization
UNIQUE(slug, organization_id)

-- Document slug must be unique per team per locale
UNIQUE(slug, team_id, default_locale) WHERE deleted_at IS NULL

-- Translation locale per document must be unique
UNIQUE(document_id, locale)

-- Team member must be unique (no duplicates)
UNIQUE(team_id, user_id)
```

### Check Constraints (Business Rules)
```sql
-- Budget cannot be negative
CHECK (budget >= 0)

-- Actual spent cannot exceed budget
CHECK (actual_spent <= budget OR budget IS NULL)

-- Consultation duration must be positive
CHECK (duration_minutes > 0)

-- Testimonial rating between 1-5
CHECK (rating >= 1 AND rating <= 5)

-- Lead score is non-negative
CHECK (lead_score >= 0)
```

---

## INDEXES PRIORITY

### P0 (Create Immediately)
```
idx_users_email
idx_teams_owner_id
idx_projects_team_id
idx_documents_team_id
idx_deployments_service_id
idx_consultations_scheduled_for
idx_audit_logs_team_id
idx_outbox_events_published_at (WHERE published = NULL)
```

### P1 (Create in Week 1)
```
idx_projects_status
idx_documents_status
idx_leads_status
idx_documents_slug_team_locale
idx_services_project_id
idx_deliverables_service_id
```

### P2 (Create based on usage patterns)
```
Composite indexes based on query analysis
Full-text search indexes
JSONB path indexes
```

---

## PARTITIONING STRATEGY

### Time-based Partitioning
```sql
-- Analytics events (by quarter)
CREATE TABLE analytics_events (...)
PARTITION BY RANGE (created_at);

-- Audit logs (by year, optional)
CREATE TABLE audit_logs (...)
PARTITION BY RANGE (created_at);

-- Outbox events (by month, auto-cleanup)
```

### Benefits
- Faster queries for time-range searches
- Efficient archiving of old data
- Parallel processing of events

---

## MIGRATION STRATEGY

### Phase 1: Core Tables (Days 1-5)
```
001_create_extensions.sql
002_create_users_teams.sql
003_create_projects_services.sql
004_create_indexes_phase1.sql
```

### Phase 2: Content Management (Days 6-10)
```
005_create_documents_translations.sql
006_create_media_assets.sql
007_create_seo_metadata.sql
008_create_indexes_phase2.sql
```

### Phase 3: Business Logic (Days 11-15)
```
009_create_leads_contacts_consultations.sql
010_create_publishing_workflow.sql
011_create_indexes_phase3.sql
```

### Phase 4: Auditing & Analytics (Days 16-20)
```
012_create_audit_logs.sql
013_create_analytics_events.sql
014_create_outbox_events.sql
015_create_indexes_phase4.sql
```

### Phase 5: Constraints & Functions (Days 21-25)
```
016_add_constraints.sql
017_create_functions.sql
018_create_views.sql
019_final_indexes.sql
```

---

## FUTURE EXTENSIONS

### 1. Multi-Tenancy Enhancement
```sql
-- Add organization support
ALTER TABLE teams ADD COLUMN organization_id UUID;
ALTER TABLE users ADD COLUMN default_organization_id UUID;

-- Row-level security policies per organization
CREATE POLICY org_isolation ON projects
USING (team_id IN (
  SELECT id FROM teams 
  WHERE organization_id = current_org_id()
));
```

### 2. Internationalization
```sql
-- Add language preferences
ALTER TABLE users ADD COLUMN preferred_languages TEXT[];
ALTER TABLE documents ADD COLUMN language_metadata JSONB;

-- Translation memory for content
CREATE TABLE translation_memory (
  id UUID PRIMARY KEY,
  source_text TEXT,
  translated_text TEXT,
  source_language VARCHAR(10),
  target_language VARCHAR(10),
  metadata JSONB,
  UNIQUE(source_text, source_language, target_language)
);
```

### 3. Advanced Content Features
```sql
-- Collaborative editing
CREATE TABLE document_revisions (
  id UUID PRIMARY KEY,
  document_id UUID REFERENCES documents(id),
  revision_number INTEGER,
  content TEXT,
  author_id UUID REFERENCES users(id),
  change_summary TEXT,
  created_at TIMESTAMPTZ
);

-- Comments and annotations
CREATE TABLE document_comments (
  id UUID PRIMARY KEY,
  document_id UUID REFERENCES documents(id),
  content TEXT,
  author_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ
);
```

### 4. Enhanced Analytics
```sql
-- Custom dimensions
CREATE TABLE analytics_dimensions (
  id UUID PRIMARY KEY,
  team_id UUID REFERENCES teams(id),
  dimension_name VARCHAR(255),
  dimension_values TEXT[],
  created_at TIMESTAMPTZ
);

-- Goal tracking
CREATE TABLE analytics_goals (
  id UUID PRIMARY KEY,
  team_id UUID REFERENCES teams(id),
  goal_name VARCHAR(255),
  goal_metric VARCHAR(100),
  target_value DECIMAL(15,2),
  tracking_properties JSONB
);
```

### 5. Advanced Permissions
```sql
-- Fine-grained access control
CREATE TABLE resource_permissions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  resource_type VARCHAR(100),
  resource_id UUID,
  permission VARCHAR(255),
  granted_by UUID REFERENCES users(id),
  granted_at TIMESTAMPTZ
);

-- Role-based access control
CREATE TABLE custom_roles (
  id UUID PRIMARY KEY,
  team_id UUID REFERENCES teams(id),
  role_name VARCHAR(255),
  permissions TEXT[],
  created_by UUID REFERENCES users(id)
);
```

### 6. Marketplace (Future)
```sql
-- Services listing
CREATE TABLE service_listings (
  id UUID PRIMARY KEY,
  team_id UUID REFERENCES teams(id),
  service_id UUID REFERENCES services(id),
  listing_status VARCHAR(50),
  marketplace_metadata JSONB
);

-- Reviews and ratings
CREATE TABLE service_reviews (
  id UUID PRIMARY KEY,
  service_id UUID REFERENCES services(id),
  reviewer_id UUID REFERENCES users(id),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  created_at TIMESTAMPTZ
);
```

### 7. Workflow Automation
```sql
-- Automation rules
CREATE TABLE automation_rules (
  id UUID PRIMARY KEY,
  team_id UUID REFERENCES teams(id),
  trigger_type VARCHAR(100),
  trigger_conditions JSONB,
  action_type VARCHAR(100),
  action_details JSONB,
  enabled BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES users(id)
);

-- Workflow executions
CREATE TABLE workflow_executions (
  id UUID PRIMARY KEY,
  rule_id UUID REFERENCES automation_rules(id),
  triggered_by_event UUID REFERENCES outbox_events(id),
  status VARCHAR(50),
  result JSONB,
  executed_at TIMESTAMPTZ
);
```

### 8. AI/ML Features
```sql
-- AI model training data
CREATE TABLE ai_training_data (
  id UUID PRIMARY KEY,
  team_id UUID REFERENCES teams(id),
  model_name VARCHAR(255),
  input_data JSONB,
  output_data JSONB,
  confidence DECIMAL(3,2),
  created_at TIMESTAMPTZ
);

-- Model performance tracking
CREATE TABLE model_performance (
  id UUID PRIMARY KEY,
  model_name VARCHAR(255),
  metric_name VARCHAR(255),
  metric_value DECIMAL(15,4),
  recorded_at TIMESTAMPTZ
);
```

---

## PERFORMANCE TUNING

### Connection Pooling
```
min_pool_size: 10
max_pool_size: 50
idle_timeout: 600s
max_lifetime: 1800s
```

### Query Optimization
```
-- Prepare statements for frequently run queries
-- Use explain analyze for performance tuning
-- Monitor slow_log for problem queries
```

### Maintenance
```sql
-- Weekly vacuum
VACUUM ANALYZE;

-- Monthly reindex
REINDEX DATABASE techdon;

-- Quarterly partition maintenance
ALTER TABLE analytics_events DROP PARTITION old_quarter;
```

---

## DATA RETENTION POLICIES

| Table | Retention | Action |
|-------|-----------|--------|
| audit_logs | 7 years | Archive to audit_logs_archive |
| analytics_events | 2 years | Aggregate & archive |
| outbox_events | 90 days | Delete after published |
| deleted records | Permanent | Soft delete (deleted_at) |
| user sessions | 30 days | Delete from sessions table |
| error logs | 90 days | Archive & compress |

---

## Summary

**Total Tables**: 25+  
**Total Columns**: 350+  
**Total Indexes**: 50+  
**Growth Capacity**: 5 years at 10x scale  
**Audit Trail**: Complete (7-year retention)  
**Soft Deletes**: All tables supported  
**Multi-Language**: Full translation support  
**Event Sourcing**: Outbox pattern ready  
**Extensibility**: JSONB metadata on all major tables  

