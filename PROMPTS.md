# Codex prompts — phases 0 to 3 (revision 3)

All npm commands run in `studio-next/`. AGENTS.md and BUILD_PLAN.md live at the repository root (`Import Studio/`).

Run one at a time. Send me the report and live link after each, and I'll verify before you run the next.
Commit, tag, deploy and report rules are in AGENTS.md. Each prompt says whether they apply.

---

## P1 — Phase 0: Safety net

```
Phase 0 — safety net. Authorised: commit, tag, push. Not authorised: deploy, or discarding anything.
1. Add the attached AGENTS.md and BUILD_PLAN.md to the repository root (Import Studio/). If AGENTS.md exists, merge it and keep both sets of rules.
2. Inventory the working tree. Classify every modified or untracked entry as one of:
   a) app source/config: commit
   b) generated, ZIPs, ad-hoc screenshots, verification artefacts, caches, .env*: don't commit; add to .gitignore; leave the files in place
   c) unsure: list it and leave it uncommitted
   Show the classification table before committing.
3. In studio-next/: run lint, typecheck and build. If any fails, stop and report. Don't fix code in this phase.
4. Application commit: the (a) entries plus AGENTS.md, BUILD_PLAN.md and .gitignore, as "Phase 0 — Studio demo 9.7 working state". Tag demo-9.7 and push the commit and tag.
5. Compare with production: fetch https://importio-studio-demo.rob123400.chatgpt.site/build, take the app/build/page-*.js name from the HTML, download that file and compute its SHA-256. Compare the name and checksum with the local build output. Record "published" if both match, or "unpublished: local differs from live" if not. A mismatch is information, not a failure: don't stop.
6. Receipt commit (BUILD_PLAN.md only): add a Log row with date, phase 0, tag demo-9.7, short app SHA, published yes/no, the live and local file names + checksums, and notes (including the count of (b) and (c) entries). Commit as "Phase 0 receipt" and push. Don't move the tag.
7. Report: the classification table, lint/typecheck/build results, app SHA, receipt SHA, published result, and the remaining (c) entries for Rob to decide.
```

## P2 — Phase 1: Behaviour tests

```
Phase 1 — behaviour tests. No production app changes. Test tooling, config, scripts and CI are allowed. Authorised: commit, tag, push. No deploy.
1. Playwright setup: fixed clock (e.g. 2026-10-12T10:00:00Z), reduced motion, a fresh browser storage state before every test (signed-in demo user, empty drafts), fixed viewport sizes. Add the `npm run test:e2e` script.
2. Behavioural tests (mock data):
   - Templates end to end: Research (BrightSend input decision; edited schema: remove plan_details, add seat_limit → null "Not stated · unknown"), Extract, Collect, Monitor (creates a monitor), Enrich (sample CSV → run → results).
   - Persona tasks: export CSV/JSON headers equal the field names, no duplicates; Review "Enter value" needs a reason, then Undo restores it; API key revealed once, then masked; monitor with "Price falls below"; invite dialog; dataset detail survives a reload; New workflow with an unsaved run → Discard dialog; sidebar collapse persists.
   - Route checks for /search, /runs, /usage, /developers and /settings: heading, title, no console errors.
3. Visual baselines, kept small: app shell (expanded and collapsed), /build steps 1–4, /review, a dataset detail; each at 1440×900 and 375×812.
4. GitHub Actions workflow (working directory studio-next/) that runs lint, typecheck, build and test:e2e on every push and pull request.
   Design system: [OPTION A] check out the public design-system repo configured by the `DESIGN_SYSTEM_REPOSITORY` repository variable (fallback `hcirbor/importio-design-system`) at a pinned ref into the path the file: dependency expects (`../../Import.io design system` relative to `studio-next/`). No token is required. Don't copy its source into Studio.
5. Commit the Playwright snapshot baselines under the test directory (deliberate baselines are source-controlled).
6. Quality gates (no app code fixes in this phase):
   - TypeScript strict on (if it's already on, confirm).
   - ESLint: @typescript-eslint/no-explicit-any, no-unused-vars, and unused exports (e.g. ts-prune or knip). Add a `npm run lint:quality` script.
   - Record current violations in studio-next/quality-baseline.json (rule, file, count). CI fails on any violation not in the baseline, and when a baseline count goes up.
   - Report the baseline totals per rule, plus the 10 largest components by line count.
Tag tests-baseline. Receipt commit per AGENTS.md (no deploy). Report the test count and CI run link.
```

## P3 — Phase 2: Reactive data boundary

```
Phase 2 — reactive data boundary. Refactor only: no changes to rendered markup or CSS. Import and hook changes inside .tsx files are expected. Authorised: commit, tag, push, deploy the demo.
1. src/lib/data/StudioDataSource.ts:
   - subscribe(listener) => unsubscribe; getSnapshot() => StudioSnapshot (stable references between changes).
   - execution: ExecutionEngine: suggest/plan, validate, start/get/cancel run, subscribeRunEvents(runId, listener), evidence, search, enrichment, monitors.
   - controlPlane: StudioControlPlane: workspaces, members/roles, humanReview, datasets, pipelines, API keys.
   - capabilities: feature id → { status: 'available' | 'preview' | 'coming-soon', note?, limit? }.
   - Every mutation (datasets, review counts, API keys, members, monitors, workspace switch, runs) notifies subscribers.
2. StudioDataProvider + useStudio(selector) built on useSyncExternalStore. Replace the state currently held in src/lib/auth/index.tsx with this provider. Keep the auth/session part working, with the same public hook names where possible.
3. Move all mock/scripted data and logic into src/lib/data/mock/ (mock-execution.ts, mock-control-plane.ts, mock-capabilities.ts where everything is 'available'). Same browser-storage keys and migrations, so existing demo users keep their data.
4. src/lib/data/index.ts returns the mock source. No live code.
5. Components and pages use only useStudio and src/lib/data. Add a lint rule blocking imports of src/lib/data/mock/* from components and app.
6. Generate /build-info.json at build time: { commit (required, full SHA), tag (optional; omit if the build runs before tagging), builtAt, source: "mock" }.
7. All Phase 1 tests pass with 0 visual differences, locally and in CI.
Tag boundary. Deploy the demo and verify per AGENTS.md (the live build-info commit must equal the tagged SHA). Receipt commit afterwards.
```

## P3R — Phase 2R: Code review + cleanup

Run this as two prompts. Send me the review (part A) before running part B.

```
Phase 2R, part A — code review only. No code changes. Authorised: commit the report only.
Review studio-next/src and write studio-next/docs/reviews/2026-10-XX-phase-2.md with:
1. Summary: overall health and the top 5 risks.
2. Findings table: id, severity (high/medium/low), file:line, category, problem, suggested fix, effort (S/M/L). Categories:
   - duplicated logic (the same rule in more than one place)
   - components over ~300 lines or doing more than one job
   - per-template or per-scenario special cases in shared code (if template === 'research' …)
   - prompt/field parsing done by ad-hoc text matching: how robust is it, and where does it break
   - state: anything still bypassing the data layer, unnecessary re-renders, stale-state risks
   - types: any, unsafe casts, optional fields that are really required
   - dead code, unused exports, commented-out blocks
   - accessibility issues visible in code (missing labels, roles, focus handling)
   - anything that would block the live engine in Phase 5
3. Quality-baseline totals, and which findings would reduce them.
4. A proposed cleanup list: high and medium findings that need no visual changes, max ~1 day of work.
Commit the report as "Phase 2R review". No tag.
```

```
Phase 2R, part B — cleanup. Authorised: commit, tag, push, deploy the demo.
Implement only the cleanup items Rob approved from docs/reviews/2026-10-XX-phase-2.md: [PASTE APPROVED IDS].
Rules: no changes to rendered markup or CSS; behaviour identical; 0 visual differences; every Phase 1 test passes.
Lower quality-baseline.json to the new totals (it may only go down).
Update the review file: mark each item fixed (with commit) or deferred (with reason).
Tag cleanup-1. Deploy the demo and verify per AGENTS.md. Receipt commit afterwards.
```

## P4 — Phase 3: Status labels

```
Phase 3 — status labels. Authorised: commit, tag, push, deploy the demo.
1. StatusTag component (shadcn Badge): "Coming soon" (neutral) or "Preview" (blue outline). Hover or focus shows the note.
2. Feature ids and the live notes (used later):
   - browser-actions: "Clicks, forms and logins aren't available yet."
   - take-control: "Taking control of the browser isn't available yet."
   - input-decisions: "Interactive decisions on a page aren't available yet."
   - collect-pagination / large-collect: preview, "Live runs are capped at 3 pages and 10 records."
   - monitor-rules: "Price thresholds aren't available yet. Monitors alert on any change."
   - monitor-channels: "Email and Slack alerts aren't available yet."
   - cost-estimates: "Live cost isn't available yet. Usage is shown instead."
   Status is read only from capabilities.
3. Behaviour:
   - coming-soon: the control stays visible and clickable and opens a popover with the note. Never disabled without an explanation.
   - preview: works within its limit. Over the limit, offer "Run a sample (10 records)".
   - Review plan: flag any plan step that needs a coming-soon feature.
4. NEXT_PUBLIC_SHOW_STATUS_TAGS: default false. Add tests with it set to true, using a test capability map that marks every feature id.
5. With labels off: 0 visual differences.
Tag status-tags. Deploy the demo (labels off) and verify per AGENTS.md. Receipt commit afterwards.
```

---

Phases 4–10 get their prompts once the decisions in BUILD_PLAN.md are made. Phase 4 starts with the access gate, then the allowlisted proxy, then the health and Extract smoke tests. Phase 5R is a human engineering review, not a prompt: book the reviewer before Phase 5 starts.
