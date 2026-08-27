# Failure Postmortem: website-analytics

## Root Cause
POST /api/analytics/events crashed with TypeError: Cannot read properties of undefined (reading x-forwarded-for) on every request, so no events were stored in the database. The client used navigator.sendBeacon which masked the 500 error.

## Evidence
- Git commits: 252ca02 (changed 4th arg to response), a5e0493 (added analytics handler reading request.headers)
- Production error: {"success":false,"error":"Internal server error","detail":"Cannot read properties of undefined (reading x-forwarded-for)"}
- Database state: SELECT COUNT(*) FROM website_analytics_events returned 0

## Fix
1. server/resources/analytics.js: Changed request.headers to request?.headers?.[...] to handle ServerResponse safely.
2. src/lib/analytics.js: Replaced sendBeacon with fetch + keepalive: true so failures are visible.
3. src/index.jsx: trackPageView now records window.location.pathname + hash instead of React currentView.
4. server/resources/analytics.js: parseDateRange uses end-of-day UTC for the to bound so today's events are included.
5. src/components/dashboard/views/AnalyticsView.jsx: Added toEndOfDay helper.

## Verification
- [x] Unit tests pass (npx jest api-tests/analytics.test.js)
- [x] Production test of /api/analytics/events no longer returns 500
- [x] Database column verification passed
- [ ] Deploy to production and verify events appear in dashboard after manual navigation
