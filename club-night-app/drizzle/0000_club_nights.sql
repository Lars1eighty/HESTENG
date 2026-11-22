CREATE TABLE club_nights (
  owner_id TEXT PRIMARY KEY NOT NULL,
  share_id TEXT NOT NULL UNIQUE,
  plan TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
