"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ResourceFormValues {
  name: string;
  type: string;
  email: string | null;
  capacityHrs: number;
  costRate: number;
}

interface TaskOption {
  id: string;
  name: string;
}

interface ResourceFormFieldsProps {
  idPrefix: string;
  type: string;
  onTypeChange: (value: string) => void;
  defaultValues?: ResourceFormValues;
  tasks: TaskOption[];
  selectedTaskIds: string[];
  onTaskToggle: (taskId: string, checked: boolean) => void;
}

export function ResourceFormFields({
  idPrefix,
  type,
  onTypeChange,
  defaultValues,
  tasks,
  selectedTaskIds,
  onTaskToggle,
}: ResourceFormFieldsProps) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-name`}>Name</Label>
        <Input
          id={`${idPrefix}-name`}
          name="name"
          defaultValue={defaultValues?.name}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-type`}>Type</Label>
        <select
          id={`${idPrefix}-type`}
          value={type}
          onChange={(e) => onTypeChange(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="PERSON">Person</option>
          <option value="EQUIPMENT">Equipment</option>
          <option value="MATERIAL">Material</option>
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-capacity`}>Capacity (hrs/day)</Label>
          <Input
            id={`${idPrefix}-capacity`}
            name="capacityHrs"
            type="number"
            defaultValue={defaultValues?.capacityHrs ?? 8}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-cost`}>Cost Rate ($/hr)</Label>
          <Input
            id={`${idPrefix}-cost`}
            name="costRate"
            type="number"
            defaultValue={defaultValues?.costRate ?? 0}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-email`}>Email</Label>
        <Input
          id={`${idPrefix}-email`}
          name="email"
          type="email"
          defaultValue={defaultValues?.email ?? ""}
        />
      </div>
      {tasks.length > 0 && (
        <div className="space-y-2">
          <Label>Assigned Tasks</Label>
          <div className="max-h-40 space-y-2 overflow-y-auto rounded-md border p-3">
            {tasks.map((task) => (
              <label key={task.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedTaskIds.includes(task.id)}
                  onChange={(e) => onTaskToggle(task.id, e.target.checked)}
                  className="h-4 w-4 rounded border-input"
                />
                <span>{task.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
