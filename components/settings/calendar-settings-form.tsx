"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateCalendarSettings } from "@/lib/actions/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

const DAY_LABELS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

interface Calendar {
  id: string;
  name: string;
  workDays: number[];
  hoursPerDay: number;
  holidays: Date[];
}

interface CalendarSettingsFormProps {
  calendars: Calendar[];
  canEdit: boolean;
}

export function CalendarSettingsForm({ calendars, canEdit }: CalendarSettingsFormProps) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (calendars.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Working Calendar</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No calendars configured</p>
        </CardContent>
      </Card>
    );
  }

  const calendar = calendars[0];

  async function handleSubmit(formData: FormData) {
    setPending(calendar.id);
    setMessage(null);
    setError(null);
    const result = await updateCalendarSettings(calendar.id, formData);
    setPending(null);
    if (result.error) {
      setError(result.error);
    } else {
      setMessage("Calendar updated");
      router.refresh();
    }
  }

  const holidaysValue = calendar.holidays
    .map((d) => new Date(d).toISOString().slice(0, 10))
    .join(", ");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Working Calendar</CardTitle>
        <CardDescription>Work days and hours used for project scheduling</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cal-name">Calendar name</Label>
            <Input
              id="cal-name"
              name="name"
              defaultValue={calendar.name}
              disabled={!canEdit}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="hoursPerDay">Hours per day</Label>
            <Input
              id="hoursPerDay"
              name="hoursPerDay"
              type="number"
              min={1}
              max={24}
              step={0.5}
              defaultValue={calendar.hoursPerDay}
              disabled={!canEdit}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Work days</Label>
            <div className="flex flex-wrap gap-3">
              {DAY_LABELS.map((day) => (
                <label key={day.value} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="workDays"
                    value={day.value}
                    defaultChecked={calendar.workDays.includes(day.value)}
                    disabled={!canEdit}
                    className="rounded border-input"
                  />
                  {day.label}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="holidays">Holidays</Label>
            <Input
              id="holidays"
              name="holidays"
              defaultValue={holidaysValue}
              placeholder="2026-12-25, 2026-01-01"
              disabled={!canEdit}
            />
            <p className="text-xs text-muted-foreground">
              Comma-separated dates (YYYY-MM-DD). Currently {calendar.holidays.length} holiday(s).
            </p>
          </div>

          {calendar.holidays.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {calendar.holidays.slice(0, 5).map((d, i) => (
                <span key={i} className="rounded bg-muted px-2 py-1 text-xs">
                  {formatDate(d)}
                </span>
              ))}
              {calendar.holidays.length > 5 && (
                <span className="text-xs text-muted-foreground">
                  +{calendar.holidays.length - 5} more
                </span>
              )}
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
          {message && <p className="text-sm text-green-600">{message}</p>}
          {canEdit && (
            <Button type="submit" disabled={pending === calendar.id}>
              {pending === calendar.id ? "Saving..." : "Save calendar"}
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
