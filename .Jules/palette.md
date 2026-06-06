## 2024-11-20 - Missing Form Labels and Icon Button ARIA labels
**Learning:** Found an accessibility issue pattern specific to this app's components where custom inputs and icon-only buttons lacked programmatic associations (e.g. `for` attributes on labels and `aria-label` attributes on icon-only buttons). The main layout elements also lacked a clear `focus-visible` ring.
**Action:** Always verify `for` and `aria-label` tags when inspecting or adding new interactive custom elements in this design system.
