import SafetyLiveLocationExperience from "@/components/safety/SafetyLiveLocationExperience";
import type { SharedLiveLocationSourceWeb } from "@/components/safety/safetyWebData";

export default async function SafetyLiveLocationPage({ params }: { params: Promise<{ source: string; sessionId: string }> }) {
  const { source, sessionId } = await params;
  const safeSource: SharedLiveLocationSourceWeb = source === "activity" ? "activity" : "friend";
  return <SafetyLiveLocationExperience source={safeSource} sessionId={decodeURIComponent(sessionId)}/>;
}
