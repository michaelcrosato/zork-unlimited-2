## 2025-02-14 - Interactive Elements Missing Accessibility Primitives
**Learning:** In the AdventureForge UI, custom interactive components (like icon-only utility buttons and raw input fields) frequently lacked basic a11y primitives: no focus states due to `outline: none;` on buttons, icon-only buttons missing `aria-label`, and `<label>` tags missing the `for` attribute to associate them with inputs. Screen reader users would hear unlabeled inputs and keyboard users would lose track of focus.
**Action:** Always verify `button:focus-visible` styling is present when resetting button outlines. Always ensure `<label>` has a `for` attribute or the input has an `aria-label`, and explicitly label all icon-only buttons.

## 2025-02-14 - Exits Compass Accessibility and UX
**Learning:** Abbreviated text buttons (like N, S, E, W) and geometric shape text (▲, ▼) used as interactive controls are confusing to screen readers without explicit `aria-label` mappings, and unintuitive to users without tooltips. The Exits compass used these and left users wondering what exact directions they mapped to.
**Action:** Always explicitly label navigation controls and add descriptive tooltips (`title`) to icon-only or single-letter UI buttons. Also mark decorative disabled buttons (like center grid spacers) with `aria-hidden="true"`.
