# Studio × CiteOtter — Build plan

Owner: Rob Richardson · Started: 12 Oct 2026 · Revision 3 · Status: Phase 0

Repository root: `Import Studio/` · Application root: `studio-next/` (run all npm commands there)

## Goal

Keep the Studio interface as the target design. Power it, one workflow at a time, with CiteOtter's existing extraction engine. The demo site always stays on mock data.

## Ground rules

1. **The demo site never breaks.** `importio-studio-demo.rob123400.chatgpt.site` stays on mock data permanently.
2. **The live preview is internal only and access-gated.** CiteOtter staging is one shared account behind a shared Basic-auth credential.
3. **One phase = one Codex prompt = one PR and one release tag.** The tag sits on the tested application commit. Deploy results go in a separate documentation-only receipt commit. Don't start the next phase until this one is verified.
4. **Rendered markup and CSS don't change during plumbing phases.** Import and hook changes inside `.tsx` files are expected. Visual tests enforce this.
5. **CiteOtter stays read-only through the initial integration.** Any required engine change goes on a separate branch and PR with an identified company owner. Never push to its master branch.
6. **Nothing is hidden because it isn't built.** Use "Coming soon" or "Preview" labels instead.

## Architecture

```
Studio UI (rendered output unchanged)
   │ hooks only: useStudio(selector) via StudioDataProvider (useSyncExternalStore)
   ▼
StudioDataSource
 ├── subscribe(listener) → unsubscribe        (all state is reactive)
 ├── getSnapshot() → StudioSnapshot
 ├── execution     (ExecutionEngine)      mock now → CiteOtter later
 │     plan · validate · runs · run events · evidence · search · enrichment · monitors
 ├── controlPlane  (StudioControlPlane)   mock (browser storage) for now
 │     workspaces · members/roles · humanReview · datasets · pipelines · API keys
 └── capabilities  feature → available | preview | coming-soon

Live preview only:
Studio (Next.js server build, not a static export), behind an access gate (VPN / IAP / SSO)
   └── /api/engine/*  allowlisted routes · origin and CSRF checks · timeouts · size limits
          └── CiteOtter REST (server-held Basic-auth credential)
                 └── Amber model · Import.io MCP · Postgres · optional SearXNG
```

Naming: CiteOtter's `review` is an automated evidence check. Studio's human inbox is `humanReview`. Never mix them.

## CiteOtter limits (design against these)

| Area | Live limit |
|---|---|
| Page access | Public HTTPS, read-only. No clicks, forms, logins or browser profiles. |
| `collect` | ≤ 3 pages, ≤ 10 records |
| `agent` | ≤ 6 pages |
| Other workflows | ≤ 3 pages, ≤ 10 records |
| Monitors | Page and topic monitors; notification `none` or `on_change` only. No price thresholds, no Email/Slack channels. |
| Cost | `cost_usd` is unknown. Measured usage (model requests, tokens where available, page attempts, tool time) is available. |
| Health | `/healthz` covers service and database only. It does not check Amber or Import.io MCP. |
| SDK | The TypeScript SDK is incomplete. Check each endpoint against `internal/service/http.go`. |
| Reachability | Supported public HTTPS pages only. Sites can be blocked or unavailable. |

## Phases

| # | Phase | Prompt | Output | Deploy | Tag | Done when |
|---|---|---|---|---|---|---|
| 0 | Safety net | P1 | Classify the working tree; commit the verified app; record whether it's published | No | `demo-9.7` | Clean status (apart from listed artefacts); published/unpublished recorded with file name and checksum comparison |
| 1 | Behaviour tests | P2 | Playwright: deterministic clock and storage, reduced motion, reset per test; `npm run test:e2e`; CI | No | `tests-baseline` | Tests pass locally and in CI |
| 2 | Reactive data boundary | P3 | subscribe/getSnapshot source; StudioDataProvider; mock moved behind it; `/build-info.json` (`commit` required, `tag` optional) | Yes, demo | `boundary` | Tests pass with 0 visual differences; live `/build-info.json` commit equals the tagged SHA |
| 3 | Status labels | P4 | Capabilities map + StatusTag; off on demo | Yes, demo (labels off) | `status-tags` | 0 differences with labels off; labelled states tested |
| 4 | Protected live host + server | P5 | Server build; access gate; allowlisted `/api/engine/*` proxy; health and Extract smoke test | Yes, live preview | `live-gateway` | Gate blocks anonymous access; `/healthz` OK; bounded Extract smoke test passes (provider path works); no credential reaches the browser |
| 5 | Extract, live | P6 | Live ExecutionEngine for "Extract from a page" | Live preview | `live-extract` | Supported public HTTPS pages run end to end: plan → run → evidence → dataset → export; blocked/unavailable pages show a clear state |
| 6 | Compare + harden | P7 | 10-URL mock-vs-live comparison; error states; usage metrics kept, `cost_usd` unknown | Live preview | `live-extract-hardened` | Blocked, timeout and null cases handled; comparison report written |
| 7 | Research, live | P8 | Multi-domain research | Live preview | `live-research` | As phase 5, for Research |
| 8 | Collect, live | P9 | Collect capped at 3 pages / 10 records, with Preview label | Live preview | `live-collect` | Over-cap plans offer "Run a sample (10 records)" |
| 9 | Enrichment, live | P10 | CSV enrichment through CiteOtter | Live preview | `live-enrich` | Sample CSV enriches live with evidence |
| 10 | Monitors, live | P11 | Page/topic monitors with `on_change`; thresholds and channels labelled Coming soon | Live preview | `live-monitors` | Supported monitors run; unsupported rules are labelled |

Out of scope (engineering's decision): real sign-in, multi-tenant workspaces, billing, persistent control-plane storage.

Expect 11 planned prompts plus roughly one fix-up prompt per phase, so 15–20 in total.

## Design-system dependency (decide before Phase 1)

Studio depends on `"@importio/design-system": "file:../../Import.io design system"`. That folder won't exist in a GitHub Actions checkout, so CI would fail. Choose one option. Never copy its source into Studio.

| Option | Effort | Notes |
|---|---|---|
| **A. CI checks out the design-system repo into the expected path** | Low | Quickest if it has its own private GitHub repo. Needs a read-only deploy key or token as a CI secret. Local setup stays the same. |
| B. Publish to GitHub Packages and pin a version | Medium | Cleanest long-term. Studio depends on `@importio/design-system@x.y.z`, and design-system changes need a version bump. |
| C. Monorepo / workspace | High | Restructures both repos. Not now. |
| D. Vendor a pinned `.tgz` | Low | Works offline, but goes stale silently. Only as a stopgap. |

Recommended: **A now, B later.** The chosen option: ______

## Decisions needed before Phase 4

- [ ] **Live preview host** that can run a Next.js server **behind an access gate** (VPN, IAP or SSO). Not chatgpt.site, not public, not CiteOtter's repo.
- [ ] **CiteOtter staging credential** (shared Basic auth), who issues it while the engineer is away, and where it's stored server-side.
- [ ] **Who pays** for Amber model, Import.io MCP and SearXNG usage on staging.
- [ ] **His manager or the CTO is told,** and a company owner is named for any CiteOtter change.

## Rollback (non-destructive only)

| Situation | Action |
|---|---|
| Demo site broken after a deploy | Redeploy the previous tag; confirm `/build-info.json` `commit` equals that tag's SHA |
| A committed change is wrong | `git revert <commit>` (keeps history; nothing lost) |
| Want to compare against an old version | `git worktree add ../studio-<tag> <tag>` (separate folder; current work untouched) |
| A task fails with uncommitted changes | Stop. Report what's uncommitted. Discard nothing without Rob's explicit approval |
| Live preview broken | Redeploy the previous `live-*` tag. The demo is unaffected |

Never use `git reset --hard`, `git clean -fd`, force-push or branch deletion without explicit approval.

Tags are the restore points. This file is the map, not the backup.

## Log

Rows are added by receipt commits after each phase.

| Date | Phase | Tag | App SHA | Published? | Deploy evidence | Notes |
|---|---|---|---|---|---|---|
| 2026-10-12 | — | — | — | — | — | Demo at 9.7. CiteOtter mapped read-only. Plan revision 3. |
