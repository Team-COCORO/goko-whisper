import type { Env } from "./env";
import { json, safeEqual } from "./http";

export async function handleSummary(request: Request, env: Env): Promise<Response> {
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
