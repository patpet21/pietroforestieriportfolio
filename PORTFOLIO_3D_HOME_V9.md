# Portfolio 3D Home — Interactive Systems Lab (2026-10-19)

## Design references
- Beautiful UI (https://www.beautifului.dev/) supplied the inspiration for compact, stateful micro-interactions and clear interactive controls. Its AI demo widgets were not copied into this portfolio.
- Free open component examples such as ReactBits (https://www.reactbits.dev/) inspired the overall idea of 3D exploration. The two components here are original, built with standard React and CSS transforms instead of copying components or importing a heavy 3D library.
- The user's own AI PM Lab links page (https://aipmlinks.propertydex.xyz/) informed the focus on projects, processes and resources.

## What's been added
1. **HeroSystems3D** sits alongside "I BUILD WHAT'S NEXT" at desktop widths. It shows a six-face 3D systems cube surrounded by orbital rings and floating annotations. The cube slowly rotates until a visitor drags or adjusts it using arrow keys. The visitor can choose DISCOVER, AUTOMATE, DELIVER to change the content explanation and can reset the view.
2. **WorkflowDepth3D** replaces the old plain six-word "Approach" row. It shows six actual perspective-positioned CSS 3D layers linked to Discover, Analyze, Design, Coordinate, Deliver and Improve. Selecting any layer or numbered button updates the explanation. Previous/next buttons work too.

Both adapt to phone and tablet widths; cube controls are reachable without relying on hovering. Animations respect \`prefers-reduced-motion\`. The original project coverflow and all project detail pages remain unchanged.

## Design and performance
- No new npm packages, no third-party network calls, and no GitHub Actions.
- All materials are authored as original JSX/CSS; no 3D model licensing concerns or hosted assets.
- Existing lightweight WebGL particle field in the hero remains in place; the new objects are CSS 3D.
- Testing still needed: run \`npm run build\` and review mobile/touch, Safari, keyboard and Netlify deploy.
