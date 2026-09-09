import EditActivityWebExperience from '@/components/activity/EditActivityWebExperience';

export default async function EditTripPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EditActivityWebExperience feature="trip" id={id} />;
}
