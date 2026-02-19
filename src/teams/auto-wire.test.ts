import { describe, expect, it } from "vitest";
import type { OpenClawConfig } from "../config/config.js";
import { resolveEffectiveAllowAgents, resolveTeamLeadToolsAlsoAllow } from "./auto-wire.js";

function makeConfig(overrides?: Partial<OpenClawConfig>): OpenClawConfig {
  return {
    agents: {
      list: [
        { id: "eng-lead", name: "Engineering Lead" },
        { id: "eng-backend", name: "Backend Engineer" },
        { id: "eng-frontend", name: "Frontend Engineer" },
        { id: "solo-agent" },
      ],
    },
    teams: [
      {
        id: "engineering",
        name: "Engineering Team",
        lead: "eng-lead",
        members: ["eng-backend", "eng-frontend"],
      },
    ],
    ...overrides,
  };
}

describe("resolveEffectiveAllowAgents", () => {
  it("extends existing allowAgents with team members", () => {
    const cfg = makeConfig();
    const result = resolveEffectiveAllowAgents(cfg, "eng-lead", ["some-other-agent"]);
    expect(result).toContain("some-other-agent");
    expect(result).toContain("eng-backend");
    expect(result).toContain("eng-frontend");
  });

  it("returns team members when no configured allow list", () => {
    const cfg = makeConfig();
    const result = resolveEffectiveAllowAgents(cfg, "eng-lead", undefined);
    expect(result).toContain("eng-backend");
    expect(result).toContain("eng-frontend");
    expect(result).toHaveLength(2);
  });

  it("returns original list for non-leads", () => {
    const cfg = makeConfig();
    const result = resolveEffectiveAllowAgents(cfg, "solo-agent", ["some-agent"]);
    expect(result).toEqual(["some-agent"]);
  });

  it("returns empty array for non-leads with no configured list", () => {
    const cfg = makeConfig();
    const result = resolveEffectiveAllowAgents(cfg, "solo-agent", undefined);
    expect(result).toEqual([]);
  });

  it("deduplicates when configured and team members overlap", () => {
    const cfg = makeConfig();
    const result = resolveEffectiveAllowAgents(cfg, "eng-lead", ["eng-backend", "extra"]);
    expect(result.filter((id) => id === "eng-backend")).toHaveLength(1);
    expect(result).toContain("extra");
    expect(result).toContain("eng-frontend");
  });
});

describe("resolveTeamLeadToolsAlsoAllow", () => {
  it("adds sessions_spawn and agents_list for leads", () => {
    const cfg = makeConfig();
    const result = resolveTeamLeadToolsAlsoAllow(cfg, "eng-lead", undefined);
    expect(result).toContain("sessions_spawn");
    expect(result).toContain("agents_list");
  });

  it("preserves existing also-allow entries for leads", () => {
    const cfg = makeConfig();
    const result = resolveTeamLeadToolsAlsoAllow(cfg, "eng-lead", ["memory_search"]);
    expect(result).toContain("memory_search");
    expect(result).toContain("sessions_spawn");
    expect(result).toContain("agents_list");
  });

  it("returns undefined for non-leads", () => {
    const cfg = makeConfig();
    expect(resolveTeamLeadToolsAlsoAllow(cfg, "solo-agent", undefined)).toBeUndefined();
  });

  it("returns existing list unchanged for non-leads", () => {
    const cfg = makeConfig();
    const existing = ["tool_a"];
    expect(resolveTeamLeadToolsAlsoAllow(cfg, "solo-agent", existing)).toBe(existing);
  });
});
