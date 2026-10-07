export type IssueResponse =
  | { result: "issued"; code: string; issuedAt: number }
  | { result: "sold_out" }
  | { result: "invalid" }
  | { result: "unavailable" }
  | { result: "error" };

export type VerifyResponse =
  | { result: "redeemed" | "already_redeemed" }
  | { result: "invalid_pin" | "unknown_code" | "error" };

export type Summary = {
  issued: number;
  redeemed: number;
  remaining: number;
  limit: number;
};

const issueFlights = new Map<string, Promise<IssueResponse>>();

function apiUrl(path: string): string {
  const base = import.meta.env.VITE_API_BASE_URL ?? "";
  return `${base}${path}`;
}

async function readResult(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { result?: unknown };
    return typeof body.result === "string" ? body.result : "error";
  } catch {
    return "error";
  }
}

async function postIssue(
  nickname: string,
  clientId: string,
): Promise<IssueResponse> {
  try {
    const response = await fetch(apiUrl("/api/token/issue"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nickname, clientId }),
    });
    const body = (await response.json()) as {
      result?: unknown;
      code?: unknown;
      issuedAt?: unknown;
    };
    if (
      body.result === "issued" &&
      typeof body.code === "string" &&
      typeof body.issuedAt === "number"
    ) {
      return { result: "issued", code: body.code, issuedAt: body.issuedAt };
    }
    if (
      body.result === "sold_out" ||
      body.result === "invalid" ||
      body.result === "unavailable"
    ) {
      return { result: body.result };
    }
    return { result: "error" };
  } catch {
    return { result: "error" };
  }
}

export function issueToken(
  nickname: string,
  clientId: string,
): Promise<IssueResponse> {
  const existing = issueFlights.get(clientId);
  if (existing) return existing;

  const flight = postIssue(nickname, clientId).finally(() => {
    issueFlights.delete(clientId);
  });
  issueFlights.set(clientId, flight);
  return flight;
}

export async function verifyStamp(stamp: string, token: string): Promise<boolean> {
  try {
    const response = await fetch(apiUrl("/api/stamp/verify"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stamp, token }),
    });
    if (!response.ok) return false;
    const body = (await response.json()) as { result?: unknown };
    return body.result === "ok";
  } catch {
    return false;
  }
}

export async function verifyToken(
  code: string,
  pin: string,
): Promise<VerifyResponse> {
  try {
    const response = await fetch(apiUrl("/api/token/verify"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, pin }),
    });
    const result = await readResult(response);
    if (
      result === "redeemed" ||
      result === "already_redeemed" ||
      result === "invalid_pin" ||
      result === "unknown_code"
    ) {
      return { result };
    }
    return { result: "error" };
  } catch {
    return { result: "error" };
  }
}

export async function fetchSummary(
  token: string,
): Promise<{ ok: true; summary: Summary } | { ok: false; unauthorized: boolean }> {
  try {
    const response = await fetch(apiUrl("/api/admin/summary"), {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (response.status === 401) return { ok: false, unauthorized: true };
    if (!response.ok) return { ok: false, unauthorized: false };
    const summary = (await response.json()) as Summary;
    return { ok: true, summary };
  } catch {
    return { ok: false, unauthorized: false };
  }
}
