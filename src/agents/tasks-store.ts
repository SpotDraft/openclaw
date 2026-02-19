import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

export type TaskStatus = "open" | "in_progress" | "done";

export type Task = {
  id: string;
  title: string;
  status: TaskStatus;
  agentId: string;
  sessionKey?: string;
  createdAt: number;
  updatedAt: number;
  metadata?: Record<string, unknown>;
};

type TasksFile = {
  tasks: Task[];
};

function resolveTasksPath(workspaceDir: string): string {
  return path.join(workspaceDir, "tasks.json");
}

async function readTasksFile(filePath: string): Promise<TasksFile> {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const parsed = JSON.parse(raw) as TasksFile;
    if (!Array.isArray(parsed.tasks)) {
      return { tasks: [] };
    }
    return parsed;
  } catch {
    return { tasks: [] };
  }
}

async function writeTasksFile(filePath: string, data: TasksFile): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}

export async function listTasks(
  workspaceDir: string,
  filter?: { status?: TaskStatus; agentId?: string },
): Promise<Task[]> {
  const filePath = resolveTasksPath(workspaceDir);
  const data = await readTasksFile(filePath);
  let tasks = data.tasks;
  if (filter?.status) {
    tasks = tasks.filter((t) => t.status === filter.status);
  }
  if (filter?.agentId) {
    tasks = tasks.filter((t) => t.agentId === filter.agentId);
  }
  return tasks;
}

export async function getTask(workspaceDir: string, id: string): Promise<Task | null> {
  const filePath = resolveTasksPath(workspaceDir);
  const data = await readTasksFile(filePath);
  return data.tasks.find((t) => t.id === id) ?? null;
}

export async function createTask(
  workspaceDir: string,
  params: {
    title: string;
    agentId: string;
    sessionKey?: string;
    metadata?: Record<string, unknown>;
  },
): Promise<Task> {
  const filePath = resolveTasksPath(workspaceDir);
  const data = await readTasksFile(filePath);
  const now = Date.now();
  const task: Task = {
    id: crypto.randomUUID(),
    title: params.title,
    status: "open",
    agentId: params.agentId,
    sessionKey: params.sessionKey,
    createdAt: now,
    updatedAt: now,
    metadata: params.metadata,
  };
  data.tasks.push(task);
  await writeTasksFile(filePath, data);
  return task;
}

export async function updateTask(
  workspaceDir: string,
  id: string,
  patch: {
    title?: string;
    status?: TaskStatus;
    metadata?: Record<string, unknown>;
  },
): Promise<Task | null> {
  const filePath = resolveTasksPath(workspaceDir);
  const data = await readTasksFile(filePath);
  const task = data.tasks.find((t) => t.id === id);
  if (!task) {
    return null;
  }
  if (patch.title !== undefined) {
    task.title = patch.title;
  }
  if (patch.status !== undefined) {
    task.status = patch.status;
  }
  if (patch.metadata !== undefined) {
    task.metadata = { ...task.metadata, ...patch.metadata };
  }
  task.updatedAt = Date.now();
  await writeTasksFile(filePath, data);
  return task;
}
