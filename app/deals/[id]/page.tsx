import { CommerceDetailExperience } from '@/components/commerce/CommerceDetailExperience';

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ business?: string }> }) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  return <CommerceDetailExperience mode="deal" id={id} businessIdHint={query.business ?? ''} />;
}
