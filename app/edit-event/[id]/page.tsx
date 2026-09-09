import EditActivityWebExperience from '@/components/activity/EditActivityWebExperience';

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EditActivityWebExperience feature="event" id={id} />;
}
