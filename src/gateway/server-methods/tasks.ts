import type { GatewayRequestHandlers } from "./types.js";
import {
  createTask,
  getTask,
  listTasks,
  updateTask,
  type TaskStatus,
} from "../../agents/tasks-store.js";
import { resolveWorkspaceRoot } from "../../agents/workspace-dir.js";
import { ErrorCodes, errorShape } from "../protocol/index.js";

function resolveWorkspace(params: Record<string, unknown>) {
  const workspace =
    typeof params.workspace === "string" && params.workspace.trim()
      ? params.workspace.trim()
      : undefined;
  return resolveWorkspaceRoot(workspace);
}

export const tasksHandlers: GatewayRequestHandlers = {
  "tasks.list": async ({ params, respond }) => {
    try {
      const workspaceDir = resolveWorkspace(params);
      const status =
        typeof params.status === "string" && params.status.trim()
          ? (params.status.trim() as TaskStatus)
          : undefined;
      const agentId =
        typeof params.agentId === "string" && params.agentId.trim()
          ? params.agentId.trim()
          : undefined;
      const tasks = await listTasks(workspaceDir, { status, agentId });
      respond(true, { tasks, count: tasks.length });
    } catch (err) {
      respond(
        false,
        undefined,
        errorShape(ErrorCodes.UNAVAILABLE, `tasks.list failed: ${String(err)}`),
      );
    }
  },

  "tasks.get": async ({ params, respond }) => {
    const id = typeof params.id === "string" ? params.id.trim() : "";
    if (!id) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "id required"));
      return;
    }
    try {
      const workspaceDir = resolveWorkspace(params);
      const task = await getTask(workspaceDir, id);
      if (!task) {
        respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, `task not found: ${id}`));
        return;
      }
      respond(true, { task });
    } catch (err) {
      respond(
        false,
        undefined,
        errorShape(ErrorCodes.UNAVAILABLE, `tasks.get failed: ${String(err)}`),
      );
    }
  },

  "tasks.create": async ({ params, respond }) => {
    const title = typeof params.title === "string" ? params.title.trim() : "";
    if (!title) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "title required"));
      return;
    }
    const agentId =
      typeof params.agentId === "string" && params.agentId.trim()
        ? params.agentId.trim()
        : "unknown";
    const sessionKey =
      typeof params.sessionKey === "string" && params.sessionKey.trim()
        ? params.sessionKey.trim()
        : undefined;
    const metadata =
      params.metadata && typeof params.metadata === "object" && !Array.isArray(params.metadata)
        ? (params.metadata as Record<string, unknown>)
        : undefined;
    try {
      const workspaceDir = resolveWorkspace(params);
      const task = await createTask(workspaceDir, {
        title,
        agentId,
        sessionKey,
        metadata,
      });
      respond(true, { task });
    } catch (err) {
      respond(
        false,
        undefined,
        errorShape(ErrorCodes.UNAVAILABLE, `tasks.create failed: ${String(err)}`),
      );
    }
  },

  "tasks.update": async ({ params, respond }) => {
    const id = typeof params.id === "string" ? params.id.trim() : "";
    if (!id) {
      respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, "id required"));
      return;
    }
    const title =
      typeof params.title === "string" && params.title.trim() ? params.title.trim() : undefined;
    const status =
      typeof params.status === "string" && params.status.trim()
        ? (params.status.trim() as TaskStatus)
        : undefined;
    const metadata =
      params.metadata && typeof params.metadata === "object" && !Array.isArray(params.metadata)
        ? (params.metadata as Record<string, unknown>)
        : undefined;
    try {
      const workspaceDir = resolveWorkspace(params);
      const task = await updateTask(workspaceDir, id, { title, status, metadata });
      if (!task) {
        respond(false, undefined, errorShape(ErrorCodes.INVALID_REQUEST, `task not found: ${id}`));
        return;
      }
      respond(true, { task });
    } catch (err) {
      respond(
        false,
        undefined,
        errorShape(ErrorCodes.UNAVAILABLE, `tasks.update failed: ${String(err)}`),
      );
    }
  },
};
