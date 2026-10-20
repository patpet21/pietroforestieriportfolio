# Spatial Control V17 — Mobile Gesture Stabilization

## Problem observed
On a vertically mounted phone, the earlier open-palm implementation used immediate frame-to-frame landmark differences to scroll. With ordinary mobile camera jitter it could scroll erratically up/down. Finger pointing and air taps were also hard to align and trigger.

## New unified interaction

- **One extended index — navigate and scroll**: Holding an extended index still aims a cursor at existing site links, buttons and inputs. Move the same index vertically by a deliberate distance to initiate a touch-like swipe of the content, with no Point/Scroll toggle.
- **Air click**: Aim at a target and bend the index briefly. A target-lock, two-frame press hysteresis, cooldown and minimum hover duration prevent accidental adjacent clicks. Holding a steady target approximately 1.55 seconds activates as a fallback if the camera does not recognize the bend.
- **Two extended fingers (index+middle) — zoom**: Extend index and middle with the other fingers folded, hold the pose for at least four frames, then spread or close the pair to scale **only the website's main content** from 85% to 140%. The webcam panel and controls remain unscaled. Stop Camera resets website zoom.
- **On mobile, MediaPipe tracks one hand at a time** to reduce model workload and pointer switching. A two-finger zoom uses the index and middle fingers of that same hand. Desktop can track up to two hands.
- **No custom navigation buttons or modes**. The normal site's controls remain the targets. Webcam is opt-in and can always be stopped.

## Stability safeguards

1. Do not scroll during open-palm posture: prevents mixed auto-scroll/click behavior that previously jumped between classifications.
2. Ignore up to two individual missed tracking frames; on sustained loss clear hover/tap/swipe state.
3. Smooth webcam coordinates before hit tests.
4. Arm vertical swipe only when movement exceeds 5.5% of normalized screen height and dominates sideways movement, consistently for at least two frames.
5. While swiping, ignore movements under 0.6% normalized height; clamp frame scroll magnitude and suppress short-lived direction reversals until the reverse movement is substantial.
6. Stop scroll after about five quiet tracking frames; moving the pointer after that re-enables normal click selection without changing modes.
7. Require four stable two-finger frames to enter zoom. Temporarily tolerate up to two classification dropouts. Apply updates only for zoom changes of at least 1.5 percentage points.
8. Render the camera at a smaller portrait-oriented resolution on mobile to reduce model cost.

## Hardware/browser limitations
- RGB cameras only estimate 3D hand pose; actual touchscreen contact and force/forward push cannot be measured reliably without additional sensors. Air bend and dwell are reasonable software approximations.
- Gestural zoom affects **this website only**, not the whole phone and not WhatsApp/other apps. Browser camera sessions generally suspend when the tab goes into the background.
- Two fingers can be visually occluded; lighting and distance affect MediaPipe accuracy.
- This is a prototype. Performance/precision on actual mobile hardware still needs testing. Production deployment must be verified independently.
- Use only when stationary; never for messaging or interacting with the phone while driving.

## Mobile QA after deployment
1. With the phone on a holder while stationary, open the site and enable gestures.
2. Index only: hold steady near a link. The page should not drift. Move the finger up/down deliberately; the page should follow, then stop on its own when the finger stops.
3. Navigate to a normal menu link by holding for about 1.55 seconds, or aim and curl your index. Watch for a click only on the highlighted target.
4. Try the V pose (index+middle) and open/close the fingers: site content should zoom within 85–140%, without page scroll. Stop Camera should restore 100%.
5. Test portrait rotation, phone distance/lighting, temporary finger occlusion and permission denial.
6. Verify the actual production build and webcam on device. No code-only test certifies live accuracy.

No new paid services, hardware or npm dependencies.
