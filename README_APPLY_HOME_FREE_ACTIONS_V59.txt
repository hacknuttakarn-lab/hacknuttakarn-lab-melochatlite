Melo Chat Lite — V59 Home Free Plan Actions

Change:
- On Home only, users whose current plan_code is "free" no longer see:
  - Not Interested (×)
  - Interested / Connect (♥)
- Premium / Premium+ keep the existing buttons and behavior.
- Follow is intentionally left unchanged because this request only removes Interested / Not Interested.
- No SQL required.

Files:
- components/home/HomeDashboardExperience.tsx

After overlay:
npx tsc --noEmit
