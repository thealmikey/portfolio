# Decisions

## 2026-07-25 - Establish a documentation-first migration guardrail system

- Use `.agent/` as the operational source of truth for agent workflows, rather than modifying application code or deployment configuration.
- Record known versions as **observed** values and label unknown values explicitly; do not manufacture a dataset version from migration filenames.
- Keep the tag taxonomy centralized in a single registry and require lowercase `domain:value` tags to make search and filtering deterministic.
- Require explicit forward compatibility, rollback, and verification fields for every future migration plan.

## Rejected alternatives

- Adding an application dependency or runtime migration framework: out of scope for a documentation/agentic-safety request.
- Rewriting historical migrations to retrofit metadata: risks changing proven history and does not improve future safety enough to justify it.
