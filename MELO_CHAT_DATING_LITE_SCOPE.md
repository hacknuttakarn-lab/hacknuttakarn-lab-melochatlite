# Melo Chat Dating Lite — Phase 1 Scope

This copy is a separate web-only product baseline. The original Melo Chat project must not be modified by this work.

## Core experiences kept
- Love/Dating discovery as the only matching mode
- Feed and Post creation
- Direct chat and existing chat translation capability
- Chat unread badges and chat notification surfaces
- Activity/general notifications that remain relevant to Dating, Feed, Match, Verification, Package, and account events
- Profile and dating profile
- Like / Save / Pass / Match flows already used by Love mode
- Premium / package pages
- Light and Dark themes
- Authentication/account flows
- Identity verification and document attachment flows (retain existing data/API integrations; dedicated Lite UX to be consolidated in the next phase)
- Block/report/privacy/legal/support essentials

## User-facing languages
- Thai
- English
- German

Legacy dictionaries are temporarily retained internally so existing legacy components still typecheck while they are being removed. Language selectors expose only the three Lite languages.

## Removed from Lite navigation / future cleanup candidates
- Friend mode
- Trips
- Events
- Communities
- Deals
- Partner/business mode
- Quest & Rewards
- Travel-oriented Safety Center features
- Travel Passport / Reputation features that depend on Trips or Events

Do not drop Supabase tables, RLS policies, RPCs, storage buckets, or production data as part of Phase 1.

## Desktop information architecture
Primary: Home / Feed / Dating / Chats / Profile
Secondary/account: Premium / Verification / Settings / Notifications

## Mobile browser information architecture
Persistent bottom navigation: Home / Feed / Dating / Chat / Profile
Header: brand + notification + account/menu
Drawer: Dating / Feed / Premium / Settings + language + theme + logout

## Notification model
Keep two visible notification concepts:
1. Chat notifications: unread direct-message count, sound/popup behavior where browser permission allows it.
2. Activity notifications: Likes, Matches, Feed interactions, verification status, package/account events.

Legacy Trip/Event/Community/Partner notification routing may remain in code during migration but must not be surfaced as Lite navigation destinations after cleanup.

## Responsive targets
- Mobile browser: 360–767 px, bottom navigation, touch targets >= 44 px, no horizontal overflow.
- Tablet: 768–1023 px, compact header and responsive content columns.
- Desktop: >= 1024 px, full header/navigation and multi-column layouts where useful.

## Migration rule
Hide/re-route user-facing legacy features first, verify build and core flows, then remove unused components and finally clean database dependencies only after usage is proven absent.
