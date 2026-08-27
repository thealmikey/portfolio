# SEO Audit — Assumptions

## Environmental
- Site is deployed on Vercel with `vercel.json` routing
- Production domain: `https://techdon.co.ke`
- Supabase project: `https://ngvikxevpdeqdvmevick.supabase.co`
- Build process: `vite build && node scripts/generate-seo.mjs && node scripts/build-check.mjs`
- `SEO_SITE_URL` and `SEO_SITE_NAME` are set in Vercel environment

## Architectural
- React 18 SPA with view-state machine on landing page
- Dashboard uses react-router-dom with lazy-loaded views
- No SSR/SSG beyond build-time static HTML generation
- API routes are Vercel serverless functions in `api/entities.js`
- Supabase REST API is called directly (no Supabase JS SDK)

## Data Shape Assumptions
- `blog_posts`: slug, title, excerpt, content, cover_image_url, author_name, published_at, meta_title, meta_description, tags, status, deleted_at
- `portfolio_showcase`: id, title, description, project_link, live_link, company_name_override, company_logo_url, screenshot_urls, status, sort_order, deleted_at
- `job_postings`: id, title, department, location, employment_type, summary, status, is_public, sort_order, deleted_at
- `site_branding_settings`: site_title, site_subtitle, team_id
- `services_offered`: title, description, features, sort_order, is_active

## Search Console Assumptions
- Site is verified in Google Search Console (per user statement)
- Owner can create a service account or OAuth credentials in Google Cloud
- Search Console API requires server-side authentication

## Browser/Crawler Assumptions
- Googlebot executes JavaScript but prefers static HTML
- Plausible analytics script does not block rendering
- No cloaking or deceptive practices

## Constraints
- Do not introduce new frameworks
- Do not expose secrets in frontend code
- Do not generate thin/duplicate content
- Do not change established URLs without redirects
- Keep changes atomic and reviewable
