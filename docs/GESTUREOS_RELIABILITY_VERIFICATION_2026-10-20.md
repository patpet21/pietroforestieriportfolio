# GestureOS reliability change and verification

Date: 20 October 2026. Starting commit: `afa20f5` on `main`.
Branch: `fix/gestureos-reliability`. This implements the click-first work from
`GESTUREOS_CODEX_AUDIT_2026-10-20.md`; it does not certify real-camera accuracy.

## Root causes and resulting behavior

- A relaxed index plus another extended finger could fail the old index-only
  predicate. The extracted pose classifier accepts that aim while retaining
  the existing open-palm and explicit V predicates and their priority.
- Release, target acquisition and click dispatch previously depended on several
  early-return branches. A pure `PointerController` now advances before the
  scroll/zoom branches. It freezes the last open aim on the first close sample,
  confirms the pinch once, and requires confirmed release before another click.
  The existing normalized close/open ratios and two-sample confirmation remain.
  There is no dwell click and no independent cooldown that can swallow an edge.
- Starting with a closed pinch, losing the hand, changing mode or route, or
  restarting cannot activate a previously acquired target. Reacquire with an
  open hand before pinching. A frame gap above the existing 320 ms scroll loss
  guard also invalidates the click session. Retention is limited to the existing
  850 ms aim expiry rather than the previous 3-second press allowance.
- Dispatch rechecks the original target at the retained screen coordinate.
  Covers, removed elements, disabled controls/fieldsets, inert ancestors and
  ARIA-disabled controls are rejected. Neighbor probing and the 12 px retained
  target override were removed: aiming between close controls cannot activate a
  different nearby control. This reduces assistance on small targets and needs
  real-camera usability testing. Inputs receive focus; buttons and router links
  retain the existing `.click()` activation contract.
- Per-camera-frame React cursor state is replaced by a DOM ref. Overlay drawing
  is limited to 15 Hz and skipped when the mobile camera preview is compact.
  Video remains mounted and playing. The keyboard experiment is confined to
  the desktop `/gesture-lab` entry and remains mutually exclusive with navigation.
  Legacy Lab is explicitly labeled and its incorrect global bend-to-click copy
  is corrected. Its independent tracker has not been rewritten.
- Mobile/backend constants no longer impose 105/150 ms inference intervals.
  `FrameBudget` uses an exponential average of measured synchronous frame work,
  with a 24 Hz ceiling and a 55% work budget, bounded to 250 ms. These are initial
  resource policies, not measured mobile performance guarantees. Each rAF checks
  for a new decoded video frame; inference is synchronous with no queued work.
  The scheduler backs off when inference/UI work takes longer and can recover.
- Palm scrolling was extracted without changing its smoothing, dead zone, speed
  multiplier, sign, jump handling or per-sample calculation. Sampling cadence can
  affect perceived response, so real-device scroll regression is still required.

## Local diagnostics

Open any route with `?gestureDebug=1`, enable gestures, and expand/collapse the
diagnostic panel as needed. It is absent by default. Collapse it when it covers
a control you want to test; ordinary occlusion rules apply to it too.

The panel updates at 4 Hz. It contains user agent, viewport/DPR, reported video
dimensions/frame rate, GPU/CPU backend, decoded and processed FPS, handedness
categories/scores, detected hands, raw/filtered cursor, pose, pinch ratio and
confirmation state, target rectangle/tag and retention age, suppression reasons,
hand acquisition/loss/switch counts and initialization failure stage/name.
Counters named `suppressed:*` count frames reporting each reason, not human
attempts or independent failed clicks. Successful dispatches have a click counter.

Timing percentiles use the last 240 observations per stage:

| Metric | What is measured |
| --- | --- |
| `inferenceMs` | Synchronous `detectForVideo` duration |
| `poseMs`, `classifyMs`, `hitTestMs`, `overlayMs` | Relevant synchronous work |
| `frameWorkMs`, `processedIntervalMs` | Whole processed cycle and sample interval |
| `pinchConfirmationMs` | First close candidate to confirmed close |
| `sampleToActionMs` | Confirming rAF's inference start to activation dispatch |
| `sampleToNextRafMs` | Same start to following animation callback; paint proxy only |
| `reactCommitMs` | React Profiler render duration, when profiling is available |
| `longTaskMs` | Browser PerformanceObserver long tasks, where supported |

These measurements **exclude camera exposure, capture/transport latency and
physical display scanout**. They are not webcam-to-photon latency. React profiling
is normally disabled by the production React build. No video, screenshots,
element text, typed input, or form values are collected by these diagnostics;
there is no upload/export endpoint. All aggregates live in page memory.

## Automated verification

The repository had no lockfile or test runner. This change adds a pnpm lockfile,
Node's test runner, Playwright and CI. npm was unavailable in the execution
environment; the baseline and final TypeScript/Vite build commands were run
through the installed Node/pnpm runtime instead. Initial dependency download
needed Windows system certificates; TLS verification was retained.

Reproduce with Node 24 and pnpm 11.25.0:

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm test
pnpm exec playwright install chromium
pnpm test:browser
```

- Baseline `tsc && vite build`: passed; existing >500 kB bundle warning.
- Final frozen-lockfile offline install and `pnpm build`: passed, including
  strict TypeScript. The existing bundle-size warning remains.
- Unit suite: 13 tests, including 20 baseline palm traces with multiple sample
  intervals/speeds, reversals and jumps. Golden results were captured by executing
  the starting commit's actual scroll block, not the replacement helper.
- Chromium browser suite: 7 tests. DOM controls, nested SVG, overlays, removed and
  disabled controls/ancestors, adjacent targets, React Router and native input;
  integrated navigator start/stop/restart, relaxed pointing, pinch latch, tracking
  loss, palm transition, mobile compact mode, simulated GPU failure to CPU,
  permission denial, covered targets, route transition and camera interlock.
- The integrated tests feed **synthetic landmarks and canvas video**, replacing
  the model at the browser module boundary. They execute the real React component
  and frame loop but do not run the real model, GPU, camera or phone hardware.

## Required device acceptance before treating navigation as validated

No real desktop webcam, Android phone or iPhone gesture trials were performed.
No before/after physical-device latency, click success rate or thermal/battery
result is claimed. Playwright mobile viewport tests are not phone benchmarks.

| Acceptance run | Procedure / evidence to record | Status |
| --- | --- | --- |
| Desktop click | 30 intentional attempts over 5 controls in each of 2 lighting conditions; successful single clicks, misses, unintended doubles; target >=90% single clicks | Pending |
| Scroll | 20 palm sequences, short/long motions, reversals, release and speed changes; no scroll during aiming/pinch | Numeric traces pass; real camera pending |
| Two real phones | Device/OS/browser/backend/resolution; processed FPS; inference and confirmation p50/p95; externally measured action-to-visible latency; goal >=15 Hz on capable phones | Pending |
| Lifecycle | Portrait/landscape, minimized/expanded preview, background/return, camera denial/retry, GPU/CPU fallback, route change and stop | Synthetic subset passes; physical/browser matrix pending |
| Experimental typing | No characters before calibration; 20 isolated attempts per mode and word/key error rate | Pre-calibration unit test passes; precision trials pending |

## Deferred work and material limits

Inference remains on the main thread. Scheduling reduces duty cycle but cannot
split an individual long inference. MediaPipe's official guide documents this
blocking behavior and recommends workers:
https://developers.google.com/edge/mediapipe/solutions/vision/hand_landmarker/web_js.
Worker frame transport/OffscreenCanvas support, GPU initialization and recovery
need a separate compatibility spike on target Android/iOS browsers before being
made the default. No worker compatibility or latency improvement is claimed.

Handedness is exposed for diagnosis; navigation still uses wrist continuity,
with invalidation on detected jumps. Ambiguous crossings/occlusion are not solved.
Air Typing calibration/hand assignment remains experimental. Camera/model service
unification, initialization timeouts and the historical gesture CSS consolidation
are deferred; the legacy camera is quarantined and the existing event interlock
is tested. Native pointer, touch and keyboard remain available throughout.
