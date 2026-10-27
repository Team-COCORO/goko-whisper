import type { Env } from "./env";
import { errorText, json, readJson, safeEqual } from "./http";
import { BLOCKED_CLIENT_ID, CLIENT_ID_RE, STAMP_IDS } from "./ids";
import { clearMergeFailure, mergeLocked, recordMergeFailure } from "./lockout";

type StudentRow = {
  client_id: string;
  nickname: string;
  telegram_code: string;
  stamps: string;
};

function enrollError(request: Request, error: string, status: number): Response {
  return json(request, { success: false, error }, status);
}

function parseStampList(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is string => typeof item === "string" && STAMP_IDS.has(item),
    );
  } catch {
    return [];
  }
}

function enrollBody(row: StudentRow) {
  return {
    success: true as const,
    student: {
      clientId: row.client_id,
      nickname: row.nickname,
      telegramCode: row.telegram_code,
      stamps: parseStampList(row.stamps),
    },
  };
}

async function findStudent(
  db: D1Database,
  clientId: string,
): Promise<StudentRow | null> {
  return db
    .prepare(
      `SELECT client_id, nickname, telegram_code, stamps
       FROM students
       WHERE client_id = ?`,
    )
    .bind(clientId)
    .first<StudentRow>();
}

const TELEGRAM_CODE_RE = /^[0-7]-[0-7]-[0-7]-[0-7]$/;
const STAMP_ORDER = ["spot1", "spot2", "spot3"];

function drawTelegram(): string {
  const buf = new Uint8Array(4);
  crypto.getRandomValues(buf);
  return `${buf[0] & 7}-${buf[1] & 7}-${buf[2] & 7}-${buf[3] & 7}`;
}

function isClientCollision(message: string): boolean {
  return message.includes("students.client_id");
}

function isTelegramCollision(message: string): boolean {
  return (
    message.includes("students.telegram_code") ||
    message.includes("students.nickname")
  );
}

export async function handleEnroll(request: Request, env: Env): Promise<Response> {
  const parsed = await readJson(request);
  if (!parsed.ok) return enrollError(request, "INVALID", 400);
  const payload = parsed.payload;
  if (!payload || typeof payload !== "object") {
    return enrollError(request, "INVALID", 400);
  }

  const record = payload as {
    clientId?: unknown;
    nickname?: unknown;
    initialStamp?: unknown;
    token?: unknown;
  };
  const clientId = typeof record.clientId === "string" ? record.clientId : "";
  if (!CLIENT_ID_RE.test(clientId) || clientId === BLOCKED_CLIENT_ID) {
    return enrollError(request, "INVALID", 400);
  }

  const nickname =
    typeof record.nickname === "string" ? record.nickname.trim() : "";
  const existing = await findStudent(env.DB, clientId);
  if (existing) return respondExisting(request, existing, nickname);

  if (!nickname || nickname.length > 10) {
    return enrollError(request, "INVALID", 400);
  }

  let initialStamp: string | null = null;
  if (record.initialStamp != null) {
    if (
      typeof record.initialStamp !== "string" ||
      !STAMP_IDS.has(record.initialStamp)
    ) {
      return enrollError(request, "INVALID", 400);
    }
    initialStamp = record.initialStamp;
    const token = typeof record.token === "string" ? record.token : "";
    const expected = env.STAMP_TOKEN ?? "";
    if (!expected || !token || !(await safeEqual(token, expected))) {
      return enrollError(request, "FORBIDDEN", 403);
    }
  }

  const stamps = initialStamp ? JSON.stringify([initialStamp]) : "[]";
  const now = Date.now();
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const telegramCode = drawTelegram();
    try {
      const result = await env.DB.prepare(
        `INSERT INTO students (
           client_id, nickname, telegram_code, stamps, created_at, updated_at
         )
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)`,
      )
        .bind(clientId, nickname, telegramCode, stamps, now, now)
        .run();
      if ((result.meta.changes ?? 0) > 0) {
        return json(
          request,
          enrollBody({
            client_id: clientId,
            nickname,
            telegram_code: telegramCode,
            stamps,
          }),
        );
      }
    } catch (error) {
      const message = errorText(error);
      if (isClientCollision(message)) {
        const raced = await findStudent(env.DB, clientId);
        if (raced) return respondExisting(request, raced, nickname);
        return enrollError(request, "UNAVAILABLE", 500);
      }
      if (isTelegramCollision(message)) continue;
      return enrollError(request, "UNAVAILABLE", 500);
    }

    const raced = await findStudent(env.DB, clientId);
    if (raced) return respondExisting(request, raced, nickname);
    return enrollError(request, "UNAVAILABLE", 500);
  }

  return enrollError(request, "UNAVAILABLE", 503);
}

function respondExisting(request: Request, row: StudentRow, nickname: string): Response {
  if (!nickname || nickname.length > 10 || nickname !== row.nickname) {
    return enrollError(request, "FORBIDDEN", 403);
  }
  return json(request, enrollBody(row));
}

function unionStamps(saved: string[], incoming: string[]): string[] {
  const present = new Set([...saved, ...incoming]);
  return STAMP_ORDER.filter((id) => present.has(id));
}

async function findByTelegram(
  db: D1Database,
  nickname: string,
  telegramCode: string,
): Promise<StudentRow | null> {
  return db
    .prepare(
      `SELECT client_id, nickname, telegram_code, stamps
       FROM students
       WHERE nickname = ? AND telegram_code = ?`,
    )
    .bind(nickname, telegramCode)
    .first<StudentRow>();
}

async function isRedeemed(db: D1Database, clientId: string): Promise<boolean> {
  const row = await db
    .prepare("SELECT status FROM tokens WHERE client_id = ?")
    .bind(clientId)
    .first<{ status: string }>();
  return row?.status === "redeemed";
}

async function writeUnion(
  db: D1Database,
  clientId: string,
  incoming: string[],
): Promise<StudentRow | null> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const row = await findStudent(db, clientId);
    if (!row) return null;
    const stamps = JSON.stringify(unionStamps(parseStampList(row.stamps), incoming));
    if (stamps === row.stamps) return { ...row, stamps };
    const result = await db
      .prepare(
        `UPDATE students
         SET stamps = ?1, updated_at = ?2
         WHERE client_id = ?3 AND stamps = ?4`,
      )
      .bind(stamps, Date.now(), clientId, row.stamps)
      .run();
    if ((result.meta.changes ?? 0) > 0) return { ...row, stamps };
  }
  return null;
}

export async function handleMerge(request: Request, env: Env): Promise<Response> {
  const parsed = await readJson(request);
  if (!parsed.ok) return enrollError(request, "INVALID", 400);
  const payload = parsed.payload;
  if (!payload || typeof payload !== "object") {
    return enrollError(request, "INVALID", 400);
  }

  const record = payload as {
    nickname?: unknown;
    telegramCode?: unknown;
    stamp?: unknown;
    token?: unknown;
  };
  const nickname = typeof record.nickname === "string" ? record.nickname.trim() : "";
  const telegramCode = typeof record.telegramCode === "string" ? record.telegramCode : "";
  const stamp = typeof record.stamp === "string" ? record.stamp : "";
  const token = typeof record.token === "string" ? record.token : "";
  if (!nickname || nickname.length > 10 || !TELEGRAM_CODE_RE.test(telegramCode) || !STAMP_IDS.has(stamp)) {
    return enrollError(request, "INVALID", 400);
  }

  const now = Date.now();
  if (await mergeLocked(env.DB, nickname, now)) {
    return enrollError(request, "LOCKED", 429);
  }

  const expected = env.STAMP_TOKEN ?? "";
  if (!expected || !token || !(await safeEqual(token, expected))) {
    return enrollError(request, "FORBIDDEN", 403);
  }

  const found = await findByTelegram(env.DB, nickname, telegramCode);
  if (!found) {
    const failure = await recordMergeFailure(env.DB, nickname, now);
    if (failure === "locked") return enrollError(request, "LOCKED", 429);
    return enrollError(request, "MISMATCH", 401);
  }

  const merged = await writeUnion(env.DB, found.client_id, [stamp]);
  if (!merged) return enrollError(request, "UNAVAILABLE", 503);
  await clearMergeFailure(env.DB, nickname);

  return json(request, {
    ...enrollBody(merged),
    redeemed: await isRedeemed(env.DB, merged.client_id),
  });
}

export async function handleRestore(request: Request, env: Env): Promise<Response> {
  const parsed = await readJson(request);
  if (!parsed.ok) return enrollError(request, "INVALID", 400);
  const payload = parsed.payload;
  if (!payload || typeof payload !== "object") {
    return enrollError(request, "INVALID", 400);
  }

  const record = payload as { nickname?: unknown; telegramCode?: unknown };
  const nickname = typeof record.nickname === "string" ? record.nickname.trim() : "";
  const telegramCode = typeof record.telegramCode === "string" ? record.telegramCode : "";
  if (!nickname || nickname.length > 10 || !TELEGRAM_CODE_RE.test(telegramCode)) {
    return enrollError(request, "INVALID", 400);
  }

  const now = Date.now();
  if (await mergeLocked(env.DB, nickname, now)) {
    return enrollError(request, "LOCKED", 429);
  }

  const found = await findByTelegram(env.DB, nickname, telegramCode);
  if (!found) {
    const failure = await recordMergeFailure(env.DB, nickname, now);
    if (failure === "locked") return enrollError(request, "LOCKED", 429);
    return enrollError(request, "MISMATCH", 401);
  }

  await clearMergeFailure(env.DB, nickname);
  return json(request, {
    ...enrollBody(found),
    redeemed: await isRedeemed(env.DB, found.client_id),
  });
}

export async function handleSync(request: Request, env: Env): Promise<Response> {
  const parsed = await readJson(request);
  if (!parsed.ok) return enrollError(request, "INVALID", 400);
  const payload = parsed.payload;
  if (!payload || typeof payload !== "object") {
    return enrollError(request, "INVALID", 400);
  }

  const record = payload as { clientId?: unknown; nickname?: unknown };
  const clientId = typeof record.clientId === "string" ? record.clientId : "";
  const nickname =
    typeof record.nickname === "string" ? record.nickname.trim() : "";

  if (
    !nickname ||
    nickname.length > 10 ||
    !CLIENT_ID_RE.test(clientId) ||
    clientId === BLOCKED_CLIENT_ID
  ) {
    return enrollError(request, "INVALID", 400);
  }

  const student = await findStudent(env.DB, clientId);
  if (!student) return enrollError(request, "NOT_FOUND", 404);
  if (student.nickname !== nickname) {
    return enrollError(request, "FORBIDDEN", 403);
  }

  const stamps = STAMP_ORDER.filter((id) =>
    parseStampList(student.stamps).includes(id),
  );
  return json(request, {
    success: true,
    stamps,
    redeemed: await isRedeemed(env.DB, clientId),
  });
}

export async function handleStamp(request: Request, env: Env): Promise<Response> {
  const parsed = await readJson(request);
  if (!parsed.ok) return json(request, { result: "invalid" }, 400);
  const payload = parsed.payload;

  if (!payload || typeof payload !== "object") {
    return json(request, { result: "invalid" }, 400);
  }

  const record = payload as { stamp?: unknown; token?: unknown; clientId?: unknown };
  const stamp = typeof record.stamp === "string" ? record.stamp : "";
  const token = typeof record.token === "string" ? record.token : "";
  const expected = env.STAMP_TOKEN ?? "";
  if (
    !STAMP_IDS.has(stamp) ||
    !expected ||
    !(await safeEqual(token, expected))
  ) {
    return json(request, { result: "invalid" }, 401);
  }

  const clientId = typeof record.clientId === "string" ? record.clientId : "";
  if (CLIENT_ID_RE.test(clientId) && clientId !== BLOCKED_CLIENT_ID) {
    try {
      await writeUnion(env.DB, clientId, [stamp]);
    } catch {
      // 更新に失敗しても、秘密が合っていれば押印は成立する。
    }
  }

  return json(request, { result: "ok" });
}
