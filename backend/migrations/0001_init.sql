CREATE TABLE tokens (
  client_id   TEXT PRIMARY KEY,
  code        TEXT NOT NULL UNIQUE,
  nickname    TEXT NOT NULL,
  status      TEXT NOT NULL CHECK (status IN ('issued', 'redeemed')),
  issued_at   INTEGER NOT NULL,
  redeemed_at INTEGER
);

CREATE TABLE settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT INTO settings (key, value) VALUES ('reward_limit', '500');
