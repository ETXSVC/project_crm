import { describe, it, expect } from "vitest";
import {
  detectCycle,
  forwardPass,
  computeCriticalPath,
  type ScheduleTask,
  type ScheduleDependency,
} from "./engine";

const baseDate = new Date("2026-07-01");

function makeTask(
  id: string,
  name: string,
  duration: number,
  opts: Partial<ScheduleTask> = {}
): ScheduleTask {
  return {
    id,
    name,
    parentId: null,
    type: "TASK",
    startDate: baseDate,
    endDate: null,
    duration,
    percentComplete: 0,
    sortOrder: 0,
    ...opts,
  };
}

describe("detectCycle", () => {
  it("returns false for acyclic graph", () => {
    const deps: ScheduleDependency[] = [
      { id: "1", predecessorId: "a", successorId: "b", type: "FS", lag: 0 },
      { id: "2", predecessorId: "b", successorId: "c", type: "FS", lag: 0 },
    ];
    expect(detectCycle(["a", "b", "c"], deps)).toBe(false);
  });

  it("returns true for cyclic graph", () => {
    const deps: ScheduleDependency[] = [
      { id: "1", predecessorId: "a", successorId: "b", type: "FS", lag: 0 },
      { id: "2", predecessorId: "b", successorId: "a", type: "FS", lag: 0 },
    ];
    expect(detectCycle(["a", "b"], deps)).toBe(true);
  });
});

describe("forwardPass", () => {
  it("schedules tasks with FS dependency", () => {
    const tasks = [makeTask("a", "Task A", 5), makeTask("b", "Task B", 3)];
    const deps: ScheduleDependency[] = [
      { id: "1", predecessorId: "a", successorId: "b", type: "FS", lag: 0 },
    ];
    const result = forwardPass(tasks, deps, baseDate);
    const taskA = result.find((t) => t.id === "a")!;
    const taskB = result.find((t) => t.id === "b")!;
    expect(taskA.endDate!.getTime()).toBeLessThan(taskB.startDate!.getTime());
  });

  it("rolls up summary task dates", () => {
    const tasks = [
      makeTask("s", "Summary", 0, { type: "SUMMARY", sortOrder: 0 }),
      makeTask("a", "Child A", 5, { parentId: "s", sortOrder: 1 }),
      makeTask("b", "Child B", 3, { parentId: "s", sortOrder: 2 }),
    ];
    const result = forwardPass(tasks, [], baseDate);
    const summary = result.find((t) => t.id === "s")!;
    expect(summary.startDate).toBeTruthy();
    expect(summary.endDate).toBeTruthy();
    expect(summary.duration).toBeGreaterThan(0);
  });
});

describe("computeCriticalPath", () => {
  it("identifies critical tasks with zero slack", () => {
    const tasks = [
      makeTask("a", "Task A", 5),
      makeTask("b", "Task B", 5),
    ];
    const deps: ScheduleDependency[] = [
      { id: "1", predecessorId: "a", successorId: "b", type: "FS", lag: 0 },
    ];
    const critical = computeCriticalPath(tasks, deps);
    expect(critical.has("b")).toBe(true);
  });
});
