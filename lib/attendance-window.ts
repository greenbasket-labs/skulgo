const NIGERIA_OFFSET_MS = 60 * 60 * 1000;

export type AttendanceWindow = {
  startTime: string;
  endTime: string;
};

export const DEFAULT_ATTENDANCE_WINDOWS: Record<"morning" | "afternoon", AttendanceWindow> = {
  morning: { startTime: "07:30", endTime: "09:00" },
  afternoon: { startTime: "13:00", endTime: "14:00" },
};

export function normalizeTime(value: unknown, fallback: string) {
  const text = String(value ?? "").trim();
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(text) ? text : fallback;
}

export function getAttendanceWindow(
  settings: { morningAttendanceStart?: unknown; morningAttendanceEnd?: unknown; afternoonAttendanceStart?: unknown; afternoonAttendanceEnd?: unknown },
  session: string
): AttendanceWindow {
  if (session === "afternoon") {
    return {
      startTime: normalizeTime(settings.afternoonAttendanceStart, DEFAULT_ATTENDANCE_WINDOWS.afternoon.startTime),
      endTime: normalizeTime(settings.afternoonAttendanceEnd, DEFAULT_ATTENDANCE_WINDOWS.afternoon.endTime),
    };
  }
  return {
    startTime: normalizeTime(settings.morningAttendanceStart, DEFAULT_ATTENDANCE_WINDOWS.morning.startTime),
    endTime: normalizeTime(settings.morningAttendanceEnd, DEFAULT_ATTENDANCE_WINDOWS.morning.endTime),
  };
}

export function getWindowBounds(dateValue: Date, window: AttendanceWindow) {
  const date = dateValue.toISOString().slice(0, 10);
  const start = new Date(date + "T" + window.startTime + ":00+01:00");
  const end = new Date(date + "T" + window.endTime + ":00+01:00");
  return { start, end };
}

export function getAttendanceWindowState(now: Date, dateValue: Date, window: AttendanceWindow) {
  const { start, end } = getWindowBounds(dateValue, window);
  return {
    start,
    end,
    allowed: now >= start && now < end,
    before: now < start,
    after: now >= end,
  };
}

export function formatAttendanceWindow(window: AttendanceWindow) {
  return window.startTime + "–" + window.endTime;
}
