Melo Chat Lite V46 Overlay

Changes:
1. Profile age is calculated from date_of_birth using the actual birthday.
2. Removed # tag chips from the top profile identity card only. Interests remain stored and remain visible in the About/Interests section.
3. Register page password and confirm-password fields now have independent show/hide controls.
4. No database migration is required for V46.

Apply:
- Extract/copy this overlay over the existing project, preserving folders.
- Restart development server: npm run dev

Validation:
- TypeScript: node node_modules/typescript/bin/tsc --noEmit --pretty false (passed)
