# Assumptions: Website Analytics

## Environmental
- Vercel serverless runtime passes (request, response) to api/entities.js, which forwards (method, urlObj, body, response) to resource handlers
- ServerResponse does not have a .headers property; headers must be read via response.getHeader(name)
- Supabase website_analytics_events table exists with columns: id, event_type, path, referrer, user_agent, ip_address, session_id, link_target, link_text, metadata, created_at

## Architectural
- Landing page is an SPA with internal currentView state that does NOT match window.location.pathname
- Dashboard date filters use YYYY-MM-DD strings passed as from/to query params
- The analytics endpoint is public (no auth) to allow unauthenticated tracking from the marketing site

## Data-shape
- session_id is a client-generated UUID stored in localStorage with 30-minute TTL
- path for page views should be the browser URL (pathname + hash), not internal router state
- link_click events include link_text (max 200 chars) and link_target (resolved URL or data-track-target)
