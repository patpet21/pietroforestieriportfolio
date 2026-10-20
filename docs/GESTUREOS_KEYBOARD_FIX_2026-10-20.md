# Floating Air Type: highlighted keys did not type

User report: the floating AIR TYPE LAB highlights a key but does not write it.
This follow-up targets that keyboard; the legacy keyboard inside the Lab page
still has separate experimental interaction logic.

The previous change fixed navigation only. AirTypingEngine still had an independent
pinch implementation, gated on ten-finger calibration. Its projection measured
finger position relative to the wrist, cancelling whole-hand translation, and its
index key could remain stale when the finger was no longer considered extended.
Those behaviors are observable in the old code; they do not prove the exact
landmark sequence from the user's real-camera attempt.

The default INDEX + PINCH mode now uses one index pointer mapped over the keyboard
and the same PointerController close/release lifecycle as navigation. No two-hand
calibration or finger-bend threshold is required. Highlighting reflects the actual
armed controller, the last open target is frozen during closure, and one pinch
produces one character. Moving the whole hand moves the pointer. Losing tracking,
changing modes, changing movement range or closing the overlay invalidates its
previous press. Key hit-testing checks current DOM visibility/disabled/inert state.
Full key-rectangle reads run only during experimental calibration.

Ten-finger tap remains opt-in and experimental, with its own automatic two-hand
calibration. UI text and visible controls distinguish it from INDEX + PINCH.
There are no changes to open-palm scrolling or the portfolio layout.

Regression tests include one-hand highlighting-to-character output without
calibration, held pinches, consecutive identical letters, whole-hand movement,
crossing a key boundary during closure, stale/missing/disabled targets, loss and
reacquisition, plus the existing navigation and scroll tests. A Chromium test
executes the actual floating keyboard and types `CIAO`, a repeated `O`, backspace,
space and `Q`, then types into the selected native textarea. This test replaces
the camera/model with canvas video and synthetic landmarks; real webcam precision
still needs user/device trials and is not certified by these results.

Local verification: TypeScript/Vite build passed (existing bundle-size warning),
19 unit tests passed, and all 8 Chromium browser tests passed, including the
selected textarea insertion and disabled-key checks. Browser fixtures wait for
DOM readiness rather than unrelated external media to finish downloading.

To try it: open `/gesture-lab`, enable Spatial Control, open EXPERIMENTAL AIR
KEYBOARD and keep INDEX + PINCH selected. Move one index pointer onto a key,
touch thumb and index, then separate them before the next character. A ten-finger
typing posture is only relevant in the separately labeled experiment.
