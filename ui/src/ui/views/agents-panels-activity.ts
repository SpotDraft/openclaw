import { html, nothing } from "lit";
import type { ActivityEntry } from "../app-tool-stream.ts";

function phaseIcon(phase: string): string {
  switch (phase) {
    case "start":
      return "▶";
    case "end":
      return "✓";
    case "error":
      return "✗";
    default:
      return "·";
  }
}

function phaseClass(phase: string): string {
  switch (phase) {
    case "start":
      return "chip-info";
    case "end":
      return "chip-ok";
    case "error":
      return "chip-danger";
    default:
      return "";
  }
}

function formatTs(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString(undefined, { hour12: false });
}

export function renderActivityFeed(entries: ActivityEntry[]) {
  const sorted = entries.toReversed();
  return html`
    <section class="card">
      <div class="card-title">Activity Feed</div>
      <div class="card-sub">Real-time lifecycle events from agent runs.</div>
      ${
        sorted.length === 0
          ? html`
              <div class="callout info" style="margin-top: 12px">
                No activity yet. Lifecycle events (agent spawns, completions, errors) will appear here.
              </div>
            `
          : html`
              <div class="list" style="margin-top: 16px; max-height: 500px; overflow-y: auto;">
                ${sorted.map(
                  (entry) => html`
                    <div class="list-item">
                      <div class="list-main">
                        <div class="list-title">
                          <span class="chip ${phaseClass(entry.phase)}" style="margin-right: 8px;">
                            ${phaseIcon(entry.phase)} ${entry.phase}
                          </span>
                          ${entry.agentId ? html`<span class="mono">${entry.agentId}</span>` : nothing}
                        </div>
                        ${entry.task ? html`<div class="list-sub">${entry.task}</div>` : nothing}
                        ${
                          entry.error
                            ? html`<div class="list-sub" style="color: var(--color-danger);">${entry.error}</div>`
                            : nothing
                        }
                      </div>
                      <div class="list-meta">
                        <div class="mono">${formatTs(entry.ts)}</div>
                        <div class="muted mono" style="font-size: 11px;">${entry.runId.slice(0, 8)}</div>
                      </div>
                    </div>
                  `,
                )}
              </div>
            `
      }
    </section>
  `;
}
