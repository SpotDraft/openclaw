import type { OpenClawConfig } from "../config/config.js";
import { resolveTeamAllowAgents, isTeamLead } from "./resolve.js";

/**
 * Extends allowAgents with team member IDs if this agent is a team lead.
 * Runtime-only — does NOT persist to config file.
 */
export function resolveEffectiveAllowAgents(
  cfg: OpenClawConfig,
  agentId: string,
  configured: string[] | undefined,
): string[] {
  const teamMembers = resolveTeamAllowAgents(cfg, agentId);
  if (teamMembers.length === 0) {
    return configured ?? [];
  }
  const base = configured ?? [];
  const merged = new Set(base);
  for (const id of teamMembers) {
    merged.add(id);
  }
  return Array.from(merged);
}

/**
 * For team leads, ensures sessions_spawn and agents_list are in the tools.alsoAllow list.
 */
export function resolveTeamLeadToolsAlsoAllow(
  cfg: OpenClawConfig,
  agentId: string,
  existingAlsoAllow: string[] | undefined,
): string[] | undefined {
  if (!isTeamLead(cfg, agentId)) {
    return existingAlsoAllow;
  }
  const base = existingAlsoAllow ?? [];
  const merged = new Set(base);
  merged.add("sessions_spawn");
  merged.add("agents_list");
  return Array.from(merged);
}
