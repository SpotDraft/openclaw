import type { GatewayBrowserClient } from "../gateway.ts";
import type { TeamsListResult, TeamsStatusResult } from "../types.ts";

export type TeamsState = {
  client: GatewayBrowserClient | null;
  connected: boolean;
  teamsLoading: boolean;
  teamsError: string | null;
  teamsList: TeamsListResult | null;
  teamsSelectedId: string | null;
  teamsChatMessage: string;
  teamsChatSending: boolean;
  teamsChatMessages: Array<{ role: "user" | "assistant"; text: string; ts: number }>;
  teamsChatRunId: string | null;
};

export async function loadTeams(state: TeamsState) {
  if (!state.client || !state.connected) {
    return;
  }
  if (state.teamsLoading) {
    return;
  }
  state.teamsLoading = true;
  state.teamsError = null;
  try {
    const res = await state.client.request<TeamsListResult>("teams.list", {});
    if (res) {
      state.teamsList = res;
      const selected = state.teamsSelectedId;
      const known = res.teams.some((t) => t.id === selected);
      if (!selected || !known) {
        state.teamsSelectedId = res.teams[0]?.id ?? null;
      }
    }
  } catch (err) {
    state.teamsError = String(err);
  } finally {
    state.teamsLoading = false;
  }
}

export async function loadTeamStatus(
  state: TeamsState,
  teamId: string,
): Promise<TeamsStatusResult | null> {
  if (!state.client || !state.connected) {
    return null;
  }
  try {
    return await state.client.request<TeamsStatusResult>("teams.status", { teamId });
  } catch {
    return null;
  }
}

export async function sendTeamMessage(state: TeamsState, teamId: string) {
  const message = state.teamsChatMessage.trim();
  if (!message || !state.client || !state.connected) {
    return;
  }
  state.teamsChatSending = true;
  const idempotencyKey = crypto.randomUUID();
  state.teamsChatMessages = [
    ...state.teamsChatMessages,
    { role: "user" as const, text: message, ts: Date.now() },
  ];
  state.teamsChatMessage = "";
  try {
    const res = await state.client.request<{
      runId: string;
      teamId: string;
      leadAgentId: string;
      status: string;
    }>("teams.run", {
      teamId,
      message,
      idempotencyKey,
      deliver: false,
    });
    state.teamsChatRunId = res?.runId ?? null;
    state.teamsChatMessages = [
      ...state.teamsChatMessages,
      {
        role: "assistant" as const,
        text: "Task accepted. Check status for updates.",
        ts: Date.now(),
      },
    ];
  } catch (err) {
    state.teamsChatMessages = [
      ...state.teamsChatMessages,
      { role: "assistant" as const, text: `Error: ${String(err)}`, ts: Date.now() },
    ];
  } finally {
    state.teamsChatSending = false;
  }
}
