# Studio × CiteOtter — Build plan

Owner: Rob Richardson · Started: 12 Oct 2026 · Revision 4 · Status: Phase 1 complete

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
| 1 | Behaviour tests + quality gates | P2 | Playwright: deterministic clock and storage, reduced motion, reset per test; `npm run test:e2e`; CI. TypeScript strict, `no-explicit-any`, unused-code lint; existing violations listed in a baseline (not fixed yet) | No | `tests-baseline` | Tests pass locally and in CI; no new violations allowed beyond the baseline |
| 2 | Reactive data boundary | P3 | subscribe/getSnapshot source; StudioDataProvider; mock moved behind it; `/build-info.json` (`commit` required, `tag` optional) | Yes, demo | `boundary` | Tests pass with 0 visual differences; live `/build-info.json` commit equals the tagged SHA |
| 2R | **Code review + cleanup** | P3R | Written review (duplication, components over ~300 lines, `any`, dead code, per-template special cases, text-matching logic); then one cleanup with no visual changes; quality baseline reduced | Yes, demo | `cleanup-1` | Review report saved in `docs/reviews/`; baseline violations reduced; 0 visual differences |
| 3 | Status labels | P4 | Capabilities map + StatusTag; off on demo | Yes, demo (labels off) | `status-tags` | 0 differences with labels off; labelled states tested |
| 3B | **Feature parity with the HTML concept** | P4B | Restore features lost in the React port (see "Parity gaps"), on mock data, with status labels where the engine can't support them yet | Yes, demo | `parity-1` | Every gap is either restored or recorded as an intentional removal; journey tests added for each restored flow |
| 4A | **Engine contract** | P4A | Define and test the production engine contract against mock implementations only | No | `engine-contract` | The contract covers phases 7–10 and the production engine path is confirmed before live feature work begins |
| 4 | Protected live host + server | P5 | Server build; access gate; allowlisted `/api/engine/*` proxy; health and Extract smoke test | Yes, live preview | `live-gateway` | Gate blocks anonymous access; `/healthz` OK; bounded Extract smoke test passes (provider path works); no credential reaches the browser |
| 5 | Extract, live | P6 | Live ExecutionEngine for "Extract from a page" | Live preview | `live-extract` | Supported public HTTPS pages run end to end: plan → run → evidence → dataset → export; blocked/unavailable pages show a clear state |
| 5R | **Human engineering review** | — | An engineer reviews the CiteOtter translation, the `/api/engine/*` server, the access gate and credential handling. Findings fixed in a follow-up prompt | No | `live-extract-reviewed` | Named reviewer signs off; blocking findings fixed. No wider access to the live preview before this |
| 6 | Compare + harden | P7 | 10-URL mock-vs-live comparison; error states; usage metrics kept, `cost_usd` unknown | Live preview | `live-extract-hardened` | Blocked, timeout and null cases handled; comparison report written |
| 7 | Research, live | P8 | Multi-domain research | Live preview | `live-research` | As phase 5, for Research |
| 8 | Collect, live | P9 | Collect capped at 3 pages / 10 records, with Preview label | Live preview | `live-collect` | Over-cap plans offer "Run a sample (10 records)" |
| 9 | Enrichment, live | P10 | CSV enrichment through CiteOtter | Live preview | `live-enrich` | Sample CSV enriches live with evidence |
| 10 | Monitors, live | P11 | Page/topic monitors with `on_change`; thresholds and channels labelled Coming soon | Live preview | `live-monitors` | Supported monitors run; unsupported rules are labelled |

Out of scope (engineering's decision): real sign-in, multi-tenant workspaces, billing, persistent control-plane storage.

Expect 13 planned prompts plus roughly one fix-up prompt per phase, so 17–23 in total.

## Parity gaps (HTML concept → React app, audited 12 Oct 2026)

Already carried over under new names: Memories → Runs › Saved · Groups → Runs › Batches · Candidates/Qualifications → Search › Companies · Webhooks → Developers › Webhooks.

| Priority | Missing in React app | In the HTML concept |
|---|---|---|
| High | Pipeline repair flow | `#pipeline-repair`: what changed on the site, before/after evidence, "Approve repair (creates v8)", "Roll back to v7"; surfaced in Needs attention |
| High | Monitor events | "Recent monitor events" on Monitors, plus `#monitor-event` detail: what changed, evidence, "Accept as new baseline", "Mute field for 7 days", "Open run" |
| High | Run controls | "Cancel" on any running run, "Get API code" (run → API/MCP call), "Resolve inputs (n)" summary, domain queue for larger runs |
| Medium | Capture artefacts | "View screenshot", "View HTML snapshot", "Watch recording" on captures (labelled ROADMAP in HTML) |
| Medium | Roadmap labelling | HTML used ROADMAP tags (Configure monitor, screenshots). Dropped in the port; Phase 3 StatusTag replaces it |
| Medium | Enrichment retries | "Retry N failed" rows on partial enrichments |
| Medium | Settings | Notifications and Audit log sections |
| Medium | Qualification follow-through | "Save qualified candidates" → dataset; "Extend search" |
| Decide | Managed handoff | "Hand to Import.io experts" in Review and Datasets (code exists but isn't shown). Restore it, or record it as an intentional removal (no contact-sales CTAs) |
| Low | Quick try | `#try` single-page Extract preview with "Save to workspace" |
| Low | Usage | "Download JSON", usage by pipeline |
| Low | Runs | "Load older" pagination |

## Code quality

- **Gates (from Phase 1):** TypeScript `strict`, ESLint `no-explicit-any` and unused-code rules, all enforced in CI. Existing violations go in a recorded baseline. New code may not add any, and the baseline only shrinks.
- **Checkpoints:** Phase 2R (agent code review + cleanup, after the data boundary) and Phase 5R (human engineering review before the live preview goes wider). A third agent review after Phase 10 is recommended.
- **Review reports** are saved in `studio-next/docs/reviews/YYYY-MM-DD-phase-N.md`.
- **Reviewer for 5R:** ______ (the engineer when back, otherwise whoever covers for him)
- **Carried forward:** `use-workflow-composer.tsx` (600 lines) and re-export shims → Phase 4A; NavTabs design-system component → Phase 3B.

## Design-system dependency (decide before Phase 1)

Studio depends on `"@importio/design-system": "file:../../Import.io design system"`. That folder won't exist in a GitHub Actions checkout, so CI would fail. Choose one option. Never copy its source into Studio.

| Option | Effort | Notes |
|---|---|---|
| **A. CI checks out the design-system repo into the expected path** | Low | Quickest if it has its own private GitHub repo. Needs a read-only deploy key or token as a CI secret. Local setup stays the same. |
| B. Publish to GitHub Packages and pin a version | Medium | Cleanest long-term. Studio depends on `@importio/design-system@x.y.z`, and design-system changes need a version bump. |
| C. Monorepo / workspace | High | Restructures both repos. Not now. |
| D. Vendor a pinned `.tgz` | Low | Works offline, but goes stale silently. Only as a stopgap. |

Recommended: **A now, B later.** The chosen option: **A, using the public repository configured by `DESIGN_SYSTEM_REPOSITORY` (fallback: `hcirbor/importio-design-system`) at a pinned commit; no token required.**

## Decisions needed before Phase 4

- [ ] **Repository home:** move `hcirbor/importio-studio-concept` into the Import.io company GitHub organisation before live integration, or keep it in its current owner through the preview?
- [ ] **Live preview host** that can run a Next.js server **behind an access gate** (VPN, IAP or SSO). The likely host is the same platform as CiteOtter staging, with Studio running as its own service behind staff sign-in. Not chatgpt.site, not public, not CiteOtter's repo.
- [ ] **CiteOtter staging credential** (shared Basic auth), who issues it while the engineer is away, and where it's stored server-side.
- [x] **Amber staging cost:** Amber is an internal model; staging usage needs no sign-off.
- [ ] **Production engine path confirmed before phases 7–10.**
- [ ] **His manager or the CTO is told,** and a company owner is named for any CiteOtter change.
- [ ] **Phase 5R reviewer named** (an engineer who signs off the live integration).

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
| 2026-10-12 | Phase 0 — Safety net | `demo-9.7` | `f9c3512` | Yes — already live | Live/local `page-68238ff096eb45be.js`; SHA-256 `9e0186ee5e8795730215240d22cf6895cbef24a1e2895b6b5ba97be398cedbcf` matched | No Phase 0 deploy. Inventory: 27 application files, 51 ignored local artefacts, 0 unsure. |
| 2026-10-12 | Phase 1 — Behaviour tests + quality gates | `tests-baseline` | `7ab494c` | No — not deployed | CI [38272849924](https://github.com/hcirbor/importio-studio-concept/actions/runs/38272849924) passed on `5709b98` | 34 Playwright tests, including 16 exact visual baselines on macOS and Linux. Quality baseline: 19 tracked issues, 0 regressions. CI follow-ups: `5efddcf`, `5709b98`. |
| 2026-10-12 | Phase 2 — Reactive data boundary | `boundary` | `6478bad` | Yes — demo | Live `/build-info.json`: commit `6478badce081d92925e311815dc5f3beb0d645af`; tag `boundary`; source `mock`; no `dirty` field | Sites version 36. PR [#2](https://github.com/hcirbor/importio-studio-concept/pull/2); CI [38281704727](https://github.com/hcirbor/importio-studio-concept/actions/runs/38281704727) passed. 26 unit and 34 Playwright tests passed with 0 visual differences. |
| 2026-10-12 | Phase 2R — Code review + cleanup, part B1 | `cleanup-1` | `6a7e100` | Yes — demo | Live `/build-info.json`: commit `6a7e1000d681c47cc4f7792d2dd00953a308f9e7`; tag `cleanup-1`; source `mock`; no `dirty` field | Sites version 37. PR [#4](https://github.com/hcirbor/importio-studio-concept/pull/4); CI [38288270768](https://github.com/hcirbor/importio-studio-concept/actions/runs/38288270768) passed. Quality and axe baselines reduced to 0; 48 unit and 66 Playwright tests passed with 0 visual differences. |
| 2026-10-12 | Phase 2R — Code review + cleanup, part B2 | `cleanup-2` | `6f827d4` | Yes — demo | Live `/build-info.json`: commit `6f827d40b6a0aa7b0c1ec372768014c56247e511`; tag `cleanup-2`; source `mock`; no `dirty` field | Sites version 38. PR [#5](https://github.com/hcirbor/importio-studio-concept/pull/5); CI [38293455862](https://github.com/hcirbor/importio-studio-concept/actions/runs/38293455862) passed. Component splits and extended axe coverage landed with 0 visual differences. |
