# Gesture Lab V15 — Keyboard Press + Global Navigation Fix

## Why this change
User feedback: webcam recognized hands but typing felt impossible, the perceived fingertip was difficult to align, and Holo Navigator could not scroll or navigate reliably.

The prior code offered Dwell and Pinch to type, while the global controller also ignored clicks on its own floating controls even when the cursor highlighted them.

## Implemented
- **INDEX TAP (new default)**: Aim an extended index at a highlighted holographic key. Curl that index toward the palm to register one keystroke, then straighten to release. This is a tracked finger-bend gesture, **not** a touch-surface event or a true depth-sensing holographic keypress.
- Lock the prior highlighted key's position while bending, since the fingertip normally drifts during a press.
- Require two consistent tracking frames for tap onset/release and use an explicit press/release threshold.
- **Hold 1 Sec** and **Pinch** remain selectable keyboard alternatives.
- Live INDEX PRESSED/READY feedback and a hand-movement range slider to tune how far the index can reach.
- **HOLO NAVIGATOR (global):** same INDEX TAP gesture as default. User can still use Auto Click (dwell) or Pinch.
- A persistent floating navigation dock with large Home, About, Projects, Services, Gesture Lab and Contact buttons; global Point/Scroll mode toggles; Page Up/Down buttons.
- Fixed a **real click-blocking bug**: the global controller used to reject its own floating action buttons even when they were highlighted; ray clicks on explicit dock actions now pass through.
- Increased hand-to-pointer reach, added a Recenter Hand Position command, and widened the Scroll active zone / movement speed.
- All webcam access remains explicitly opt-in. Existing camera stop and local/global camera mutual exclusion are preserved.
- The camera-based keyboard overlay, holographic styling and other project pages remain unchanged.

## Limitations and QA
A standard webcam does not measure physical fingertip contact with floating or screen-rendered keys. Curl-to-click can feel closer to a normal key press, but detection varies across hands, lighting, camera placement and pose. Alternate dwell/touch controls remain necessary.

Before claiming live hardware performance: confirm the Netlify build and test with a physical webcam.

Manual QA after deployment:
1. In Gesture Lab start the camera, choose INDEX TAP, aim at highlighted A, bend then extend index; verify exactly one A appears and feedback reads INDEX PRESSED.
2. Try Hold 1 Sec and Pinch fallback. Adjust Hand Movement Range if pointer doesn't reach all keys.
3. Start global HOLO CONTROL. Aim at the right-side GESTURE COMMAND CENTER. Bend index over PROJECTS; verify navigation. Ensure camera continues through routes.
4. Aim at PAGE DOWN then PAGE UP; verify both work. Choose HAND SCROLL to scroll vertically, and return to POINT & CLICK using the command dock.
5. Test Recenter after holding index in center of webcam field, then adjust Pointer Reach.
6. Verify Stop Camera, permission denial and mouse/touch fallback.
7. Check mobile and desktop, including CSS overlay not blocking ordinary navigation.

No new dependencies or GitHub Actions added.
