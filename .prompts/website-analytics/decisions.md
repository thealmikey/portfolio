# Design Decisions: Website Analytics

## Architecture
- Client tracking: src/lib/analytics.js provides track(), trackPageView(), trackClick(), trackCta(), trackFormSubmit(), trackSectionView()
- Event transport: Originally navigator.sendBeacon (batched), changed to fetch + keepalive: true for immediate delivery in SPA context
- Backend: Single resource server/resources/analytics.js handling /api/analytics/events (POST) and /api/admin/analytics/summary (GET)
- Database: website_analytics_events table with indexes on event_type, path, session_id, created_at

## Trade-offs Considered
- sendBeacon vs fetch: sendBeacon is ideal for unload events but batches and delays in SPA navigation. fetch + keepalive provides immediate delivery with background persistence
- Session storage: Used localStorage with 30-minute TTL. Alternatives: cookies, server-side session inference from IP+UA
- IP address collection: Extracted from x-forwarded-for header. This requires defensive access because the Vercel serverless runtime passes ServerResponse (not IncomingMessage) as the 4th resource handler argument

## Rejected Alternatives
- Full Google Analytics integration (too heavy, privacy concerns)
- Server-side session tracking via IP+UA fingerprinting (less accurate than client-side UUID)
- Separate tables per event type (unnecessary complexity; single table with index is sufficient)
