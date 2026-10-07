interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  STAFF_PIN: string;
  ADMIN_TOKEN: string;
  STAMP_TOKEN: string;
}

type TokenRow = {
  code: string;
  issued_at: number;
  status: string;
  redeemed_at: number | null;
};

const DEV_ORIGINS = new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

const CLIENT_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const INSERT_TOKEN = `
INSERT INTO tokens (client_id, code, nickname, status, issued_at)
SELECT ?1, ?2, ?3, 'issued', ?4
WHERE (SELECT COUNT(*) FROM tokens)
      < (SELECT CAST(value AS INTEGER) FROM settings WHERE key = 'reward_limit')
`;

function corsHeaders(request: Request): Headers {
  const headers = new Headers();
  const origin = request.headers.get("Origin");
  if (origin && DEV_ORIGINS.has(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    headers.set("Vary", "Origin");
  }
  return headers;
}

function json(request: Request, body: unknown, status = 200): Response {
  const headers = corsHeaders(request);
  headers.set("Content-Type", "application/json");
  return new Response(JSON.stringify(body), { status, headers });
}

function isJsonRequest(request: Request): boolean {
  const type = request.headers.get("Content-Type") ?? "";
  return type.toLowerCase().startsWith("application/json");
}

async function safeEqual(a: string, b: string): Promise<boolean> {
  const enc = new TextEncoder();
  const [left, right] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(a)),
    crypto.subtle.digest("SHA-256", enc.encode(b)),
  ]);
  return crypto.subtle.timingSafeEqual(
    new Uint8Array(left),
    new Uint8Array(right),
  );
}

function drawCode(): string {
  return String(1000 + Math.floor(Math.random() * 9000));
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function findByClient(
  db: D1Database,
  clientId: string,
): Promise<TokenRow | null> {
  return db
    .prepare(
      "SELECT code, issued_at, status, redeemed_at FROM tokens WHERE client_id = ?",
    )
    .bind(clientId)
    .first<TokenRow>();
}

function issuedBody(row: TokenRow) {
  return { result: "issued" as const, code: row.code, issuedAt: row.issued_at };
}

async function issueToken(
  db: D1Database,
  nickname: string,
  clientId: string,
): Promise<
  | { ok: true; body: ReturnType<typeof issuedBody> | { result: "sold_out" } }
  | { ok: false }
> {
  const existing = await findByClient(db, clientId);
  if (existing) return { ok: true, body: issuedBody(existing) };

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = drawCode();
    const issuedAt = Date.now();
    try {
      const result = await db
        .prepare(INSERT_TOKEN)
        .bind(clientId, code, nickname, issuedAt)
        .run();
      if ((result.meta.changes ?? 0) > 0) {
        return {
          ok: true,
          body: { result: "issued", code, issuedAt },
        };
      }
      const raced = await findByClient(db, clientId);
      if (raced) return { ok: true, body: issuedBody(raced) };
      return { ok: true, body: { result: "sold_out" } };
    } catch (error) {
      const message = errorText(error);
      if (message.includes("tokens.client_id")) {
        const raced = await findByClient(db, clientId);
        if (raced) return { ok: true, body: issuedBody(raced) };
        return { ok: false };
      }
      if (message.includes("tokens.code")) continue;
      return { ok: false };
    }
  }

  return { ok: false };
}

async function handleIssue(request: Request, env: Env): Promise<Response> {
  if (!isJsonRequest(request)) {
    return json(request, { result: "invalid" }, 400);
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return json(request, { result: "invalid" }, 400);
  }

  if (!payload || typeof payload !== "object") {
    return json(request, { result: "invalid" }, 400);
  }

  const record = payload as { nickname?: unknown; clientId?: unknown };
  const nickname =
    typeof record.nickname === "string" ? record.nickname.trim() : "";
  const clientId = typeof record.clientId === "string" ? record.clientId : "";

  if (
    !nickname ||
    nickname.length > 20 ||
    !CLIENT_ID_RE.test(clientId)
  ) {
    return json(request, { result: "invalid" }, 400);
  }

  const issued = await issueToken(env.DB, nickname, clientId);
  if (!issued.ok) return json(request, { result: "unavailable" }, 500);
  return json(request, issued.body);
}

async function handleVerify(request: Request, env: Env): Promise<Response> {
  if (!isJsonRequest(request)) {
    return json(request, { result: "invalid" }, 400);
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return json(request, { result: "invalid" }, 400);
  }

  if (!payload || typeof payload !== "object") {
    return json(request, { result: "invalid" }, 400);
  }

  const record = payload as { code?: unknown; pin?: unknown };
  const code = typeof record.code === "string" ? record.code : "";
  const pin = typeof record.pin === "string" ? record.pin : "";

  if (!/^\d{4}$/.test(pin) || !(await safeEqual(pin, env.STAFF_PIN))) {
    return json(request, { result: "invalid_pin" }, 401);
  }
  if (!/^\d{4}$/.test(code)) {
    return json(request, { result: "unknown_code" }, 404);
  }

  const row = await env.DB.prepare(
    "SELECT status, redeemed_at FROM tokens WHERE code = ?",
  )
    .bind(code)
    .first<{ status: string; redeemed_at: number | null }>();

  if (!row) return json(request, { result: "unknown_code" }, 404);

  if (row.status === "redeemed") {
    return json(request, {
      result: "already_redeemed",
      redeemedAt: row.redeemed_at,
    });
  }

  const redeemedAt = Date.now();
  const updated = await env.DB.prepare(
    `UPDATE tokens
     SET status = 'redeemed', redeemed_at = ?1
     WHERE code = ?2 AND status = 'issued'`,
  )
    .bind(redeemedAt, code)
    .run();

  if ((updated.meta.changes ?? 0) > 0) {
    return json(request, { result: "redeemed", redeemedAt });
  }

  const latest = await env.DB.prepare(
    "SELECT status, redeemed_at FROM tokens WHERE code = ?",
  )
    .bind(code)
    .first<{ status: string; redeemed_at: number | null }>();

  if (latest?.status === "redeemed") {
    return json(request, {
      result: "already_redeemed",
      redeemedAt: latest.redeemed_at,
    });
  }

  return json(request, { result: "unknown_code" }, 404);
}

const STAMP_IDS = new Set(["spot1", "spot2", "spot3"]);

async function handleStamp(request: Request, env: Env): Promise<Response> {
  if (!isJsonRequest(request)) {
    return json(request, { result: "invalid" }, 400);
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return json(request, { result: "invalid" }, 400);
  }

  if (!payload || typeof payload !== "object") {
    return json(request, { result: "invalid" }, 400);
  }

  const record = payload as { stamp?: unknown; token?: unknown };
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

  return json(request, { result: "ok" });
}

async function handleSummary(request: Request, env: Env): Promise<Response> {
  const header = request.headers.get("Authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";
  if (!(await safeEqual(token, env.ADMIN_TOKEN))) {
    return json(request, { result: "unauthorized" }, 401);
  }

  const issuedRow = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM tokens",
  ).first<{ n: number }>();
  const redeemedRow = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM tokens WHERE status = 'redeemed'",
  ).first<{ n: number }>();
  const limitRow = await env.DB.prepare(
    "SELECT value FROM settings WHERE key = 'reward_limit'",
  ).first<{ value: string }>();

  const issued = Number(issuedRow?.n ?? 0);
  const redeemed = Number(redeemedRow?.n ?? 0);
  const limit = Number(limitRow?.value ?? 0);
  const remaining = Math.max(0, (Number.isFinite(limit) ? limit : 0) - issued);

  return json(request, { issued, redeemed, remaining, limit });
}

async function handleApi(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  }

  if (url.pathname === "/api/stamp/verify" && request.method === "POST") {
    return handleStamp(request, env);
  }
  if (url.pathname === "/api/token/issue" && request.method === "POST") {
    return handleIssue(request, env);
  }
  if (url.pathname === "/api/token/verify" && request.method === "POST") {
    return handleVerify(request, env);
  }
  if (url.pathname === "/api/admin/summary" && request.method === "GET") {
    return handleSummary(request, env);
  }

  return json(request, { result: "not_found" }, 404);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      return handleApi(request, env);
    }
    return env.ASSETS.fetch(request);
  },
};
