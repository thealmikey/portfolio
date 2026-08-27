# Assumptions

- The repository's committed migrations and the active Supabase database may not be at the same version; a database query is required to prove applied state.
- No Supabase CLI or MCP is available, so live database-version verification needs the approved existing migration command or human-provided access.
- Existing `.agent/` files are intended to be the primary operating context for future agents.
