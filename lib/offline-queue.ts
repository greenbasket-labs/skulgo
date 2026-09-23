"use client";

export type OfflineAction = {
  id: string;
  url: string;
  method: "POST" | "PATCH" | "PUT" | "DELETE";
  body: unknown;
  createdAt: number;
  scopeKey: string;
};

export type OfflineRecord<T = unknown> = {
  key: string;
  value: T;
  updatedAt: number;
};

const ACTIONS_KEY = "skulgo_offline_queue_v3";
const RECORDS_KEY = "skulgo_offline_records_v2";

function readActions(): OfflineAction[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(ACTIONS_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter(item => item && typeof item.scopeKey === "string") : [];
  } catch {
    return [];
  }
}

function writeActions(queue: OfflineAction[]) {
  localStorage.setItem(ACTIONS_KEY, JSON.stringify(queue));
}

function readRecords(): OfflineRecord[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECORDS_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeRecords(records: OfflineRecord[]) {
  localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
}

function actionDedupeKey(action: { url: string; method: string; body: unknown }) {
  if (!action.body || typeof action.body !== "object" || Array.isArray(action.body)) return null;
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

export function makeOfflineScope(userId: string, membershipId: string) {
  return `${userId}:${membershipId}`;
}

export function queueAction(
  action: Omit<OfflineAction, "id" | "createdAt" | "scopeKey"> & { scopeKey: string }
) {
  if (!action.scopeKey.trim()) {
    throw new Error("Offline actions require an active workspace scope");
  }

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

  const current = readActions();
  const dedupeKey = actionDedupeKey(item);

  if (dedupeKey) {
    const next = current.filter(
      existing =>
        existing.scopeKey !== item.scopeKey ||
        actionDedupeKey(existing) !== dedupeKey
    );
    writeActions([...next, item]);
  } else {
    writeActions([...current, item]);
  }

  return item;
}

export function queuedActions(scopeKey?: string) {
  const actions = readActions();
  return scopeKey ? actions.filter(action => action.scopeKey === scopeKey) : actions;
}

export function queuedCount(scopeKey?: string) {
  return queuedActions(scopeKey).length;
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

export async function syncOfflineQueue(scopeKey?: string) {
  // Never sync an unscoped queue: offline work belongs to a specific
  // personal account + school membership workspace.
  if (!scopeKey?.trim()) {
    return { synced: 0, remaining: queuedCount() };
  }

  if (!navigator.onLine) {
    return { synced: 0, remaining: queuedCount(scopeKey) };
  }

  const all = readActions();
  const target = all.filter(action => action.scopeKey === scopeKey);
  const targetIds = new Set(target.map(action => action.id));
  const remaining: OfflineAction[] = all.filter(action => !targetIds.has(action.id));
  let synced = 0;

  for (const action of target) {
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
  return { synced, remaining: remaining.filter(a => a.scopeKey === scopeKey).length };
}

const activeSyncs = new Map<string, (result: { synced: number; remaining: number }) => void>();
const runningScopes = new Set<string>();

export function startOfflineSync(
  scopeKey?: string,
  onSync?: (result: { synced: number; remaining: number }) => void
) {
  if (typeof window === "undefined" || !scopeKey?.trim()) return;

  const run = async () => {
    if (runningScopes.has(scopeKey)) return;
    runningScopes.add(scopeKey);
    try {
      const result = await syncOfflineQueue(scopeKey);
      activeSyncs.get(scopeKey)?.(result);
    } finally {
      runningScopes.delete(scopeKey);
    }
  };

  activeSyncs.set(scopeKey, onSync ?? (() => undefined));

  const existing = window.__skulgoOfflineScopes ?? new Set<string>();
  if (!existing.has(scopeKey)) {
    existing.add(scopeKey);
    window.__skulgoOfflineScopes = existing;
    window.addEventListener("online", run);
  }

  void run();
}
