CREATE TABLE training_history (
  seq INTEGER PRIMARY KEY AUTOINCREMENT,
  owner TEXT NOT NULL,
  record_key TEXT NOT NULL,
  payload TEXT,
  UNIQUE (owner, record_key)
);
--> statement-breakpoint
CREATE INDEX training_history_owner_seq ON training_history (owner, seq);
