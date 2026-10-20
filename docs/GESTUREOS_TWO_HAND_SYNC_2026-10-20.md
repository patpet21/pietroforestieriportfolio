# AIR TYPE: two hands and synchronized forward contact

The reported failure was two visible hands producing one pointer in the floating
AIR TYPE LAB. The forward path explicitly chose one hand, kept one controller,
and returned one INDEX marker. The regression test even asserted that the second
hand was ignored. This was a software restriction, not a webcam diagnosis.

## Changes

- Forward touch now has one independent index pointer per visible hand, with
  separate neutral planes, approach/contact state and withdrawal latches.
  Either hand can write while the other remains held. Two contacts in the same
  processed frame emit both characters, in stable L/R order.
- Detection order and current screen side no longer define the continuing
  identity. Matching uses confident model handedness, wrist continuity and
  short motion prediction. Ambiguous or contradictory identity evidence clears
  contact instead of transferring another hand's armed plane. Persistent
  contradictions repair the assignment. Losing a hand immediately removes its
  pointer/controller; the remaining hand retains its own state.
- The keyboard marker uses the current observed index position. The old fixed
  per-frame position filter and the extra 65 ms left/top CSS tween are removed.
  A small separate contact mark shows the target locked during approach, while
  the labelled LI/RI pointers continue to follow the fingers. The in-page lab's
  extra 60 ms cursor tween is also removed.
- A neutral sample now clears contact confirmation immediately. Previously, two
  full-depth samples separated by one neutral sample could incorrectly count
  as consecutive contact.
- Local opt-in diagnostics (`?gestureDebug=1`) expose both controller states,
  identity resets, live/contact coordinates, processed/presented sample IDs,
  `sampleToKeyboardActionMs`, `sampleToKeyboardCommitMs` and contact confirmation
  timing. These are software sample/React-commit measurements, not exposure-to-
  display latency. They contain no camera images or typed content.

The default action remains **push the index forward, then withdraw**. Gesture
thresholds and palm scroll arithmetic are unchanged. Global portfolio navigation
retains one control hand. The optional ten-finger bend experiment and the separate
in-page manipulation demos retain their existing scope; this change does not
claim ten independent forward-touch fingers.

## Verification

Unit regressions cover separate hand sizes/planes, independent and simultaneous
contacts, held fingers, detector order reversal, labelled and low-confidence
crossings, ambiguous overlaps, one-hand loss/reacquisition, depth noise and the
single-neutral confirmation bug. One reproduced defect involved different
neutral palm sizes: an abrupt identity exchange could become a false depth push
without any forward motion. The new regression rejects that sequence.

Chromium integration tests exercise the actual floating keyboard, both labelled
markers, independent/simultaneous text insertion, disappearance/reappearance,
and a moving live fingertip with a separately locked contact. Existing navigation,
scroll, DOM visibility checks, native fields and single-hand typing are retained.
The fixtures supply synthetic landmarks through a mocked detector and canvas
video. Browser files run sequentially to avoid competing camera/render workloads;
remote font styles are stubbed so their delivery cannot stall document startup.

Local verification: strict TypeScript/Vite build, **37 unit tests** and **13
Chromium integration tests** pass. The existing bundle-size warning remains.

Real webcam accuracy, two-hand occlusion, tracking jitter and smartphone latency
remain unmeasured. An unobserved crossing without reliable handedness may be
intrinsically ambiguous. Model inference still runs synchronously on the main
thread. Passing these tests establishes the software behavior above, not VR-grade
physical tracking or a measured click-success rate.
