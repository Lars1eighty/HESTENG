import { playerEloSeed } from "@/data/playerEloSeed";
import { DEMO_CLUB_ID } from "@/data/clubs";
import { getCurrentClubId } from "@/lib/currentClub";
import { normalizeName, type PlayerProfile } from "@/lib/playerIdentity";

function createStablePlayerId(source: "seed", name: string) {
  return `${source}:${normalizeName(name).replace(/\s+/g, "-")}`;
}

export function getPlayerRegistry(clubId = getCurrentClubId()): PlayerProfile[] {
  return playerEloSeed
    .filter((seed) => (seed.clubId ?? DEMO_CLUB_ID) === clubId)
    .map((seed) => ({
      id: seed.playerId ?? createStablePlayerId("seed", seed.name),
      name: seed.name,
      type: "player" as const,
    }))
    .filter((player, index, players) => (
      players.findIndex((item) => item.id === player.id || normalizeName(item.name) === normalizeName(player.name)) === index
    ))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function getSelectablePlayerNames(clubId = getCurrentClubId()): string[] {
  return getPlayerRegistry(clubId).map((player) => player.name);
}
