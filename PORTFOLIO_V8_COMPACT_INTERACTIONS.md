# Portfolio v8 — smaller cards and more interactive case studies

Updated 2026-10-19.

Changes in the React/TypeScript portfolio:
- Compact 3D carousel cards on home (desktop maximum width ~382 px, mobile maximum ~282 px) with existing arrows, swipe and project summaries preserved.
- Project grid expands to 3 columns at roomy desktop widths, 2 on laptops and compact 1-column cards on mobile.
- More efficient image/card heights, text, spacing, service cards and project detail side panels.
- All 8 project detail pages now include an interactive 4-chapter narrative: Challenge, Approach, Solution, Current stage. Chapters can be selected directly or stepped with arrows.
- The seven non-PrivacyGate split-screen project explorers get click-to-enlarge visuals in an Escape-dismissable overlay with a descriptive label.
- The existing PrivacyGate screenshot interaction remains intact.
- The enormous plain "Next Project" text section is replaced with a branded next-project preview card and an All Projects link.
- Reduced-motion and mobile breakpoints included. Project stage/status remain truthful and no new data or external services are used.
- No new npm packages or GitHub Actions.

Still to check: Netlify TypeScript/Vite build and visual QA in actual desktop and mobile browsers.
