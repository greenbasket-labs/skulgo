"use client";

export type OfflineAction = {
  id: string;
  url: string;
  method: "POST" | "PATCH" | "PUT" | "DELETE";
  body: unknown;
  createdAt: number;
};

export type OfflineRecord<T = unknown> = {
  key: string;
  value: T;
  updatedAt: number;
};

const ACTIONS_KEY = "skulgo_offline_queue_v2";
const RECORDS_KEY = "skulgo_offline_records_v1";

function readActions(): OfflineAction[] {
  try {
    return JSON.parse(localStorage.getItem(ACTIONS_KEY) || "[]");
  } catch {
    return [];
  }
}

function writeActions(queue: OfflineAction[]) {
  localStorage.setItem(ACTIONS_KEY, JSON.stringify(queue));
}

function readRecords(): OfflineRecord[] {
  try {
    return JSON.parse(localStorage.getItem(RECORDS_KEY) || "[]");
  } catch {
    return [];
  }
}

function writeRecords(records: OfflineRecord[]) {
  localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
}

function actionDedupeKey(action: { url: string; method: string; body: unknown }) {
  if (!action.body || typeof action.body !== "object" || Array.isArray(action.body)) {
    return null;
  }

  const body = action.body as Record<string, unknown>;

  if (action.method === "POST" && action.url.endsWith("/attendance")) {
    const { studentId, date, session } = body;
    if (studentId && date && session) return `attendance:${studentId}:${date}:${session}`;
  }

  if (action.method === "POST" && action.url.endsWith("/assessments")) {
    const { studentId, subjectId, term } = body;
    if (studentId && subjectId && term) return `assessment:${studentId}:${subjectId}:${term}`;
  }

  return null;
}

export function queueAction(action: Omit<OfflineAction, "id" | "createdAt">) {
  const body =
    action.method === "POST" &&
    action.body &&
    typeof action.body === "object" &&
    !Array.isArray(action.body) &&
    !("reference" in action.body)
      ? { ...action.body, reference: `OFFLINE-${crypto.randomUUID()}` }
      : action.body;

  const item: OfflineAction = {
    ...action,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    body,
  };

  const dedupeKey = actionDedupeKey(item);
  const current = readActions();

  if (dedupeKey) {
    const next = current.filter(existing => actionDedupeKey(existing) !== dedupeKey);
    writeActions([...next, item]);
  } else {
    writeActions([...current, item]);
  }

  return item;
}

export function queuedActions() {
  return readActions();
}

export function queuedCount() {
  return readActions().length;
}

export function cacheRecord<T>(key: string, value: T) {
  const records = readRecords().filter(record => record.key !== key);
  records.push({ key, value, updatedAt: Date.now() });
  writeRecords(records);
}

export function readCachedRecord<T>(key: string): T | null {
  const record = readRecords().find(item => item.key === key);
  return record ? (record.value as T) : null;
}

export async function syncOfflineQueue() {
  if (!navigator.onLine) {
    return { synced: 0, remaining: readActions().length };
  }

  const queue = readActions();
  const remaining: OfflineAction[] = [];
  let synced = 0;

  for (const action of queue) {
    try {
      const response = await fetch(action.url, {
        method: action.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action.body),
      });

      if (response.ok) {
        synced += 1;
      } else {
        remaining.push(action);
      }
    } catch {
      remaining.push(action);
      break;
    }
  }

  writeActions(remaining);
  return { synced, remaining: remaining.length };
}

let started = false;
let syncing = false;

export function startOfflineSync(onSync?: (result: { synced: number; remaining: number }) => void) {
  if (started || typeof window === "undefined") return;
  started = true;

  const run = async () => {
    if (syncing) return;
    syncing = true;
    try {
      const result = await syncOfflineQueue();
      onSync?.(result);
    } finally {
      syncing = false;
    }
  };

  window.addEventListener("online", run);
  void run();
}
