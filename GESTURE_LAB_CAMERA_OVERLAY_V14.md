# Gesture Lab V14 — Camera-keyboard synchronization

2026-10-19 — Overlay change requested after a live webcam usability test.

## UX changes
- Air Keyboard displays one unified camera stage: mirrored live webcam video fills the large interaction area.
- Holographic QWERTY keys and editable text output appear on top of the webcam feed; the fingertip cursor, highlighted letter, and one-second typing ring all live in the same view.
- Camera status and explicit Enable/Stop Camera remain in the right-side controls, without duplicating the video.
- Without the camera the same keyboard works with mouse and touch.
- Hold 1 Sec is the default; pinch remains optional and pinch-specific settings are hidden in dwell mode.
- Text starts empty to make typed characters easy to see.

## Synchronization
MediaPipe fingertip X coordinates are mirrored horizontally to match the webcam selfie preview. The video uses CSS object-fit: cover. Tracking now projects the normalized fingertip through the same scaled cover image and centered cropping geometry used by the rendered video.

An actual DOM key must be within the fingertip's local position plus a 12px snap margin and held stable for 130 ms to be highlighted. Holding the key for 1 second selects it only once, until the finger leaves or changes target. The current finger cursor is drawn on the same camera stage, not on a separate keyboard.

## Testing and limits
- This is a screen-based holographic-style overlay, not a real volumetric hologram.
- Permission remains opt-in. MediaPipe runs camera inference on device; the model/SDK may make external requests as already disclosed.
- Cube and WBS modes, portfolio routes and global Holo Navigator remain in place.
- Run npm run build, check deployed Netlify, and test target alignment with a webcam. A static code check does not establish real hardware precision.
- Test finger inside camera view, preferably well-lit. Verify target highlight, typing ring, resulting character, and that a single hold doesn't repeat forever.
- Test desktop/mobile layouts and stopping the camera.
