# V10 — WBS to Automation scroll sequence / fixed cube overlap

Date: 2026-10-19

## What changed
- Fixed the hero overlap reported by the owner. The hero now has a real two-column CSS grid containing **intro text and CTA in one column** and **the rotatable 3D cube in the other**. At tablet/mobile sizes, the columns stack. The cube no longer uses absolute positioning over the heading, CTAs or scroll hint.
- Added \`src/components/ScrollWBSAutomation.tsx\`. It is a **scroll-driven demonstration**, not a movie or a live production automation.
- The sticky sequence has four phases: (1) Work Breakdown Structure and work packages; (2) 3D explosion/spreading tasks; (3) connected task automation with animated workflow links; and (4) a simulated project delivery dashboard. Positions, perspective, rotations, scale and opacity interpolate continuously with actual browser scroll progress.
- Every step has PM context: scope, WBS, stakeholder coordination, dependencies, automation tasks, quality/risk checks and deliverables. This positions the owner as a PM coordinating AI and processes, not only as a web developer.
- Stage dots are interactive and move the browser to the selected scroll point. For reduced-motion settings, visitors select stages without scroll animation.
- Responsive desktop/tablet/mobile layout, passive/rAF-throttled scroll listener with clean teardown, no new dependencies or additional services.
- The former 6-layer static \`WorkflowDepth3D\` is replaced on the home route; its source remains available without being rendered.

## Visual check
Check the following when the Netlify deploy is complete:
1. Heading "I BUILD WHAT'S NEXT" and CTA do **not overlap** the 3D cube at 1024–1920 px or tablet portrait.
2. On narrow phones, the cube appears below the hero text with clear margins.
3. Scroll to **03 / PROJECT MANAGEMENT × AUTOMATION**; pause at 0%, 33%, 66%, and 100% of the sticky track to inspect the WBS, explosion, automation links and delivery board.
4. Verify stage-jump buttons, mobile touch scrolling, Esc/keyboard controls on the hero cube and reduced-motion behavior.
5. Check \`npm run build\` (TypeScript and Vite), and check deployed web UI. Neither is implied by static file checks.
