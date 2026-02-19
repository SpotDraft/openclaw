import { Type } from "@sinclair/typebox";
import { stringEnum } from "../schema/typebox.js";
import { createTask, getTask, listTasks, updateTask, type TaskStatus } from "../tasks-store.js";
import { resolveWorkspaceRoot } from "../workspace-dir.js";
import { type AnyAgentTool, jsonResult, readStringParam } from "./common.js";

const TASK_ACTIONS = ["create", "list", "update", "complete", "get"] as const;
const TASK_STATUSES = ["open", "in_progress", "done"] as const;

const TasksToolSchema = Type.Object({
  action: stringEnum(TASK_ACTIONS),
  // create
  title: Type.Optional(Type.String()),
  // create, list, get, update, complete
  agentId: Type.Optional(Type.String()),
  sessionKey: Type.Optional(Type.String()),
  // list
  status: Type.Optional(stringEnum(TASK_STATUSES)),
  // update, complete, get
  id: Type.Optional(Type.String()),
  // update
  metadata: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
});

export function createTasksTool(opts?: {
  agentSessionKey?: string;
  workspaceDir?: string;
}): AnyAgentTool {
  return {
    label: "Tasks",
    name: "tasks",
    description:
      "Create, list, update, and complete persistent tasks that survive across sessions. Tasks are stored in the workspace and can be shared between agents.",
    parameters: TasksToolSchema,
    execute: async (_toolCallId, args) => {
      const params = args as Record<string, unknown>;
      const action = readStringParam(params, "action", { required: true });
      const workspaceDir = resolveWorkspaceRoot(opts?.workspaceDir);

      if (action === "create") {
        const title = readStringParam(params, "title", { required: true });
        const agentId = readStringParam(params, "agentId") ?? "unknown";
        const sessionKey = readStringParam(params, "sessionKey") ?? opts?.agentSessionKey;
        const metadata =
          params.metadata && typeof params.metadata === "object"
            ? (params.metadata as Record<string, unknown>)
            : undefined;
        const task = await createTask(workspaceDir, {
          title,
          agentId,
          sessionKey,
          metadata,
        });
        return jsonResult({ ok: true, task });
      }

      if (action === "list") {
        const status = readStringParam(params, "status") as TaskStatus | undefined;
        const agentId = readStringParam(params, "agentId");
        const tasks = await listTasks(workspaceDir, { status, agentId });
        return jsonResult({ ok: true, tasks, count: tasks.length });
      }

      if (action === "get") {
        const id = readStringParam(params, "id", { required: true });
        const task = await getTask(workspaceDir, id);
        if (!task) {
          return jsonResult({ ok: false, error: `Task not found: ${id}` });
        }
        return jsonResult({ ok: true, task });
      }

      if (action === "update") {
        const id = readStringParam(params, "id", { required: true });
        const title = readStringParam(params, "title");
        const status = readStringParam(params, "status") as TaskStatus | undefined;
        const metadata =
          params.metadata && typeof params.metadata === "object"
            ? (params.metadata as Record<string, unknown>)
            : undefined;
        const task = await updateTask(workspaceDir, id, {
          title,
          status,
          metadata,
        });
        if (!task) {
          return jsonResult({ ok: false, error: `Task not found: ${id}` });
        }
        return jsonResult({ ok: true, task });
      }

      if (action === "complete") {
        const id = readStringParam(params, "id", { required: true });
        const task = await updateTask(workspaceDir, id, { status: "done" });
        if (!task) {
          return jsonResult({ ok: false, error: `Task not found: ${id}` });
        }
        return jsonResult({ ok: true, task });
      }

      throw new Error(`Unknown tasks action: ${action}`);
    },
  };
}
