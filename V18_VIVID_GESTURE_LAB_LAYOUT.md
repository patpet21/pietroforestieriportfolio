# V18 — Vivid site theme + dedicated Gesture Lab (25 October 2026)

## Changes
- Brighter cobalt/azure gradients across the entire portfolio: Home, About, Projects, individual project pages, Services, Contact, footer and Gesture Lab.
- Raised the brightness and contrast of cards, form fields, page headings, hover affordances and buttons. Cyan, light blue and soft violet accents preserve the technological look while reducing near-black surfaces.
- Removed the permanently mounted global `HoloNavigator` component from App.tsx. **Spatial Control no longer appears on every page**, including mobile.
- Mounted one `HoloNavigator` inside a dedicated `gsl-spatial-section` in Gesture Lab, in normal page flow, with a camera activation button and clear description.
- Kept the separate Air Keyboard, 3D Control and WBS Builder experiments intact. Starting one camera system still stops the other.
- Kept a **compact teaser on Home** pointing to /gesture-lab, without any extra camera or navigation controls.
- No additional dependencies, paid services or GitHub Actions.

## Verification
- Static source checks confirm one Gesture Lab mount, no global camera import/render, route continuity, legacy experiments still present, updated privacy copy, CSS balanced, mobile styles and brand theme selectors.
- **Not yet verified:** npm build, Netlify deployment and live browser/device visual QA. Local shell cannot resolve github.com for cloning.
- Preview test: Home should display the compact Spatial Interaction teaser; the Spatial Control camera panel should appear only at /gesture-lab. Start / stop camera there and verify its stream stops on route change.
- Check text contrast and color fidelity on desktop/mobile, including project cards, contact fields and responsive header. Check that existing WBS and camera features still work.

Backup branch: backup/pre-vivid-theme-gesture-lab-only-2026-10-25
