ALTER TABLE students ADD COLUMN redeemed_at INTEGER;

UPDATE students
SET redeemed_at = (
  SELECT tokens.redeemed_at
  FROM tokens
  WHERE tokens.client_id = students.client_id
    AND tokens.status = 'redeemed'
)
WHERE EXISTS (
  SELECT 1
  FROM tokens
  WHERE tokens.client_id = students.client_id
    AND tokens.status = 'redeemed'
);

CREATE INDEX IF NOT EXISTS idx_students_redeemed ON students (redeemed_at);
