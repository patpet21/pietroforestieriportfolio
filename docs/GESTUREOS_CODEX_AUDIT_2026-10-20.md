# GestureOS — technical audit and Codex implementation brief
**Date:** 20 October 2026  
**Repository:** https://github.com/patpet21/pietroforestieriportfolio  
**Audited baseline (main):** 8f339c7ab796c89b32febafb2e2fdccba8a4be52  
**Audit scope:** global gesture navigator, desktop/mobile camera, pinch-click, hand tracking, Air Keyboard, legacy Gesture Lab, related CSS and React integrations.  
**Audit method:** static inspection of current GitHub files, dependency/config review, source-level trace of state transitions, and official MediaPipe documentation. **No running webcam/device tests, production build, benchmark or deployment verification was performed.** Findings distinguish proven code behavior from likely runtime consequences.

## A. Executive verdict

**Do not add more gestures or overwrite main with another prototype.** The global open-palm scroll is user-confirmed as relatively usable on desktop. Pinch-click is user-confirmed unreliable; mobile is user-confirmed laggy/jittery; air typing is experimental and not useful enough for normal text entry.

The code explains plausible causes:
1. A needlessly restrictive “index pointing” classifier prevents selecting targets naturally.
2. Mobile processing is deliberately capped at ~6.7–9.5 inference cycles/sec before actual MediaPipe/React costs.
3. Synchronous inference, frequent React/UI updates and keyboard layout reads all compete on the main thread.
4. Gesture modes/latches interact through early returns, transient poses and stale targets.
5. Two independent camera/gesture implementations fragment behavior and testing.
6. Webcam fingertip landmarks are not physical key-contact sensors. Treat ten-finger air typing as an R&D demo, not a production feature.

**Scope guard:** Preserve current portfolio design, routes, normal touch/mouse/keyboard and open-palm scrolling. First fix pointer + click; then mobile latency; isolate the keyboard experiment.

## B. Repo architecture

| Location | Responsibility | Risk |
| --- | --- | --- |
| src/components/HoloNavigator.tsx (~709 lines) | Global MediaPipe camera, hand classification, scroll, cursor, pinch-click, zoom, keyboard calibration orchestration, mobile panel | Very high: one monolithic frame handler and coupled modes |
| src/lib/AirTypingEngine.ts (~184 lines) | 10 fingertip projections, home-row calibration, per-finger bend/pinch press | High: empirical mapping and fragile calibration |
| src/components/AirKeyboard.tsx (~76 lines) | Air Typing UI and per-finger markers | Moderate |
| src/components/GestureLab.tsx (~434 lines) | **Separate** camera/tracker, one-index keyboard, 3D scene, WBS | High duplication; different gestures and thresholds |
| src/styles.css (~2,814 lines) | Portfolio plus historical V16/V17 gestural CSS | High cascade complexity |
| src/gestureos.css (~244 lines) | V18–V21 CSS patches, mobile video presentation | High !important accumulation |
| src/airtyping.css (~97 lines) | Keyboard overlay and mobile media queries | Moderate |
| src/App.tsx | Mounts HoloNavigator globally; GestureLab on /gesture-lab | Global camera/UI effects |
| src/main.tsx | Imports styles.css → gestureos.css → airtyping.css | Cascade order matters |
| package.json / tsconfig.json | React 19, Vite 6, TypeScript strict, MediaPipe Tasks Vision 1.1.1 | No test script in package.json |

**Important:** The camera implementations are normally made mutually exclusive using window events pf-holo-enable and pf-lab-camera-start. They are not shown to be simultaneously running; however the gesture recognition code is duplicated and inconsistent.

## C. Findings (prioritized, evidence, mechanism, remedy)

### P0-01 — Index-only classification blocks ordinary pointing [CONFIRMED CODE; HIGH-CONFIDENCE CAUSE]
Source: https://github.com/patpet21/pietroforestieriportfolio/blob/8f339c7ab796c89b32febafb2e2fdccba8a4be52/src/components/HoloNavigator.tsx#L74-L89 and https://github.com/patpet21/pietroforestieriportfolio/blob/8f339c7ab796c89b32febafb2e2fdccba8a4be52/src/components/HoloNavigator.tsx#L544-L567.

getHand() sets pointing to TRUE only if index is extended **AND** middle, ring and pinky all fail the extension test. For a relaxed human pointing gesture, other fingers may be partly open. When pointing is false and there is no prior eligible pressed target, the handler returns early. A visible, correctly tracked hand can therefore fail to aim/click.

**Codex:** redesign pointer intention independently of requiring the other 3 fingers curled. Include an explicit pointer-state machine (IDLE → AIMING → ARMED → PRESSED → RELEASED) and confidence, with flexible postures and temporal hysteresis. The index fingertip alone may aim; pinch should not require re-qualifying the whole hand as “pointing.” Maintain prior target through transitions, but never click a stale/covered element.

### P0-02 — Pinch can be swallowed by early returns, lost targets or latch [CONFIRMED CONTROL FLOW; EXACT FAILURE NEEDS INSTRUMENTATION]
Source: https://github.com/patpet21/pietroforestieriportfolio/blob/8f339c7ab796c89b32febafb2e2fdccba8a4be52/src/components/HoloNavigator.tsx#L439-L526 and https://github.com/patpet21/pietroforestieriportfolio/blob/8f339c7ab796c89b32febafb2e2fdccba8a4be52/src/components/HoloNavigator.tsx#L537-L612.

Sequence: press classification → zoom branch (possible return) → scroll branch (possible return) → filtered pointer candidate → pinch hysteresis (2 model frames) → eligible check (possible return) → target re-selection → latch/cooldown → activation. This is a long and fragile route for a single click. The pinch classifier uses normalized gap thresholds 0.62/0.88 with 2-frame confirmation; target selection can fail before pinchStarted fires. Successful press requires target non-null and 260ms from previous press. Legacy tapRef/swipeRef remain in the component despite the UI now promising pinch-only.

**Codex:** one gesture controller, one pinch edge detector, separate target acquisition from gesture classification. Log the **reason for every suppressed click** (not-pointing, target-missing, gesture-not-confirmed, latch-active, cooldown, mode-switch, tracker-lost). Guarantee exactly one click on pinch close, re-arm only after release, and never synthesize a click for a covered/disabled target.

### P0-03 — Mobile lag is built into the frame cap [CONFIRMED CODE; HIGH-CONFIDENCE CAUSE]
Source: https://github.com/patpet21/pietroforestieriportfolio/blob/8f339c7ab796c89b32febafb2e2fdccba8a4be52/src/components/HoloNavigator.tsx#L275-L325.

Tracking is limited by interval mobile GPU 105ms (~9.5Hz) and mobile CPU 150ms (~6.7Hz); desktop GPU 47ms (~21.3Hz) and CPU 68ms (~14.7Hz). These are **upper limits** on inference frequency, not measured FPS. Actual throughput could be lower. A two-frame pinch takes 210–300ms minimum between samples on mobile, before UI work. User sees jerk/delay.

**Codex:** profile first. Measure real acquisition/inference/render/click latency, then choose an adaptive frame scheduler based on hardware and available budget, with target 15–24 tracked updates/sec on capable mobile devices and graceful fallback on slow ones. Do not merely remove throttling and overload the UI thread.

### P0-04 — MediaPipe inference synchronously blocks the UI [DOCUMENTED API + CONFIRMED CODE]
Source: https://github.com/patpet21/pietroforestieriportfolio/blob/8f339c7ab796c89b32febafb2e2fdccba8a4be52/src/components/HoloNavigator.tsx#L310-L325, https://github.com/patpet21/pietroforestieriportfolio/blob/8f339c7ab796c89b32febafb2e2fdccba8a4be52/src/components/GestureLab.tsx#L198-L215. Official documentation: https://developers.google.com/edge/mediapipe/solutions/vision/hand_landmarker/web_js.

Both trackers call detectForVideo() inside requestAnimationFrame handlers on the main thread. Google's guide explicitly states these methods run synchronously and block the UI thread; it recommends Web Workers to avoid this.

**Codex:** instrument inference duration and long tasks; consider off-main-thread processing (e.g., Worker with a compatible frame transport such as ImageBitmap/OffscreenCanvas after a browser compatibility spike), one-in-flight-frame/backpressure, no backlog; maintain a robust main-thread fallback. Do not claim a Worker is universally supported until tested on target Android/iOS browsers.

### P1-05 — Too many DOM/React/layout operations per camera frame [CONFIRMED]
Source: https://github.com/patpet21/pietroforestieriportfolio/blob/8f339c7ab796c89b32febafb2e2fdccba8a4be52/src/components/HoloNavigator.tsx#L21-L38, https://github.com/patpet21/pietroforestieriportfolio/blob/8f339c7ab796c89b32febafb2e2fdccba8a4be52/src/components/HoloNavigator.tsx#L345-L422, https://github.com/patpet21/pietroforestieriportfolio/blob/8f339c7ab796c89b32febafb2e2fdccba8a4be52/src/components/HoloNavigator.tsx#L537-L612.

Each processed frame may draw the skeletal canvas, set cursor/pinch/status React state, probe DOM elements, read target/client bounding rectangles, and (in Air Typing mode) collect button geometries and update all fingertip React nodes. Some state updates are de-duplicated/batched, but there is no performance budget/trace proving this workload is cheap on mobile.

**Codex:** instrument each stage (video sample, MediaPipe, classify, target hit-test, DOM changes, React updates, overlay draw), update fast-moving cursor/markers via refs or rAF-driven canvas/CSS transforms, emit React state only when necessary. Cache target rectangles until layout changes; use layout-sensitive queries sparingly.

### P1-06 — Coordinate mapping and hit testing are empirical [CONFIRMED]
Source: https://github.com/patpet21/pietroforestieriportfolio/blob/8f339c7ab796c89b32febafb2e2fdccba8a4be52/src/components/HoloNavigator.tsx#L49-L73, https://github.com/patpet21/pietroforestieriportfolio/blob/8f339c7ab796c89b32febafb2e2fdccba8a4be52/src/components/HoloNavigator.tsx#L537-L585.

Pointer uses x=(1-index.x-.5)*1.48+.5 and y=(index.y-.5)*1.48+.5, clamps to the viewport, smooths using 3 hand-tuned alphas, then tests document.elementFromPoint plus 18–30px neighbors. This is not per-camera/per-user screen calibration. Nearby fallback can highlight the wrong control, especially among tightly spaced links. Overlays can occlude buttons. Actual click invokes target.click(), which is not equivalent to a full native pointerdown/up sequence.

**Codex:** show raw vs filtered cursor, target bounding box and nearest-target choice in DEBUG mode. Test links/buttons, form fields, cards and modal overlays. Separate aim, hover and activation; tune with recorded landmarks rather than arbitrary threshold changes.

### P1-07 — Control-hand identity can jump [CONFIRMED]
Source: https://github.com/patpet21/pietroforestieriportfolio/blob/8f339c7ab796c89b32febafb2e2fdccba8a4be52/src/components/HoloNavigator.tsx#L424-L438, https://github.com/patpet21/pietroforestieriportfolio/blob/8f339c7ab796c89b32febafb2e2fdccba8a4be52/src/lib/AirTypingEngine.ts#L48-L66.

Main navigator selects by proximity to previous wrist, or first pointing hand. AirTypingEngine uses mirrored screen X-order and when only one hand is seen, chooses nearest calibrated wrist. None of the consumers uses the model's handedness metadata; order/occlusion changes can flip identities. The user previously observed two hands visually but only one tracked.

**Codex:** read model handednesses plus track continuity with confidence; expose hand-detected vs hand-visible as different notions. Do not infer right/left solely from screen-side when users cross hands. One active hand for navigation is fine; desktop typing can display both but must not assume they are always both detected.

### P1-08 — Duplicate tracking stacks and inconsistent instructions [CONFIRMED]
Source: https://github.com/patpet21/pietroforestieriportfolio/blob/8f339c7ab796c89b32febafb2e2fdccba8a4be52/src/components/GestureLab.tsx#L59-L80, https://github.com/patpet21/pietroforestieriportfolio/blob/8f339c7ab796c89b32febafb2e2fdccba8a4be52/src/components/GestureLab.tsx#L163-L205, https://github.com/patpet21/pietroforestieriportfolio/blob/8f339c7ab796c89b32febafb2e2fdccba8a4be52/src/components/GestureLab.tsx#L235-L310, https://github.com/patpet21/pietroforestieriportfolio/blob/8f339c7ab796c89b32febafb2e2fdccba8a4be52/src/components/HoloNavigator.tsx#L188-L212.

GestureLab still has its own camera/tracker and single-index tap/pinch/1sec dwell; global navigator has independent MediaPipe initialization and a separate 10-finger keyboard. Lab instructional copy even says "bend index to click" while normal navigation is pinch-only. The event interlock prevents competing streams but does not make interactions consistent.

**Codex:** choose one reusable camera + landmark service and one click/gesture engine, then make views consume it. If migrating legacy Lab is risky, leave it separately labeled LEGACY EXPERIMENT and remove contradictory global instructions. Avoid two active inference sessions.

### P1-09 — Ten-finger keyboard is not physically grounded [CONFIRMED DESIGN LIMITATION]
Source: https://github.com/patpet21/pietroforestieriportfolio/blob/8f339c7ab796c89b32febafb2e2fdccba8a4be52/src/lib/AirTypingEngine.ts#L26-L37, https://github.com/patpet21/pietroforestieriportfolio/blob/8f339c7ab796c89b32febafb2e2fdccba8a4be52/src/lib/AirTypingEngine.ts#L67-L98, https://github.com/patpet21/pietroforestieriportfolio/blob/8f339c7ab796c89b32febafb2e2fdccba8a4be52/src/lib/AirTypingEngine.ts#L99-L181.

Air Typing calibration anchors 10 fingertip offsets to home keys (ASDF/JKL; and SPACE), then infers keys from wrist-relative webcam displacements and "press" from distance ratios. This is not genuine fingertip contact detection or a 3D calibrated keyboard plane. Accuracy cannot be assumed. Automatic two-hand alignment requires ~2.4s of relative stillness and stable simultaneous recognition; occlusion or motion restarts the clock. Finger identity and key projection may drift.

**Codex:** keep desktop keyboard LAB-only with explicit experimental badge. Prefer reliable mouse/touch/native keyboard for actual text input, optionally voice dictation as a separate opt-in accessibility path. The user explicitly rejected calibration requiring a button while both hands are occupied (recently replaced with automatic alignment). Do not promise normal 10-finger typing from a single webcam.

### P1-10 — Mobile camera UX has successive conflicting CSS patches [CONFIRMED]
Source: https://github.com/patpet21/pietroforestieriportfolio/blob/8f339c7ab796c89b32febafb2e2fdccba8a4be52/src/styles.css#L2726-L2812, https://github.com/patpet21/pietroforestieriportfolio/blob/8f339c7ab796c89b32febafb2e2fdccba8a4be52/src/gestureos.css#L1-L244, https://github.com/patpet21/pietroforestieriportfolio/blob/8f339c7ab796c89b32febafb2e2fdccba8a4be52/src/airtyping.css#L1-L97.

Historical V16/V17 styles, V18/V19/V20/V21 gesture patches and numerous !important overrides target the same controls. Mobile “compact” mode keeps a ~2px video mounted while hiding the full preview, then exposes it through CAMERA button. Good intent, but test browser decoding when minimized, while switching apps, rotating screen and returning from background. Desktop and mobile CSS media queries override each other in several layers.

**Codex:** consolidate styles after functionality is verified; use a single explicit mobile/desktop state layout instead of another CSS override. On mobile, camera feed should be **diagnostics optional**, not occupy the website.

### P2-11 — No objective performance or functional test harness found in project setup [CONFIRMED FOR PACKAGE; REPO-WIDE ABSENCE NOT ESTABLISHED]
Source: https://github.com/patpet21/pietroforestieriportfolio/blob/8f339c7ab796c89b32febafb2e2fdccba8a4be52/package.json#L1-L25 and https://github.com/patpet21/pietroforestieriportfolio/blob/8f339c7ab796c89b32febafb2e2fdccba8a4be52/tsconfig.json#L1-L1.

package.json exposes dev/build/preview but no test script; TypeScript is strict. We did not inspect the entire repository tree for other tests. This audit did not run npm build or webcam tests; GitHub combined status check supplied no reported statuses for the audited commit.

**Codex:** baseline npm ci / npm run build; introduce deterministic classifier/state-machine unit tests and Playwright tests for DOM target acquisition/navigation. Add temporary visual/metric diagnostics for real-camera manual tests.

### P2-12 — MediaPipe resources depend on CDN/model endpoints [CONFIRMED]
Source: https://github.com/patpet21/pietroforestieriportfolio/blob/8f339c7ab796c89b32febafb2e2fdccba8a4be52/src/components/HoloNavigator.tsx#L18-L19 and https://github.com/patpet21/pietroforestieriportfolio/blob/8f339c7ab796c89b32febafb2e2fdccba8a4be52/src/components/HoloNavigator.tsx#L275-L307.

A versioned jsDelivr WASM runtime and Google-hosted hand model are requested at runtime. Camera permission can succeed but tracking initialization can fail; the current UI now distinguishes camera-only preview from model ready. Check network errors, CSP, mobile connectivity, model initialization time and GPU→CPU fallback.

**Codex:** record structured initialization failures and sensible timeouts; retain stop/retry/recover behavior; avoid silently saying gestures enabled when only video works.

## D. Instrumentation Codex must add before altering thresholds

Implement an opt-in developer diagnostic panel/query flag (e.g., ?gestureDebug=1), NOT enabled by default:

- Browser, device model/OS, viewport DPR, reported camera resolution, MediaPipe backend GPU/CPU.
- Decode/input frames/sec, inference frames/sec, infer p50/p95 milliseconds, render p50/p95, long main-thread tasks if supported.
- Detected hand count, handedness and confidence when available, hand loss/reacquisition count.
- Cursor raw x/y vs filtered x/y, current pointer confidence and pose.
- Pinch gap/normalized ratio, close/open hysteresis state, consecutive confirmation frames, and clicked event.
- Current target label/DOM tag, hit test method (direct or nearest fallback), target retention age, reason click was suppressed.
- Render UI counters at **2–4 Hz maximum**; do not flood console or re-render React for every diagnostic value.
- Never log/upload actual video, contact form content, typed text or personal imagery; metrics may remain session-local and removable.

## E. Work plan for Codex (in this order; separate commits/PR)

### Phase 0 — Preserve baseline (no behavior changes)
1. Create feature branch fix/gestureos-reliability; do **not** force-push or directly alter main.
2. Run npm ci and npm run build; report errors honestly.
3. Document present behavior on desktop Chrome and Android Chrome (prefer actual device; Playwright emulation is not a substitute for hardware timing).
4. Add local-only debug panel + metric instrumentation; include test captures with redacted/no camera images.

### Phase 1 — Click only (highest priority)
1. Extract getHand/pose/gesture lifecycle into pure functions with typed frame inputs and deterministic timestamps.
2. Relax overconstrained pointing, separate aim and pinch, ensure independent press close/open hysteresis.
3. Separate TARGET_ACQUIRED from GESTURE_CONFIRMED and ACTION_DISPATCHED; ensure **one gesture = one click**.
4. Test buttons, internal React Router links, nested SVG/icon targets, disabled buttons, text inputs, overlaid cards, scrolling and route transitions.
5. No 1.25 sec dwell; preserve palm scroll exactly as working today unless there is a failing measured case.

### Phase 2 — Mobile responsiveness
1. Benchmark video frame rate, model inference and UI update costs.
2. Optimize the main-thread path and drawing; experiment with a Worker where feasible, no unbounded frame queues.
3. Build a measured adaptive scheduler. Mobile should feel continuous, not limited to 6–10 gesture updates/sec on capable devices.
4. Ensure hidden preview does not stall video decoding; keep optional CAMERA debug UI.
5. Test portrait/landscape, camera permission denial, app switching, CPU fallback, low-end Android, iOS Safari if available.

### Phase 3 — Architecture cleanup
1. Share camera/model lifecycle and gesture machine between HoloNavigator and GestureLab (or explicitly quarantine legacy demo).
2. Consolidate gesture-only CSS (currently styles.css + gestureos.css + airtyping.css).
3. Make mobile and desktop defaults explicit, keep web accessibility/touch and normal keyboard.
4. Add tests and CI for click lifecycle; optimize on measured evidence.

### Phase 4 — Air Typing research only after core stable
1. Keep experimental entry separate and opt-in.
2. Test ten-fingertip tracking/hand handedness independently of keypress recognition.
3. Evaluate calibrate/auto-calibrate with repeated trials and quantify word error rate; if it does not beat conventional input, do not ship as a core feature.
4. Consider a realistic speech-to-text input mode rather than claiming physical keyboard equivalence.

## F. Acceptance tests (must be demonstrated, not asserted)

**Desktop click:** at least 30 intentional attempts across 5 different controls in each of 2 lighting scenarios. Desired ≥90% successful single clicks, no unintended double-clicks, no navigation on failed/unintended gestures. Record gesture-to-action median/p95 latency. User may refine these thresholds.

**Scroll regression:** 20 long/short palm gestures, direction reversals and palm release; no spurious scroll while aiming or pinching; keep speed setting functional.

**Mobile responsiveness:** report measured processed FPS and p50/p95 gesture-to-visible-effect on two real phones if possible. Target ≥15 processed updates/sec on capable phones and perceived latency below ~150ms median for simple actions. On slower devices, degrade honestly without locking main thread. These are goals, not current measured performance.

**Air Typing experiment:** no character before calibration, no accidental character while hovering; display count of genuinely detected hands. 20 isolated key attempts in each input mode, note error rate. If objective criteria fail, leave it labeled EXPERIMENTAL.

**Lifecycle:** start, stop, restart, route transition, app background/return, denied permission, GPU failure→CPU fallback, lost hand, overlay expansion/collapse. Camera tracks must stop when disabled.

**Accessibility:** all gestures are optional; browser's ordinary pointer/touch/keyboard pathways must remain available. Do not hijack accessibility or trap focus in overlay.

## G. CODEX MASTER PROMPT (copy into Codex)

You are working in the repository patpet21/pietroforestieriportfolio. Read docs/GESTUREOS_CODEX_AUDIT_2026-10-20.md first. The user reports: open-palm scroll works adequately on PC, but thumb-index pinch-click does not reliably activate page controls; mobile is delayed/jerky; ten-finger air typing is not reliably usable. Do not add more gestures. First identify exact click suppression paths with instrumentation and deterministic tests, then fix pointer/click state isolation, then profile and improve mobile performance. Work on a branch and avoid pushing to main without verification. Preserve all existing portfolio pages, scroll behavior, and native mouse/touch/keyboard use. Separate Gesture Lab's legacy camera implementation from the global navigator or refactor safely. Do not claim physical ten-finger typing accuracy from monocular webcam landmarks. Deliver: code + tests + measured before/after desktop and mobile results (or explicitly state if no real device was available), a short explanation of root causes, and a pull request for review.

## H. Useful references

- Google MediaPipe Hand Landmarker for Web (sync inference + worker recommendation): https://developers.google.com/edge/mediapipe/solutions/vision/hand_landmarker/web_js
- Hand Landmarker API and result contract: https://developers.google.com/edge/api/mediapipe/js/tasks-vision.handlandmarker
- MediaPipe source including handedness results: https://github.com/google-ai-edge/mediapipe/blob/master/mediapipe/tasks/web/vision/hand_landmarker/hand_landmarker.ts
- Repo current source files linked throughout this report.

**End of audit.** The findings describe code observable at the audited baseline, not experimentally demonstrated performance. Codex should challenge hypotheses through instrumented tests instead of continuing threshold guessing.
