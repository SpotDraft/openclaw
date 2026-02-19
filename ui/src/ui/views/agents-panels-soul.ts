import { html, nothing } from "lit";
import type { AgentIdentityResult } from "../types.ts";

export function renderSoulEditor(params: {
  agentId: string;
  agentIdentity: AgentIdentityResult | null;
  agentFileContents: Record<string, string>;
  agentFileDrafts: Record<string, string>;
  agentFileSaving: boolean;
  onFileDraftChange: (name: string, content: string) => void;
  onFileReset: (name: string) => void;
  onFileSave: (name: string) => void;
}) {
  const baseContent = params.agentFileContents["SOUL.md"] ?? "";
  const draft = params.agentFileDrafts["SOUL.md"] ?? baseContent;
  const isDirty = draft !== baseContent;
  const name = params.agentIdentity?.name?.trim() || params.agentId;
  const emoji = params.agentIdentity?.emoji?.trim() || "";
  const header = emoji ? `${emoji} ${name}` : name;

  return html`
    <section class="card">
      <div class="row" style="justify-content: space-between;">
        <div>
          <div class="card-title">${header} - SOUL.md</div>
          <div class="card-sub">Define this agent's personality, rules, and behavior.</div>
        </div>
        <div class="agent-file-actions">
          <button
            class="btn btn--sm"
            ?disabled=${!isDirty}
            @click=${() => params.onFileReset("SOUL.md")}
          >
            Reset
          </button>
          <button
            class="btn btn--sm primary"
            ?disabled=${params.agentFileSaving || !isDirty}
            @click=${() => params.onFileSave("SOUL.md")}
          >
            ${params.agentFileSaving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
      ${
        !baseContent && !draft
          ? html`
              <div class="callout info" style="margin-top: 12px">
                No SOUL.md found. Write one to define this agent's persona and save to create it.
              </div>
            `
          : nothing
      }
      <label class="field" style="margin-top: 12px;">
        <span>Content</span>
        <textarea
          style="min-height: 400px; font-family: var(--font-mono);"
          .value=${draft}
          @input=${(e: Event) =>
            params.onFileDraftChange("SOUL.md", (e.target as HTMLTextAreaElement).value)}
          placeholder="# SOUL.md&#10;&#10;You are..."
        ></textarea>
      </label>
    </section>
  `;
}
