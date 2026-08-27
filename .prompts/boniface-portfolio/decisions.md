# Decisions

- **Static site over SSR/SSG framework**: Chose Vite + React static build over Next.js/Nuxt to reduce complexity for a single-page resume. Vercel can host the `dist/` output directly.
- **No backend/database**: Portfolio is pure frontend. No Supabase, no API layer. Content is embedded in the React component.
- **Single-page layout**: Resume content fits naturally on a single scrollable page. Avoided multi-page routing to keep deployment and maintenance simple.
- **Embedded CV data**: Parsed the .docx source and embedded the structured data directly in the component rather than loading from JSON at runtime. Reduces fetch complexity and ensures offline resilience.
- **Minimal design system**: Used plain CSS with a small set of custom properties rather than importing a heavy UI library. Keeps bundle size small and avoids external dependencies.
- **GitHub/Vercel workflow**: Standard Vercel Git integration. User will create repo `thealmikey/boniface-portfolio` (or similar) and connect it to Vercel.

Rejected alternatives:
- PDF generation: Too rigid, not easily updatable, poor mobile experience.
- Multi-section routed app: Unnecessary overhead for a single resume.
- CMS/headless CMS: Overkill for static personal content.
