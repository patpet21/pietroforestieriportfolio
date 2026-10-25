# Gesture Lab V19 — One Spatial Control, One Camera

## Design change
Gesture Lab previously contained two distinct webcam-powered systems on the same page: global Spatial Control (with its own Air Keyboard) plus an older, independent Air Keyboard experiment with a second "Enable Camera" button.

As requested, the page is now organized as:

1. **Spatial Control** (primary): the only camera activation button, live vision preview, pointer and gesture navigation; its existing Air Keyboard can be opened after enabling the camera.
2. **3D Control** (secondary): interactive CSS 3D cube that supports mouse/touch drag, rotation controls, and expanding/reducing. The hand pointer can click its actual controls while Spatial Control is enabled.
3. **WBS Builder** (secondary): move work-package cards with mouse/touch, or select two cards to connect dependencies with mouse, touch or Spatial Control's gesture click.

There is no separate Air Keyboard tab, duplicated large typing stage, camera settings panel or second camera permission path. Only one `HoloNavigator` is mounted and it owns the MediaPipe capture and the AirKeyboard component. The old experiment-specific camera engine was removed from GestureLab rather than merely hidden behind CSS.

The Air Keyboard toggle is available on mobile as well as desktop **inside the Spatial Control session**. Mobile tracking remains experimental; no precision guarantees are implied.

## Quality and safety notes
- No second getUserMedia call exists in GestureLab.
- Camera remains strictly opt-in, under the Enable Gestures and Stop Camera controls.
- When Gesture Lab is exited, HoloNavigator unmounts and closes the camera stream.
- 3D and WBS are interactive without requiring webcam access; they don't create additional streams.
- Keyboard is not instantiated until Spatial Control has a ready camera and the user elects to open the Air Keyboard.
- Preserve a full pre-change backup at `backup/pre-single-camera-gesture-lab-2026-10-25`.
- Check the actual browser/phone camera, mobile overlay alignment, keyboard behavior, viewport wrapping, touch drag and WBS linking after deployment.

## How to test
1. Load `/gesture-lab`. Confirm exactly one **Enable Gestures** button in the Spatial Control section and no separate Air Keyboard tab.
2. Enable camera once; confirm only one permission request and live preview.
3. Open **Experimental Air Keyboard** inside Spatial Control; confirm the typing UI appears without a new camera request. Close the keyboard; confirm the same camera session remains active.
4. Open 3D Control. Drag/rotate the cube; try expand/reset, with normal pointer and optionally the Spatial hand pointer.
5. Switch to WBS Builder. Move a card; select card A and B to create a dependency. Reset WBS.
6. Verify desktop and mobile layouts, including Air Keyboard toggle on supported browsers, proper stop-capture and no camera on Home/Projects.

No new paid services, NPM packages or GitHub workflows were added.
