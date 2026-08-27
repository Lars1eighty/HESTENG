import { DEMO_CLUB_ID } from "@/data/clubs";
import type { PlayerEloRating, EloRatingEvent } from "@/lib/eloRatingEngine";
import type { LiveActiveSnapshot } from "@/lib/liveActiveEngine";
import type { PlayerAliasMapping } from "@/lib/playerAliasStore";
import { normalizeName } from "@/lib/playerIdentity";
import type { PlayerBoardNeedsState } from "@/lib/playerRegistry";

export type SharedClubDataState = {
  version: 1;
  eloRatings: PlayerEloRating[];
  eloEvents: EloRatingEvent[];
  liveActiveSnapshots: LiveActiveSnapshot[];
  playerBoardNeeds: PlayerBoardNeedsState;
  playerAliases: Record<string, PlayerAliasMapping[]>;
  updatedAt: string;
};

export const EMPTY_SHARED_CLUB_DATA_STATE: SharedClubDataState = {
  version: 1,
  eloRatings: [],
  eloEvents: [],
  liveActiveSnapshots: [],
  playerBoardNeeds: {},
  playerAliases: {},
  updatedAt: new Date(0).toISOString(),
};

function ratingKey(rating: PlayerEloRating) {
  return `${rating.clubId ?? DEMO_CLUB_ID}:${normalizeName(rating.player)}`;
}

function eventKey(event: EloRatingEvent) {
  return `${event.clubId ?? DEMO_CLUB_ID}:${event.matchId}`;
}

function snapshotKey(snapshot: LiveActiveSnapshot) {
  return `${snapshot.clubId}:${snapshot.clubNightId}`;
}

function aliasKey(alias: PlayerAliasMapping) {
  return `${alias.clubId}:${alias.normalizedAlias || normalizeName(alias.alias)}`;
}

export function normalizeSharedClubDataState(input: Partial<SharedClubDataState>): SharedClubDataState {
  const ratings = new Map<string, PlayerEloRating>();
  const events = new Map<string, EloRatingEvent>();
  const snapshots = new Map<string, LiveActiveSnapshot>();
  const aliasesByClub: Record<string, PlayerAliasMapping[]> = {};
  const aliases = new Map<string, PlayerAliasMapping>();

  (Array.isArray(input.eloRatings) ? input.eloRatings : []).forEach((rating) => {
    if (!rating?.player) return;
    ratings.set(ratingKey(rating), {
      ...rating,
      clubId: rating.clubId ?? DEMO_CLUB_ID,
    });
  });

  (Array.isArray(input.eloEvents) ? input.eloEvents : []).forEach((event) => {
    if (!event?.matchId) return;
    events.set(eventKey(event), {
      ...event,
      clubId: event.clubId ?? DEMO_CLUB_ID,
    });
  });

  (Array.isArray(input.liveActiveSnapshots) ? input.liveActiveSnapshots : []).forEach((snapshot) => {
    if (!snapshot?.clubId || !snapshot.clubNightId) return;
    snapshots.set(snapshotKey(snapshot), snapshot);
  });

  Object.entries(input.playerAliases ?? {}).forEach(([clubId, clubAliases]) => {
    if (!Array.isArray(clubAliases)) return;
    clubAliases.forEach((alias) => {
      if (!alias?.alias || !alias.playerId) return;
      aliases.set(aliasKey(alias), {
        ...alias,
        clubId: alias.clubId ?? clubId,
        normalizedAlias: alias.normalizedAlias || normalizeName(alias.alias),
      });
    });
  });

  [...aliases.values()].forEach((alias) => {
    aliasesByClub[alias.clubId] = [...(aliasesByClub[alias.clubId] ?? []), alias];
  });

  Object.keys(aliasesByClub).forEach((clubId) => {
    aliasesByClub[clubId] = aliasesByClub[clubId].sort((a, b) =>
      a.canonicalName.localeCompare(b.canonicalName) || a.alias.localeCompare(b.alias)
    );
  });

  return {
    version: 1,
    eloRatings: [...ratings.values()].sort((a, b) => (a.clubId ?? "").localeCompare(b.clubId ?? "") || a.player.localeCompare(b.player)),
    eloEvents: [...events.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    liveActiveSnapshots: [...snapshots.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    playerBoardNeeds: input.playerBoardNeeds && typeof input.playerBoardNeeds === "object" && !Array.isArray(input.playerBoardNeeds)
      ? input.playerBoardNeeds
      : {},
    playerAliases: aliasesByClub,
    updatedAt: input.updatedAt ?? new Date().toISOString(),
  };
}

export function hasSharedClubData(state: Partial<SharedClubDataState>) {
  return Boolean(
    state.eloRatings?.length ||
    state.eloEvents?.length ||
    state.liveActiveSnapshots?.length ||
    Object.keys(state.playerBoardNeeds ?? {}).length ||
    Object.keys(state.playerAliases ?? {}).length
  );
}

export function mergeSharedClubData(serverState: Partial<SharedClubDataState>, localState: Partial<SharedClubDataState>) {
  const server = normalizeSharedClubDataState(serverState);
  const local = normalizeSharedClubDataState(localState);
  const serverRatingKeys = new Set(server.eloRatings.map(ratingKey));
  const serverEventKeys = new Set(server.eloEvents.map(eventKey));
  const serverSnapshotKeys = new Set(server.liveActiveSnapshots.map(snapshotKey));
  const aliasesByClub: Record<string, PlayerAliasMapping[]> = {};

  Object.keys({ ...local.playerAliases, ...server.playerAliases }).forEach((clubId) => {
    const serverAliases = server.playerAliases[clubId] ?? [];
    const serverAliasKeys = new Set(serverAliases.map(aliasKey));
    aliasesByClub[clubId] = [
      ...serverAliases,
      ...(local.playerAliases[clubId] ?? []).filter((alias) => !serverAliasKeys.has(aliasKey(alias))),
    ];
  });

  return normalizeSharedClubDataState({
    eloRatings: [
      ...server.eloRatings,
      ...local.eloRatings.filter((rating) => !serverRatingKeys.has(ratingKey(rating))),
    ],
    eloEvents: [
      ...server.eloEvents,
      ...local.eloEvents.filter((event) => !serverEventKeys.has(eventKey(event))),
    ],
    liveActiveSnapshots: [
      ...server.liveActiveSnapshots,
      ...local.liveActiveSnapshots.filter((snapshot) => !serverSnapshotKeys.has(snapshotKey(snapshot))),
    ],
    playerBoardNeeds: {
      ...local.playerBoardNeeds,
      ...server.playerBoardNeeds,
    },
    playerAliases: aliasesByClub,
    updatedAt: server.updatedAt,
  });
}
