# - Prefers responsive, multi-form-factor design that adapts across screen sizes (tablet, desktop) rather than fixed mobile-only portrait layouts. Confidence: 0.8
- Prefers responsive, multi-form-factor design that adapts across screen sizes (tablet, desktop) rather than fixed mobile-only portrait layouts. Confidence: 0.8
- Prefers thorough design/system analysis before implementing changes (analysis-first workflow). Confidence: 0.7
- Uses a feature-branch-per-task git workflow (e.g., `feat/responsive-layout`), with a status check before branching. Confidence: 0.8
- Tracks implementation via a progressive todo list, marking steps completed before moving to the next phase. Confidence: 0.7
- Verifies changes with lint and type-checking (`tsc --noEmit`) before considering work done. Confidence: 0.7
- Follows a mobile-first responsive approach that progressively enhances: single column on phone, grid/list columns on tablet/desktop using `useWindowDimensions` and named breakpoints. Confidence: 0.8
- Evaluates each screen's layout on its individual merits rather than applying a uniform responsive treatment everywhere; e.g. rejected the desktop split-view adaptation for login (prefers it kept centered as-is) while approving the register screen's two-column responsive layout. Confidence: 0.9
