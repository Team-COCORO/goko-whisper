import {
  handleStudentDelete,
  handleStudentRedeem,
  handleStudentSearch,
  handleStudentStamps,
  handleSummary,
} from "./admin";
import type { Env } from "./env";
import { corsHeaders, json, securityHeaders } from "./http";
import {
  handleEnroll,
  handleMerge,
  handleRestore,
  handleStamp,
  handleSync,
} from "./students";
import { handleSurveySubmit, handleSurveySummary } from "./survey";
import { handleIssue, handleVerify } from "./tokens";

async function handleApi(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  }

  if (url.pathname === "/api/stamp/verify" && request.method === "POST") {
    return handleStamp(request, env);
  }
  if (url.pathname === "/api/student/enroll" && request.method === "POST") {
    return handleEnroll(request, env);
  }
  if (url.pathname === "/api/student/merge" && request.method === "POST") {
    return handleMerge(request, env);
  }
  if (url.pathname === "/api/student/restore" && request.method === "POST") {
    return handleRestore(request, env);
  }
  if (url.pathname === "/api/student/sync" && request.method === "POST") {
    return handleSync(request, env);
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
  if (url.pathname === "/api/admin/student/search" && request.method === "GET") {
    return handleStudentSearch(request, env);
  }
  if (url.pathname === "/api/admin/student/delete" && request.method === "POST") {
    return handleStudentDelete(request, env);
  }
  if (url.pathname === "/api/admin/student/stamps" && request.method === "POST") {
    return handleStudentStamps(request, env);
  }
  if (url.pathname === "/api/admin/student/redeem" && request.method === "POST") {
    return handleStudentRedeem(request, env);
  }
  if (url.pathname === "/api/survey" && request.method === "POST") {
    return handleSurveySubmit(request, env);
  }
  if (url.pathname === "/api/admin/survey/summary" && request.method === "GET") {
    return handleSurveySummary(request, env);
  }

  return json(request, { result: "not_found" }, 404);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      return handleApi(request, env);
    }
    const response = await env.ASSETS.fetch(request);
    const headers = new Headers(response.headers);
    securityHeaders(headers);
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};
