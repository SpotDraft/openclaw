import type { IncomingMessage, ServerResponse } from "node:http";
import crypto from "node:crypto";
import type { AuthRateLimiter } from "./auth-rate-limit.js";
import type { ResolvedGatewayAuth } from "./auth.js";
import { countActiveRunsForSession } from "../agents/subagent-registry.js";
import { createDefaultDeps } from "../cli/deps.js";
import { agentCommand } from "../commands/agent.js";
import { loadConfig } from "../config/config.js";
import { normalizeAgentId } from "../routing/session-key.js";
import { defaultRuntime } from "../runtime.js";
import { resolveTeam, listTeamsResolved, buildTeamContextPrompt } from "../teams/resolve.js";
import { authorizeGatewayBearerRequestOrReply } from "./http-auth-helpers.js";
import {
  readJsonBodyOrError,
  sendJson,
  sendMethodNotAllowed,
  sendInvalidRequest,
} from "./http-common.js";

const TEAMS_PREFIX = "/v1/teams";

export async function handleTeamsHttpRequest(
  req: IncomingMessage,
  res: ServerResponse,
  opts: {
    auth: ResolvedGatewayAuth;
    trustedProxies?: string[];
    rateLimiter?: AuthRateLimiter;
  },
): Promise<boolean> {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  if (!url.pathname.startsWith(TEAMS_PREFIX)) {
    return false;
  }

  const authed = await authorizeGatewayBearerRequestOrReply({
    req,
    res,
    auth: opts.auth,
    trustedProxies: opts.trustedProxies,
    rateLimiter: opts.rateLimiter,
  });
  if (!authed) {
    return true;
  }

  const subpath = url.pathname.slice(TEAMS_PREFIX.length);

  // GET /v1/teams
  if ((subpath === "" || subpath === "/") && req.method === "GET") {
    const cfg = loadConfig();
    const teams = listTeamsResolved(cfg);
    sendJson(res, 200, { teams });
    return true;
  }

  // Match /v1/teams/:id/run or /v1/teams/:id/status
  const match = subpath.match(/^\/([^/]+)\/(run|status)$/);
  if (!match) {
    sendInvalidRequest(res, "unknown teams endpoint");
    return true;
  }

  const teamId = decodeURIComponent(match[1]);
  const action = match[2];

  const cfg = loadConfig();
  const team = resolveTeam(cfg, teamId);
  if (!team) {
    sendJson(res, 404, { error: { type: "not_found", message: `unknown team: "${teamId}"` } });
    return true;
  }

  // POST /v1/teams/:id/run
  if (action === "run") {
    if (req.method !== "POST") {
      sendMethodNotAllowed(res, "POST");
      return true;
    }
    const bodyRaw = await readJsonBodyOrError(req, res, 1024 * 1024);
    if (bodyRaw === undefined) {
      return true;
    }
    const body = (bodyRaw ?? {}) as Record<string, unknown>;
    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (!message) {
      sendInvalidRequest(res, "message is required");
      return true;
    }

    const leadAgentId = normalizeAgentId(team.lead);
    const teamContext = buildTeamContextPrompt({ cfg, team });
    const idem =
      typeof body.idempotencyKey === "string" && body.idempotencyKey.trim()
        ? body.idempotencyKey.trim()
        : crypto.randomUUID();
    const sessionKey =
      typeof body.sessionKey === "string" && body.sessionKey.trim()
        ? body.sessionKey.trim()
        : `agent:${leadAgentId}:team:${team.id}:${crypto.randomUUID()}`;
    const deliver = body.deliver === true;
    const timeout =
      typeof body.timeout === "number" && Number.isFinite(body.timeout) ? body.timeout : undefined;
    const thinking =
      typeof body.thinking === "string" && body.thinking.trim() ? body.thinking.trim() : undefined;

    const runId = idem;

    // Return 202 immediately.
    sendJson(res, 202, {
      runId,
      teamId: team.id,
      leadAgentId,
      status: "accepted",
    });

    // Run asynchronously.
    void agentCommand(
      {
        message,
        agentId: leadAgentId,
        sessionKey,
        runId,
        deliver,
        extraSystemPrompt: teamContext,
        messageChannel: "webchat",
        bestEffortDeliver: false,
        thinking,
        timeout: timeout?.toString(),
      },
      defaultRuntime,
      createDefaultDeps(),
    );

    return true;
  }

  // GET /v1/teams/:id/status
  if (action === "status") {
    if (req.method !== "GET") {
      sendMethodNotAllowed(res, "GET");
      return true;
    }
    const leadAgentId = normalizeAgentId(team.lead);
    const leadKey = `agent:${leadAgentId}`;
    const leadActive = countActiveRunsForSession(leadKey);
    let totalActive = leadActive;

    const members: Array<{ agentId: string; activeRuns: number }> = [];
    for (const memberId of team.members) {
      const id = normalizeAgentId(memberId);
      const memberKey = `agent:${id}`;
      const active = countActiveRunsForSession(memberKey);
      totalActive += active;
      members.push({ agentId: id, activeRuns: active });
    }

    sendJson(res, 200, {
      teamId: team.id,
      name: team.name,
      leadAgentId,
      leadActiveRuns: leadActive,
      totalActiveRuns: totalActive,
      members,
    });
    return true;
  }

  return false;
}
