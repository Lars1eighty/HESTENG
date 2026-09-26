"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useKlubaften } from "@/context/KlubaftenContext";
import KampScoringPage from "../../../kamp/[id]/page";

export default function ScopedKampScoringPage() {
  const params = useParams<{ clubNightId?: string }>();
  const { setCurrentClubNightId } = useKlubaften();
  const clubNightId = typeof params.clubNightId === "string" ? params.clubNightId : null;

  useEffect(() => {
    if (clubNightId) setCurrentClubNightId(clubNightId);
  }, [clubNightId, setCurrentClubNightId]);

  return <KampScoringPage />;
}
