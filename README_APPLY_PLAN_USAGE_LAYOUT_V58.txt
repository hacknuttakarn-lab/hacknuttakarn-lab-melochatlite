Melo Chat Lite - V58 My Plan / Usage layout

Changes:
- Main package usage cards moved directly under the main package period.
- Main package Translation now uses base plan quota only (base_translation_used / translation_limit).
- Translation Add-ons are separated below the main plan usage.
- Each active Translation Add-on now has its own progress bar and expiry detail.
- No SQL changes.

After overlay:
  npx tsc --noEmit
Then redeploy Production.
