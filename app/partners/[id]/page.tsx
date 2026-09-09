import { CommerceDetailExperience } from '@/components/commerce/CommerceDetailExperience';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CommerceDetailExperience mode="partner" id={id} />;
}
