import ClubMatchPage from "../../../kamp/[id]/page";

export default function ScopedClubMatchPage(props: {
  params: Promise<{ clubNightId: string; id: string }>;
}) {
  return <ClubMatchPage {...props} />;
}
