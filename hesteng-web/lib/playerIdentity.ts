export type PlayerId = string;

export type PlayerProfileType = "player" | "guest";

export type PlayerProfile = {
  id: PlayerId;
  name: string;
  type: PlayerProfileType;
  guestSlot?: "top" | "mid" | "bottom";
};

export type PlayerAlias = {
  source: "dartconnect";
  sourceName: string;
  playerId: PlayerId;
};

export type UnknownPlayer = {
  source: "dartconnect";
  sourceName: string;
  detectedAt: string;
};

export type PlayerIdentityState = {
  profiles: PlayerProfile[];
  aliases: PlayerAlias[];
  unknownPlayers: UnknownPlayer[];
};

function normalizeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[,.'’]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function createPlayerId(): PlayerId {
  return `P-${crypto.randomUUID()}`;
}

export function resolveDartConnectPlayer(
  sourceName: string,
  state: PlayerIdentityState
): PlayerProfile | null {
  const normalized = normalizeName(sourceName);

  const alias = state.aliases.find(
    (item) => normalizeName(item.sourceName) === normalized
  );

  if (alias) {
    return state.profiles.find((profile) => profile.id === alias.playerId) ?? null;
  }

  return (
    state.profiles.find((profile) => normalizeName(profile.name) === normalized) ??
    null
  );
}

export function addDartConnectAlias(
  sourceName: string,
  playerId: PlayerId,
  state: PlayerIdentityState
): PlayerIdentityState {
  const normalized = normalizeName(sourceName);
  const existing = state.aliases.find(
    (alias) => normalizeName(alias.sourceName) === normalized
  );

  if (existing) {
    return {
      ...state,
      aliases: state.aliases.map((alias) =>
        normalizeName(alias.sourceName) === normalized
          ? { ...alias, playerId }
          : alias
      ),
    };
  }

  return {
    ...state,
    aliases: [
      ...state.aliases,
      { source: "dartconnect", sourceName, playerId },
    ],
    unknownPlayers: state.unknownPlayers.filter(
      (player) => normalizeName(player.sourceName) !== normalized
    ),
  };
}

export function registerUnknownDartConnectPlayer(
  sourceName: string,
  state: PlayerIdentityState,
  detectedAt = new Date().toISOString()
): PlayerIdentityState {
  const normalized = normalizeName(sourceName);

  if (resolveDartConnectPlayer(sourceName, state)) {
    return state;
  }

  if (
    state.unknownPlayers.some(
      (player) => normalizeName(player.sourceName) === normalized
    )
  ) {
    return state;
  }

  return {
    ...state,
    unknownPlayers: [
      ...state.unknownPlayers,
      { source: "dartconnect", sourceName, detectedAt },
    ],
  };
}

export function createGuestProfile(
  sourceName: string,
  slot: "top" | "mid" | "bottom"
): PlayerProfile {
  return {
    id: createPlayerId(),
    name: sourceName,
    type: "guest",
    guestSlot: slot,
  };
}

export function createPlayerProfile(name: string): PlayerProfile {
  return {
    id: createPlayerId(),
    name,
    type: "player",
  };
}
