# AI QA CoPilot

Upload or paste a requirement doc and generate functional, negative, boundary,
and edge-case test cases with Claude. Export the result as CSV, Excel,
Markdown, or JSON.

This is the MVP slice (Phase 1) of a larger planned tool. Later phases:
OpenAPI/Swagger → API scenarios + Playwright/Selenium codegen, JIRA
integration, and CI/CD failure analysis.

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Add your Anthropic API key:

   ```bash
   cp .env.local.example .env.local
   ```

   Then open `.env.local` and set `ANTHROPIC_API_KEY` to your own key from
   https://console.anthropic.com/.

3. The SQLite database is already created at `./dev.db` via Prisma migrations
   (see `prisma/schema.prisma`). If you ever need to reset or recreate it:

   ```bash
   npx prisma migrate dev
   ```

4. Run the dev server:

   ```bash
   npm run dev
   ```

   Open http://localhost:3000.

## How it works

1. Create a project.
2. Paste requirement text or upload a `.txt`/`.md` file.
3. Click "Generate tests" — Claude returns test cases tagged as Functional,
   Negative, Boundary, or Edge Case, each with steps, preconditions, and an
   expected result.
4. Browse the results by category and export to CSV, Excel, Markdown, or
   JSON.

## Architecture notes

- `src/lib/llm/` — LLM provider abstraction. `provider.ts` is a factory keyed
  off the `LLM_PROVIDER` env var; `providers/anthropic.ts` is the only
  implementation so far, using Claude's tool-use feature to get structured
  JSON output (validated with `zod`).
- `src/lib/export/` — CSV/XLSX/Markdown/JSON serializers, used by the
  `/api/runs/[runId]/export/[format]` route.
- `prisma/schema.prisma` — `Project` → `RequirementDoc` → `TestRun` →
  `TestCase`. Every generation attempt is a `TestRun` row, so history is
  browsable per project.
