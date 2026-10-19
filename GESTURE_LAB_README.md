# Gesture Lab — Webcam Hand Tracking (Prototype)

Date: 2026-10-19
Route: **/gesture-lab**
Source: \`src/components/GestureLab.tsx\`
Styles: last section of \`src/styles.css\`

## Three real interactive modes

1. **Air Keyboard:** Index fingertip positions a floating visual cursor over the virtual keyboard. Pinching thumb and index fires one keyboard action, with hysteresis and a 340 ms cooldown. Manual mouse/touch buttons and editable textarea also work. Copy, Clear, Backspace and Space are functional.
2. **3D Control:** The camera-driven finger location sets 3D object rotation. A pinch toggles size. Pointer drag, arrows, expand and reset work without camera.
3. **WBS Builder:** Move the hand cursor to a work-package card, pinch and drag it, then release near another card to add a dependency. Pointer drag and "click one card, then another" provide fallbacks. A reset action restores the four-node demo.

This is a **local, illustrative prototype** of project workflows, not a deployed production automation or gesture-controlled PM system.

## Technology
- Pinned npm: \`@mediapipe/tasks-vision@1.1.1\`. Lazy imported **after** the user clicks Enable Camera.
- MediaPipe Hand Landmarker (float16), video inference up to roughly 15 frames per second.
- WASM downloaded from \`https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.1/wasm\`.
- Model from \`https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task\`.
- GPU attempt first, automatic CPU fallback.
- React, TypeScript, existing Vite setup, CSS 3D; no Three.js required.
- Session tokens protect against races when Start/Cancel/Stop are clicked while the model loads.
- The camera tracks stop on button press and on React unmount. No video is recorded or transmitted by the portfolio application. Note: Google states its MediaPipe Tasks SDK can send performance/usage metrics to Google; this is disclosed directly in the UI.

## Real-world testing checklist
1. Open \`/gesture-lab\` on the deployed Netlify HTTPS website. Try all three modes **without enabling the camera**.
2. Click **Enable Camera**, grant permissions, wait for model download. Confirm that a mirrored live preview appears. The gesture cursor should move in the stage when one hand is visible.
3. Air Keyboard: align index fingertip over a letter; pinch thumb+index and separate them. Repeat. Test Space/Backspace/Clear/Copy and typing via the physical keyboard.
4. 3D: move the hand to rotate, pinch to expand/shrink, test mouse-drag and reset.
5. WBS: pinch Requirements, move and release near WBS design. Confirm a line appears. Test pointer drag, select-two-cards fallback, Reset WBS.
6. Stop camera: preview and tracking must stop. Repeat while model **is loading** using Cancel Camera Setup.
7. Deny camera permission: readable error appears; manual controls should remain available.
8. Test Safari/Edge/Chrome on Windows/macOS and mobile devices with webcams. Hands should be well lit and visible; gesture precision will vary.
9. Verify the \`npm run build\` output for the latest commit. Confirm model/CDN requests succeed on the real Netlify domain, since they require an internet connection and external servers.

## Deployment constraints
- Build is still configured in \`netlify.toml\`: \`npm run build\` -> \`dist\`, React Router fallback to \`index.html\`.
- No GitHub Actions, paid AI API, personal data storage or server-side camera processing.
- The prototype is intentionally opt-in and has conventional mouse, touch and keyboard fallbacks.
- Actual browser, webcam and Vite build testing must be reported independently; structural checks alone do **not** prove live camera functionality.
