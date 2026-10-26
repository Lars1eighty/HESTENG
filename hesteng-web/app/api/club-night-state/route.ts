import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import {
  knownMatchBelongsToClub,
  scopeClubNightState,
  validClubNightSnapshot,
} from "@/lib/clubNightAccess.mjs";
import {
  readSharedClubNightState,
  replaceSharedClubNightSnapshot,
  upsertSharedClubNightMatches,
  upsertSharedCompletedMatch,
} from "@/lib/serverClubNightStateStore";
import type { ClubNight } from "@/context/KlubaftenContext";
import type { ClubMatch } from "@/lib/matchEngine";
import type { CompletedMatch } from "@/lib/matchStore";

export const runtime = "nodejs";

async function getAccess() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  // Memberships are read from the database by the NextAuth session callback.
  const memberships = session.user.memberships ?? [];
  return {
    readable: new Set(memberships.map((membership) => membership.clubId)),
    editable: new Set(memberships.filter((membership) => membership.role === "ADMIN").map((membership) => membership.clubId)),
  };
}

function error(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET() {
  const access = await getAccess();
  if (!access) return error("Authentication required", 401);

  const state = await readSharedClubNightState();
  return NextResponse.json(scopeClubNightState(state, access.readable));
}

export async function POST(request: NextRequest) {
  const access = await getAccess();
  if (!access) return error("Authentication required", 401);

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return error("Ugyldig anmodning.", 400);

  const existing = await readSharedClubNightState();

  if (body.type === "completedMatch") {
    const match = body.completedMatch;
    if (!match || typeof match.id !== "string" || typeof match.clubNightId !== "string") {
      return error("Kampresultatet mangler gyldige ID'er.", 400);
    }
    const night = existing.clubNights.find((item) => item.id === match.clubNightId);
    if (!night || !night.clubId || !access.readable.has(night.clubId)) {
      return error("Ingen adgang til klubaftenen.", 403);
    }
    if ((match.clubId && match.clubId !== night.clubId)
      || !knownMatchBelongsToClub(existing, night.clubId, night.id, match.id)) {
      return error("Kampresultatet tilhører ikke klubaftenen.", 400);
    }

    const state = await upsertSharedCompletedMatch({
      ...(match as CompletedMatch),
      clubId: night.clubId,
      clubNightId: night.id,
    });
    return NextResponse.json(scopeClubNightState(state, access.readable));
  }

  if (body.type === "matches") {
    if (typeof body.clubNightId !== "string" || !Array.isArray(body.matches)) {
      return error("Ugyldige kampe.", 400);
    }
    const night = existing.clubNights.find((item) => item.id === body.clubNightId);
    if (!night || !night.clubId || !access.editable.has(night.clubId)) {
      return error("Kun klubadministrator kan ændre kampoversigten.", 403);
    }
    if (!body.matches.every((match: ClubMatch) =>
      match && typeof match.id === "string"
      && (!match.clubId || match.clubId === night.clubId)
      && (!match.clubNightId || match.clubNightId === night.id)
      && knownMatchBelongsToClub(existing, night.clubId!, night.id, match.id)
    )) {
      return error("En kamp tilhører ikke klubaftenen.", 400);
    }
    const state = await upsertSharedClubNightMatches(night.id, body.matches);
    return NextResponse.json(scopeClubNightState(state, access.readable));
  }

  // The browser can cache several clubs. Update ONLY the selected club, without
  // deleting another club's nights when its browser snapshot is absent.
  const clubId = typeof body.clubId === "string" ? body.clubId.trim() : "";
  if (!clubId || !access.editable.has(clubId)) {
    return error("Kun klubadministrator kan gemme klubaften.", 403);
  }
  if (!Array.isArray(body.clubNights)) return error("Klubaftener mangler.", 400);
  const clubNights = (body.clubNights as ClubNight[]).filter((night) => night?.clubId === clubId);
  if (!validClubNightSnapshot(clubNights, clubId)) {
    return error("Ugyldig klubaften eller kampoversigt.", 400);
  }

  const completedMatches: CompletedMatch[] = Array.isArray(body.completedMatches)
    ? (body.completedMatches as CompletedMatch[]).filter((match) => {
      if (match?.clubId !== clubId || typeof match.id !== "string" || !match.clubNightId) return false;
      return knownMatchBelongsToClub(existing, clubId, match.clubNightId, match.id)
        || clubNights.some((night) => night.id === match.clubNightId
          && night.matches.some((item) => item.id === match.id));
    })
    : [];

  const state = await replaceSharedClubNightSnapshot({
    clubId,
    clubNights,
    currentClubNightId: typeof body.currentClubNightId === "string" ? body.currentClubNightId : null,
    completedMatches,
  });
  return NextResponse.json(scopeClubNightState(state, access.readable));
}
