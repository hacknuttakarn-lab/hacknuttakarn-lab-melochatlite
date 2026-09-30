Melo Chat Lite - Light Mode + Admin Review visual adjustment

Changed only:
- app/globals.css
- components/settings/AdminVerificationReview.module.css

Changes:
1. Light-mode global page background is darker (#e9eef5) so white content cards are easier to distinguish.
2. Light-mode border/surface contrast adjusted slightly to preserve hierarchy.
3. Header light background follows the new page background.
4. Admin Review Center left request list widened slightly and its pane/detail separation strengthened.
5. Dark mode, verification logic, RPC, SQL, and unrelated pages were not changed.
6. No SQL migration is required for this overlay.
7. TypeScript typecheck passed.
