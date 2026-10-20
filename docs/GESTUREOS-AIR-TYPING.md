# GestureOS Air Type V2 — two-hand, ten-fingertip experimental keyboard

This prototype is integrated with `src/components/HoloNavigator.tsx` and **shares its existing MediaPipe webcam**. No second camera stream or third-party keyboard service is started.

## GitHub research

These references informed our *approach*, not a direct code copy:

1. [Google MediaPipe web Hand Landmarker](https://github.com/google-ai-edge/mediapipe-samples-web) — browser-local hand tracking; 21 joint landmarks per hand; support for two hands.
2. [saumyapathak38/virtual-keyboard-and-mouse](https://github.com/saumyapathak38/virtual-keyboard-and-mouse) — MIT-licensed project demonstrating stabilized hovering, hysteresis and mouse/keyboard mode separation.
3. [Talal-Ahmed01/Virtual-Keyboard-and-Mouse](https://github.com/Talal-Ahmed01/Virtual-Keyboard-and-Mouse) — reference architecture for keyboard overlay, pinch confirmation, key feedback and jitter filtering.
4. [heysudhuu/Hand-Gesture-Controlled-Virtual-Keyboards](https://github.com/heysudhuu/Hand-Gesture-Controlled-Virtual-Keyboards) — educational finger-tap input and key-target visualization.

The code in `AirTypingEngine.ts` and `AirKeyboard.tsx` is written for this React/TypeScript project; Python/PyAutoGUI projects cannot be pasted into a web app.

## V4: hands-free alignment, experimental keyboard
The uncalibrated webcam coordinates cannot be mapped directly onto an on-screen keyboard with physical-keyboard precision. This section is explicitly a **research prototype** and should not be described as reliable ten-finger typing.

- Open **OPEN AIR KEYBOARD** on desktop. Automatic calibration is already armed: there is **no need to click another button** while posing with both hands.
- Show **both hands separated, with relaxed fingers**, in view of the camera. When two hands are reliably detected and their wrists/index fingertips remain steady for approximately 2.4 seconds, the engine captures a home-row reference automatically (ASDF / JKL; and SPACE).
- If the camera only detects one hand, the interface tells you explicitly; automatic two-hand alignment waits for both. A hand shown in the video without a landmark skeleton is not being recognized by the model.
- The button **RESTART AUTO-ALIGN** clears calibration and re-arms the hands-free process; you may press it *before* positioning your hands.
- Input defaults to **PINCH FALLBACK**, a deliberate thumb/index confirmation that is less likely to emit random letters. **FINGER TAP** remains an experimental mode, not the default.
- This approach cannot sense actual touch or accurately infer finger-to-key contact from a single RGB webcam. Do not claim physical-keyboard parity.

## V4 mobile behavior
On a phone, enable gestures once and the panel collapses to a small **GESTURES ON** pill when tracking is ready. The camera preview is an **optional debug view** behind the **CAMERA** button. When camera playback or permissions fail, the expanded panel shows recovery actions. Mobile intentionally uses single-hand palm scrolling and pointing. The ten-finger typing experiment is desktop-only. The camera stream continues while the visual preview is hidden; touching **STOP** releases it.

### Normal site click (different from Air Typing)
Extend your index finger and aim at a button (the TARGET label must show its name), **touch the tip of your thumb to the tip of the index finger once**, then separate them. The status panel shows PINCH OPEN / CLOSING / CLOSED. Bending the index alone no longer clicks, and the old hold-to-click countdown is removed. Palm-open vertical motion retains the existing scroll feature.

## Actual interaction

- Activate Spatial Control, then choose **OPEN AIR KEYBOARD**. Normal navigation and palm scrolling are suspended while the keyboard is open.
- **FINGER TAP** (experimental option): after automatic hands-free alignment, 10 independent calibrated home-row pointers can be tracked. Green dots indicate the left hand, purple dots the right. Settle a fingertip on a key, bend it toward the palm to activate, straighten before another press.
- **PINCH FALLBACK** (default): hover the index fingertip over a key and pinch index + thumb. Use this if finger-curl recognition is unreliable.
- **RANGE**, **sensitivity** and **RESTART AUTO-ALIGN** support recalibration for changing camera framing, hand size, posture and lighting.
- The virtual keys can also be clicked with a physical mouse or touch device.
- If an editable text field was previously focused, typing inserts into that field; otherwise it uses a demo buffer.
- **CLOSE** returns to the normal Spatial Control gestures.

## Real limitations

MediaPipe estimates 3D joints from a monocular RGB camera; it does **not** provide a real physical keyboard touch sensor. Consequently all ten fingers can be *tracked and assigned actions*, but the accuracy and speed of blind ten-finger typing cannot be guaranteed. This is a browser prototype, not a Windows keyboard driver.

The per-finger press detector uses landmark geometry, stable hover, down/up hysteresis and independent re-arming to reduce repeated keystrokes. The pinch fallback is intentionally retained.

## Verification checklist (webcam)

1. Open keyboard, hold both hands visible, and verify hands-free auto alignment completes without clicking anything.
2. Confirm left/right finger dots follow hand motion and each dot is projected into the keyboard area.
3. Keep a fingertip steady over a key; check that key highlights.
4. Bend and release the fingertip; exactly one character should be typed. Try two different fingers.
5. Confirm no letters appear when the hand moves without a deliberate tap.
6. Test BACK, SPACE, ENTER, CLEAR and physical mouse/touch input.
7. Test pinch fallback and recenter/range controls.
8. Close keyboard; confirm original scrolling and click gestures still work.

No claim of webcam-level reliability should be made without manual hardware testing.
