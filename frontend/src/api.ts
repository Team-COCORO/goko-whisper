export type Summary = {
  completed: number;
  redeemed: number;
  waiting: number;
  remaining: number;
  limit: number;
};

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

export type MergeResponse =
  | { ok: true; student: EnrollStudent; redeemed: boolean }
  | { ok: false; error: "invalid" | "mismatch" | "forbidden" | "locked" | "unavailable" | "error" };

const mergeFlights = new Map<string, Promise<MergeResponse>>();

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

async function postMerge(
  nickname: string,
  telegramCode: string,
  stamp: string,
  token: string,
): Promise<MergeResponse> {
  try {
    const response = await fetchApi("/api/student/merge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nickname, telegramCode, stamp, token }),
    });
    const body = (await response.json()) as {
      success?: unknown;
      error?: unknown;
      redeemed?: unknown;
      student?: {
        clientId?: unknown;
        nickname?: unknown;
        telegramCode?: unknown;
        stamps?: unknown;
      };
    };
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
      stamps &&
      typeof body.redeemed === "boolean"
    ) {
      return {
        ok: true,
        redeemed: body.redeemed,
        student: {
          clientId: student.clientId,
          nickname: student.nickname,
          telegramCode: student.telegramCode,
          stamps,
        },
      };
    }
    if (response.status === 429 || body.error === "LOCKED") {
      return { ok: false, error: "locked" };
    }
    if (response.status === 403 || body.error === "FORBIDDEN") {
      return { ok: false, error: "forbidden" };
    }
    if (response.status === 401 || body.error === "MISMATCH") {
      return { ok: false, error: "mismatch" };
    }
    if (body.error === "INVALID") return { ok: false, error: "invalid" };
    if (body.error === "UNAVAILABLE") return { ok: false, error: "unavailable" };
    return { ok: false, error: "error" };
  } catch {
    return { ok: false, error: "error" };
  }
}

export function mergeStudent(
  nickname: string,
  telegramCode: string,
  stamp: string,
  token: string,
): Promise<MergeResponse> {
  const key = `${nickname}:${telegramCode}:${stamp}`;
  const existing = mergeFlights.get(key);
  if (existing) return existing;
  const flight = postMerge(nickname, telegramCode, stamp, token).finally(() => {
    mergeFlights.delete(key);
  });
  mergeFlights.set(key, flight);
  return flight;
}

export type RestoreResponse =
  | { ok: true; student: EnrollStudent; redeemed: boolean }
  | { ok: false; error: "invalid" | "mismatch" | "locked" | "unavailable" | "error" };

const restoreFlights = new Map<string, Promise<RestoreResponse>>();

async function postRestore(nickname: string, telegramCode: string): Promise<RestoreResponse> {
  try {
    const response = await fetchApi("/api/student/restore", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nickname, telegramCode }),
    });
    const body = (await response.json()) as {
      success?: unknown;
      error?: unknown;
      redeemed?: unknown;
      student?: {
        clientId?: unknown;
        nickname?: unknown;
        telegramCode?: unknown;
        stamps?: unknown;
      };
    };
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
      stamps &&
      typeof body.redeemed === "boolean"
    ) {
      return {
        ok: true,
        redeemed: body.redeemed,
        student: {
          clientId: student.clientId,
          nickname: student.nickname,
          telegramCode: student.telegramCode,
          stamps,
        },
      };
    }
    if (response.status === 429 || body.error === "LOCKED") {
      return { ok: false, error: "locked" };
    }
    if (response.status === 401 || body.error === "MISMATCH") {
      return { ok: false, error: "mismatch" };
    }
    if (body.error === "INVALID") return { ok: false, error: "invalid" };
    if (body.error === "UNAVAILABLE") return { ok: false, error: "unavailable" };
    return { ok: false, error: "error" };
  } catch {
    return { ok: false, error: "error" };
  }
}

export function restoreStudent(nickname: string, telegramCode: string): Promise<RestoreResponse> {
  const key = `${nickname}:${telegramCode}`;
  const existing = restoreFlights.get(key);
  if (existing) return existing;
  const flight = postRestore(nickname, telegramCode).finally(() => {
    restoreFlights.delete(key);
  });
  restoreFlights.set(key, flight);
  return flight;
}

export type SyncResponse =
  | { ok: true; stamps: string[]; redeemed: boolean }
  | { ok: false; error: "invalid" | "forbidden" | "missing" | "error" };

const syncFlights = new Map<string, Promise<SyncResponse>>();

async function postSync(clientId: string, nickname: string): Promise<SyncResponse> {
  try {
    const response = await fetchApi("/api/student/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId, nickname }),
    });
    const body = (await response.json()) as {
      success?: unknown;
      error?: unknown;
      stamps?: unknown;
      redeemed?: unknown;
    };
    if (response.status === 404 || body.error === "NOT_FOUND") {
      return { ok: false, error: "missing" };
    }
    if (response.status === 403 || body.error === "FORBIDDEN") {
      return { ok: false, error: "forbidden" };
    }
    const stamps = Array.isArray(body.stamps)
      ? body.stamps.filter((item): item is string => typeof item === "string")
      : null;
    if (response.ok && body.success === true && stamps && typeof body.redeemed === "boolean") {
      return { ok: true, stamps, redeemed: body.redeemed };
    }
    if (body.error === "INVALID") return { ok: false, error: "invalid" };
    return { ok: false, error: "error" };
  } catch {
    return { ok: false, error: "error" };
  }
}

export function syncStudent(clientId: string, nickname: string): Promise<SyncResponse> {
  const key = `${clientId}:${nickname}`;
  const existing = syncFlights.get(key);
  if (existing) return existing;
  const flight = postSync(clientId, nickname).finally(() => {
    syncFlights.delete(key);
  });
  syncFlights.set(key, flight);
  return flight;
}

export async function verifyStamp(
  stamp: string,
  token: string,
  clientId?: string,
): Promise<StampVerifyResult> {
  const payload: { stamp: string; token: string; clientId?: string } = { stamp, token };
  if (clientId) payload.clientId = clientId;
  try {
    const response = await fetchApi("/api/stamp/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (response.status === 401) return "invalid";
    if (!response.ok) return "error";
    const body = (await response.json()) as { result?: unknown };
    return body.result === "ok" ? "ok" : "invalid";
  } catch {
    return "error";
  }
}

export type OfficeStudent = {
  nickname: string;
  telegramCode: string;
  createdAt: number;
  stamps: string[];
  redeemed: boolean;
};

export type OfficeError =
  | "unauthorized"
  | "invalid"
  | "missing"
  | "conflict"
  | "unavailable"
  | "error";

function officeError(status: number): OfficeError {
  if (status === 401) return "unauthorized";
  if (status === 400) return "invalid";
  if (status === 404) return "missing";
  if (status === 409) return "conflict";
  if (status === 503) return "unavailable";
  return "error";
}

async function postOffice(
  path: string,
  idToken: string,
  body: unknown,
): Promise<{ ok: true } | { ok: false; error: OfficeError }> {
  try {
    const response = await fetchApi(path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) return { ok: false, error: officeError(response.status) };
    const payload = (await response.json()) as { success?: unknown };
    if (payload.success !== true) return { ok: false, error: "error" };
    return { ok: true };
  } catch {
    return { ok: false, error: "error" };
  }
}

export function deleteStudent(
  idToken: string,
  nickname: string,
  telegramCode: string,
): Promise<{ ok: true } | { ok: false; error: OfficeError }> {
  return postOffice("/api/admin/student/delete", idToken, { nickname, telegramCode });
}

export function redeemStudent(
  idToken: string,
  nickname: string,
  telegramCode: string,
): Promise<{ ok: true } | { ok: false; error: OfficeError }> {
  return postOffice("/api/admin/student/redeem", idToken, { nickname, telegramCode });
}

export function updateStamps(
  idToken: string,
  nickname: string,
  telegramCode: string,
  stamps: string[],
): Promise<{ ok: true } | { ok: false; error: OfficeError }> {
  return postOffice("/api/admin/student/stamps", idToken, { nickname, telegramCode, stamps });
}

export async function listStudents(
  idToken: string,
): Promise<
  | { ok: true; students: OfficeStudent[]; truncated: boolean }
  | { ok: false; error: OfficeError }
> {
  try {
    const response = await fetchApi("/api/admin/student/search", {
      headers: { Authorization: `Bearer ${idToken}` },
    });
    if (!response.ok) return { ok: false, error: officeError(response.status) };
    const body = (await response.json()) as {
      success?: boolean;
      truncated?: boolean;
      students?: OfficeStudent[];
    };
    if (!body.success || !Array.isArray(body.students)) return { ok: false, error: "error" };
    return { ok: true, students: body.students, truncated: Boolean(body.truncated) };
  } catch {
    return { ok: false, error: "error" };
  }
}

export async function fetchSummary(
  idToken: string,
): Promise<{ ok: true; summary: Summary } | { ok: false; error: OfficeError }> {
  try {
    const response = await fetchApi("/api/admin/summary", {
      headers: { Authorization: `Bearer ${idToken}` },
    });
    if (!response.ok) return { ok: false, error: officeError(response.status) };
    const summary = (await response.json()) as Summary & { success?: boolean };
    if (
      typeof summary.completed !== "number" ||
      typeof summary.redeemed !== "number" ||
      typeof summary.waiting !== "number" ||
      typeof summary.remaining !== "number" ||
      typeof summary.limit !== "number"
    ) {
      return { ok: false, error: "error" };
    }
    return { ok: true, summary };
  } catch {
    return { ok: false, error: "error" };
  }
}

export type SurveyPayload = {
  region: string;
  regionOther: string;
  boughtFood: boolean;
  foodItem: string;
  foodRating: number | null;
  foodComment: string;
  appRating: number | null;
  appComment: string;
};

export type SurveySubmitResult =
  | { ok: true }
  | { ok: false; error: "invalid" | "locked" | "error" };

export async function submitSurvey(payload: SurveyPayload): Promise<SurveySubmitResult> {
  try {
    const response = await fetchApi("/api/survey", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (response.status === 429) return { ok: false, error: "locked" };
    if (response.status === 400) return { ok: false, error: "invalid" };
    const body = (await response.json()) as { success?: unknown };
    if (response.ok && body.success === true) return { ok: true };
    return { ok: false, error: "error" };
  } catch {
    return { ok: false, error: "error" };
  }
}

export type SurveySummary = {
  total: number;
  bought: number;
  foodRatingAvg: number | null;
  appRatingAvg: number | null;
  regions: { region: string; count: number }[];
  foodItems: { item: string; count: number }[];
  recent: {
    createdAt: number;
    region: string;
    regionOther: string;
    boughtFood: boolean;
    foodItem: string;
    foodRating: number | null;
    foodComment: string;
    appRating: number | null;
    appComment: string;
  }[];
};

export async function fetchSurveySummary(
  idToken: string,
): Promise<{ ok: true; summary: SurveySummary } | { ok: false; error: OfficeError }> {
  try {
    const response = await fetchApi("/api/admin/survey/summary", {
      headers: { Authorization: `Bearer ${idToken}` },
    });
    if (!response.ok) return { ok: false, error: officeError(response.status) };
    const body = (await response.json()) as SurveySummary & { success?: boolean };
    if (body.success !== true || typeof body.total !== "number") {
      return { ok: false, error: "error" };
    }
    return { ok: true, summary: body };
  } catch {
    return { ok: false, error: "error" };
  }
}

export function openSurveyPage(): void {
  const url = new URL("survey.html", window.location.href).href;
  const opened = window.open(url, "_blank", "noopener,noreferrer");
  if (!opened) window.location.assign(url);
}
