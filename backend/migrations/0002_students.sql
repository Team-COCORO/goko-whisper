CREATE TABLE students (
  client_id TEXT PRIMARY KEY,
  nickname TEXT NOT NULL,
  telegram_code TEXT NOT NULL,
  stamps TEXT NOT NULL DEFAULT '[]',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(nickname, telegram_code)
);

CREATE INDEX idx_students_search ON students (nickname, telegram_code);
CREATE INDEX idx_students_created ON students (created_at DESC);
