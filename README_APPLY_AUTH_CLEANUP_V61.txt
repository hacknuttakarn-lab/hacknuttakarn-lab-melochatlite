Melo Chat Lite — V61 Auth UI cleanup

Changes:
- Desktop/tablet Login, Forgot Password and Reset Password: remove only the “MELO CHAT LITE” kicker.
- Mobile Login drawer: hide the duplicate upper language selector on auth pages; keep the lower Language control.
- Mobile Forgot Password: hide marketing intro and center the reset-request card in the usable viewport.
- Mobile Reset Password keeps the card-only centered layout and password visibility toggles from V60.
- Register page is not changed by the kicker rule.
- TH / EN / DE and Dark / Light remain supported.
- No SQL required.

After overlay:
npx tsc --noEmit
