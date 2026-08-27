# TechDon SEO — Introspective Audit Report
**Date:** 2026-08-19
**Auditor:** Kilo (Automated + Manual)
**Scope:** Full technical SEO, content SEO, performance, Search Console integration, dashboard observability

---

## 1. Current SEO Architecture

TechDon is a **Vite 5 + React 18** multi-page application (NOT Next.js). It uses 6 HTML entry points hydrated by React:

| HTML Shell | Route | Rendering | SEO Treatment |
|------------|-------|-----------|---------------|
| `index.html` | `/` | SPA view-state machine | Crawlable, static meta + JSON-LD |
| `dashboard.html` | `/dashboard/*` | react-router-dom SPA | `noindex` |
| `login.html` | `/dashboard/login` | SPA | `noindex` |
| `careers.html` | `/careers` | SPA | Crawlable, build-time generated |
| `scope.html` | `/scope/:token` | SPA | `noindex` |
| `portal.html` | `/portal/:client` | SPA | `noindex` |

**SEO is achieved through:**
- Static `<head>` in HTML shells
- Build-time HTML generation in `scripts/generate-seo.mjs` (creates static pages under `dist/`)
- `robots.txt` + `sitemap.xml` generated at build
- JSON-LD structured data injected into generated pages
- Vercel routing (`vercel.json`) maps URLs to HTML shells

**Route → Data Source → Rendering Map:**

```
/ (home)
  → Static HTML shell + build-time Organization JSON-LD
  → SPA hydrates client-side for interactivity

/blog
  → Build-time generated static HTML
  → Content from Supabase blog_posts (fetched at build)

/blog/:slug
  → Build-time generated static HTML per post
  → Content from Supabase blog_posts

/work/:id
  → Build-time generated static HTML per portfolio item
  → Content from Supabase portfolio_showcase

/careers
  → Build-time generated static HTML
  → Content from Supabase job_postings

/services/:slug (11 pages)
  → Build-time generated static HTML per service
  → Content from hardcoded SERVICE_LANDING_PAGES array

/dashboard/*
  → noindex SPA
  → Client-side auth only (localStorage)

/portal/:client
  → noindex, mapped to dashboard.html

/scope/:token
  → noindex SPA
```

---

## 2. What Already Exists

### Implemented Correctly
- ✅ Static canonical URLs on all public HTML shells
- ✅ Open Graph + Twitter Card meta on public pages
- ✅ JSON-LD structured data (Organization, WebSite, Service, FAQPage, BlogPosting, BreadcrumbList, JobPosting, CreativeWork)
- ✅ `robots.txt` with sitemap reference and disallowed paths
- ✅ Build-time sitemap generation (`scripts/generate-seo.mjs`)
- ✅ 11 crawlable service landing pages under `/services/`
- ✅ `noindex` on operational routes (dashboard, login, portal, scope)
- ✅ Plausible analytics
- ✅ Geo metadata (KE, Kabete coordinates)
- ✅ Favicon SVG + manifest
- ✅ Image lazy loading + async decoding
- ✅ Cache-Control headers (public pages get `s-maxage=3600`)
- ✅ CSP, HSTS, MIME sniffing, referrer, permissions security headers
- ✅ Build validation (`scripts/build-check.mjs`)

---

## 3. What Is Missing

### Critical Missing
- ❌ **Google Search Console verification** — no verification meta tag, no data retrieval
- ❌ **Secrets scrubbed from git** — GitHub token + Supabase keys in `vercel.json` (committed)
- ❌ **Missing favicon files** — `favicon.png` and `apple-touch-icon.png` referenced but don't exist
- ❌ **No SEO dashboard/observability** — owner cannot see SEO health, trends, or issues
- ❌ **No Search Console data pipeline** — no way to see impressions, clicks, CTR, position
- ❌ **No automated SEO audit** — no way to run repeatable technical SEO checks
- ❌ **`seo_metadata` table was dropped** (migration 025) — no per-page SEO override capability
- ❌ **No `/services` listing page** — only individual service pages exist

### High Impact Missing
- ❌ Inconsistent Twitter card type (`summary` on home, `summary_large_image` on generated pages)
- ❌ No `lastmod` for service pages in sitemap
- ❌ No `max-image-preview:large` in robots.txt
- ❌ No `hreflang` annotations (even if single-language for now)
- ❌ No structured data validation in CI
- ❌ No image optimization pipeline (WebP/AVIF)
- ❌ Dynamic SPA view changes don't update `<head>` meta
- ❌ No broken link detection
- ❌ No duplicate content detection
- ❌ No thin content detection

### Medium Impact Missing
- ❌ No `keywords` meta tag (controversial but sometimes useful)
- ❌ No breadcrumb navigation on home page
- ❌ No related-content links on blog posts
- ❌ No pagination for blog listing
- ❌ No `alternate` link for RSS/Atom feed
- ❌ No `n` seconds to first byte monitoring
- ❌ No Core Web Vitals monitoring
- ❌ No 404 page with helpful navigation
- ❌ No `archive.org` or Wayback Machine integration

---

## 4. What Is Incorrectly Implemented

### Security (P0)
| Issue | Location | Severity |
|-------|----------|----------|
| GitHub PAT committed in `vercel.json` | `vercel.json:6` | Critical |
| Supabase service role key committed in `vercel.json` | `vercel.json:9-10` | Critical |
| Supabase anon key committed in `vercel.json` | `vercel.json:9` | High |

### Metadata
| Issue | Location | Severity |
|-------|----------|----------|
| Twitter card `summary` on home, `summary_large_image` on generated pages | `index.html:23` vs `generate-seo.mjs:118` | Medium |
| Missing `og:image` on service pages | `generate-seo.mjs` (no image param for services) | Medium |
| `max-age=0` in Cache-Control for public pages | `vercel.json:58` | Medium |
| `NODE_ENV=development` hardcoded in `vercel.json` | `vercel.json:5` | High |

### Sitemap
| Issue | Location | Severity |
|-------|----------|----------|
| No `/services` listing page in sitemap | `generate-seo.mjs` | Medium |
| Service pages lack `lastmod` | `generate-seo.mjs:424-428` | Low |
| Portfolio `lastmod` uses `updated_at` which may not exist | `generate-seo.mjs:421` | Low |

### Structured Data
| Issue | Location | Severity |
|-------|----------|----------|
| `BlogPosting` schema missing `publisher` logo | `generate-seo.mjs:214-227` | Low |
| `CreativeWork` schema is vague for portfolio | `generate-seo.mjs:229-238` | Low |
| No `potentialAction` in `WebSite` schema | `generate-seo.mjs:164-173` | Low |

### Internal Linking
| Issue | Location | Severity |
|-------|----------|----------|
| Service pages link to `/services` but no `/services` listing page exists | `generate-seo.mjs:187` | Medium |
| Blog posts link back to `/blog` but no related posts | `generate-seo.mjs:262` | Low |
| Home page has no contextual links to service pages | `src/index.jsx` | Medium |

### Robots
| Issue | Location | Severity |
|-------|----------|----------|
| Missing `max-image-preview:large` | `public/robots.txt` | Low |
| Missing `max-video-preview:-1` | `public/robots.txt` | Low |
| `/portal/:client` routes map to `dashboard.html` (noindex) but Vercel route uses regex that could match `/portal/anything` | `vercel.json:31-33` | Low |

---

## 5. Indexability Risks

| Risk | Severity | Details |
|------|----------|---------|
| Generated pages depend on build-time Supabase fetch | High | If build fails or Supabase is unreachable, pages use empty seed data (no posts, no portfolio, no jobs) |
| SPA client-side views not crawlable | Medium | Landing page view-state changes (blog, project) don't update URL or meta for crawlers |
| `noindex` on dashboard prevents any indexing | Low | Intended behavior, but ensure no internal links point to dashboard from public pages |
| `/portal/:client` catch-all could expose URLs | Low | Currently maps to noindex dashboard, but regex `(/.*)?` is broad |
| No `noindex` on potential error/empty states | Medium | If Supabase returns empty data, generated pages still index but with thin content |

**Indexable:** `/`, `/blog`, `/blog/:slug`, `/work/:id`, `/careers`, `/services/:slug` (11 pages)
**Not indexable intentionally:** `/dashboard/*`, `/dashboard/login`, `/portal/:client`, `/scope/:token`
**Not indexable accidentally:** None identified
**Unknown:** `/check-message` (static HTML, no meta audit performed)

---

## 6. Metadata Problems

### Titles
| Page | Title | Issue |
|------|-------|-------|
| Home | `TechDon Solutions \| Digital Transformation in Kenya` | ✅ Good |
| Blog listing | `Technology Insights for Kenyan Teams \| TechDon` | ✅ Good |
| Blog post | `post.meta_title || post.title` | ⚠️ Falls back to title if meta_title missing |
| Work item | `${item.title} — TechDon Work` | ✅ Good |
| Careers | `Careers at Techdon Solutions \| Kenya Technology Jobs` | ✅ Good |
| Service | `${service.name} \| Techdon Solutions Kenya` | ✅ Good but hardcoded, not from DB |

### Descriptions
| Page | Description | Issue |
|------|-------------|-------|
| Home | Static in HTML | ✅ Good |
| Blog listing | Static in generate-seo.mjs | ✅ Good |
| Blog post | `post.meta_description || post.excerpt || post.title` | ⚠️ Could fall back to title if both missing |
| Work item | `item.description || Case study: ${item.title}` | ⚠️ Generic fallback |
| Service | `service.summary` | ✅ Good |

### Canonicals
| Page | Canonical | Issue |
|------|-----------|-------|
| Home | `https://techdon.co.ke/` | ✅ |
| Blog | `/blog` | ✅ Resolved to absolute |
| Blog post | `/blog/${post.slug}` | ✅ |
| Work | `/work/${item.id}` | ✅ |
| Careers | `/careers` | ✅ |
| Service | `/services/${service.slug}` | ✅ |

### OG/Twitter
| Page | OG Image | Twitter Card | Issue |
|------|----------|--------------|-------|
| Home | Missing | `summary` | ⚠️ No image, small card |
| Blog listing | Missing | `summary_large_image` | ⚠️ No image |
| Blog post | `cover_image_url` | `summary_large_image` | ✅ Conditional |
| Work | `screenshot_urls[0] || company_logo_url` | `summary_large_image` | ✅ Conditional |
| Service | Missing | `summary_large_image` | ⚠️ No image |
| Careers | Missing | `summary_large_image` | ⚠️ No image |

---

## 7. Sitemap / Robots Problems

### Sitemap
| Issue | Severity |
|-------|----------|
| No `/services` listing page | Medium |
| Service pages lack `lastmod` | Low |
| Portfolio `lastmod` may reference non-existent column | Low |
| No `xhtml:link` hreflang | Low |
| Sitemap is static XML, no sitemap index | Low (site is small) |

### Robots.txt
| Issue | Severity |
|-------|----------|
| Missing `max-image-preview:large` | Low |
| Missing `max-video-preview:-1` | Low |
| Missing `Crawl-delay` (not needed for Google, but some bots respect it) | Info |

---

## 8. Canonical Problems

| Issue | Severity | Details |
|-------|----------|---------|
| Home canonical uses absolute URL with trailing slash | Low | Consistent, but `/` vs no `/` could be an issue |
| Generated pages use relative canonical (`/blog`, `/blog/:slug`) | Low | Resolved to absolute by `absolute()` helper |
| No canonical on `/check-message` or other static pages | Unknown | Not audited |
| No `rel="alternate"` for language variants | Info | Single-language site |

---

## 9. Structured Data Problems

| Schema | Status | Issues |
|--------|--------|--------|
| Organization + ProfessionalService | ✅ Valid | Missing `sameAs` for social profiles |
| WebSite | ✅ Valid | Missing `potentialAction` for search |
| Service | ✅ Valid | 3 hardcoded FAQs per service (acceptable) |
| BreadcrumbList | ✅ Valid | Correct hierarchy |
| FAQPage | ✅ Valid | Questions are genuine |
| BlogPosting | ⚠️ Minor | Missing `publisher.logo`, missing `image` when no cover |
| CreativeWork | ⚠️ Minor | Too generic; should be more specific (e.g., `WebSite`, `SoftwareApplication`) |
| JobPosting | ⚠️ Minor | Missing `employmentType`, `datePosted`, `validThrough` |

---

## 10. Semantic HTML Problems

| Issue | Severity | Details |
|-------|----------|---------|
| Generated service pages use `<main class="seo-service">` | ✅ Good | Semantic |
| Blog posts use `<article>` with `<header>` | ✅ Good | |
| Blog listing uses `<ul class="seo-posts">` | ✅ Good | |
| Home page H1 depends on CMS content | ⚠️ Medium | Need to verify actual H1 output |
| No skip-to-content link | Low | Accessibility + SEO |
| Generated pages have single H1 | ✅ Good | |
| No `<nav aria-label="Breadcrumb">` on home | Info | Only on service pages |

---

## 11. Internal Linking Problems

| Issue | Severity | Details |
|-------|----------|---------|
| No `/services` listing page | Medium | Service pages link to non-existent `/services` |
| No related posts on blog detail | Low | Missed opportunity for crawl depth |
| Home page to service pages links unclear | Medium | Need contextual links from homepage |
| No footer sitemap links | Low | |
| Dashboard has no public outbound links | Info | Intended (noindex) |

---

## 12. URL Architecture

| URL Pattern | Status | Issue |
|-------------|--------|-------|
| `/` | ✅ Clean | |
| `/blog` | ✅ Clean | |
| `/blog/:slug` | ✅ Clean | |
| `/work/:id` | ⚠️ Medium | Uses database UUID, not human-readable |
| `/careers` | ✅ Clean | |
| `/services/:slug` | ✅ Clean | |
| `/dashboard/*` | ✅ Clean | noindex |
| `/portal/:client` | ⚠️ Low | Client slug exposed in URL |

---

## 13. Performance / Core Web Vitals Risks

| Issue | Severity | Details |
|-------|----------|---------|
| No image optimization pipeline (WebP/AVIF) | High | Large images hurt LCP |
| Google Fonts loaded via preload + stylesheet swap | Medium | FOIT possible, but mitigated |
| Plausible analytics script deferred | ✅ Good | Non-blocking |
| `max-age=0` on public pages | Medium | No browser caching |
| Source maps disabled in production | ✅ Good | |
| No `font-display: swap` in font loading | Medium | |
| Large `logo_light.png` asset | Medium | Should be optimized |
| SPA bundle size unknown | Medium | Need bundle analysis |

---

## 14. Content / SEO Risks

| Issue | Severity | Details |
|-------|----------|---------|
| Service pages have thin ~200-word content | Medium | May be seen as thin by Google |
| Blog posts may have empty content if DB fetch fails | High | Build falls back to empty seed |
| Portfolio items may have empty description | Medium | Thin content risk |
| No content freshness signals beyond `lastmod` | Low | |
| No author bio/schema for blog posts | Low | |
| No pagination for blog listing | Low | All posts on one page |

---

## 15. Search Console Integration Status

**Status: NOT CONFIGURED**

- No Google Search Console verification meta tag
- No service account / OAuth integration
- No data retrieval pipeline
- No sitemap submission automation
- Owner must manually submit sitemap and verify ownership

---

## 16. Dashboard / SEO Observability Gaps

**Status: NO SEO OBSERVABILITY**

- AnalyticsView tracks website visits (page views, clicks, unique sessions) — NOT SEO metrics
- No SEO health score
- No technical SEO checks
- No indexation monitoring
- No Search Console data display
- No issue tracking
- No trend analysis for SEO
- No alerts for SEO deterioration

---

## 17. Prioritized Recommendations

### P0 — Critical (Fix Immediately)

| # | Issue | Action |
|---|-------|--------|
| 1 | Secrets committed in `vercel.json` | Rotate GitHub PAT + Supabase keys; remove from `vercel.json`; use Vercel env vars only |
| 2 | Missing `favicon.png` and `apple-touch-icon.png` | Generate PNG variants from SVG favicon |
| 3 | No Search Console verification | Add verification capability; document setup steps |
| 4 | `NODE_ENV=development` hardcoded in `vercel.json` | Remove or set to `production` |

### P1 — High Impact

| # | Issue | Action |
|---|-------|--------|
| 5 | No SEO dashboard | Build `SEOView` in dashboard with health score, issues, opportunities, trends |
| 6 | No Search Console data pipeline | Build server-side API routes to fetch GSC data; store in `search_console_snapshots` table |
| 7 | No `/services` listing page | Generate `/services/index.html` with all services listed |
| 8 | Inconsistent Twitter card types | Standardize on `summary_large_image` everywhere |
| 9 | Service pages lack `lastmod` in sitemap | Add `lastmod` from DB or build timestamp |
| 10 | No automated SEO audit runner | Build `scripts/run-seo-audit.mjs` that checks metadata, canonicals, structured data, internal links |
| 11 | `max-age=0` on public pages | Change to `max-age=300` or similar for better caching |
| 12 | No `seo_metadata` table | Create new `seo_page_metrics` and `seo_issues` tables for dashboard data |

### P2 — Improvement

| # | Issue | Action |
|---|-------|--------|
| 13 | No image optimization | Add `sharp`-based build step for WebP/AVIF conversion |
| 14 | Thin service page content | Expand service landing page content to 500+ words |
| 15 | No related posts on blog | Add "Related Articles" section |
| 16 | No breadcrumbs on home | Add breadcrumb nav where appropriate |
| 17 | No RSS/Atom feed | Add `/blog/rss.xml` |
| 18 | No 404 page | Create helpful 404 with navigation |
| 19 | `CreativeWork` schema too generic | Use more specific schema types for portfolio |

### P3 — Long-term

| # | Issue | Action |
|---|-------|--------|
| 20 | No keyword tracking | Build keyword position tracker using Search Console data |
| 21 | No Core Web Vitals monitoring | Add Vercel Analytics or custom monitoring |
| 22 | No competitor tracking | Out of scope for self-hosted system |
| 23 | No A/B testing for meta tags | Build meta A/B framework |

---

## 18. SEO Data Model (Proposed)

```sql
-- SEO page metrics (per crawlable URL)
CREATE TABLE seo_page_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL,
  url_hash VARCHAR(64) NOT NULL UNIQUE,
  title TEXT,
  meta_description TEXT,
  canonical_url TEXT,
  robots_directive VARCHAR(50),
  h1_count INTEGER DEFAULT 0,
  h2_count INTEGER DEFAULT 0,
  word_count INTEGER DEFAULT 0,
  has_og_image BOOLEAN DEFAULT false,
  has_twitter_card BOOLEAN DEFAULT false,
  has_schema BOOLEAN DEFAULT false,
  schema_types TEXT[],
  internal_links_count INTEGER DEFAULT 0,
  external_links_count INTEGER DEFAULT 0,
  images_count INTEGER DEFAULT 0,
  images_missing_alt INTEGER DEFAULT 0,
  load_time_ms INTEGER,
  last_checked TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- SEO issues found during audits
CREATE TABLE seo_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL,
  issue_type VARCHAR(100) NOT NULL,
  severity VARCHAR(20) NOT NULL, -- critical, high, medium, low, info
  title TEXT NOT NULL,
  description TEXT,
  recommendation TEXT,
  status VARCHAR(20) DEFAULT 'open', -- open, fixed, ignored
  first_seen TIMESTAMPTZ DEFAULT now(),
  last_seen TIMESTAMPTZ DEFAULT now(),
  fixed_at TIMESTAMPTZ
);

-- Search Console snapshots (time-series)
CREATE TABLE search_console_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date DATE NOT NULL,
  url TEXT NOT NULL,
  query TEXT,
  country VARCHAR(2),
  device VARCHAR(20),
  clicks INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  ctr DECIMAL(5,4) DEFAULT 0,
  position DECIMAL(4,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(snapshot_date, url, query, country, device)
);

-- SEO health snapshots (daily aggregate)
CREATE TABLE seo_health_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date DATE NOT NULL,
  overall_score INTEGER,
  technical_score INTEGER,
  indexability_score INTEGER,
  content_score INTEGER,
  structured_data_score INTEGER,
  performance_score INTEGER,
  critical_issues INTEGER DEFAULT 0,
  high_issues INTEGER DEFAULT 0,
  medium_issues INTEGER DEFAULT 0,
  low_issues INTEGER DEFAULT 0,
  indexed_pages INTEGER DEFAULT 0,
  total_pages INTEGER DEFAULT 0,
  organic_clicks INTEGER DEFAULT 0,
  organic_impressions INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(snapshot_date)
);
```

---

## 19. BEFORE Summary

| Category | Status | Critical Issues |
|----------|--------|-----------------|
| Indexability | Partial | Build-time dependency, no `/services` listing |
| Metadata | Partial | Inconsistent Twitter cards, missing OG images |
| Sitemap | Partial | Missing `/services` listing, no `lastmod` for services |
| Robots | Good | Missing `max-image-preview` directive |
| Canonical | Good | Consistent absolute URLs |
| Structured Data | Good | Minor schema gaps |
| Semantic HTML | Good | Minor breadcrumb gaps |
| Internal Linking | Partial | Missing `/services` listing, no related posts |
| URL Architecture | Good | UUIDs in `/work/:id` |
| Performance | Partial | No image optimization, `max-age=0` |
| Content | Partial | Thin service pages, empty content risk |
| Search Console | Missing | No integration at all |
| Dashboard Observability | Missing | No SEO health visibility |
| Security | Critical | Secrets committed in git |
