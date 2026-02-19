import { describe, expect, it } from "vitest";
import type { OpenClawConfig } from "../config/config.js";
import {
  resolveTeam,
  listTeamIds,
  listTeamsResolved,
  resolveTeamAllowAgents,
  isTeamLead,
  buildTeamContextPrompt,
} from "./resolve.js";

function makeConfig(overrides?: Partial<OpenClawConfig>): OpenClawConfig {
  return {
    agents: {
      list: [
        { id: "eng-lead", name: "Engineering Lead" },
        { id: "eng-backend", name: "Backend Engineer" },
        { id: "eng-frontend", name: "Frontend Engineer" },
        { id: "eng-reviewer", name: "Code Reviewer" },
        { id: "solo-agent" },
      ],
    },
    teams: [
      {
        id: "engineering",
        name: "Engineering Team",
        lead: "eng-lead",
        members: ["eng-backend", "eng-frontend", "eng-reviewer"],
        description: "Handles all engineering tasks",
      },
    ],
    ...overrides,
  };
}

describe("resolveTeam", () => {
  it("finds a team by ID", () => {
    const cfg = makeConfig();
    const team = resolveTeam(cfg, "engineering");
    expect(team).toBeDefined();
    expect(team?.id).toBe("engineering");
    expect(team?.lead).toBe("eng-lead");
  });

  it("returns undefined for unknown team", () => {
    const cfg = makeConfig();
    expect(resolveTeam(cfg, "nonexistent")).toBeUndefined();
  });

  it("is case-insensitive", () => {
    const cfg = makeConfig();
    expect(resolveTeam(cfg, "ENGINEERING")).toBeDefined();
  });

  it("returns undefined when no teams configured", () => {
    const cfg: OpenClawConfig = { agents: { list: [{ id: "main" }] } };
    expect(resolveTeam(cfg, "engineering")).toBeUndefined();
  });
});

describe("listTeamIds", () => {
  it("lists all team IDs", () => {
    const cfg = makeConfig();
    expect(listTeamIds(cfg)).toEqual(["engineering"]);
  });

  it("returns empty array when no teams configured", () => {
    const cfg: OpenClawConfig = {};
    expect(listTeamIds(cfg)).toEqual([]);
  });
});

describe("listTeamsResolved", () => {
  it("enriches teams with agent names", () => {
    const cfg = makeConfig();
    const resolved = listTeamsResolved(cfg);
    expect(resolved).toHaveLength(1);
    expect(resolved[0].lead.name).toBe("Engineering Lead");
    expect(resolved[0].members).toHaveLength(3);
    expect(resolved[0].members[0].name).toBe("Backend Engineer");
  });

  it("returns empty array when no teams configured", () => {
    const cfg: OpenClawConfig = {};
    expect(listTeamsResolved(cfg)).toEqual([]);
  });
});

describe("resolveTeamAllowAgents", () => {
  it("returns member IDs for team leads", () => {
    const cfg = makeConfig();
    const members = resolveTeamAllowAgents(cfg, "eng-lead");
    expect(members).toContain("eng-backend");
    expect(members).toContain("eng-frontend");
    expect(members).toContain("eng-reviewer");
  });

  it("returns empty for non-leads", () => {
    const cfg = makeConfig();
    expect(resolveTeamAllowAgents(cfg, "solo-agent")).toEqual([]);
  });

  it("returns empty when no teams configured", () => {
    const cfg: OpenClawConfig = {};
    expect(resolveTeamAllowAgents(cfg, "any")).toEqual([]);
  });
});

describe("isTeamLead", () => {
  it("identifies lead agents", () => {
    const cfg = makeConfig();
    expect(isTeamLead(cfg, "eng-lead")).toBe(true);
  });

  it("returns false for non-leads", () => {
    const cfg = makeConfig();
    expect(isTeamLead(cfg, "eng-backend")).toBe(false);
    expect(isTeamLead(cfg, "solo-agent")).toBe(false);
  });

  it("returns false when no teams configured", () => {
    const cfg: OpenClawConfig = {};
    expect(isTeamLead(cfg, "eng-lead")).toBe(false);
  });
});

describe("buildTeamContextPrompt", () => {
  it("produces correct system prompt", () => {
    const cfg = makeConfig();
    const team = cfg.teams![0];
    const prompt = buildTeamContextPrompt({ cfg, team });
    expect(prompt).toContain("# Team Context");
    expect(prompt).toContain('"Engineering Team"');
    expect(prompt).toContain("eng-backend (Backend Engineer)");
    expect(prompt).toContain("eng-frontend (Frontend Engineer)");
    expect(prompt).toContain("eng-reviewer (Code Reviewer)");
    expect(prompt).toContain("Team purpose: Handles all engineering tasks");
    expect(prompt).toContain("sessions_spawn");
  });

  it("omits description line when not set", () => {
    const cfg = makeConfig({
      teams: [
        {
          id: "minimal",
          lead: "eng-lead",
          members: ["eng-backend"],
        },
      ],
    });
    const team = cfg.teams![0];
    const prompt = buildTeamContextPrompt({ cfg, team });
    expect(prompt).not.toContain("Team purpose:");
  });
});
