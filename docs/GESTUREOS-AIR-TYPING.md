# GestureOS Air Type V2 — two-hand, ten-fingertip experimental keyboard

This prototype is integrated with `src/components/HoloNavigator.tsx` and **shares its existing MediaPipe webcam**. No second camera stream or third-party keyboard service is started.

## GitHub research

These references informed our *approach*, not a direct code copy:

1. [Google MediaPipe web Hand Landmarker](https://github.com/google-ai-edge/mediapipe-samples-web) — browser-local hand tracking; 21 joint landmarks per hand; support for two hands.
2. [saumyapathak38/virtual-keyboard-and-mouse](https://github.com/saumyapathak38/virtual-keyboard-and-mouse) — MIT-licensed project demonstrating stabilized hovering, hysteresis and mouse/keyboard mode separation.
3. [Talal-Ahmed01/Virtual-Keyboard-and-Mouse](https://github.com/Talal-Ahmed01/Virtual-Keyboard-and-Mouse) — reference architecture for keyboard overlay, pinch confirmation, key feedback and jitter filtering.
4. [heysudhuu/Hand-Gesture-Controlled-Virtual-Keyboards](https://github.com/heysudhuu/Hand-Gesture-Controlled-Virtual-Keyboards) — educational finger-tap input and key-target visualization.

The code in `AirTypingEngine.ts` and `AirKeyboard.tsx` is written for this React/TypeScript project; Python/PyAutoGUI projects cannot be pasted into a web app.

## Actual interaction

- Activate Spatial Control, then choose **OPEN AIR KEYBOARD**. Normal navigation and palm scrolling are suspended while the keyboard is open.
- **FINGER TAP** (default): up to 10 fingertips are tracked concurrently across two hands. Green dots indicate the left hand, purple dots the right. Point a fingertip at an on-screen key, keep it there for a moment, then curl/bend that finger toward its palm to type. Straighten/release before the next press.
- **PINCH FALLBACK**: hover the index fingertip over a key and pinch index + thumb. Use this if finger-curl recognition is unreliable.
- **RANGE**, **sensitivity** and **RECENTER** are provided because camera framing, hand size and lighting change the geometry.
- The virtual keys can also be clicked with a physical mouse or touch device.
- If an editable text field was previously focused, typing inserts into that field; otherwise it uses a demo buffer.
- **CLOSE** returns to the normal Spatial Control gestures.

## Real limitations

MediaPipe estimates 3D joints from a monocular RGB camera; it does **not** provide a real physical keyboard touch sensor. Consequently all ten fingers can be *tracked and assigned actions*, but the accuracy and speed of blind ten-finger typing cannot be guaranteed. This is a browser prototype, not a Windows keyboard driver.

The per-finger press detector uses landmark geometry, stable hover, down/up hysteresis and independent re-arming to reduce repeated keystrokes. The pinch fallback is intentionally retained.

## Verification checklist (webcam)

1. Open keyboard and verify one/two-hand counter and up to five/ten dots.
2. Confirm left/right finger dots follow hand motion and each dot is projected into the keyboard area.
3. Keep a fingertip steady over a key; check that key highlights.
4. Bend and release the fingertip; exactly one character should be typed. Try two different fingers.
5. Confirm no letters appear when the hand moves without a deliberate tap.
6. Test BACK, SPACE, ENTER, CLEAR and physical mouse/touch input.
7. Test pinch fallback and recenter/range controls.
8. Close keyboard; confirm original scrolling and click gestures still work.

No claim of webcam-level reliability should be made without manual hardware testing.
