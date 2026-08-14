import { players as legacyPlayerNames } from "@/data/players";
import { playerEloSeed } from "@/data/playerEloSeed";
import { normalizeName, type PlayerProfile } from "@/lib/playerIdentity";

function createStablePlayerId(source: "legacy" | "seed", name: string) {
  return `${source}:${normalizeName(name).replace(/\s+/g, "-")}`;
}

function sameIdentity(left: PlayerProfile, right: PlayerProfile) {
  return left.id === right.id || normalizeName(left.name) === normalizeName(right.name);
}

function addUniquePlayer(players: PlayerProfile[], player: PlayerProfile) {
  if (players.some((item) => sameIdentity(item, player))) return players;
  return [...players, player];
}

export function getPlayerRegistry(): PlayerProfile[] {
  const legacyPlayers = legacyPlayerNames.map((name) => ({
    id: createStablePlayerId("legacy", name),
    name,
    type: "player" as const,
  }));

  return playerEloSeed
    .map((seed) => ({
      id: seed.playerId ?? createStablePlayerId("seed", seed.name),
      name: seed.name,
      type: "player" as const,
    }))
    .reduce(addUniquePlayer, legacyPlayers)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function getSelectablePlayerNames(): string[] {
  return getPlayerRegistry().map((player) => player.name);
}
