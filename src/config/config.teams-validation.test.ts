import { describe, expect, it } from "vitest";
import { OpenClawSchema } from "./zod-schema.js";

describe("teams config validation", () => {
  it("accepts valid teams array", () => {
    const result = OpenClawSchema.safeParse({
      agents: {
        list: [{ id: "lead" }, { id: "member-a" }, { id: "member-b" }],
      },
      teams: [
        {
          id: "my-team",
          name: "My Team",
          lead: "lead",
          members: ["member-a", "member-b"],
          description: "A test team",
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("accepts teams with minimal fields", () => {
    const result = OpenClawSchema.safeParse({
      agents: {
        list: [{ id: "lead" }, { id: "worker" }],
      },
      teams: [
        {
          id: "minimal",
          lead: "lead",
          members: ["worker"],
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("accepts config with no teams", () => {
    const result = OpenClawSchema.safeParse({
      agents: { list: [{ id: "solo" }] },
    });
    expect(result.success).toBe(true);
  });

  it("rejects unknown lead agent ID", () => {
    const result = OpenClawSchema.safeParse({
      agents: {
        list: [{ id: "worker" }],
      },
      teams: [
        {
          id: "bad-team",
          lead: "nonexistent-lead",
          members: ["worker"],
        },
      ],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages.some((m) => m.includes("nonexistent-lead"))).toBe(true);
    }
  });

  it("rejects unknown member agent ID", () => {
    const result = OpenClawSchema.safeParse({
      agents: {
        list: [{ id: "lead" }],
      },
      teams: [
        {
          id: "bad-team",
          lead: "lead",
          members: ["nonexistent-member"],
        },
      ],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages.some((m) => m.includes("nonexistent-member"))).toBe(true);
    }
  });

  it("rejects extra properties on team entries", () => {
    const result = OpenClawSchema.safeParse({
      agents: { list: [{ id: "lead" }] },
      teams: [
        {
          id: "bad",
          lead: "lead",
          members: [],
          unknownField: true,
        },
      ],
    });
    expect(result.success).toBe(false);
  });
});
