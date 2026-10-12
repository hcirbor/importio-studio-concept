# AGENTS.md — rules for coding agents working on Studio

Read BUILD_PLAN.md first. Work only on what the prompt asks.

## Repository layout

- The Git repository root is `Import Studio/`. The application root is `studio-next/`.
- Run all npm commands in `studio-next/`. Paths in phase prompts that start with `src/`, `tests/` or `public/` are relative to `studio-next/`.
- `AGENTS.md` and `BUILD_PLAN.md` live at the repository root.
- Studio depends on `@importio/design-system` (currently `file:../../Import.io design system`). Never copy its source into Studio. CI resolves it as described in BUILD_PLAN.md ("Design-system dependency").

## Scope rules

- Change only what the prompt lists. No unrequested refactors, renames, copy changes or "improvements".
- No contact-sales CTAs. No surprising UI changes.
- Demo content uses fictional `.example` domains only. Never claim certifications (e.g. SOC 2).
- Never use 'ROADMAP', 'WIP' or 'Beta' as labels.
- Plumbing phases (tests, data boundary, gateway, live engines): no changes to rendered markup or CSS. Import and hook changes inside `.tsx` files are allowed. Visual tests must show 0 differences.
- Components read state only through `src/lib/data` hooks. Never import mock modules directly.
- CiteOtter (`kapetacom/citeotter`) stays read-only through the initial integration. Any required engine change goes on a separate branch and PR with an identified company owner. Never push to its master branch.
- CiteOtter's credential (shared Basic auth) stays on the server, used only by `/api/engine/*`. Never in client code, URLs, logs or `NEXT_PUBLIC_*` variables.
- Naming: Studio's human inbox is `humanReview`. CiteOtter's `review` is an automated evidence check.
- Don't claim CiteOtter capabilities beyond BUILD_PLAN.md's "CiteOtter limits" table. Unfinished features stay visible, with a "Coming soon" or "Preview" StatusTag driven by `capabilities`. Never hide or silently disable them.
- Never commit build output, caches, `.env*`, ZIPs, ad-hoc screenshots or verification artefacts. Add them to `.gitignore` if missing. Deliberate Playwright snapshot baselines and stable test fixtures under the test directories are source-controlled.

## Code quality

- TypeScript `strict` stays on. No `any`, `@ts-ignore` or `eslint-disable` without a one-line justification comment.
- Don't add to the quality baseline (`studio-next/quality-baseline.json`). Only reduce it.
- No per-template or per-scenario special cases in shared code. Use data/config (templates, capabilities) instead.
- Components stay focused. If a component you touch is over ~300 lines, flag it in your report (don't split it unless the prompt says so).
- No dead code, commented-out blocks or unused exports left behind.
- Shared logic lives in `src/lib/`, not copied into components.

## Git safety

- Never run `git reset --hard`, `git clean`, force-push, or delete branches or tags without Rob's explicit approval.
- Roll back committed work with `git revert`. Compare old versions with `git worktree add`.
- If a task fails with uncommitted changes, stop and report. Discard nothing.

## Phase prompts that authorise commit, tag, push or deploy end with

(Only when the prompt says so. Other prompts make changes and report, nothing more.)

One phase = one branch from `main`, one PR, one merge commit and one release tag. The tag sits on the tested merge commit on `main`. Deployment results go in a separate documentation-only receipt commit on `main`.

1. Create the phase branch from the latest `main`.
2. In `studio-next/`: `npm run lint`, `npm run typecheck`, `npm run build` and `npm run test:e2e` all pass (once tests exist).
3. **Application commit** with a message naming the phase (e.g. "Phase 2 — reactive data boundary"). Push the branch and open a PR.
4. Wait for CI to pass. Merge the PR with a merge commit (not squash or rebase), then tag that merge commit on `main` as BUILD_PLAN.md specifies and push the tag. If Rob asks to review the PR first, stop after opening it; merge, tag, deploy and receipt require his later approval.
5. Deploy only if the phase's Deploy column says so:
   - Never deploy a dirty build. `/build-info.json` must not contain `"dirty": true`.
   - **Demo** (`importio-studio-demo.rob123400.chatgpt.site`): static export, mock data, labels off. After publishing, fetch `/build-info.json` and confirm its `commit` equals the tagged commit SHA. Until build-info exists, fetch the live `/build` HTML, take the `app/build/page-*.js` name from it, and compare that file name and its SHA-256 with the local build. If they don't match, the deploy failed: say so and don't report it as done.
   - **Live preview:** deploy behind the access gate. Confirm anonymous requests are blocked, `/healthz` is OK through the proxy, and the bounded Extract smoke test passes.
6. **Receipt commit on `main`** (documentation only, BUILD_PLAN.md): add a Log row with date, phase, tag, short merge SHA, published yes/no, deploy evidence (build-info SHA, or file name + checksum) and notes. Commit as "Phase N receipt" and push. Don't move the tag. The working tree ends clean.
7. Report: files changed, test results, PR and CI, tag, merge SHA, receipt SHA, deploy confirmation, and anything not done.
