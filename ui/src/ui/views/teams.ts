import { html, nothing } from "lit";
import type { AgentIdentityResult, TeamsListResult } from "../types.ts";

export type TeamsPanel = "overview" | "chat" | "status";

export type TeamsProps = {
  loading: boolean;
  error: string | null;
  teamsList: TeamsListResult | null;
  selectedTeamId: string | null;
  activePanel: TeamsPanel;
  chatMessage: string;
  chatSending: boolean;
  chatMessages: Array<{ role: "user" | "assistant"; text: string; ts: number }>;
  agentIdentityById: Record<string, AgentIdentityResult>;
  onRefresh: () => void;
  onSelectTeam: (teamId: string) => void;
  onSelectPanel: (panel: TeamsPanel) => void;
  onChatMessageChange: (msg: string) => void;
  onSendChat: (teamId: string) => void;
};

function renderTeamsTabs(active: TeamsPanel, onSelect: (panel: TeamsPanel) => void) {
  const tabs: Array<{ key: TeamsPanel; label: string }> = [
    { key: "overview", label: "Overview" },
    { key: "chat", label: "Chat" },
    { key: "status", label: "Status" },
  ];
  return html`
    <div class="agent-tabs">
      ${tabs.map(
        (t) => html`
          <button
            type="button"
            class="agent-tab ${active === t.key ? "active" : ""}"
            @click=${() => onSelect(t.key)}
          >
            ${t.label}
          </button>
        `,
      )}
    </div>
  `;
}

export function renderTeams(props: TeamsProps) {
  const teams = props.teamsList?.teams ?? [];
  const selectedId = props.selectedTeamId ?? teams[0]?.id ?? null;
  const selectedTeam = selectedId ? (teams.find((t) => t.id === selectedId) ?? null) : null;

  return html`
    <div class="agents-layout">
      <section class="card agents-sidebar">
        <div class="row" style="justify-content: space-between;">
          <div>
            <div class="card-title">Teams</div>
            <div class="card-sub">${teams.length} configured.</div>
          </div>
          <button class="btn btn--sm" ?disabled=${props.loading} @click=${props.onRefresh}>
            ${props.loading ? "Loading..." : "Refresh"}
          </button>
        </div>
        ${
          props.error
            ? html`<div class="callout danger" style="margin-top: 12px;">${props.error}</div>`
            : nothing
        }
        <div class="agent-list" style="margin-top: 12px;">
          ${
            teams.length === 0
              ? html`
                  <div class="muted">No teams configured.</div>
                `
              : teams.map(
                  (team) => html`
                    <button
                      type="button"
                      class="agent-row ${selectedId === team.id ? "active" : ""}"
                      @click=${() => props.onSelectTeam(team.id)}
                    >
                      <div class="agent-avatar">${(team.name || team.id).slice(0, 1).toUpperCase()}</div>
                      <div class="agent-info">
                        <div class="agent-title">${team.name || team.id}</div>
                        <div class="agent-sub mono">${team.members.length} members</div>
                      </div>
                    </button>
                  `,
                )
          }
        </div>
      </section>
      <section class="agents-main">
        ${
          !selectedTeam
            ? html`
                <div class="card">
                  <div class="card-title">Select a team</div>
                  <div class="card-sub">Pick a team to inspect or interact with.</div>
                </div>
              `
            : html`
                <div class="card" style="margin-bottom: 16px;">
                  <div class="card-title">${selectedTeam.name || selectedTeam.id}</div>
                  ${selectedTeam.description ? html`<div class="card-sub">${selectedTeam.description}</div>` : nothing}
                </div>
                ${renderTeamsTabs(props.activePanel, (panel) => props.onSelectPanel(panel))}
                ${props.activePanel === "overview" ? renderTeamOverview(selectedTeam, props.agentIdentityById) : nothing}
                ${props.activePanel === "chat" ? renderTeamChat(selectedTeam.id, props) : nothing}
                ${props.activePanel === "status" ? renderTeamStatus(selectedTeam) : nothing}
              `
        }
      </section>
    </div>
  `;
}

function renderTeamOverview(
  team: NonNullable<TeamsListResult["teams"][number]>,
  identityById: Record<string, AgentIdentityResult>,
) {
  const leadIdentity = identityById[team.lead.id];
  return html`
    <div class="card" style="margin-top: 16px;">
      <div class="card-title" style="margin-bottom: 8px;">Lead Agent</div>
      <div class="agent-row" style="cursor: default;">
        <div class="agent-avatar">
          ${leadIdentity?.emoji || (team.lead.name || team.lead.id).slice(0, 1).toUpperCase()}
        </div>
        <div class="agent-info">
          <div class="agent-title">${team.lead.name || team.lead.id}</div>
          <div class="agent-sub mono">${team.lead.id}</div>
        </div>
        <span class="agent-pill">lead</span>
      </div>
    </div>
    <div class="card" style="margin-top: 16px;">
      <div class="card-title" style="margin-bottom: 8px;">Members</div>
      ${team.members.map((member) => {
        const memberIdentity = identityById[member.id];
        return html`
          <div class="agent-row" style="cursor: default;">
            <div class="agent-avatar">
              ${memberIdentity?.emoji || (member.name || member.id).slice(0, 1).toUpperCase()}
            </div>
            <div class="agent-info">
              <div class="agent-title">${member.name || member.id}</div>
              <div class="agent-sub mono">${member.id}</div>
            </div>
          </div>
        `;
      })}
    </div>
  `;
}

function renderTeamChat(teamId: string, props: TeamsProps) {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      props.onSendChat(teamId);
    }
  };
  return html`
    <div class="card" style="margin-top: 16px;">
      <div class="card-title" style="margin-bottom: 8px;">Chat with Team</div>
      <div style="max-height: 400px; overflow-y: auto; margin-bottom: 12px; padding: 8px; border: 1px solid var(--border-color, #eee); border-radius: 8px;">
        ${
          props.chatMessages.length === 0
            ? html`
                <div class="muted">No messages yet. Send a task to the team.</div>
              `
            : props.chatMessages.map(
                (msg) => html`
                  <div style="margin-bottom: 8px; ${msg.role === "user" ? "text-align: right;" : ""}">
                    <span
                      class="agent-pill"
                      style="font-size: 10px; margin-bottom: 2px;"
                    >
                      ${msg.role === "user" ? "You" : "Team"}
                    </span>
                    <div style="padding: 6px 10px; border-radius: 8px; display: inline-block; max-width: 80%; text-align: left; background: ${msg.role === "user" ? "var(--accent-bg, #e3f2fd)" : "var(--card-bg, #f5f5f5)"};">
                      ${msg.text}
                    </div>
                  </div>
                `,
              )
        }
      </div>
      <div class="row" style="gap: 8px;">
        <textarea
          class="input"
          style="flex: 1; min-height: 40px; resize: vertical;"
          placeholder="Send a task to the team..."
          .value=${props.chatMessage}
          @input=${(e: InputEvent) => props.onChatMessageChange((e.target as HTMLTextAreaElement).value)}
          @keydown=${handleKeyDown}
          ?disabled=${props.chatSending}
        ></textarea>
        <button
          class="btn"
          ?disabled=${props.chatSending || !props.chatMessage.trim()}
          @click=${() => props.onSendChat(teamId)}
        >
          ${props.chatSending ? "Sending..." : "Send"}
        </button>
      </div>
    </div>
  `;
}

function renderTeamStatus(team: NonNullable<TeamsListResult["teams"][number]>) {
  return html`
    <div class="card" style="margin-top: 16px;">
      <div class="card-title" style="margin-bottom: 8px;">Team Status</div>
      <div class="card-sub" style="margin-bottom: 12px;">
        Active runs across team members. Refresh the Teams tab to update.
      </div>
      <div class="agent-row" style="cursor: default;">
        <div class="agent-info">
          <div class="agent-title">${team.lead.name || team.lead.id}</div>
          <div class="agent-sub mono">${team.lead.id}</div>
        </div>
        <span class="agent-pill">lead</span>
      </div>
      ${team.members.map(
        (member) => html`
          <div class="agent-row" style="cursor: default;">
            <div class="agent-info">
              <div class="agent-title">${member.name || member.id}</div>
              <div class="agent-sub mono">${member.id}</div>
            </div>
          </div>
        `,
      )}
    </div>
  `;
}
