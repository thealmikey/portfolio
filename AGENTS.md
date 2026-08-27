# AGENTS.md — Adaptive Agent Runtime

TechDon's agent operating manual.

This is a **runtime**, not a checklist. It behaves like a senior engineer joining an ongoing project: it caches expensive discoveries, never repeats work, escalates verification by risk, knows its limitations, and asks for human help only when necessary.

---

# Product Vision

Boniface Mwangi Portfolio — a clean, modern, professional online resume. Every implementation should move the site toward the polish of Linear, Vercel, GitHub, Notion, Stripe, Raycast, Figma, Clerk, and Supabase Studio. Every decision should increase perceived quality. Visitors should immediately feel the product is modern, premium, and trustworthy.

# Technology Standards

Primary Stack: React · TypeScript · Vite · pnpm · oxlint

Preferred Principles: functional components · strong typing · feature-oriented architecture · static-first · atomic changes · documentation-driven development.

Avoid introducing additional frameworks without justification.

## Feature Prompt Registry

Every significant feature must store its originating prompt and refinement history in .prompts/ before implementation begins. This enables iterative correction when failures are discovered.

**Required artifacts per feature:**
- .prompts/<feature-slug>/prompt.md — Original request, acceptance criteria, and success signals.
- .prompts/<feature-slug>/decisions.md — Key design decisions, trade-offs considered, and rejected alternatives.
- .prompts/<feature-slug>/assumptions.md — Environmental, architectural, and data-shape assumptions.

**Rules:**
1. Create the prompt directory **before** writing implementation code.
2. Update decisions.md whenever an implementation choice is made that deviates from the original prompt.
3. When a failure is diagnosed, append a ailure-postmortem.md entry with root cause, fix, and verification steps.
4. Never delete or overwrite historical prompts. Append-only.
5. On feature completion, reference the prompt path in the commit message.

**Example:** .prompts/website-analytics/prompt.md, .prompts/website-analytics/decisions.md, .prompts/website-analytics/assumptions.md


# Request Fidelity

Do exactly what the user asks. Do not expand scope, do not add "improvements" that were not requested, and do not take initiatives that can affect existing functionality, deployment configuration, security posture, schema, or runtime behavior without explicit confirmation.

If a request is ambiguous, present options with trade-offs and a recommendation, then wait for approval. Never invent business requirements, infer missing database intent, or make unilateral changes.

If a change could surprise the user or alter outcomes they did not ask about, surface it first and ask before implementing.

# Source of Truth Hierarchy

When conflicts are discovered:

1. Capability Charter
2. Business Requirements
3. Accepted ADRs
4. Current Supabase Schema
5. API Contracts
6. Frontend Implementation

Do not assume the UI or the database is correct. Determine the authoritative source.

---

# Three-Layer Architecture

Knowledge is separated so the agent stays fast and never rediscovers stable facts.

| Layer | Location | What lives there | Refresh |
|-------|----------|-----------------|---------|
| **Persistent Runtime** | `.agent/runtime/` | Machine capabilities, installed tools, design tokens, cached discoveries | Rarely (on env change) |
| **Project Intelligence** | `.agent/` + `.agent/reference/` | Active context, architecture, ADRs, design debt, workflow knowledge, extracted detailed rules | As the project evolves |
| **Task Intelligence** | ephemeral | Only the files, components, request, and verification needed for the current task | Per task |

**Load only what the current task requires.** Never load an entire feature when one component changes. Never scan the repository when indexes exist.

---

# Runtime Cache

The agent maintains persistent runtime knowledge in `.agent/runtime/`:

- `runtime.md` — OS, hardware, installed browsers, core CLIs, package-manager, project scripts, common commands.
- `capabilities.md` — capability registry (what tooling is available).
- `design-tokens.md` — design memory (spacing, typography, radius, elevation, motion, colors, variants).

Repository indexes already live in `.agent/cache/` (file/component/route/api/supabase/env).

Additional indexed knowledge:
- `.agent/patterns/` — introspection, capability charters, ADR workflow, design algebra, continuous evolution
- `.agent/indexes/` — machine-readable graphs (components, ports, events, services, primitives, capability-map)
- `.agent/metrics/` — entropy and quality debt tracking
- `.agent/observations/` — timestamped insights that may mature into ADRs

**Refresh the cache only when:**

- cache missing
- user requests a refresh
- a probed command unexpectedly fails
- the environment appears changed
- a dependency-version mismatch is detected

Do NOT rediscover machine facts on every task.

# Capability Registry

Before any capability-dependent step, consult `.agent/runtime/capabilities.md`. Do NOT ask "can I use X?" every session.

Current highlights (verify against the registry file):

- Installed: git, node, docker, Chrome, Edge.
- Missing: Playwright, Chrome DevTools MCP, Supabase MCP, Supabase CLI, Vercel CLI, ImageMagick, rg/fd/sg/jq/yq, and most optional analyzers.
- When a capability is `Missing` and the task needs it, follow the **Human Assistance Protocol** instead of guessing.

# Context Budget

Context is limited. Spend it deliberately.

- Only load files required for the task.
- Never load a whole feature when one component changes.
- Never scan the repository if indexes exist.
- Prefer AST indexes, cached metadata, and targeted searches (Grep / Glob / semantic_search) over recursive reads.
- Use the Grep and Glob tools in place of `rg` / `fd` (not installed here).

---

# Ambiguity Detection

Reject vague requests before writing code.

If a request has multiple plausible interpretations, emit:

```
Ambiguous

Possible interpretations
- ...
- ...
- ...

Recommendation
<single interpretation>

Await confirmation.
```

Example: "Improve dashboard" → possible: spacing / hierarchy / workflow speed / new features / responsive. Recommend one and wait. Do NOT generate speculative code for all interpretations.

# Clarification Protocol

If confidence is below 90%, STOP. Present options with trade-offs and a recommendation, then wait for approval. Never invent business requirements or infer missing database intent.

**Decision Gate Triggers** — pause when: confidence < 95%, business intent unclear, UX has multiple viable paths, schema changes required, permissions unclear, workflow unclear, or architecture implications unknown. Produce: current understanding, options, pros, cons, recommendation, questions.

# Escalation Rules

Not every request deserves the same ceremony. Choose the path by task type:

```
Simple styling / copy
  → Do not produce reports or architecture reviews.
  → Modify. Validate (per matrix). Done.

New component
  → Review design. Implement. Browser check. Done.

New feature
  → Architecture. UX. Implementation. Verification.

Major workflow
  → Product review. Architecture. UX review.
  → Browser testing. Accessibility. Responsive. Design score.
```

# Verification Levels

Escalate verification with risk. Most changes need little.

- **Level 0 — Documentation only.** No verification.
- **Level 1 — Single component.** Lint + typecheck.
- **Level 2 — Feature.** Component testing + browser verification.
- **Level 3 — Workflow.** Multiple pages + responsive + accessibility.
- **Level 4 — Critical.** Payments, authentication, permissions, data migration → full verification.

# Smart Verification Matrix

| Change         | Verification                |
|----------------|-----------------------------|
| Text           | None                        |
| Copy           | None                        |
| CSS spacing    | Screenshot (if visible)     |
| Component      | Browser                     |
| Layout         | Responsive                 |
| Forms          | Browser + validation        |
| Auth           | Full (L4)                  |
| Database       | Integration                 |
| Permissions    | Full (L4)                  |
| Routing        | Navigation                 |
| Animation      | Visual                     |

# UI Review Triggers

Inspect screenshots only when actually needed:

- CSS changed
- Layout changed
- Component added
- Responsive behaviour changed
- User supplies a screenshot
- User reports a visual issue

Otherwise skip visual review. (Playwright/screenshot tooling is `Missing` here — rely on the user for visual confirmation via the Human Assistance Protocol.)

# Design Memory

The agent remembers the design language. Concrete tokens (spacing, typography, radius, elevation, motion, color scales, base element rules, dark mode) are in `.agent/runtime/design-tokens.md`, extracted from `src/design-system/`. Reference the CSS variables; never hardcode raw values. Prefer existing shared primitives (`AppCard`, `AppTable`, `AppDialog`, `AppToolbar`, `EmptyState`, `LoadingState`, `ErrorState`, `StatusBadge`, `PageHeader`, `ActionMenu`).

---

# Design Philosophy & Principles

The UI is a composition of small, reusable, deterministic decisions rather than large visual redesigns. Every improvement should increase consistency, clarity, usability and polish without introducing unnecessary novelty. Design quality emerges from repetition, refinement and composability. Never redesign an entire page to fix a local issue.

## Functional Design Thinking

Treat the interface as immutable data transformed through pure operations. Components compose from smaller primitives. Each task should modify only the smallest component necessary.

## Primitive First

Never invent page-specific solutions. Every visual decision should either:

- reuse an existing primitive
- improve an existing primitive
- create a reusable primitive

Avoid one-off styling.

## One Concern Per Change

Each implementation should have exactly one objective.

Examples:
- ✓ Improve card spacing
- ✓ Standardize border radius
- ✓ Improve button hierarchy
- ✓ Refine typography scale
- ✗ Modernize dashboard
- ✗ Make everything prettier

Large requests should be decomposed.

## Progressive Enhancement

The system should always remain deployable. Prefer:

```
Current
    ↓
Better spacing
    ↓
Better typography
    ↓
Improved cards
    ↓
Improved interactions
    ↓
Improved responsiveness
```

rather than

```
Delete everything
    ↓
Rebuild
```

## Small Reviewable Commits

Every design improvement should be understandable in isolation. If the change description cannot fit in one sentence, it is probably too large.

Examples:
- Normalize spacing tokens.
- Improve sidebar hover states.
- Replace hardcoded colors with semantic tokens.
- Unify button sizing.

## Context Budget

The AI has limited working memory. Never analyze the whole application unless explicitly requested. Instead:

1. Locate affected component.
2. Understand local dependencies.
3. Apply improvement.
4. Verify.
5. Stop.

Avoid discussing unrelated components.

## Local Reasoning

Work outward:

```
Button
    ↓
Button Group
    ↓
Toolbar
    ↓
Header
    ↓
Page
```

Never begin with the page.

## Design Invariants

The following should become increasingly consistent over time:

- Typography
- Spacing
- Corner radius
- Shadow
- Animation
- Elevation
- Border weight
- Color usage
- Icon size
- Interaction feedback

Each change should reduce variance.

## No Duplicate Decisions

If two components solve the same problem differently, the task is:

```
Find canonical version
    ↓
Update others
```

not

```
Invent third version
```

## Tokens Before CSS

Never hardcode visual values when a token should exist.

Instead of `padding: 17px;` prefer `space.md`
Instead of `#1877F2` prefer `primary.500`

## Composition Over Inheritance

Components should compose. Avoid giant configurable components.

Prefer:
```
Card
CardHeader
CardBody
CardFooter
CardActions
```

over:
```
MegaCard
```

## Predictability

Every interaction should behave like similar interactions.

Buttons:
- same hover
- same focus
- same disabled state
- same loading
- same transitions

Users learn consistency.

## Incremental Visual Polish

Visual polish should occur in layers:

1. Layout
2. Spacing
3. Typography
4. Color
5. Motion
6. Micro-interactions

Never begin with animations.

## Refactoring Rule

Whenever modifying UI, ask:

- Can this reduce duplication?
- Can this become reusable?
- Can another screen benefit?

If yes, improve the abstraction first.

## AI Execution Strategy

Observe → Identify affected primitives → Identify reusable patterns → Plan smallest improvement → Implement → Verify visually → Stop. Avoid speculative improvements.

## Stop Conditions

Stop when:

- objective achieved
- consistency improved
- tests pass
- design remains coherent

Do not continue polishing indefinitely. Perfect is not a stopping condition.

## Design Quality Metrics

Optimize for lower visual entropy, higher consistency, fewer unique patterns, stronger hierarchy, clearer affordances, predictable interactions, reusable primitives, semantic tokens over literals, accessibility, responsiveness, and maintainability. Never optimize for novelty.

## Referential Transparency (Design Algebra)

Every design task should have predictable inputs and outputs. Instead of open-ended redesigns, rewrite the task as a bounded transformation with explicit input, transformation, and expected output. This keeps changes understandable and reviewable. Full vocabulary: `.agent/patterns/design-algebra.md`.

# Human Assistance Protocol

Ask for human help only when necessary, and make it actionable:

```
Human Action Required

Reason
<why the agent cannot proceed/verify alone>

Time Required
<estimate>

Instructions
1. ...
2. ...

Resume Point
<what to do once the human responds>
```

# Anti-Perfection Rule

Do not optimize beyond the user's request.

- Small tasks stay small.
- Avoid expanding scope.
- Do not redesign pages unless requested.
- Do not perform architecture reviews for cosmetic changes.
- Do not trigger workflow audits for isolated fixes.
- Respect the requested scope.

---

# Optimization Principle

Optimize for future reasoning, not just current execution.

Traditional engineering optimizes for runtime performance, memory, or correctness.
An AI-native process adds another target: reasoning cost. Every abstraction,
module, interface, event, component, and document should make the next human—
or the next AI—need to understand less before making the next correct change.

# Continuous Introspection

Every task passes through a short internal reasoning cycle before code is modified.

Observe
  → Understand
  → Compare
  → Predict
  → Simplify
  → Implement
  → Reflect

Detailed checklists: `.agent/patterns/introspection.md`.

# Knowledge Crystallization

Working memory is temporary. Repository knowledge is permanent.

After every task, ask: "Did I learn something reusable?"
If yes, crystallize it into an indexed artifact:
- Pattern  → `.agent/patterns/`
- Primitive → `.agent/indexes/primitives.json`
- Decision → `docs/adr/`
- Token    → `.agent/runtime/design-tokens.md`
- Term     → `.agent/glossary.md`

The repository should become more understandable every week.

# Product Ownership

Each capability owns itself.

Before modifying a capability, locate and load its charter:
- VISION.md — North Star
- MISSION.md — Scope and boundaries
- RULES.md — Constraints and invariants
- QUALITY.md — Maturity dimensions and scores
- ADRS/ — Accepted decisions

The repository, not the AI, owns product knowledge.

# Quality Dimensions

Quality is not a project. It is continuous enrichment.

Every capability matures along dimensions:
- SEO, Accessibility, Performance, Security, Analytics, Documentation, Testing

Maturity levels: 0 (none) → 1 (basic) → 2 (structured) → 3 (automated) → 4 (validated)

Whenever touching a capability, check `QUALITY.md` for low-risk adjacent improvements.
Only one atomic improvement per task unless explicitly requested.

## Build Output Structure

This project uses Vite. Build artifacts are emitted to `dist/`, with JavaScript bundles in `dist/assets/*.js`. There is no root-level `app.js` or single entry bundle.

- `scripts/build-check.mjs` validates `dist/assets/*.js` presence, not root files.
- When updating build scripts, verify against Vite's multi-page output: `dist/index.html`, `dist/dashboard.html`, `dist/login.html`, plus `dist/assets/*.js` and `dist/assets/*.css`.

## Universal Resilience — Mandatory Patterns

**No view should completely fail to render.**

1. **Boundary Validation** — Every external data source MUST be validated before rendering.
2. **Graceful Degradation** — On data failure, render a fallback message for that section only.
3. **No Uncaught Render Exceptions** — Components must guard against invalid props/data before rendering.
4. **Error Boundaries** — Wrap independent page sections in error boundaries when applicable.

## Build Output Structure

This project uses Vite. Build artifacts are emitted to `dist/`, with JavaScript bundles in `dist/assets/*.js`. There is no root-level `app.js` or single entry bundle.

- `scripts/build-check.mjs` validates `dist/assets/*.js` presence, not root files.
- Vercel deploys the `dist/` directory directly.

---

# Lessons Learned: Analytics Audit Root Cause Analysis

The following failures were discovered during the Jul 2026 website analytics investigation. They represent systemic anti-patterns that must not recur.

## Commit Hygiene Failures

- Misleading commit messages: Commit a5e0493 was titled fix(portfolio) but introduced the website analytics tracking feature. Commit messages must reflect actual content.
- Mixed concerns in single commits: Portfolio fixes, media upload routing, and analytics tracking were bundled together. Atomic commits must have one objective.

## API Contract Drift

- Silent parameter rename: Commit 252ca02 changed the 4th argument of api/entities.js from request to response. Subsequent commits (a5e0493) introduced resource handlers that assumed the old contract. In Vercel serverless runtime, ServerResponse has no .headers, causing a TypeError on every analytics event.
- No contract validation: Tests mocked a request-like object with .headers, so they passed in isolation but failed in production. Tests must simulate the actual runtime object shape.

## Silent Failures in Client Transport

- sendBeacon mask failures: src/lib/analytics.js used navigator.sendBeacon as the primary transport. sendBeacon does not expose HTTP status codes, so a 500 response was invisible to the user.
- No client-side error reporting: Tracking errors were swallowed with empty catch blocks.

## Frontend Path Fidelity

- Router state vs browser path: trackPageView(currentView) passed React internal router state instead of window.location.pathname + window.location.hash.

## Dashboard Date Truncation

- Timezone-naive date filters: AnalyticsView built YYYY-MM-DD strings that the backend parsed as midnight UTC, excluding today from the default range.

## Repository Contamination

- Debug artifacts committed: site visits commit included check-message-* and run-check.* files that do not belong in the repository.

---

## Contract Stability Rules

1. Document the handler contract: api/entities.js passes (request, response) to resources.route(method, urlObj, body, response). Resource handlers MUST NOT assume the 4th argument is request.
2. Name the 4th argument response consistently: All new resource handlers must use async function route(method, urlObj, body, response).
3. Test with production-shaped mocks: Unit tests must mock the actual object shape passed by the runtime.
4. Never swallow transport errors silently: Client-side tracking must use fetch with keepalive: true as the primary transport.
5. Validate at the fetch boundary: Every API response must be validated with useSafeFetch or equivalent.

---

## Prompt Engineering Refinements

1. Failure mode analysis - List every point in the data pipeline where the feature could silently fail.
2. Runtime contract verification - Identify every interface boundary and verify the implementation matches the actual runtime shape.
3. Transport audit - For any client-side data submission, confirm the chosen transport exposes failure states appropriately.
4. Schema alignment check - Before writing dashboard queries, verify the database column names and types match what the frontend expects.

---

## Post-Mortem Template

When a production failure is diagnosed, append to the feature .prompts/ directory with root cause, evidence, fix, and verification checklist.


# Core Workflow

Apply the minimum ceremony for the task's verification level.

1. **Understand** — current task, feature, migration, affected modules, dependencies.
2. **Impact Analysis** — files to modify, potentially affected files, Supabase impact, risk (Low/Medium/High). For multi-component features, produce the Feature Specification (see workflow reference).
3. **Clarify** — only if confidence < 90% (see Clarification Protocol).
4. **Implement** — smallest logical change; avoid unrelated edits.
5. **Validate** — per Verification Levels / Matrix (lint, typecheck, build, browser, etc.).
6. **Document** — update affected docs per Documentation Requirements.

# Session Exit

Before concluding, update `.agent/active_context.md` with: Task Status (Planned/In Progress/Blocked/Completed), Changes Made (added/modified/removed), Discovered Issues (OBS entries), Next Task (single atomic task), Context Summary (≤15 bullets). Keep it so the next session continues without rescanning.

Before concluding:
1. Update `.agent/metrics/entropy.json` with files touched, abstractions added, duplication removed, dependencies changed.
2. If new reusable knowledge was discovered, crystallize it into the appropriate indexed artifact.

---

# References (loaded on demand)

Load a reference only when its escalation level is reached. Do not load all of them for every task.

| Reference | Load when | Path |
|-----------|-----------|------|
| Introspection | L1+ before any implementation | `.agent/patterns/introspection.md` |
| Capability Charter | L1+ before touching any feature | `<capability>/VISION.md`, `MISSION.md`, `RULES.md`, `QUALITY.md` |
| Capability Ownership | L1+ when capability is unclear | `.agent/patterns/capability-ownership.md` |
| Design Algebra | L1+ when applying visual transformations | `.agent/patterns/design-algebra.md` |
| ADR Workflow | L2+ before architectural changes | `.agent/patterns/adr-workflow.md` |
| Continuous Evolution | L1+ when no feature work is active | `.agent/patterns/continuous-evolution.md` |
| Resilience & Failure Isolation | L2+ or shared layout/route/data | `.agent/reference/resilience.md` |
| Design Standards | L3+ or any UI/layout/component work | `.agent/reference/design-standards.md` |
| Quality Checklist | L2+ before completion | `.agent/reference/quality-checklist.md` |
| UX Patterns (modals, decision tree, designer mode, maturity) | L2+ or CRUD/modal/interaction design | `.agent/reference/ux-patterns.md` |
| Workflow & Process (impact analysis, migrations, docs, git) | L1+ for code/schema/doc changes | `.agent/reference/workflow.md` |

Project Intelligence lives in `.agent/` (active_context, PROJECT_INTROSPECTION, schema-index, glossary, memory, dependency_map) and `docs/`.
