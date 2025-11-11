# Performance Benchmarks

## Token Gallery Metrics (T021)
### 2025-11-08
- **Scenario**: Storybook `Design System/Tokens/Catalog` story rendered via `TokenGallery`
- **Method**: Automated measurement script (`apps/frontend/scripts/measure-token-gallery.mjs`) launched Storybook on port 6100 and attempted to record navigation + paint metrics through Playwright.
- **Result**: ❌ Blocked – Playwright browsers could not launch inside the prior sandbox (`bootstrap_check_in ... Permission denied (1100)` for Chromium and `SIGABRT` for Firefox). No trustworthy LCP/TTI values were captured.
- **Follow Up**: Re-run metrics outside the sandbox once Storybook + Playwright can execute.

### 2025-11-09
- **Scenario**: Regenerated static Storybook (`pnpm --filter @blockbuilders/frontend... exec cross-env-shell NODE_PATH=$INIT_CWD/node_modules storybook build --config-dir ./.storybook --output-dir ../../artifacts/storybook-static --disable-telemetry`) and served it locally via `python3 -m http.server 6100`.
- **Method**: Playwright Chromium headless run of `apps/frontend/scripts/measure-token-gallery.mjs` against `http://localhost:6100/?path=/story/design-system-tokens-catalog--gallery`, reviewing the emitted navigation + paint metrics.
- **Result**: ✅ PASS – DOM Interactive 124 ms, TTI (load event end) 238 ms, LCP 238 ms, FCP 332 ms. All measurements are comfortably below the ≤2.0 s TTI / ≤2.5 s LCP budgets.
- **Artifacts**: Raw JSON output captured during the run (`/tmp/token_metrics.json`); rerun the script with the same static build when tokens change materially.

## Foundation Components Story Metrics (T041)
### 2025-11-09
- **Scenario**: Storybook static build for `Design System/Components/Foundation` plus render-timing capture for the Playground story.
- **Method**: Rebuilt Storybook via `pnpm --filter @blockbuilders/frontend... exec ... storybook build --config-dir ./.storybook --output-dir ../../artifacts/storybook-static --disable-telemetry` while timing the run (`artifacts/storybook-build.log`). Measured the static `foundation` story by launching Playwright Chromium headless against `artifacts/storybook-static/index.html?path=/story/design-system-components-foundation--playground` and reading `performance.getEntriesByType('navigation')`/`paint` values.
- **Result**: ✅ PASS – Storybook build completed in 19.49 s real time (39.55 s user CPU). DOM Interactive/Complete both landed at 32 ms for the foundation story; FCP/LCP entries are unavailable for the `file://` protocol but the navigation metrics confirm the story renders almost instantly.
- **Artifacts**: `artifacts/storybook-build.log` (build output + duration) and the ad-hoc Playwright console capture from the measurement run (recorded in task notes).
