type PublicClubNightSnapshot = {
  clubNightId: string;
  clubId: string;
  status: string;
  clubNight: unknown;
  completedMatches?: unknown[];
};

export type PublicClubNightAccess = {
  publicToken: string;
  clubNightId: string;
  clubId: string;
  status: string;
};

export type GuestClubNightSnapshot = {
  publicToken: string;
  clubNightId: string;
  clubId: string;
  clubNight: unknown;
  completedMatches: unknown[];
};

export async function syncPublicClubNight(snapshot: PublicClubNightSnapshot) {
  const response = await fetch("/api/guest-club-night", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(snapshot),
  });

  if (!response.ok) {
    throw new Error("Kunne ikke opdatere gæsteadgang til klubaftenen.");
  }

  return (await response.json()) as PublicClubNightAccess;
}

export async function getPublicClubNightAccess(clubNightId: string) {
  const response = await fetch(
    `/api/guest-club-night?clubNightId=${encodeURIComponent(clubNightId)}`,
    { cache: "no-store" },
  );

  if (!response.ok) {
    throw new Error("Kunne ikke hente gæsteadgang til klubaftenen.");
  }

  const data = (await response.json()) as { record: PublicClubNightAccess | null };
  return data.record;
}

export async function getGuestClubNight(publicToken: string) {
  const response = await fetch(`/api/g/${encodeURIComponent(publicToken)}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Kunne ikke hente den aktive klubaften.");
  }

  return (await response.json()) as GuestClubNightSnapshot;
}

export async function saveGuestCompletedMatch(publicToken: string, completedMatch: unknown) {
  const response = await fetch(`/api/g/${encodeURIComponent(publicToken)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ completedMatch }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(data.error ?? "Kunne ikke gemme kampresultatet.");
  }

  return (await response.json()) as { completedMatches: unknown[] };
}

export async function publishGuestClubNight(snapshot: PublicClubNightSnapshot) {
  return syncPublicClubNight(snapshot);
}
