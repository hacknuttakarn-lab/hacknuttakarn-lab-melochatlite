import { redirect } from "next/navigation";

/**
 * MELO_DISABLE_FULLSCREEN_DIRECT_CHAT_V1
 *
 * Direct messaging now uses ChatDrawer only.
 * The legacy full-page /chat UI is intentionally disabled.
 *
 * Activity chat routes such as:
 * /trips/[id]/chat
 * /events/[id]/chat
 * /community/[id]/chat
 * /partner/chat
 *
 * are NOT affected by this route.
 */
export default function LegacyChatPage() {
  redirect("/feed");
}
