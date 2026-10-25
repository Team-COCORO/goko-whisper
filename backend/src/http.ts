const DEV_ORIGINS = new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

const MAX_BODY_BYTES = 4096;

export function securityHeaders(headers: Headers): void {
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Referrer-Policy", "no-referrer");
}

export function corsHeaders(request: Request): Headers {
  const headers = new Headers();
  securityHeaders(headers);
  const origin = request.headers.get("Origin");
  if (origin && DEV_ORIGINS.has(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    headers.set("Vary", "Origin");
  }
  return headers;
}

export function json(request: Request, body: unknown, status = 200): Response {
  const headers = corsHeaders(request);
  headers.set("Content-Type", "application/json");
  return new Response(JSON.stringify(body), { status, headers });
}

function isJsonRequest(request: Request): boolean {
  const type = request.headers.get("Content-Type") ?? "";
  return type.toLowerCase().startsWith("application/json");
}

export async function readJson(
  request: Request,
): Promise<{ ok: true; payload: unknown } | { ok: false }> {
  if (!isJsonRequest(request)) return { ok: false };

  const declared = request.headers.get("Content-Length");
  if (declared !== null) {
    const size = Number(declared);
    if (!Number.isFinite(size) || size > MAX_BODY_BYTES) return { ok: false };
  }

  const reader = request.body?.getReader();
  if (!reader) return { ok: false };

  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > MAX_BODY_BYTES) {
      await reader.cancel();
      return { ok: false };
    }
    chunks.push(value);
  }

  const buf = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    buf.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return { ok: true, payload: JSON.parse(new TextDecoder().decode(buf)) };
  } catch {
    return { ok: false };
  }
}

export async function safeEqual(a: string, b: string): Promise<boolean> {
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

export function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
