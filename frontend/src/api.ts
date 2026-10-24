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
const API_TIMEOUT_MS = 10_000;

export type StampVerifyResult = "ok" | "invalid" | "error";

export type EnrollStudent = {
  clientId: string;
  nickname: string;
  telegramCode: string;
  stamps: string[];
};

export type EnrollResponse =
  | { ok: true; student: EnrollStudent }
  | { ok: false; error: "invalid" | "forbidden" | "unavailable" | "error" };

const enrollFlights = new Map<string, Promise<EnrollResponse>>();

function apiUrl(path: string): string {
  const base = import.meta.env.VITE_API_BASE_URL ?? "";
  return `${base}${path}`;
}

function fetchApi(path: string, init?: RequestInit): Promise<Response> {
  return fetch(apiUrl(path), {
    ...init,
    signal: AbortSignal.timeout(API_TIMEOUT_MS),
  });
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
    const response = await fetchApi("/api/token/issue", {
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

async function postEnroll(
  clientId: string,
  nickname: string,
  stamp?: { initialStamp: string; token: string },
): Promise<EnrollResponse> {
  try {
    const response = await fetchApi("/api/student/enroll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId,
        nickname,
        ...(stamp ? { initialStamp: stamp.initialStamp, token: stamp.token } : {}),
      }),
    });
    const body = (await response.json()) as {
      success?: unknown;
      error?: unknown;
      student?: {
        clientId?: unknown;
        nickname?: unknown;
        telegramCode?: unknown;
        stamps?: unknown;
      };
    };
    if (response.status === 403 || body.error === "FORBIDDEN") {
      return { ok: false, error: "forbidden" };
    }
    const student = body.student;
    const stamps = Array.isArray(student?.stamps)
      ? student.stamps.filter((item): item is string => typeof item === "string")
      : null;
    if (
      response.ok &&
      body.success === true &&
      student &&
      typeof student.clientId === "string" &&
      typeof student.nickname === "string" &&
      typeof student.telegramCode === "string" &&
      stamps
    ) {
      return {
        ok: true,
        student: {
          clientId: student.clientId,
          nickname: student.nickname,
          telegramCode: student.telegramCode,
          stamps,
        },
      };
    }
    if (body.error === "INVALID") return { ok: false, error: "invalid" };
    if (body.error === "UNAVAILABLE") return { ok: false, error: "unavailable" };
    return { ok: false, error: "error" };
  } catch {
    return { ok: false, error: "error" };
  }
}

export function enrollStudent(
  clientId: string,
  nickname: string,
  stamp?: { initialStamp: string; token: string },
): Promise<EnrollResponse> {
  const key = `${clientId}:${stamp?.initialStamp ?? ""}`;
  const existing = enrollFlights.get(key);
  if (existing) return existing;
  const flight = postEnroll(clientId, nickname, stamp).finally(() => {
    enrollFlights.delete(key);
  });
  enrollFlights.set(key, flight);
  return flight;
}

export async function verifyStamp(
  stamp: string,
  token: string,
): Promise<StampVerifyResult> {
  try {
    const response = await fetchApi("/api/stamp/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stamp, token }),
    });
    if (response.status === 401) return "invalid";
    if (!response.ok) return "error";
    const body = (await response.json()) as { result?: unknown };
    return body.result === "ok" ? "ok" : "invalid";
  } catch {
    return "error";
  }
}

export async function verifyToken(
  code: string,
  pin: string,
): Promise<VerifyResponse> {
  try {
    const response = await fetchApi("/api/token/verify", {
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
    const response = await fetchApi("/api/admin/summary", {
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
