# Forward touch: the intended click gesture

The user's clarified interaction is **push the index forward as if touching a
suspended button, then withdraw**. This change supersedes the earlier pinch
default. It applies to global navigation, floating AIR TYPE LAB and the in-page
Gesture Lab keyboard. Palm scroll and native pointer/touch/keyboard are retained.
Cube resize and WBS grab remain separate legacy manipulation experiments.

## Implementation

`ForwardPushController` replaces the pinch controller. Its lifecycle is:
aim → automatically establish a neutral plane → advance → contact → withdraw.
No amount of idle hovering causes a click. Thumb/index closure is not an input.
Finger bending is not the activation trigger; a straight-index quality check
rejects strongly folded poses. The cursor ring visualizes **spatial progress**.

Google documents image landmark Z relative to the wrist, and world coordinates
relative to the hand center, not the hand's absolute distance from the camera:
https://developers.google.com/edge/mediapipe/solutions/vision/hand_landmarker/web_js.
Consequently the implementation does not treat raw fingertip Z as camera distance.

`measureForwardDepth` combines apparent palm size (for whole-hand advance) with
wrist/palm-relative fingertip depth (for index advance). Normalized palm-shape
ratios reject obvious rotation/foreshortening changes. A hand-identity jump,
invalid tracking or long frame gap invalidates the reference. After reacquiring
an already advanced hand, withdrawal can move the reference backward, so the
next natural forward stroke remains usable; the reference never follows a push.

Initial policy values are centralized in `FORWARD_TOUCH_POLICY`: at least 200 ms
of stable aim and four samples establish the reference; full progress is 14%
apparent palm enlargement or 0.35 palm-scale units of relative fingertip advance.
Approach locks the target at 20% progress. Two consecutive samples beyond the
surface confirm contact. Two samples after withdrawing below 10% rearm it.
The 850 ms stroke expiry requires withdrawal/reset and is shown in the UI.
These values define the initial estimated surface; they are **not hardware-
validated accuracy or physical-distance calibration**.

The open-aim target is captured before forward motion can shift the cursor XY.
Activation still verifies the target's current DOM visibility/enabled/connected
state. Holding inside the virtual surface cannot repeat the action. Keyboard
mode is exclusive with navigation and follows the same controller. Floating
keyboard diagnostics expose progress/phase/reason without logging typed text.
The optional ten-finger bend experiment remains separate from FORWARD TOUCH.

## Verification and remaining limits

Deterministic tests use synthetic 3D landmarks and vary palm scale, relative
finger depth, thumb closure, rotation, index folding, noise, target changes,
withdrawal, loss/reacquisition, reset and mode changes. The existing 20 numeric
palm-scroll traces remain unchanged. Chromium tests exercise global navigation,
floating keyboard typing (`CIAO`, repeated letters, space/backspace and native
textarea insertion), and the in-page keyboard's forward-touch cycle. They also
assert that a thumb/index pinch alone does not activate anything in these modes.

Local result: strict TypeScript/Vite build passed, all 22 unit tests and all
9 Chromium browser tests passed. The existing large-bundle warning remains.

These tests validate software control flow with canvas video and mocked model
results. **No real webcam forward-touch accuracy, click success percentage,
false-positive rate or phone latency is certified.** A monocular camera supplies
an estimate, not a measured physical contact plane or VR-controller tracking.
Zoom, occlusion, hand rotation and model depth jitter can affect it. Real-device
trials must check the ring/progress and suppression reasons before changing the
central policy. Model inference remains synchronous as documented previously.

To try: enable gestures, aim briefly at a control until the surface is ready,
push the index toward the camera to fill the ring/contact, and withdraw. The
floating and in-page keyboards default to **FORWARD TOUCH**; pinch is not required.
