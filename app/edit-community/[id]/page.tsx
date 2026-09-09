import EditActivityWebExperience from '@/components/activity/EditActivityWebExperience';

export default async function EditCommunityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EditActivityWebExperience feature="community" id={id} />;
}
