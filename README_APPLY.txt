Melo Chat Lite - Home Dating Grid Overlay

1) Extract this ZIP over the root of melochat-web-lite.
2) Allow Windows to replace the 3 files under components/home/.
3) Restart dev server:
   Ctrl+C
   npm run dev

Changed only:
- components/home/HomeDashboardExperience.tsx
- components/home/HomeDashboardExperience.module.css
- components/home/ResponsiveAccountHome.tsx

Notes:
- Home no longer renders SocialFeedExperience, Trips, Events, Communities, Live rail, or Friend suggestions.
- Desktop: 5 profile cards per row.
- Tablet: 4/3 responsive columns.
- Mobile: 2 profile cards per row.
- Cards show equal 4:5 profile photos, name, age, nationality/flag, online indicator.
- Feed/Post code remains in the project; it is simply no longer used as Home.
- Current new Supabase still needs the Dating schema/RPC before real profiles can load.
