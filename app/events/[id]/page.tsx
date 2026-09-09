import { ActivityDetailExperience } from "@/components/activity/ActivityDetailExperience";

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ActivityDetailExperience feature="event" id={id} />;
}
