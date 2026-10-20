# GestureOS Air Type V2 — two-hand, ten-fingertip experimental keyboard

This prototype is integrated with `src/components/HoloNavigator.tsx` and **shares its existing MediaPipe webcam**. No second camera stream or third-party keyboard service is started.

## GitHub research

These references informed our *approach*, not a direct code copy:

1. [Google MediaPipe web Hand Landmarker](https://github.com/google-ai-edge/mediapipe-samples-web) — browser-local hand tracking; 21 joint landmarks per hand; support for two hands.
2. [saumyapathak38/virtual-keyboard-and-mouse](https://github.com/saumyapathak38/virtual-keyboard-and-mouse) — MIT-licensed project demonstrating stabilized hovering, hysteresis and mouse/keyboard mode separation.
3. [Talal-Ahmed01/Virtual-Keyboard-and-Mouse](https://github.com/Talal-Ahmed01/Virtual-Keyboard-and-Mouse) — reference architecture for keyboard overlay, pinch confirmation, key feedback and jitter filtering.
4. [heysudhuu/Hand-Gesture-Controlled-Virtual-Keyboards](https://github.com/heysudhuu/Hand-Gesture-Controlled-Virtual-Keyboards) — educational finger-tap input and key-target visualization.

The code in `AirTypingEngine.ts` and `AirKeyboard.tsx` is written for this React/TypeScript project; Python/PyAutoGUI projects cannot be pasted into a web app.

## V3 calibration (required)
The previous direct mapping of webcam X/Y to the keyboard was inherently unsynchronized: the hand camera frame is not the screen/key plane. This version does **not** type until you align your hands.

1. Start Spatial Control, open AIR KEYBOARD and show **both hands fully in frame**. Their palms and fingertips should not overlap. The webcam status must say **2 HANDS**; a visible hand without a skeleton is not being tracked.
2. Arrange fingers as if hovering over a physical QWERTY keyboard (left A S D F, right J K L ;, thumbs near SPACE), fingers relaxed and extended.
3. Press **ALIGN HANDS** using the mouse. The next MediaPipe frame records each fingertip relative to its own wrist and aligns it to its home key.
4. Move individual fingertips up, down or sideways *relative to your hand* to reach nearby keys. The calibrated reference moves with the wrist, reducing drift from moving your hand slightly.
5. The engine only types if the fingertip settles on one key for 180 ms, then bends, and reopens. Each finger has independent hysteresis. Easy/Balanced/Precise tunes how much bend triggers a press.
6. Use **PINCH FALLBACK** after calibration if finger tap is not reliably detected. Air Keyboard and normal site navigation run in separate interaction modes.
7. Recalibrate if your posture/camera framing changes or a hand is lost for a prolonged time.

If only one hand is detected, the keyboard indicates that. A single camera still cannot guarantee reliable natural 10-finger typing, especially when fingers overlap.

### Normal site click (different from Air Typing)
Extend your index finger and aim at a button (the TARGET label must show its name), **touch the tip of your thumb to the tip of the index finger once**, then separate them. The status panel shows PINCH OPEN / CLOSING / CLOSED. Bending the index alone no longer clicks, and the old hold-to-click countdown is removed. Palm-open vertical motion retains the existing scroll feature.

## Actual interaction

- Activate Spatial Control, then choose **OPEN AIR KEYBOARD**. Normal navigation and palm scrolling are suspended while the keyboard is open.
- **FINGER TAP** (default): after ALIGN HANDS, 10 independent calibrated home-row pointers can be tracked. Green dots indicate the left hand, purple dots the right. Settle a fingertip on a key, bend it toward the palm to activate, straighten before another press.
- **PINCH FALLBACK**: hover the index fingertip over a key and pinch index + thumb. Use this if finger-curl recognition is unreliable.
- **RANGE**, **sensitivity** and **ALIGN HANDS** support recalibration for changing camera framing, hand size, posture and lighting.
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
