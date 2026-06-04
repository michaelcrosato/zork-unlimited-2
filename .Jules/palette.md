## 2025-03-09 - Accessible Icon Buttons and Form Labels
**Learning:** Found that several icon-only buttons (like audio toggle, delete save, close modal) and main game inputs (like the console prompt) lack proper ARIA labels and `for` attributes on their visual labels. This makes screen reader navigation difficult.
**Action:** Always ensure icon-only buttons have an `aria-label` matching their `title` or intent, and form inputs are properly associated with labels.
