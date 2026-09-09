import TripJoinRequestsExperience from '@/components/trips/TripJoinRequestsExperience';

export default async function TripJoinRequestsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TripJoinRequestsExperience id={id} />;
}
