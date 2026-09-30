Melo Chat Lite V39 — Registration Profile Onboarding

1) Apply this overlay to the current project.
2) Run the SQL in Supabase SQL Editor:
   supabase/migrations/20260928164500_profile_onboarding.sql
3) Restart dev server if it is running: npm run dev

Flow:
Register -> email confirmation -> /onboarding -> Step 1 Personal -> Step 2 Looking for -> Step 3 Lifestyle -> /account (Home)
Login also resumes incomplete onboarding.
Responsive mobile layout includes top/bottom safe areas. UI supports dark/light system theme and TH/EN/DE via the existing app locale.
