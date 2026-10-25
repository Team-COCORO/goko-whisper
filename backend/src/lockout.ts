const MAX_FAILURES = 8;
const LOCK_MS = 15 * 60 * 1000;

const RECORD_PIN_FAILURE = `
INSERT INTO pin_attempts (code, failures, locked_until)
VALUES (?1, 1, NULL)
ON CONFLICT(code) DO UPDATE SET
  failures = CASE
    WHEN pin_attempts.locked_until IS NOT NULL AND pin_attempts.locked_until <= ?2 THEN 1
    ELSE pin_attempts.failures + 1
  END,
  locked_until = CASE
    WHEN (
      CASE
        WHEN pin_attempts.locked_until IS NOT NULL AND pin_attempts.locked_until <= ?2 THEN 1
        ELSE pin_attempts.failures + 1
      END
    ) >= ${MAX_FAILURES} THEN ?3
    ELSE NULL
  END
WHERE pin_attempts.locked_until IS NULL OR pin_attempts.locked_until <= ?2
`;

const RECORD_MERGE_FAILURE = `
INSERT INTO merge_attempts (nickname, failures, locked_until)
VALUES (?1, 1, NULL)
ON CONFLICT(nickname) DO UPDATE SET
  failures = CASE
    WHEN merge_attempts.locked_until IS NOT NULL AND merge_attempts.locked_until <= ?2 THEN 1
    ELSE merge_attempts.failures + 1
  END,
  locked_until = CASE
    WHEN (
      CASE
        WHEN merge_attempts.locked_until IS NOT NULL AND merge_attempts.locked_until <= ?2 THEN 1
        ELSE merge_attempts.failures + 1
      END
    ) >= ${MAX_FAILURES} THEN ?3
    ELSE NULL
  END
WHERE merge_attempts.locked_until IS NULL OR merge_attempts.locked_until <= ?2
`;

async function lockedUntil(
  db: D1Database,
  sql: string,
  key: string,
): Promise<number | null> {
  const row = await db.prepare(sql).bind(key).first<{ locked_until: number | null }>();
  return row?.locked_until ?? null;
}

function isLocked(until: number | null, now: number): boolean {
  return until != null && until > now;
}

async function recordFailure(
  db: D1Database,
  insertSql: string,
  readSql: string,
  key: string,
  now: number,
): Promise<"locked" | "open"> {
  await db.prepare(insertSql).bind(key, now, now + LOCK_MS).run();
  const until = await lockedUntil(db, readSql, key);
  return isLocked(until, now) ? "locked" : "open";
}

export function pinLocked(db: D1Database, code: string, now: number): Promise<boolean> {
  return lockedUntil(db, "SELECT locked_until FROM pin_attempts WHERE code = ?", code).then((until) =>
    isLocked(until, now),
  );
}

export function recordPinFailure(
  db: D1Database,
  code: string,
  now: number,
): Promise<"locked" | "open"> {
  return recordFailure(
    db,
    RECORD_PIN_FAILURE,
    "SELECT locked_until FROM pin_attempts WHERE code = ?",
    code,
    now,
  );
}

export async function clearPinFailure(db: D1Database, code: string): Promise<void> {
  await db.prepare("DELETE FROM pin_attempts WHERE code = ?").bind(code).run();
}

export function mergeLocked(db: D1Database, nickname: string, now: number): Promise<boolean> {
  return lockedUntil(
    db,
    "SELECT locked_until FROM merge_attempts WHERE nickname = ?",
    nickname,
  ).then((until) => isLocked(until, now));
}

export function recordMergeFailure(
  db: D1Database,
  nickname: string,
  now: number,
): Promise<"locked" | "open"> {
  return recordFailure(
    db,
    RECORD_MERGE_FAILURE,
    "SELECT locked_until FROM merge_attempts WHERE nickname = ?",
    nickname,
    now,
  );
}

export async function clearMergeFailure(db: D1Database, nickname: string): Promise<void> {
  await db.prepare("DELETE FROM merge_attempts WHERE nickname = ?").bind(nickname).run();
}
