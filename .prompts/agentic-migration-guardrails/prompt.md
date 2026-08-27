# Agentic Migration Guardrails

## Original request

Assess whether the repository captures dataset version, schema version, and tags needed for safe, easy migration; assess whether the architectural philosophy is encoded in the files agents use; then fill gaps without changing product runtime behaviour.

## Acceptance criteria

- A canonical, documented version and compatibility contract exists for the database, dataset/seeds, API envelope, and generated indexes.
- A controlled tag taxonomy can classify capabilities, datasets, migrations, and risks.
- An agent can determine the safe migration sequence, required checks, and rollback boundary before changing schema or data.
- Existing philosophy and architectural rules are discoverable from the active agent context.
- Documentation has one clear source of truth for each new concern and does not claim unverified versions.

## Success signals

- A subsequent agent can resume migration work without rediscovering version state or inventing tags.
- Schema/data/API compatibility decisions are recorded before implementation.
- The additions are documentation/process only and leave runtime behaviour unchanged.
