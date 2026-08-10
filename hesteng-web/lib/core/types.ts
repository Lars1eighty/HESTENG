export type Player = {
  id: string;
  name: string;
};

export type SeededEntry = {
  id: string;
  name: string;
  seed: number;
};

export type Pool = {
  name: string;
  players: SeededEntry[];
};

export type SeedZone = {
    size: number;
    allowedPools: string[];
};