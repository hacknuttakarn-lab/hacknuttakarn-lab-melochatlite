import TravelPassportExperience from "@/components/passport/TravelPassportExperience";

export default async function PassportUserPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  return <TravelPassportExperience requestedUserId={userId} />;
}
