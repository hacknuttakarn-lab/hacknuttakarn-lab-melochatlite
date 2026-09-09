import { ActivityDetailExperience } from '@/components/activity/ActivityDetailExperience';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ActivityDetailExperience feature="community" id={id} />;
}
