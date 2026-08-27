# SEO Audit — Key Decisions

## Architecture Decision: Vite SPA, Not Next.js
TechDon uses Vite + React 18 + react-router-dom v7. There is no App Router, no Pages Router, and no `generateMetadata`. SEO is achieved through:
- Build-time static HTML generation (`scripts/generate-seo.mjs`)
- Static `<head>` in HTML entry points
- Vercel routing maps URL patterns to HTML shells

This is a valid SSR-like approach for a static site. No migration to Next.js was performed.

## Decision: Build-Time SEO Generation Over Client-Side
Instead of adding runtime meta tag manipulation (which search bots may not execute), we keep the existing build-time generation approach and extend it. This ensures crawlers see fully-rendered HTML with correct metadata.

## Decision: Server-Side Search Console Integration
Search Console API calls happen exclusively in Vercel serverless functions (`api/`). No OAuth tokens or service account keys are exposed to the browser. The dashboard fetches pre-aggregated data from `/api/admin/seo/*` endpoints.

## Decision: Service Account JWT Using Built-in Node Crypto
Rather than adding the `googleapis` npm package (new dependency), we implement Google service account JWT creation using Node.js built-in `crypto` module. This keeps the dependency footprint unchanged.

## Decision: Extend Existing Analytics, Not Replace
The existing `website_analytics_events` table and `/api/analytics/events` endpoint remain for behavioral analytics. SEO-specific data uses new tables: `seo_page_metrics`, `seo_issues`, `search_console_snapshots`, `seo_health_snapshots`.

## Decision: Reuse Existing UI Primitives
The SEO dashboard uses existing `KpiCard`, `Card`, `EmptyState`, `Button`, `Skeleton` components from `src/components/ui/`. No new design system additions.

## Decision: No New Database Tables for Thin Content
Rather than creating doorway pages or thin content, we audit existing content quality and flag issues. The system reports problems but does not auto-generate content.

## Decision: Hidden H1 for SPA Home Page
Since the home page is a client-side SPA without static H1 in initial HTML, we inject a visually-hidden H1 that gets replaced by React on hydration. This provides a fallback for crawlers that don't execute JavaScript.

## Decision: Audit Runner as Dual-Use
The SEO audit runner exists both as a standalone CLI script (`scripts/run-seo-audit.mjs`) and as an API endpoint (`/api/admin/seo/audit`). This enables both CI integration and manual dashboard-triggered audits.

## Rejected Alternatives
- Next.js migration: too large, breaks working deployment
- Client-side meta manipulation: unreliable for SEO crawlers
- Third-party SEO SaaS: adds dependency/cost, owner wants self-hosted observability
- Automated content generation: violates "do not cheat" principle
- googleapis npm package: unnecessary dependency; built-in crypto suffices for JWT signing
