# Feature Prompt: Website Analytics Tracking

## Original Request
Implement a lightweight public web analytics system for the TechDon marketing site. Track site visits, page views, link clicks, and form submissions. Display aggregated metrics in a dashboard view.

## Acceptance Criteria
- [ ] Page views are recorded on every landing page navigation
- [ ] Link clicks on tracked elements are recorded
- [ ] Form submissions are recorded
- [ ] Dashboard shows Page Views, Unique Visits, Link Clicks, CTR
- [ ] Daily trend chart and Top Pages / Top Links tables render correctly
- [ ] All data stored in Supabase website_analytics_events table

## Success Signals
- website_analytics_events table has non-zero rows after manual testing
- Dashboard KPI cards show values > 0
- No 500 errors on /api/analytics/events
- Events appear in dashboard within 1 minute of manual interaction
