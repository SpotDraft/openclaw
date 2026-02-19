import crypto from "node:crypto";
import type { GatewayRequestHandlers } from "./types.js";
import { countActiveRunsForSession } from "../../agents/subagent-registry.js";
import { agentCommand } from "../../commands/agent.js";
import { loadConfig } from "../../config/config.js";
import { normalizeAgentId } from "../../routing/session-key.js";
import { defaultRuntime } from "../../runtime.js";
import { resolveTeam, listTeamsResolved, buildTeamContextPrompt } from "../../teams/resolve.js";
import {
  ErrorCodes,
  errorShape,
  formatValidationErrors,
  validateTeamsListParams,
  validateTeamsRunParams,
  validateTeamsStatusParams,
} from "../protocol/index.js";
import { formatForLog } from "../ws-log.js";

export const teamsHandlers: GatewayRequestHandlers = {
  "teams.list": ({ params, respond }) => {
    if (!validateTeamsListParams(params)) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          `invalid teams.list params: ${formatValidationErrors(validateTeamsListParams.errors)}`,
        ),
      );
      return;
    }
    const cfg = loadConfig();
    const teams = listTeamsResolved(cfg);
    respond(true, { teams }, undefined);
  },

  "teams.run": async ({ params, respond, context }) => {
    if (!validateTeamsRunParams(params)) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          `invalid teams.run params: ${formatValidationErrors(validateTeamsRunParams.errors)}`,
        ),
      );
      return;
    }
    const p = params as {
      teamId: string;
      message: string;
      sessionKey?: string;
      deliver?: boolean;
      timeout?: number;
      channel?: string;
      to?: string;
      thinking?: string;
      idempotencyKey?: string;
    };
    const cfg = loadConfig();
    const team = resolveTeam(cfg, p.teamId);
    if (!team) {
      respond(
        false,
        undefined,
        errorShape(ErrorCodes.INVALID_REQUEST, `unknown team: "${p.teamId}"`),
      );
      return;
    }

    const leadAgentId = normalizeAgentId(team.lead);
    const teamContext = buildTeamContextPrompt({ cfg, team });
    const idem = p.idempotencyKey || crypto.randomUUID();
    const runId = idem;
    const sessionKey =
      p.sessionKey || `agent:${leadAgentId}:team:${team.id}:${crypto.randomUUID()}`;

    const accepted = {
      runId,
      teamId: team.id,
      leadAgentId,
      status: "accepted" as const,
    };
    respond(true, accepted, undefined, { runId });

    void agentCommand(
      {
        message: p.message,
        agentId: leadAgentId,
        sessionKey,
        runId,
        deliver: p.deliver ?? false,
        extraSystemPrompt: teamContext,
        messageChannel: "webchat",
        bestEffortDeliver: false,
        thinking: p.thinking,
        timeout: p.timeout?.toString(),
        channel: p.channel,
        to: p.to,
      },
      defaultRuntime,
      context.deps,
    )
      .then((result) => {
        const payload = {
          runId,
          teamId: team.id,
          leadAgentId,
          status: "ok" as const,
          result,
        };
        respond(true, payload, undefined, { runId });
      })
      .catch((err) => {
        const error = errorShape(ErrorCodes.UNAVAILABLE, String(err));
        const payload = {
          runId,
          teamId: team.id,
          leadAgentId,
          status: "error" as const,
          summary: String(err),
        };
        respond(false, payload, error, {
          runId,
          error: formatForLog(err),
        });
      });
  },

  "teams.status": ({ params, respond }) => {
    if (!validateTeamsStatusParams(params)) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          `invalid teams.status params: ${formatValidationErrors(validateTeamsStatusParams.errors)}`,
        ),
      );
      return;
    }
    const p = params as { teamId: string };
    const cfg = loadConfig();
    const team = resolveTeam(cfg, p.teamId);
    if (!team) {
      respond(
        false,
        undefined,
        errorShape(ErrorCodes.INVALID_REQUEST, `unknown team: "${p.teamId}"`),
      );
      return;
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

    respond(
      true,
      {
        teamId: team.id,
        name: team.name,
        leadAgentId,
        leadActiveRuns: leadActive,
        totalActiveRuns: totalActive,
        members,
      },
      undefined,
    );
  },
};
