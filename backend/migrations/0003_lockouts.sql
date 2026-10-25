CREATE TABLE pin_attempts (
  code TEXT PRIMARY KEY,
  failures INTEGER NOT NULL,
  locked_until INTEGER
);

CREATE TABLE merge_attempts (
  nickname TEXT PRIMARY KEY,
  failures INTEGER NOT NULL,
  locked_until INTEGER
);
