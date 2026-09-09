import { ActivityChatExperience } from '@/components/activity/ActivityChatExperience';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ActivityChatExperience feature="trip" id={id} />;
}
