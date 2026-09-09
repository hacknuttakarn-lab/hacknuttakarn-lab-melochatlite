# Melo Chat Web ↔ Android Data Parity Audit

Generated: 2026-08-31

- Web root: `D:\project\melochat-web`
- Android root: `D:\project\melochat-main`
- Web source files scanned: **171**
- Android source files scanned: **374**
- Web pages detected: **66**

## Important interpretation

This is a static source audit. "Shared" means Web and Android reference the same Supabase table/RPC/function/bucket name somewhere in source. It does not by itself prove that parameters, filters, RLS, status values, or returned fields are semantically identical. High-risk mismatches are listed separately below.

## Web pages — data source inventory

| Web page | Tables | RPC | Edge Functions | Storage | External fetch |
|---|---|---|---|---|---|
| `app/account/page.tsx` | — | — | — | — | — |
| `app/admin/quest-rewards/page.tsx` | — | — | — | — | — |
| `app/admin/review-center/page.tsx` | — | — | — | — | — |
| `app/blocked-users/page.tsx` | — | — | — | — | — |
| `app/chat/direct/[id]/page.tsx` | — | — | — | — | — |
| `app/chat/page.tsx` | — | — | — | — | — |
| `app/community/[id]/chat/page.tsx` | — | — | — | — | — |
| `app/community/[id]/page.tsx` | — | — | — | — | — |
| `app/community/page.tsx` | — | — | — | — | — |
| `app/connect/page.tsx` | — | — | — | — | — |
| `app/create-community/page.tsx` | — | — | — | — | — |
| `app/create-event/page.tsx` | — | — | — | — | — |
| `app/create-post/page.tsx` | — | — | — | — | — |
| `app/create-trip/page.tsx` | — | — | — | — | — |
| `app/deals/[id]/page.tsx` | — | — | — | — | — |
| `app/deals/page.tsx` | — | — | — | — | — |
| `app/edit-community/[id]/page.tsx` | — | — | — | — | — |
| `app/edit-event/[id]/page.tsx` | — | — | — | — | — |
| `app/edit-profile/page.tsx` | — | — | — | — | — |
| `app/edit-trip/[id]/page.tsx` | — | — | — | — | — |
| `app/events/[id]/chat/page.tsx` | — | — | — | — | — |
| `app/events/[id]/page.tsx` | — | — | — | — | — |
| `app/events/page.tsx` | — | — | — | — | — |
| `app/feed/page.tsx` | — | — | — | — | — |
| `app/forgot-password/page.tsx` | — | — | — | — | — |
| `app/friends/page.tsx` | — | — | — | — | — |
| `app/live-notice/page.tsx` | — | — | — | — | — |
| `app/login/page.tsx` | — | — | — | — | — |
| `app/love/page.tsx` | — | — | — | — | — |
| `app/page.tsx` | — | — | — | — | — |
| `app/partner/analytics/page.tsx` | — | — | — | — | — |
| `app/partner/chat/page.tsx` | — | — | — | — | — |
| `app/partner/customers/page.tsx` | — | — | — | — | — |
| `app/partner/finance/page.tsx` | — | — | — | — | — |
| `app/partner/onboarding/page.tsx` | — | — | — | — | — |
| `app/partner/page.tsx` | — | — | — | — | — |
| `app/partner/payout/page.tsx` | — | — | — | — | — |
| `app/partner/reports/page.tsx` | — | — | — | — | — |
| `app/partner/services/page.tsx` | — | — | — | — | — |
| `app/partner/settings/page.tsx` | — | — | — | — | — |
| `app/partners/[id]/page.tsx` | — | — | — | — | — |
| `app/partners/page.tsx` | — | — | — | — | — |
| `app/partner/staff/page.tsx` | — | — | — | — | — |
| `app/partner/store/page.tsx` | — | — | — | — | — |
| `app/passport/page.tsx` | — | — | — | — | — |
| `app/passport/[userId]/page.tsx` | — | — | — | — | — |
| `app/prelaunch-cleanup/page.tsx` | — | — | — | — | — |
| `app/premium/page.tsx` | — | — | — | — | — |
| `app/privacy-data/page.tsx` | — | — | — | — | — |
| `app/production-diagnostics/page.tsx` | — | — | — | — | — |
| `app/profile/page.tsx` | — | — | — | — | — |
| `app/quests/page.tsx` | — | — | — | — | — |
| `app/register/page.tsx` | — | — | — | — | — |
| `app/reputation/[id]/page.tsx` | — | — | — | — | — |
| `app/reputation/page.tsx` | — | — | — | — | — |
| `app/reset-password/page.tsx` | — | — | — | — | — |
| `app/safety/live/[source]/[sessionId]/page.tsx` | — | — | — | — | — |
| `app/safety/page.tsx` | — | — | — | — | — |
| `app/search/page.tsx` | — | — | — | — | — |
| `app/settings/page.tsx` | — | — | — | — | — |
| `app/support/page.tsx` | — | — | — | — | — |
| `app/trips/[id]/chat/page.tsx` | — | — | — | — | — |
| `app/trips/[id]/page.tsx` | — | — | — | — | — |
| `app/trips/[id]/requests/page.tsx` | — | — | — | — | — |
| `app/trips/page.tsx` | — | — | — | — | — |
| `app/users/[id]/page.tsx` | — | — | — | — | — |

## Supabase tables

| Name | Web | Android | Status |
|---|---:|---:|---|
| `activity_chat_policies` | 0 | 1 | Android only |
| `activity_emergency_shares` | 0 | 2 | Android only |
| `activity_gallery_images` | 0 | 1 | Android only |
| `admin_review_staff` | 0 | 1 | Android only |
| `ai_compatibility_profiles` | 0 | 1 | Android only |
| `ai_match_results` | 0 | 1 | Android only |
| `ai_travel_plans` | 0 | 2 | Android only |
| `ai_travel_usage_daily` | 0 | 1 | Android only |
| `ai_usage_daily` | 0 | 2 | Android only |
| `app_notifications` | 0 | 12 | Android only |
| `business-media` | 0 | 1 | Android only |
| `business-verification-private` | 0 | 1 | Android only |
| `business_service_details` | 0 | 1 | Android only |
| `business_services` | 0 | 1 | Android only |
| `businesses` | 0 | 2 | Android only |
| `chat_conversation_members` | 0 | 2 | Android only |
| `chat_messages` | 0 | 2 | Android only |
| `communities` | 0 | 2 | Android only |
| `event_attendees` | 1 | 3 | Shared |
| `events` | 1 | 12 | Shared |
| `friend_preferences` | 0 | 1 | Android only |
| `group_chat_preferences` | 0 | 1 | Android only |
| `melo_account_deletions` | 0 | 1 | Android only |
| `melo_attendance_records_v2` | 0 | 1 | Android only |
| `melo_attendance_sessions_v2` | 0 | 1 | Android only |
| `melo_quests_v1` | 0 | 1 | Android only |
| `melo_user_quest_progress_v1` | 0 | 1 | Android only |
| `melo_verified_locations_v2` | 0 | 1 | Android only |
| `monetization_products` | 0 | 1 | Android only |
| `notification_push_delivery_log` | 0 | 2 | Android only |
| `partner-payout-verification-private` | 0 | 1 | Android only |
| `partner_paid_orders` | 0 | 7 | Android only |
| `partner_payout_accounts` | 0 | 5 | Android only |
| `partner_payout_bank_accounts` | 0 | 1 | Android only |
| `partner_withdrawal_requests` | 0 | 2 | Android only |
| `profile_favorites` | 0 | 1 | Android only |
| `profile_likes` | 0 | 1 | Android only |
| `profile_matches` | 0 | 1 | Android only |
| `profiles` | 2 | 17 | Shared |
| `push_devices` | 0 | 1 | Android only |
| `report-evidence` | 0 | 2 | Android only |
| `safety_live_location_viewer_index` | 0 | 3 | Android only |
| `safety_medical_profiles` | 0 | 2 | Android only |
| `trip_interests` | 0 | 1 | Android only |
| `trip_itinerary` | 0 | 1 | Android only |
| `trip_join_requests` | 1 | 7 | Shared |
| `trip_stops` | 0 | 1 | Android only |
| `trips` | 1 | 12 | Shared |
| `trusted_live_location_history` | 0 | 1 | Android only |
| `trusted_live_location_sos_states` | 0 | 2 | Android only |
| `verification-private` | 0 | 1 | Android only |

## Supabase RPC functions

| Name | Web | Android | Status |
|---|---:|---:|---|
| `add_my_business_gallery_image` | 0 | 1 | Android only |
| `admin_get_melo_quest_reward_stats_v1` | 0 | 1 | Android only |
| `admin_list_melo_quests_v1` | 0 | 1 | Android only |
| `admin_list_melo_rewards_v1` | 0 | 1 | Android only |
| `admin_set_melo_quest_active_v1` | 0 | 1 | Android only |
| `admin_set_melo_reward_active_v1` | 0 | 1 | Android only |
| `admin_upsert_melo_quest_v1` | 0 | 1 | Android only |
| `admin_upsert_melo_reward_v1` | 0 | 1 | Android only |
| `apply_verified_store_purchase` | 0 | 1 | Android only |
| `archive_phase27_activity` | 0 | 1 | Android only |
| `attach_report_evidence` | 0 | 1 | Android only |
| `begin_my_payout_reverification` | 0 | 1 | Android only |
| `block_user` | 0 | 1 | Android only |
| `can_access_event_chat` | 0 | 1 | Android only |
| `can_access_trip_chat` | 0 | 1 | Android only |
| `can_publish_activity_chat_announcement` | 0 | 1 | Android only |
| `can_review_user` | 0 | 1 | Android only |
| `cancel_friend_request` | 0 | 1 | Android only |
| `cancel_my_account_deletion_v2` | 0 | 1 | Android only |
| `cancel_my_partner_booking` | 0 | 1 | Android only |
| `cancel_partner_work_order` | 0 | 1 | Android only |
| `cancel_phase26_attendance` | 0 | 1 | Android only |
| `cancel_safety_check_in` | 0 | 1 | Android only |
| `claim_partner_coupon` | 0 | 1 | Android only |
| `clear_my_partner_finance_demo` | 0 | 1 | Android only |
| `clear_prelaunch_test_data` | 0 | 1 | Android only |
| `close_phase27_activity_checkin` | 0 | 1 | Android only |
| `commit_my_translation_credit` | 0 | 1 | Android only |
| `complete_safety_check_in` | 0 | 1 | Android only |
| `confirm_business_service_usage` | 0 | 1 | Android only |
| `consume_ai_quota` | 0 | 2 | Android only |
| `consume_ai_travel_quota` | 0 | 1 | Android only |
| `consume_phase28_rate_limit` | 0 | 1 | Android only |
| `create_activity_chat_announcement` | 0 | 1 | Android only |
| `create_admin_melo_live_notice` | 0 | 1 | Android only |
| `create_community` | 0 | 1 | Android only |
| `create_event` | 0 | 1 | Android only |
| `create_melo_live_notice` | 0 | 1 | Android only |
| `create_monetization_order` | 0 | 1 | Android only |
| `create_my_journey_timeline_entry` | 0 | 1 | Android only |
| `create_my_partner_finance_demo_withdrawal` | 0 | 1 | Android only |
| `create_partner_booking` | 0 | 1 | Android only |
| `create_partner_business_account` | 0 | 1 | Android only |
| `create_partner_work_order` | 0 | 1 | Android only |
| `create_phase27_activity_reminder` | 0 | 1 | Android only |
| `create_safety_alert` | 0 | 1 | Android only |
| `create_safety_check_in` | 0 | 1 | Android only |
| `create_social_post_comment` | 0 | 1 | Android only |
| `create_store_monetization_order` | 0 | 1 | Android only |
| `create_trip` | 0 | 1 | Android only |
| `create_trip_album_item` | 0 | 1 | Android only |
| `create_trip_expense` | 0 | 1 | Android only |
| `create_trusted_live_location_sos` | 0 | 1 | Android only |
| `deactivate_admin_melo_live_notice` | 0 | 1 | Android only |
| `deactivate_all_my_push_devices` | 0 | 1 | Android only |
| `deactivate_push_device` | 0 | 1 | Android only |
| `delete_my_business_service` | 0 | 1 | Android only |
| `delete_my_journey_timeline_entry` | 0 | 1 | Android only |
| `delete_my_partner_payout_account` | 0 | 1 | Android only |
| `delete_phase27_activity_reminder` | 0 | 1 | Android only |
| `delete_social_post` | 0 | 1 | Android only |
| `delete_social_post_comment` | 0 | 1 | Android only |
| `delete_trip_album_item` | 0 | 1 | Android only |
| `delete_trip_expense` | 0 | 1 | Android only |
| `delete_trip_expense_settlement` | 0 | 1 | Android only |
| `export_my_melo_data` | 0 | 1 | Android only |
| `express_friend_to_love_interest_v1` | 0 | 1 | Android only |
| `fail_partner_wallet_withdrawal` | 0 | 2 | Android only |
| `finalize_partner_paid_order_redemption_to_wallet` | 0 | 1 | Android only |
| `finalize_partner_wallet_withdrawal_v2` | 0 | 2 | Android only |
| `get_activity_chat_announcements` | 0 | 1 | Android only |
| `get_activity_chat_lifecycle` | 0 | 1 | Android only |
| `get_admin_account_deletion_queue` | 0 | 1 | Android only |
| `get_admin_business_media` | 0 | 1 | Android only |
| `get_admin_business_queue` | 0 | 1 | Android only |
| `get_admin_business_review_media` | 0 | 1 | Android only |
| `get_admin_business_verification_details` | 0 | 1 | Android only |
| `get_admin_partner_business_entity_types` | 0 | 1 | Android only |
| `get_admin_partner_document_expiry_metadata` | 0 | 1 | Android only |
| `get_admin_partner_reverification_queue` | 0 | 1 | Android only |
| `get_admin_payout_bank_account_queue` | 0 | 1 | Android only |
| `get_admin_report_evidence` | 0 | 1 | Android only |
| `get_admin_review_audit_log` | 0 | 1 | Android only |
| `get_admin_review_case_queue` | 0 | 1 | Android only |
| `get_admin_review_profile_summaries` | 0 | 1 | Android only |
| `get_admin_user_report_queue` | 0 | 1 | Android only |
| `get_admin_verification_identity_details` | 0 | 1 | Android only |
| `get_admin_verification_queue` | 0 | 1 | Android only |
| `get_business_detail` | 0 | 3 | Android only |
| `get_business_gallery` | 0 | 1 | Android only |
| `get_business_profile_extras` | 0 | 1 | Android only |
| `get_business_reviews` | 0 | 1 | Android only |
| `get_business_service_details` | 0 | 1 | Android only |
| `get_business_service_sales_settings` | 0 | 2 | Android only |
| `get_business_service_usage_status` | 0 | 1 | Android only |
| `get_business_services` | 0 | 1 | Android only |
| `get_communities` | 0 | 1 | Android only |
| `get_community_detail` | 0 | 1 | Android only |
| `get_community_member_profiles` | 0 | 1 | Android only |
| `get_community_messages` | 0 | 1 | Android only |
| `get_community_messages_v2` | 0 | 1 | Android only |
| `get_connection_presence_for_users_v1` | 0 | 1 | Android only |
| `get_context_live_locations` | 0 | 1 | Android only |
| `get_context_safety_alerts` | 0 | 1 | Android only |
| `get_context_safety_check_ins` | 0 | 1 | Android only |
| `get_conversation_partner_work_orders` | 0 | 1 | Android only |
| `get_dating_feed_profiles_v2` | 0 | 1 | Android only |
| `get_dating_feed_profiles_v3` | 0 | 1 | Android only |
| `get_dating_feed_profiles_v4` | 0 | 1 | Android only |
| `get_dating_feed_profiles_v5` | 0 | 1 | Android only |
| `get_dating_profile_photo_paths_v1` | 0 | 1 | Android only |
| `get_direct_chat_permission_v1` | 0 | 1 | Android only |
| `get_event_attendees` | 0 | 2 | Android only |
| `get_event_chat_languages` | 0 | 1 | Android only |
| `get_event_chat_messages` | 0 | 1 | Android only |
| `get_event_detail` | 0 | 1 | Android only |
| `get_friend_match_candidates` | 0 | 1 | Android only |
| `get_friend_match_candidates_v2` | 0 | 2 | Android only |
| `get_incoming_friend_requests` | 0 | 1 | Android only |
| `get_journey_timeline_entries` | 0 | 1 | Android only |
| `get_journey_timeline_summary` | 0 | 1 | Android only |
| `get_melo_chat_translation_v2` | 0 | 1 | Android only |
| `get_melo_live_notice_composer_state` | 0 | 1 | Android only |
| `get_moderation_queue` | 0 | 1 | Android only |
| `get_monetization_catalog` | 0 | 1 | Android only |
| `get_my_account_deletion_status_v2` | 0 | 1 | Android only |
| `get_my_active_live_locations` | 0 | 1 | Android only |
| `get_my_active_safety_alerts` | 0 | 1 | Android only |
| `get_my_active_trusted_live_location` | 0 | 3 | Android only |
| `get_my_admin_review_access` | 0 | 2 | Android only |
| `get_my_admin_review_home_status` | 0 | 1 | Android only |
| `get_my_ai_activity_summary` | 0 | 1 | Android only |
| `get_my_ai_compatibility_profile` | 0 | 1 | Android only |
| `get_my_ai_preferences` | 0 | 3 | Android only |
| `get_my_ai_travel_usage` | 0 | 1 | Android only |
| `get_my_ai_usage` | 0 | 2 | Android only |
| `get_my_blocked_profile_ids` | 0 | 5 | Android only |
| `get_my_blocked_users` | 0 | 1 | Android only |
| `get_my_business_account` | 0 | 1 | Android only |
| `get_my_business_bookings` | 0 | 2 | Android only |
| `get_my_business_chat_list` | 0 | 2 | Android only |
| `get_my_business_coupon_claims` | 0 | 2 | Android only |
| `get_my_business_inquiries` | 0 | 1 | Android only |
| `get_my_business_location_gallery` | 0 | 1 | Android only |
| `get_my_business_paid_orders` | 0 | 1 | Android only |
| `get_my_business_private_details` | 0 | 1 | Android only |
| `get_my_business_profile_extras` | 0 | 1 | Android only |
| `get_my_business_review_state` | 0 | 1 | Android only |
| `get_my_cached_ai_matches` | 0 | 2 | Android only |
| `get_my_chat_list` | 0 | 2 | Android only |
| `get_my_chat_unread_count` | 0 | 1 | Android only |
| `get_my_communities` | 0 | 1 | Android only |
| `get_my_community_chat_list` | 0 | 1 | Android only |
| `get_my_connection_intents_v1` | 0 | 1 | Android only |
| `get_my_display_name_change_status` | 0 | 1 | Android only |
| `get_my_event_chat_list` | 0 | 1 | Android only |
| `get_my_events` | 0 | 2 | Android only |
| `get_my_friend_connections` | 0 | 1 | Android only |
| `get_my_friend_preferences` | 0 | 1 | Android only |
| `get_my_friend_preferences_v2` | 0 | 1 | Android only |
| `get_my_identity_verification_details` | 0 | 1 | Android only |
| `get_my_incoming_like_ids` | 0 | 1 | Android only |
| `get_my_journey_timeline_entry` | 0 | 1 | Android only |
| `get_my_melo_quest_reward_admin_access_v1` | 0 | 1 | Android only |
| `get_my_melo_quest_summary_v1` | 0 | 1 | Android only |
| `get_my_melo_reward_balance_v1` | 0 | 2 | Android only |
| `get_my_moderation_access` | 0 | 1 | Android only |
| `get_my_monetization_orders` | 0 | 1 | Android only |
| `get_my_monetization_summary` | 0 | 1 | Android only |
| `get_my_mutual_love_connection_ids_v1` | 0 | 1 | Android only |
| `get_my_nearby_preference` | 0 | 1 | Android only |
| `get_my_notification_center_unread_count` | 0 | 1 | Android only |
| `get_my_notifications` | 0 | 1 | Android only |
| `get_my_owned_partner_businesses` | 0 | 1 | Android only |
| `get_my_package_entitlements` | 0 | 1 | Android only |
| `get_my_partner_approved_document_replacements` | 0 | 1 | Android only |
| `get_my_partner_booking_offers` | 0 | 1 | Android only |
| `get_my_partner_bookings` | 0 | 2 | Android only |
| `get_my_partner_businesses` | 0 | 2 | Android only |
| `get_my_partner_coupons` | 0 | 2 | Android only |
| `get_my_partner_document_expiry_metadata` | 0 | 1 | Android only |
| `get_my_partner_finance_demo_accounts` | 0 | 1 | Android only |
| `get_my_partner_finance_demo_summary` | 0 | 1 | Android only |
| `get_my_partner_finance_demo_withdrawals` | 0 | 1 | Android only |
| `get_my_partner_mode` | 0 | 1 | Android only |
| `get_my_partner_paid_orders` | 0 | 1 | Android only |
| `get_my_partner_paid_orders_complete` | 0 | 1 | Android only |
| `get_my_partner_payout_accounts` | 0 | 1 | Android only |
| `get_my_partner_reverification_status` | 0 | 1 | Android only |
| `get_my_partner_service_orders` | 0 | 1 | Android only |
| `get_my_partner_wallet_summary_v2` | 0 | 1 | Android only |
| `get_my_partner_withdrawal_requests_v2` | 0 | 1 | Android only |
| `get_my_safety_check_ins` | 0 | 1 | Android only |
| `get_my_saved_partner_service_ids` | 0 | 1 | Android only |
| `get_my_saved_partner_services` | 0 | 1 | Android only |
| `get_my_temporary_activity_chat_list` | 0 | 2 | Android only |
| `get_my_trip_chat_list` | 0 | 1 | Android only |
| `get_my_trips` | 0 | 2 | Android only |
| `get_my_verification` | 1 | 1 | Shared |
| `get_nearby_events` | 0 | 1 | Android only |
| `get_nearby_people` | 0 | 1 | Android only |
| `get_nearby_trips` | 0 | 1 | Android only |
| `get_or_create_business_conversation` | 0 | 1 | Android only |
| `get_or_create_connected_direct_conversation_v1` | 0 | 1 | Android only |
| `get_owned_storage_objects_for_account_deletion_v2` | 0 | 1 | Android only |
| `get_partner_booking_offers` | 0 | 1 | Android only |
| `get_partner_business_chat_pins` | 0 | 1 | Android only |
| `get_partner_business_chat_statuses` | 0 | 1 | Android only |
| `get_partner_business_entity_type` | 0 | 1 | Android only |
| `get_partner_business_identities` | 0 | 2 | Android only |
| `get_partner_business_services` | 0 | 1 | Android only |
| `get_partner_business_verification_details` | 0 | 1 | Android only |
| `get_partner_dashboard_summary` | 0 | 1 | Android only |
| `get_partner_order_customers` | 0 | 1 | Android only |
| `get_partner_order_services` | 0 | 1 | Android only |
| `get_partner_recent_activity` | 0 | 1 | Android only |
| `get_partner_service_orders` | 0 | 1 | Android only |
| `get_partner_staff` | 0 | 1 | Android only |
| `get_phase26_attendance_members` | 0 | 3 | Android only |
| `get_phase26_attendance_overview` | 0 | 1 | Android only |
| `get_phase26_reputation_metrics` | 0 | 1 | Android only |
| `get_phase26_reputation_reviews` | 0 | 1 | Android only |
| `get_phase26_review_eligibility` | 0 | 1 | Android only |
| `get_phase27_activity_access` | 0 | 2 | Android only |
| `get_phase27_activity_audit` | 0 | 1 | Android only |
| `get_phase27_activity_management_state` | 0 | 1 | Android only |
| `get_phase27_activity_reminders` | 0 | 1 | Android only |
| `get_phase27_activity_team` | 0 | 2 | Android only |
| `get_phase27_trip_join_requests` | 0 | 1 | Android only |
| `get_phase28_privacy_status` | 0 | 1 | Android only |
| `get_prelaunch_test_data_counts` | 0 | 1 | Android only |
| `get_public_events` | 0 | 1 | Android only |
| `get_public_trips` | 0 | 1 | Android only |
| `get_reputation_reviews` | 1 | 1 | Shared |
| `get_reputation_summary` | 2 | 2 | Shared |
| `get_social_feed` | 0 | 1 | Android only |
| `get_social_post_comments` | 0 | 1 | Android only |
| `get_social_post_titles` | 0 | 1 | Android only |
| `get_travel_passport_badges` | 0 | 1 | Android only |
| `get_travel_passport_stamps` | 0 | 1 | Android only |
| `get_travel_passport_summary` | 0 | 1 | Android only |
| `get_trip_album_items` | 0 | 1 | Android only |
| `get_trip_chat_languages` | 0 | 1 | Android only |
| `get_trip_chat_messages` | 0 | 1 | Android only |
| `get_trip_detail` | 0 | 1 | Android only |
| `get_trip_expense_balances` | 0 | 1 | Android only |
| `get_trip_expense_settlements` | 0 | 1 | Android only |
| `get_trip_expenses` | 0 | 1 | Android only |
| `get_trip_member_profiles` | 0 | 2 | Android only |
| `get_trip_shared_members` | 0 | 1 | Android only |
| `get_trusted_live_location` | 0 | 1 | Android only |
| `has_approved_business_chat_access` | 0 | 1 | Android only |
| `join_community` | 0 | 1 | Android only |
| `join_event` | 0 | 1 | Android only |
| `leave_community` | 0 | 1 | Android only |
| `leave_event` | 0 | 1 | Android only |
| `leave_trip` | 0 | 1 | Android only |
| `list_active_melo_live_notices` | 0 | 1 | Android only |
| `list_admin_melo_live_notice_history` | 0 | 1 | Android only |
| `list_admin_review_staff` | 0 | 1 | Android only |
| `list_melo_reward_catalog_v1` | 0 | 1 | Android only |
| `list_my_melo_live_notice_history` | 0 | 1 | Android only |
| `list_my_melo_reward_wallet_v1` | 0 | 1 | Android only |
| `list_trusted_live_locations_shared_with_me_v2` | 0 | 1 | Android only |
| `log_phase28_app_error` | 0 | 1 | Android only |
| `mark_all_my_notification_center_read` | 0 | 1 | Android only |
| `mark_chat_conversation_read` | 0 | 1 | Android only |
| `mark_my_business_material_change` | 0 | 1 | Android only |
| `mark_my_chat_notifications_read` | 0 | 1 | Android only |
| `mark_my_notification_read` | 0 | 1 | Android only |
| `melo_business_for_viewer` | 0 | 1 | Android only |
| `melo_business_services_for_viewer` | 0 | 1 | Android only |
| `melo_cancel_attendance_v2` | 0 | 1 | Android only |
| `melo_cancel_attendance_v4` | 0 | 1 | Android only |
| `melo_checkin_with_gps_v2` | 0 | 1 | Android only |
| `melo_checkin_with_gps_v4` | 0 | 1 | Android only |
| `melo_checkin_with_qr_v2` | 0 | 1 | Android only |
| `melo_checkin_with_qr_v4` | 0 | 1 | Android only |
| `melo_close_attendance_checkin_v2` | 0 | 1 | Android only |
| `melo_close_attendance_checkin_v4` | 0 | 1 | Android only |
| `melo_get_attendance_members_v2` | 0 | 3 | Android only |
| `melo_get_attendance_members_v4` | 0 | 3 | Android only |
| `melo_get_attendance_overview_v2` | 0 | 2 | Android only |
| `melo_get_attendance_overview_v4` | 0 | 1 | Android only |
| `melo_leave_activity_reset_attendance_v1` | 0 | 2 | Android only |
| `melo_mark_chat_notifications_read_v2` | 0 | 1 | Android only |
| `melo_open_attendance_checkin_v2` | 0 | 1 | Android only |
| `melo_open_attendance_checkin_v4` | 0 | 1 | Android only |
| `melo_partner_chat_notification_recipients` | 0 | 2 | Android only |
| `melo_partner_payout_verification_approved` | 0 | 2 | Android only |
| `melo_public_business_service_summaries` | 0 | 1 | Android only |
| `melo_public_businesses` | 0 | 3 | Android only |
| `melo_reverification_gate_batch` | 0 | 2 | Android only |
| `melo_set_attendance_status_v2` | 0 | 1 | Android only |
| `melo_set_attendance_status_v4` | 0 | 1 | Android only |
| `melo_validate_attendance_day_v1` | 0 | 1 | Android only |
| `melo_verify_location_checkin_v2` | 0 | 1 | Android only |
| `notify_trusted_live_location_sos` | 0 | 1 | Android only |
| `notify_trusted_live_location_sos_v2` | 0 | 1 | Android only |
| `open_phase27_activity_checkin` | 0 | 1 | Android only |
| `partner_cancel_booking_offer` | 0 | 1 | Android only |
| `partner_cancel_service_order` | 0 | 1 | Android only |
| `partner_create_booking_offer` | 0 | 1 | Android only |
| `partner_create_service_order` | 0 | 1 | Android only |
| `partner_delete_business_service` | 0 | 1 | Android only |
| `partner_save_business_service` | 0 | 1 | Android only |
| `partner_set_business_service_active` | 0 | 1 | Android only |
| `phase26_checkin_with_gps` | 0 | 1 | Android only |
| `phase26_checkin_with_qr` | 0 | 1 | Android only |
| `phase28_health_check` | 0 | 1 | Android only |
| `preview_melo_reward_use_v1` | 0 | 1 | Android only |
| `record_partner_wallet_withdrawal_provider` | 0 | 1 | Android only |
| `record_social_post_share` | 0 | 1 | Android only |
| `record_trip_expense_settlement` | 0 | 1 | Android only |
| `redeem_melo_reward_v1` | 0 | 1 | Android only |
| `redeem_my_business_coupon` | 0 | 1 | Android only |
| `refresh_my_journey_timeline` | 0 | 1 | Android only |
| `refresh_my_melo_quest_progress_v2` | 0 | 1 | Android only |
| `refresh_my_travel_passport` | 0 | 1 | Android only |
| `refund_my_translation_credit` | 0 | 1 | Android only |
| `register_push_device` | 0 | 1 | Android only |
| `remove_friend_connection` | 0 | 1 | Android only |
| `remove_my_business_gallery_image` | 0 | 1 | Android only |
| `remove_partner_staff_member` | 0 | 1 | Android only |
| `remove_phase27_activity_member` | 0 | 1 | Android only |
| `remove_phase27_activity_role` | 0 | 1 | Android only |
| `replace_my_business_media` | 0 | 1 | Android only |
| `replace_my_journey_timeline_cover` | 0 | 1 | Android only |
| `report_social_post` | 0 | 1 | Android only |
| `request_admin_business_revision` | 0 | 1 | Android only |
| `request_to_join_trip` | 0 | 1 | Android only |
| `reserve_my_translation_credit` | 0 | 1 | Android only |
| `reserve_partner_wallet_withdrawal_v2` | 0 | 1 | Android only |
| `resolve_admin_account_deletion_request` | 0 | 1 | Android only |
| `resolve_admin_business_request` | 0 | 1 | Android only |
| `resolve_admin_partner_reverification` | 0 | 1 | Android only |
| `resolve_admin_payout_bank_account` | 0 | 1 | Android only |
| `resolve_admin_review_case` | 0 | 1 | Android only |
| `resolve_admin_user_report` | 0 | 1 | Android only |
| `resolve_admin_verification_request` | 0 | 1 | Android only |
| `resolve_moderation_report` | 0 | 1 | Android only |
| `resolve_my_partner_finance_demo_withdrawal` | 0 | 1 | Android only |
| `resolve_safety_alert` | 0 | 1 | Android only |
| `resolve_trusted_live_location_sos` | 0 | 1 | Android only |
| `respond_partner_work_order` | 0 | 1 | Android only |
| `respond_to_friend_request` | 0 | 1 | Android only |
| `respond_to_partner_booking_offer` | 0 | 1 | Android only |
| `respond_to_partner_service_order` | 0 | 1 | Android only |
| `review_phase27_trip_join_request` | 0 | 1 | Android only |
| `save_business_service_sales_settings` | 0 | 1 | Android only |
| `save_chat_message_translation` | 0 | 1 | Android only |
| `save_community_chat_message_translation` | 0 | 1 | Android only |
| `save_event_chat_message_translation` | 0 | 1 | Android only |
| `save_melo_chat_translation_v2` | 0 | 1 | Android only |
| `save_my_ai_compatibility_profile` | 0 | 1 | Android only |
| `save_my_ai_preferences` | 0 | 1 | Android only |
| `save_my_business_account_draft` | 0 | 1 | Android only |
| `save_my_business_private_details` | 0 | 1 | Android only |
| `save_my_business_profile_extras` | 0 | 1 | Android only |
| `save_my_business_review` | 0 | 1 | Android only |
| `save_my_business_service` | 0 | 1 | Android only |
| `save_my_business_service_details` | 0 | 1 | Android only |
| `save_my_connection_intents_v1` | 0 | 1 | Android only |
| `save_my_friend_preferences` | 0 | 1 | Android only |
| `save_my_friend_preferences_v2` | 0 | 1 | Android only |
| `save_my_journey_timeline_preferences` | 0 | 1 | Android only |
| `save_my_nearby_location` | 0 | 1 | Android only |
| `save_my_partner_document_expiry_metadata` | 0 | 1 | Android only |
| `save_my_partner_payout_account` | 0 | 1 | Android only |
| `save_my_travel_passport_preferences` | 0 | 1 | Android only |
| `save_partner_business_entity_type` | 0 | 1 | Android only |
| `save_partner_business_verification_details` | 0 | 1 | Android only |
| `save_trip_chat_message_translation` | 0 | 1 | Android only |
| `schedule_my_account_deletion_v2` | 0 | 1 | Android only |
| `seed_my_partner_finance_demo` | 0 | 1 | Android only |
| `send_business_inquiry` | 0 | 1 | Android only |
| `send_community_message` | 0 | 1 | Android only |
| `send_community_message_v2` | 0 | 1 | Android only |
| `send_event_chat_message` | 0 | 1 | Android only |
| `send_friend_request` | 0 | 1 | Android only |
| `send_trip_chat_message` | 0 | 1 | Android only |
| `set_admin_review_staff_active` | 0 | 1 | Android only |
| `set_my_business_inquiry_status` | 0 | 1 | Android only |
| `set_my_business_location` | 0 | 1 | Android only |
| `set_my_business_service_active` | 0 | 1 | Android only |
| `set_my_business_visibility` | 0 | 1 | Android only |
| `set_my_partner_default_payout_account` | 0 | 1 | Android only |
| `set_my_partner_mode` | 0 | 1 | Android only |
| `set_partner_business_chat_pin` | 0 | 1 | Android only |
| `set_partner_business_chat_status` | 0 | 1 | Android only |
| `set_partner_service_saved` | 0 | 1 | Android only |
| `set_phase27_activity_lifecycle` | 0 | 1 | Android only |
| `set_phase27_activity_membership_open` | 0 | 1 | Android only |
| `set_phase27_activity_reminder_enabled` | 0 | 1 | Android only |
| `set_phase27_activity_role` | 0 | 1 | Android only |
| `set_phase27_attendance_status` | 0 | 1 | Android only |
| `set_profile_favorite` | 0 | 1 | Android only |
| `set_profile_like` | 0 | 1 | Android only |
| `set_social_post_title` | 0 | 1 | Android only |
| `start_live_location` | 0 | 1 | Android only |
| `start_melo_quest_v1` | 0 | 1 | Android only |
| `start_trusted_live_location` | 0 | 1 | Android only |
| `stop_live_location` | 0 | 1 | Android only |
| `stop_my_nearby_sharing` | 0 | 1 | Android only |
| `stop_trusted_live_location` | 0 | 1 | Android only |
| `submit_admin_verification_request` | 0 | 1 | Android only |
| `submit_identity_verification_details` | 0 | 1 | Android only |
| `submit_my_business_account` | 0 | 1 | Android only |
| `submit_my_business_account_for_review` | 0 | 1 | Android only |
| `submit_my_partner_document_reverification` | 0 | 1 | Android only |
| `submit_my_partner_payout_account` | 0 | 1 | Android only |
| `submit_my_partner_reverification` | 0 | 1 | Android only |
| `submit_phase26_reputation_review` | 0 | 1 | Android only |
| `submit_phase26_review_case` | 0 | 1 | Android only |
| `submit_user_report` | 0 | 1 | Android only |
| `submit_verification_request` | 0 | 1 | Android only |
| `super_admin_set_profile_like` | 0 | 1 | Android only |
| `toggle_social_post_like` | 0 | 1 | Android only |
| `toggle_social_post_save` | 0 | 1 | Android only |
| `transfer_phase27_activity_ownership` | 0 | 1 | Android only |
| `unblock_user` | 0 | 1 | Android only |
| `update_live_location` | 0 | 1 | Android only |
| `update_my_business_booking` | 0 | 1 | Android only |
| `update_my_journey_timeline_entry` | 0 | 1 | Android only |
| `update_partner_business_account` | 0 | 1 | Android only |
| `update_partner_staff_member` | 0 | 1 | Android only |
| `update_phase27_community_activity` | 0 | 1 | Android only |
| `update_phase27_event_activity` | 0 | 1 | Android only |
| `update_phase27_trip_activity` | 0 | 1 | Android only |
| `update_trusted_live_location` | 0 | 1 | Android only |
| `upsert_admin_review_staff` | 0 | 1 | Android only |
| `upsert_partner_staff_by_email` | 0 | 1 | Android only |
| `use_melo_reward_v1` | 0 | 1 | Android only |

## Supabase Edge Functions

| Name | Web | Android | Status |
|---|---:|---:|---|
| `ai-conversation-assistant` | 0 | 1 | Android only |
| `ai-matching` | 0 | 1 | Android only |
| `ai-travel-planner` | 0 | 1 | Android only |
| `ai-trip-place-search` | 0 | 1 | Android only |
| `ai-trip-route-optimize` | 0 | 1 | Android only |
| `business-nearby-places` | 0 | 1 | Android only |
| `ensure-activity-join-notification` | 0 | 1 | Android only |
| `ensure-attendance-checkin-notification` | 0 | 1 | Android only |
| `ensure-attendance-confirmation-notification` | 0 | 1 | Android only |
| `ensure-attendance-open-notification` | 0 | 1 | Android only |
| `ensure-partner-commerce-notification` | 0 | 1 | Android only |
| `ensure-trip-join-notification` | 0 | 1 | Android only |
| `ensure-trip-review-notification` | 0 | 1 | Android only |
| `ensure-trusted-live-location-share` | 0 | 1 | Android only |
| `ensure-trusted-live-sos-notification` | 0 | 1 | Android only |
| `notify-chat-message` | 0 | 1 | Android only |
| `partner-check-promptpay-payment` | 0 | 1 | Android only |
| `partner-confirm-redemption` | 0 | 1 | Android only |
| `partner-connect-dashboard` | 0 | 1 | Android only |
| `partner-connect-onboarding` | 0 | 1 | Android only |
| `partner-connect-status` | 0 | 1 | Android only |
| `partner-create-promptpay-payment` | 0 | 1 | Android only |
| `partner-create-redemption` | 0 | 1 | Android only |
| `partner-create-withdrawal` | 0 | 1 | Android only |
| `partner-preview-redemption` | 0 | 1 | Android only |
| `translate-message` | 0 | 1 | Android only |
| `trip-emergency-info` | 0 | 1 | Android only |
| `verify-store-purchase` | 0 | 1 | Android only |

## Supabase Storage buckets

| Name | Web | Android | Status |
|---|---:|---:|---|
| `report-evidence` | 0 | 1 | Android only |

## High-risk findings

| Severity | Web file | Finding |
|---|---|---|
| HIGH | `components/chat/ChatConversationPane.tsx` | Chat contains fallback text "Melo member"; verify profile display-name resolution. |
| HIGH | `components/chat/chatData.ts` | Chat contains fallback text "Melo member"; verify profile display-name resolution. |
| HIGH | `components/chat/chatIdentity.ts` | Chat contains fallback text "Melo member"; verify profile display-name resolution. |
| HIGH | `components/chat/DirectChatExperience.tsx` | Chat reads sender fields but no active Business/Partner identity token was detected. |
| HIGH | `components/activity/ActivityChatExperience.tsx` | Chat contains fallback text "Melo member"; verify profile display-name resolution. |
| HIGH | `components/activity/ActivityChatExperience.tsx` | Chat reads sender fields but no active Business/Partner identity token was detected. |
| MEDIUM | `app/api/place-search/route.ts` | Web location source differs from Android ai-trip-place-search baseline. |
| MEDIUM | `app/api/place-reverse/route.ts` | Web location source differs from Android ai-trip-place-search baseline. |

## Web data-access files with no matching Android reference

None.

## Android data references not found anywhere in Web

### tables

- `activity_chat_policies`
- `activity_emergency_shares`
- `activity_gallery_images`
- `admin_review_staff`
- `ai_compatibility_profiles`
- `ai_match_results`
- `ai_travel_plans`
- `ai_travel_usage_daily`
- `ai_usage_daily`
- `app_notifications`
- `business-media`
- `business-verification-private`
- `business_service_details`
- `business_services`
- `businesses`
- `chat_conversation_members`
- `chat_messages`
- `communities`
- `friend_preferences`
- `group_chat_preferences`
- `melo_account_deletions`
- `melo_attendance_records_v2`
- `melo_attendance_sessions_v2`
- `melo_quests_v1`
- `melo_user_quest_progress_v1`
- `melo_verified_locations_v2`
- `monetization_products`
- `notification_push_delivery_log`
- `partner-payout-verification-private`
- `partner_paid_orders`
- `partner_payout_accounts`
- `partner_payout_bank_accounts`
- `partner_withdrawal_requests`
- `profile_favorites`
- `profile_likes`
- `profile_matches`
- `push_devices`
- `report-evidence`
- `safety_live_location_viewer_index`
- `safety_medical_profiles`
- `trip_interests`
- `trip_itinerary`
- `trip_stops`
- `trusted_live_location_history`
- `trusted_live_location_sos_states`
- `verification-private`

### rpc

- `add_my_business_gallery_image`
- `admin_get_melo_quest_reward_stats_v1`
- `admin_list_melo_quests_v1`
- `admin_list_melo_rewards_v1`
- `admin_set_melo_quest_active_v1`
- `admin_set_melo_reward_active_v1`
- `admin_upsert_melo_quest_v1`
- `admin_upsert_melo_reward_v1`
- `apply_verified_store_purchase`
- `archive_phase27_activity`
- `attach_report_evidence`
- `begin_my_payout_reverification`
- `block_user`
- `can_access_event_chat`
- `can_access_trip_chat`
- `can_publish_activity_chat_announcement`
- `can_review_user`
- `cancel_friend_request`
- `cancel_my_account_deletion_v2`
- `cancel_my_partner_booking`
- `cancel_partner_work_order`
- `cancel_phase26_attendance`
- `cancel_safety_check_in`
- `claim_partner_coupon`
- `clear_my_partner_finance_demo`
- `clear_prelaunch_test_data`
- `close_phase27_activity_checkin`
- `commit_my_translation_credit`
- `complete_safety_check_in`
- `confirm_business_service_usage`
- `consume_ai_quota`
- `consume_ai_travel_quota`
- `consume_phase28_rate_limit`
- `create_activity_chat_announcement`
- `create_admin_melo_live_notice`
- `create_community`
- `create_event`
- `create_melo_live_notice`
- `create_monetization_order`
- `create_my_journey_timeline_entry`
- `create_my_partner_finance_demo_withdrawal`
- `create_partner_booking`
- `create_partner_business_account`
- `create_partner_work_order`
- `create_phase27_activity_reminder`
- `create_safety_alert`
- `create_safety_check_in`
- `create_social_post_comment`
- `create_store_monetization_order`
- `create_trip`
- `create_trip_album_item`
- `create_trip_expense`
- `create_trusted_live_location_sos`
- `deactivate_admin_melo_live_notice`
- `deactivate_all_my_push_devices`
- `deactivate_push_device`
- `delete_my_business_service`
- `delete_my_journey_timeline_entry`
- `delete_my_partner_payout_account`
- `delete_phase27_activity_reminder`
- `delete_social_post`
- `delete_social_post_comment`
- `delete_trip_album_item`
- `delete_trip_expense`
- `delete_trip_expense_settlement`
- `export_my_melo_data`
- `express_friend_to_love_interest_v1`
- `fail_partner_wallet_withdrawal`
- `finalize_partner_paid_order_redemption_to_wallet`
- `finalize_partner_wallet_withdrawal_v2`
- `get_activity_chat_announcements`
- `get_activity_chat_lifecycle`
- `get_admin_account_deletion_queue`
- `get_admin_business_media`
- `get_admin_business_queue`
- `get_admin_business_review_media`
- `get_admin_business_verification_details`
- `get_admin_partner_business_entity_types`
- `get_admin_partner_document_expiry_metadata`
- `get_admin_partner_reverification_queue`
- `get_admin_payout_bank_account_queue`
- `get_admin_report_evidence`
- `get_admin_review_audit_log`
- `get_admin_review_case_queue`
- `get_admin_review_profile_summaries`
- `get_admin_user_report_queue`
- `get_admin_verification_identity_details`
- `get_admin_verification_queue`
- `get_business_detail`
- `get_business_gallery`
- `get_business_profile_extras`
- `get_business_reviews`
- `get_business_service_details`
- `get_business_service_sales_settings`
- `get_business_service_usage_status`
- `get_business_services`
- `get_communities`
- `get_community_detail`
- `get_community_member_profiles`
- `get_community_messages`
- `get_community_messages_v2`
- `get_connection_presence_for_users_v1`
- `get_context_live_locations`
- `get_context_safety_alerts`
- `get_context_safety_check_ins`
- `get_conversation_partner_work_orders`
- `get_dating_feed_profiles_v2`
- `get_dating_feed_profiles_v3`
- `get_dating_feed_profiles_v4`
- `get_dating_feed_profiles_v5`
- `get_dating_profile_photo_paths_v1`
- `get_direct_chat_permission_v1`
- `get_event_attendees`
- `get_event_chat_languages`
- `get_event_chat_messages`
- `get_event_detail`
- `get_friend_match_candidates`
- `get_friend_match_candidates_v2`
- `get_incoming_friend_requests`
- `get_journey_timeline_entries`
- `get_journey_timeline_summary`
- `get_melo_chat_translation_v2`
- `get_melo_live_notice_composer_state`
- `get_moderation_queue`
- `get_monetization_catalog`
- `get_my_account_deletion_status_v2`
- `get_my_active_live_locations`
- `get_my_active_safety_alerts`
- `get_my_active_trusted_live_location`
- `get_my_admin_review_access`
- `get_my_admin_review_home_status`
- `get_my_ai_activity_summary`
- `get_my_ai_compatibility_profile`
- `get_my_ai_preferences`
- `get_my_ai_travel_usage`
- `get_my_ai_usage`
- `get_my_blocked_profile_ids`
- `get_my_blocked_users`
- `get_my_business_account`
- `get_my_business_bookings`
- `get_my_business_chat_list`
- `get_my_business_coupon_claims`
- `get_my_business_inquiries`
- `get_my_business_location_gallery`
- `get_my_business_paid_orders`
- `get_my_business_private_details`
- `get_my_business_profile_extras`
- `get_my_business_review_state`
- `get_my_cached_ai_matches`
- `get_my_chat_list`
- `get_my_chat_unread_count`
- `get_my_communities`
- `get_my_community_chat_list`
- `get_my_connection_intents_v1`
- `get_my_display_name_change_status`
- `get_my_event_chat_list`
- `get_my_events`
- `get_my_friend_connections`
- `get_my_friend_preferences`
- `get_my_friend_preferences_v2`
- `get_my_identity_verification_details`
- `get_my_incoming_like_ids`
- `get_my_journey_timeline_entry`
- `get_my_melo_quest_reward_admin_access_v1`
- `get_my_melo_quest_summary_v1`
- `get_my_melo_reward_balance_v1`
- `get_my_moderation_access`
- `get_my_monetization_orders`
- `get_my_monetization_summary`
- `get_my_mutual_love_connection_ids_v1`
- `get_my_nearby_preference`
- `get_my_notification_center_unread_count`
- `get_my_notifications`
- `get_my_owned_partner_businesses`
- `get_my_package_entitlements`
- `get_my_partner_approved_document_replacements`
- `get_my_partner_booking_offers`
- `get_my_partner_bookings`
- `get_my_partner_businesses`
- `get_my_partner_coupons`
- `get_my_partner_document_expiry_metadata`
- `get_my_partner_finance_demo_accounts`
- `get_my_partner_finance_demo_summary`
- `get_my_partner_finance_demo_withdrawals`
- `get_my_partner_mode`
- `get_my_partner_paid_orders`
- `get_my_partner_paid_orders_complete`
- `get_my_partner_payout_accounts`
- `get_my_partner_reverification_status`
- `get_my_partner_service_orders`
- `get_my_partner_wallet_summary_v2`
- `get_my_partner_withdrawal_requests_v2`
- `get_my_safety_check_ins`
- `get_my_saved_partner_service_ids`
- `get_my_saved_partner_services`
- `get_my_temporary_activity_chat_list`
- `get_my_trip_chat_list`
- `get_my_trips`
- `get_nearby_events`
- `get_nearby_people`
- `get_nearby_trips`
- `get_or_create_business_conversation`
- `get_or_create_connected_direct_conversation_v1`
- `get_owned_storage_objects_for_account_deletion_v2`
- `get_partner_booking_offers`
- `get_partner_business_chat_pins`
- `get_partner_business_chat_statuses`
- `get_partner_business_entity_type`
- `get_partner_business_identities`
- `get_partner_business_services`
- `get_partner_business_verification_details`
- `get_partner_dashboard_summary`
- `get_partner_order_customers`
- `get_partner_order_services`
- `get_partner_recent_activity`
- `get_partner_service_orders`
- `get_partner_staff`
- `get_phase26_attendance_members`
- `get_phase26_attendance_overview`
- `get_phase26_reputation_metrics`
- `get_phase26_reputation_reviews`
- `get_phase26_review_eligibility`
- `get_phase27_activity_access`
- `get_phase27_activity_audit`
- `get_phase27_activity_management_state`
- `get_phase27_activity_reminders`
- `get_phase27_activity_team`
- `get_phase27_trip_join_requests`
- `get_phase28_privacy_status`
- `get_prelaunch_test_data_counts`
- `get_public_events`
- `get_public_trips`
- `get_social_feed`
- `get_social_post_comments`
- `get_social_post_titles`
- `get_travel_passport_badges`
- `get_travel_passport_stamps`
- `get_travel_passport_summary`
- `get_trip_album_items`
- `get_trip_chat_languages`
- `get_trip_chat_messages`
- `get_trip_detail`
- `get_trip_expense_balances`
- `get_trip_expense_settlements`
- `get_trip_expenses`
- `get_trip_member_profiles`
- `get_trip_shared_members`
- `get_trusted_live_location`
- `has_approved_business_chat_access`
- `join_community`
- `join_event`
- `leave_community`
- `leave_event`
- `leave_trip`
- `list_active_melo_live_notices`
- `list_admin_melo_live_notice_history`
- `list_admin_review_staff`
- `list_melo_reward_catalog_v1`
- `list_my_melo_live_notice_history`
- `list_my_melo_reward_wallet_v1`
- `list_trusted_live_locations_shared_with_me_v2`
- `log_phase28_app_error`
- `mark_all_my_notification_center_read`
- `mark_chat_conversation_read`
- `mark_my_business_material_change`
- `mark_my_chat_notifications_read`
- `mark_my_notification_read`
- `melo_business_for_viewer`
- `melo_business_services_for_viewer`
- `melo_cancel_attendance_v2`
- `melo_cancel_attendance_v4`
- `melo_checkin_with_gps_v2`
- `melo_checkin_with_gps_v4`
- `melo_checkin_with_qr_v2`
- `melo_checkin_with_qr_v4`
- `melo_close_attendance_checkin_v2`
- `melo_close_attendance_checkin_v4`
- `melo_get_attendance_members_v2`
- `melo_get_attendance_members_v4`
- `melo_get_attendance_overview_v2`
- `melo_get_attendance_overview_v4`
- `melo_leave_activity_reset_attendance_v1`
- `melo_mark_chat_notifications_read_v2`
- `melo_open_attendance_checkin_v2`
- `melo_open_attendance_checkin_v4`
- `melo_partner_chat_notification_recipients`
- `melo_partner_payout_verification_approved`
- `melo_public_business_service_summaries`
- `melo_public_businesses`
- `melo_reverification_gate_batch`
- `melo_set_attendance_status_v2`
- `melo_set_attendance_status_v4`
- `melo_validate_attendance_day_v1`
- `melo_verify_location_checkin_v2`
- `notify_trusted_live_location_sos`
- `notify_trusted_live_location_sos_v2`
- `open_phase27_activity_checkin`
- `partner_cancel_booking_offer`
- `partner_cancel_service_order`
- `partner_create_booking_offer`
- `partner_create_service_order`
- `partner_delete_business_service`
- `partner_save_business_service`
- `partner_set_business_service_active`
- `phase26_checkin_with_gps`
- `phase26_checkin_with_qr`
- `phase28_health_check`
- `preview_melo_reward_use_v1`
- `record_partner_wallet_withdrawal_provider`
- `record_social_post_share`
- `record_trip_expense_settlement`
- `redeem_melo_reward_v1`
- `redeem_my_business_coupon`
- `refresh_my_journey_timeline`
- `refresh_my_melo_quest_progress_v2`
- `refresh_my_travel_passport`
- `refund_my_translation_credit`
- `register_push_device`
- `remove_friend_connection`
- `remove_my_business_gallery_image`
- `remove_partner_staff_member`
- `remove_phase27_activity_member`
- `remove_phase27_activity_role`
- `replace_my_business_media`
- `replace_my_journey_timeline_cover`
- `report_social_post`
- `request_admin_business_revision`
- `request_to_join_trip`
- `reserve_my_translation_credit`
- `reserve_partner_wallet_withdrawal_v2`
- `resolve_admin_account_deletion_request`
- `resolve_admin_business_request`
- `resolve_admin_partner_reverification`
- `resolve_admin_payout_bank_account`
- `resolve_admin_review_case`
- `resolve_admin_user_report`
- `resolve_admin_verification_request`
- `resolve_moderation_report`
- `resolve_my_partner_finance_demo_withdrawal`
- `resolve_safety_alert`
- `resolve_trusted_live_location_sos`
- `respond_partner_work_order`
- `respond_to_friend_request`
- `respond_to_partner_booking_offer`
- `respond_to_partner_service_order`
- `review_phase27_trip_join_request`
- `save_business_service_sales_settings`
- `save_chat_message_translation`
- `save_community_chat_message_translation`
- `save_event_chat_message_translation`
- `save_melo_chat_translation_v2`
- `save_my_ai_compatibility_profile`
- `save_my_ai_preferences`
- `save_my_business_account_draft`
- `save_my_business_private_details`
- `save_my_business_profile_extras`
- `save_my_business_review`
- `save_my_business_service`
- `save_my_business_service_details`
- `save_my_connection_intents_v1`
- `save_my_friend_preferences`
- `save_my_friend_preferences_v2`
- `save_my_journey_timeline_preferences`
- `save_my_nearby_location`
- `save_my_partner_document_expiry_metadata`
- `save_my_partner_payout_account`
- `save_my_travel_passport_preferences`
- `save_partner_business_entity_type`
- `save_partner_business_verification_details`
- `save_trip_chat_message_translation`
- `schedule_my_account_deletion_v2`
- `seed_my_partner_finance_demo`
- `send_business_inquiry`
- `send_community_message`
- `send_community_message_v2`
- `send_event_chat_message`
- `send_friend_request`
- `send_trip_chat_message`
- `set_admin_review_staff_active`
- `set_my_business_inquiry_status`
- `set_my_business_location`
- `set_my_business_service_active`
- `set_my_business_visibility`
- `set_my_partner_default_payout_account`
- `set_my_partner_mode`
- `set_partner_business_chat_pin`
- `set_partner_business_chat_status`
- `set_partner_service_saved`
- `set_phase27_activity_lifecycle`
- `set_phase27_activity_membership_open`
- `set_phase27_activity_reminder_enabled`
- `set_phase27_activity_role`
- `set_phase27_attendance_status`
- `set_profile_favorite`
- `set_profile_like`
- `set_social_post_title`
- `start_live_location`
- `start_melo_quest_v1`
- `start_trusted_live_location`
- `stop_live_location`
- `stop_my_nearby_sharing`
- `stop_trusted_live_location`
- `submit_admin_verification_request`
- `submit_identity_verification_details`
- `submit_my_business_account`
- `submit_my_business_account_for_review`
- `submit_my_partner_document_reverification`
- `submit_my_partner_payout_account`
- `submit_my_partner_reverification`
- `submit_phase26_reputation_review`
- `submit_phase26_review_case`
- `submit_user_report`
- `submit_verification_request`
- `super_admin_set_profile_like`
- `toggle_social_post_like`
- `toggle_social_post_save`
- `transfer_phase27_activity_ownership`
- `unblock_user`
- `update_live_location`
- `update_my_business_booking`
- `update_my_journey_timeline_entry`
- `update_partner_business_account`
- `update_partner_staff_member`
- `update_phase27_community_activity`
- `update_phase27_event_activity`
- `update_phase27_trip_activity`
- `update_trusted_live_location`
- `upsert_admin_review_staff`
- `upsert_partner_staff_by_email`
- `use_melo_reward_v1`

### functions

- `ai-conversation-assistant`
- `ai-matching`
- `ai-travel-planner`
- `ai-trip-place-search`
- `ai-trip-route-optimize`
- `business-nearby-places`
- `ensure-activity-join-notification`
- `ensure-attendance-checkin-notification`
- `ensure-attendance-confirmation-notification`
- `ensure-attendance-open-notification`
- `ensure-partner-commerce-notification`
- `ensure-trip-join-notification`
- `ensure-trip-review-notification`
- `ensure-trusted-live-location-share`
- `ensure-trusted-live-sos-notification`
- `notify-chat-message`
- `partner-check-promptpay-payment`
- `partner-confirm-redemption`
- `partner-connect-dashboard`
- `partner-connect-onboarding`
- `partner-connect-status`
- `partner-create-promptpay-payment`
- `partner-create-redemption`
- `partner-create-withdrawal`
- `partner-preview-redemption`
- `translate-message`
- `trip-emergency-info`
- `verify-store-purchase`

### storage

- `report-evidence`

## Chat-specific checks

| Web chat file | Tables/RPC | Business identity | Sender fields | "Melo member" fallback |
|---|---|---:|---:|---:|
| `components/activity/ActivityChatExperience.tsx` | — | NO | YES | YES |
| `components/chat/ChatConversationPane.tsx` | — | YES | YES | YES |
| `components/chat/chatData.ts` | — | YES | YES | YES |
| `components/chat/chatIdentity.ts` | — | YES | YES | YES |
| `components/chat/DirectChatExperience.tsx` | — | NO | YES | NO |

## Known Android baseline rules used for review

1. Partner/Business mode must use the active business identity, not only auth.uid().
2. A customer message in a Business Chat must render as the other side for Partner mode.
3. A Business-authored message must render as the other side for User mode.
4. Contact/profile labels should resolve from profile/business data; do not expose a raw "Melo member" localhost Markdown fallback when a real display name is available.
5. Web pages should prefer the same Supabase table/RPC/Edge Function contract as Android when they implement the same product flow.
