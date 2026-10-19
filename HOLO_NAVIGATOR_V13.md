# Portfolio Holo Navigator — October 2026

## What this prototype does
A persistent opt-in, one-hand, browser-based camera interface across the **entire React portfolio**.

- **Holo Control** is a floating launcher at lower left on every route.
- The user grants camera permission. MediaPipe Hand Landmarker identifies the index fingertip.
- **POINT / CLICK** (default): A floating holographic reticle follows one raised index finger. Hover over a real hyperlink or button for about 1.1 seconds to activate it. A filling ring indicates progress. No pinch or second hand required.
- **SCROLL:** Lift the hand toward the top of the camera framing to scroll up; lower it to scroll down. The center area is neutral. Users switch explicitly between Point and Scroll in the floating controls.
- **OPEN AIR KEYBOARD:** Projects an on-screen QWERTY board. Hold over a key for ~0.85s to type. No pinch. With a text field selected (for example on Contact), keys input text into that field; otherwise a standalone scratchpad captures demo text.
- Optional **PINCH** click mode, pointer-range slider, large active target outline and text status for feedback.
- Camera lifecycle is persistent across route changes: \`<HoloNavigator/>\` is mounted **outside** the keyed \`<main>\`.
- Minimize the controller without losing the webcam stream; stop from the minimized pill or full controller at any time.
- Gesture Lab itself defaults to one-hand dwell typing. Enabling its separate local camera turns off the global camera, and enabling global Holo Control stops Gesture Lab's local camera (avoids two simultaneous inference loops).
- Existing mouse, touch, keyboard, gestures and all other site pages remain usable.

## Safety and truthful behavior
This is a **screen-rendered holographic-style interface**, not a real physical free-space hologram. No browser can project a true volumetric hologram using a normal laptop display.
- Camera never starts automatically.
- Video frames are analyzed on-device, not uploaded by the portfolio.
- MediaPipe SDK/model resources download from external servers; Google SDK may collect non-video usage information (disclosed in the UI).
- The persistent controller never navigates off-site by itself; it clicks only a real hovered link or button and only after an intentional dwell or pinch.
- Browser input field values receive native input events; network submission behavior depends on the site's ordinary forms and validations.
- Disable camera immediately by Stop Camera, the minimized X, or Escape.
- Hover activation is one per target until the target is exited, avoiding accidental repeated clicks.
- Some browser-native controls (selects, downloads, permissions) may still require conventional user interaction.

## Test instructions for browser QA
1. On deployed HTTPS site, click **HOLO CONTROL**, allow camera, keep your index finger visible.
2. Under **POINT / CLICK**, hover over the Home, About, Projects, Services and Contact links. Watch the ring fill, then verify route navigation occurs while the camera remains on.
3. Switch to **SCROLL** and move your hand vertically; verify page scroll with a neutral zone in the center.
4. Switch to **POINT / CLICK**, navigate to Contact, hover over a text field, then use the projected QWERTY keyboard to type. Close it and navigate elsewhere.
5. Navigate to Gesture Lab. Open the same global keyboard and type into local Air Keyboard keys (or close the global camera and use Gesture Lab's own dwell interaction).
6. Minimize and reopen Holo Controls while tracking; stop the camera and verify capture ends.
7. Test denied permission, missing hand, poor light, mobile Safari, Edge and Chrome.
8. Verify \`npm run build\` and the Netlify deploy logs. Static file checks do not guarantee working hardware recognition.

## Source
- \`src/components/HoloNavigator.tsx\`
- \`src/components/GestureLab.tsx\`
- \`src/App.tsx\`
- \`src/styles.css\`

No new npm packages or paid API services beyond the existing MediaPipe dependency.
