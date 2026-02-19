import type { OpenClawConfig } from "../config/config.js";
import type { TeamConfig } from "../config/types.teams.js";
import { resolveAgentConfig } from "../agents/agent-scope.js";
import { normalizeAgentId } from "../routing/session-key.js";

export function resolveTeam(cfg: OpenClawConfig, teamId: string): TeamConfig | undefined {
  const teams = cfg.teams;
  if (!Array.isArray(teams)) {
    return undefined;
  }
  const normalized = teamId.trim().toLowerCase();
  return teams.find((t) => t.id.trim().toLowerCase() === normalized);
}

export function listTeamIds(cfg: OpenClawConfig): string[] {
  const teams = cfg.teams;
  if (!Array.isArray(teams)) {
    return [];
  }
  return teams.map((t) => t.id);
}

export type ResolvedTeam = {
  id: string;
  name?: string;
  description?: string;
  lead: { id: string; name?: string };
  members: Array<{ id: string; name?: string }>;
};

export function listTeamsResolved(cfg: OpenClawConfig): ResolvedTeam[] {
  const teams = cfg.teams;
  if (!Array.isArray(teams)) {
    return [];
  }
  return teams.map((team) => {
    const leadAgent = resolveAgentConfig(cfg, team.lead);
    return {
      id: team.id,
      name: team.name,
      description: team.description,
      lead: { id: normalizeAgentId(team.lead), name: leadAgent?.name },
      members: team.members.map((memberId) => {
        const memberAgent = resolveAgentConfig(cfg, memberId);
        return { id: normalizeAgentId(memberId), name: memberAgent?.name };
      }),
    };
  });
}

export function resolveTeamAllowAgents(cfg: OpenClawConfig, agentId: string): string[] {
  const teams = cfg.teams;
  if (!Array.isArray(teams)) {
    return [];
  }
  const normalized = normalizeAgentId(agentId);
  const memberIds: string[] = [];
  for (const team of teams) {
    if (normalizeAgentId(team.lead) === normalized) {
      for (const memberId of team.members) {
        memberIds.push(normalizeAgentId(memberId));
      }
    }
  }
  return memberIds;
}

export function isTeamLead(cfg: OpenClawConfig, agentId: string): boolean {
  const teams = cfg.teams;
  if (!Array.isArray(teams)) {
    return false;
  }
  const normalized = normalizeAgentId(agentId);
  return teams.some((team) => normalizeAgentId(team.lead) === normalized);
}

export function buildTeamContextPrompt(opts: { cfg: OpenClawConfig; team: TeamConfig }): string {
  const { cfg, team } = opts;
  const teamName = team.name || team.id;
  const lines: string[] = [];

  lines.push("# Team Context");
  lines.push(`You are the lead of the "${teamName}" team.`);
  lines.push("Your team members:");

  for (const memberId of team.members) {
    const agent = resolveAgentConfig(cfg, memberId);
    const name = agent?.name;
    const id = normalizeAgentId(memberId);
    if (name) {
      lines.push(`- ${id} (${name})`);
    } else {
      lines.push(`- ${id}`);
    }
  }

  if (team.description) {
    lines.push("");
    lines.push(`Team purpose: ${team.description}`);
  }

  lines.push("");
  lines.push("Route tasks to the appropriate team member using sessions_spawn.");

  return lines.join("\n");
}
