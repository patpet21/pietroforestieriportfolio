# Natural Gesture Engine V16 — no control modes

## Goal

This change is intended to make the portfolio and mobile browser prototype feel like one continuous hands-free interface. It replaces the previous "Gesture Command Center", Point / Scroll mode switch and remote-like navigation buttons.

## Interaction contract

- **Activate only by user choice:** Press "Enable Gestures" once on the small camera controller. No automatic camera permissions or hidden background capture.
- **Open palm → drag-scroll:** Show a palm with at least three extended fingers; move it up/down. The document follows the motion like a touch gesture. A nearly stationary palm does not keep scrolling.
- **Index pointing → cursor:** Extend your index with other fingers mostly folded. The cursor follows the index over **existing** page links, cards, buttons and inputs. No duplicate Home, Projects, Page Up or Page Down controls.
- **Bend index → click:** With a link or button highlighted, briefly curl the index. The original target stays locked while bending to avoid clicking a neighboring button.
- **Dwell backup:** Hold the pointed index on a target for about 1.45 seconds (about 1.1 seconds on virtual keyboard keys) to activate when the bend gesture is unreliable.
- **Two hands:** MediaPipe tracks up to two hands. If one is an open palm it may scroll while the other points. No command or mode toggle is required.
- **Typing:** Focus a normal text input to show the original holographic onscreen typing keyboard. The keyboard is automatically associated with that field. It is not a physical projected or depth-sensing keyboard.
- **Camera:** Stop Camera shuts down the stream, tracking resources and cursors. Enabling the separate legacy Gesture Lab camera stops the global camera to avoid conflicting models.

## Technical design

- The full site uses a single persistent HoloNavigator component outside routed main. The webcam stays active as React Router changes pages.
- MediaPipe Tasks Vision Hand Landmarker (the repository's existing package) runs on-device. It detects up to two hands using webcam landmarks.
- Each frame classifies a hand as palm-open (3+ fingers extended) or index-pointing, with finger-curl timing hysteresis. Open palm motion is treated as a delta, not a fixed "scroll up/scroll down" command.
- Normalized fingertip coordinates are mirrored, scaled to reach screen edges, then smoothed before hit-testing the real DOM elements.
- Clicking is restricted to actual target elements. A highlighted target must be under the index; tap and dwell cannot repeat until it is left.
- The global menu remote and explicit navigation modes have been removed; other pages and the legacy Gesture Lab experiments remain available.

## Known limitations

- Ordinary RGB phone/laptop cameras estimate landmarks but do not measure real touch pressure or precise depth. Air taps can be imperfect, especially when fingers overlap or lighting is poor.
- A normal website can only interact with content inside its own browser context and does not grant control of Android/iOS system apps.
- The browser must remain active to capture camera frames. Mobile browsers may suspend processing when minimized/backgrounded.
- The app should be used while stationary, not while driving.
- Physical webcam and production Netlify deployment checks are required before claiming reliable accuracy.

## Hardware QA sequence

1. Desktop HTTPS, enable gestures and allow camera. Confirm model status and live preview.
2. Show a **single open palm**, move it upward and downward. Page scroll should occur without mode selection; hold palm still and it should stop scrolling.
3. Point the index at the actual top-navigation link. Curl the index once. The expected route should open without any on-screen "remote" button.
4. With one open palm and one index finger visible, test independent scrolling and pointing (within camera limits).
5. Visit Contact, select a text field and verify air keyboard appears automatically; test dwell typing and close it.
6. Navigate between pages. The same webcam session should remain active.
7. Test Stop Camera, denied permissions, Safari/Chrome/Edge, mobile vs laptop, reduced motion, and page zoom.
8. Confirm npm run build and actual deployed-browser operation. Source checks do not establish real device accuracy.

No new npm dependencies or GitHub Actions were introduced.
