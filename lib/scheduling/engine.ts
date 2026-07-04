import { addDays, differenceInDays, max, min } from "date-fns";
import type { DependencyType } from "@prisma/client";

export interface ScheduleTask {
  id: string;
  name: string;
  parentId: string | null;
  type: string;
  startDate: Date | null;
  endDate: Date | null;
  duration: number;
  percentComplete: number;
  sortOrder: number;
  isCritical?: boolean;
}

export interface ScheduleDependency {
  id: string;
  predecessorId: string;
  successorId: string;
  type: DependencyType;
  lag: number;
}

function getEndDate(start: Date, duration: number): Date {
  return addDays(start, Math.max(duration - 1, 0));
}

function getStartFromEnd(end: Date, duration: number): Date {
  return addDays(end, -(Math.max(duration - 1, 0)));
}

function applyDependency(
  predStart: Date,
  predEnd: Date,
  type: DependencyType,
  lag: number,
  succDuration: number
): Date {
  switch (type) {
    case "FS":
      return addDays(predEnd, lag + 1);
    case "SS":
      return addDays(predStart, lag);
    case "FF":
      return getStartFromEnd(addDays(predEnd, lag), succDuration);
    case "SF":
      return getStartFromEnd(addDays(predStart, lag), succDuration);
    default:
      return addDays(predEnd, lag + 1);
  }
}

export function detectCycle(
  taskIds: string[],
  dependencies: ScheduleDependency[]
): boolean {
  const graph = new Map<string, string[]>();
  for (const id of taskIds) graph.set(id, []);
  for (const dep of dependencies) {
    graph.get(dep.predecessorId)?.push(dep.successorId);
  }

  const visited = new Set<string>();
  const stack = new Set<string>();

  function dfs(node: string): boolean {
    if (stack.has(node)) return true;
    if (visited.has(node)) return false;
    visited.add(node);
    stack.add(node);
    for (const next of graph.get(node) ?? []) {
      if (dfs(next)) return true;
    }
    stack.delete(node);
    return false;
  }

  for (const id of taskIds) {
    if (dfs(id)) return true;
  }
  return false;
}

export function forwardPass(
  tasks: ScheduleTask[],
  dependencies: ScheduleDependency[],
  projectStart?: Date
): ScheduleTask[] {
  const taskMap = new Map(tasks.map((t) => [t.id, { ...t }]));
  const depsBySuccessor = new Map<string, ScheduleDependency[]>();

  for (const dep of dependencies) {
    const list = depsBySuccessor.get(dep.successorId) ?? [];
    list.push(dep);
    depsBySuccessor.set(dep.successorId, list);
  }

  const sorted = topologicalSort(tasks.map((t) => t.id), dependencies);

  for (const taskId of sorted) {
    const task = taskMap.get(taskId)!;
    if (task.type === "MILESTONE") {
      task.duration = 0;
    }

    const preds = depsBySuccessor.get(taskId) ?? [];
    let earliestStart: Date | null = null;

    for (const dep of preds) {
      const pred = taskMap.get(dep.predecessorId);
      if (!pred?.startDate || !pred?.endDate) continue;
      const candidate = applyDependency(
        pred.startDate,
        pred.endDate,
        dep.type,
        dep.lag,
        task.duration
      );
      if (!earliestStart || candidate > earliestStart) {
        earliestStart = candidate;
      }
    }

    if (!earliestStart) {
      earliestStart = task.startDate ?? projectStart ?? new Date();
    }

    if (task.type !== "MILESTONE") {
      task.startDate = earliestStart;
      task.endDate = getEndDate(earliestStart, task.duration);
    } else {
      task.startDate = earliestStart;
      task.endDate = earliestStart;
    }
  }

  rollupSummaryTasks(taskMap);
  return Array.from(taskMap.values());
}

function rollupSummaryTasks(taskMap: Map<string, ScheduleTask>) {
  const childrenMap = new Map<string, string[]>();
  for (const task of taskMap.values()) {
    if (task.parentId) {
      const list = childrenMap.get(task.parentId) ?? [];
      list.push(task.id);
      childrenMap.set(task.parentId, list);
    }
  }

  const summaryTasks = Array.from(taskMap.values())
    .filter((t) => t.type === "SUMMARY")
    .sort((a, b) => b.sortOrder - a.sortOrder);

  for (const summary of summaryTasks) {
    const childIds = childrenMap.get(summary.id) ?? [];
    const children = childIds.map((id) => taskMap.get(id)!).filter(Boolean);
    if (children.length === 0) continue;

    const starts = children.map((c) => c.startDate).filter(Boolean) as Date[];
    const ends = children.map((c) => c.endDate).filter(Boolean) as Date[];
    if (starts.length > 0 && ends.length > 0) {
      summary.startDate = min(starts);
      summary.endDate = max(ends);
      summary.duration = differenceInDays(summary.endDate, summary.startDate) + 1;
    }
  }
}

function topologicalSort(
  taskIds: string[],
  dependencies: ScheduleDependency[]
): string[] {
  const inDegree = new Map<string, number>();
  const graph = new Map<string, string[]>();

  for (const id of taskIds) {
    inDegree.set(id, 0);
    graph.set(id, []);
  }

  for (const dep of dependencies) {
    graph.get(dep.predecessorId)?.push(dep.successorId);
    inDegree.set(dep.successorId, (inDegree.get(dep.successorId) ?? 0) + 1);
  }

  const queue = taskIds.filter((id) => inDegree.get(id) === 0);
  const result: string[] = [];

  while (queue.length > 0) {
    const node = queue.shift()!;
    result.push(node);
    for (const next of graph.get(node) ?? []) {
      const deg = (inDegree.get(next) ?? 1) - 1;
      inDegree.set(next, deg);
      if (deg === 0) queue.push(next);
    }
  }

  return result.length === taskIds.length ? result : taskIds;
}

export function computeCriticalPath(
  tasks: ScheduleTask[],
  dependencies: ScheduleDependency[]
): Set<string> {
  const scheduled = forwardPass(tasks, dependencies);
  const taskMap = new Map(scheduled.map((t) => [t.id, t]));
  const projectEnd = max(
    scheduled.map((t) => t.endDate).filter(Boolean) as Date[]
  );

  const slack = new Map<string, number>();
  for (const task of scheduled) {
    if (!task.endDate) {
      slack.set(task.id, Infinity);
      continue;
    }
    slack.set(task.id, differenceInDays(projectEnd, task.endDate));
  }

  const critical = new Set<string>();
  for (const [id, s] of slack) {
    if (s === 0) critical.add(id);
  }

  return critical;
}
