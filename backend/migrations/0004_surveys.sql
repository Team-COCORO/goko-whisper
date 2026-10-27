CREATE TABLE surveys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at INTEGER NOT NULL,
  region TEXT NOT NULL,
  region_other TEXT NOT NULL DEFAULT '',
  bought_food INTEGER NOT NULL DEFAULT 0,
  food_item TEXT NOT NULL DEFAULT '',
  food_rating INTEGER,
  food_comment TEXT NOT NULL DEFAULT '',
  app_rating INTEGER,
  app_comment TEXT NOT NULL DEFAULT ''
);

CREATE INDEX idx_surveys_created ON surveys (created_at DESC);
CREATE INDEX idx_surveys_region ON surveys (region);

CREATE TABLE survey_rate (
  ip TEXT PRIMARY KEY,
  window_start INTEGER NOT NULL,
  count INTEGER NOT NULL
);
