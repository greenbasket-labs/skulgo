"use client";

export type OfflineAction = {
  id: string;
  url: string;
  method: "POST" | "PATCH" | "PUT" | "DELETE";
  body: unknown;
  createdAt: number;
};

const KEY = "skulgo_offline_queue_v1";

function readQueue(): OfflineAction[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

function writeQueue(queue: OfflineAction[]) {
  localStorage.setItem(KEY, JSON.stringify(queue));
}

export function queueAction(action: Omit<OfflineAction, "id" | "createdAt">) {
  const item: OfflineAction = {
    ...action,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    body:
      action.method === "POST" &&
      action.body &&
      typeof action.body === "object" &&
      !Array.isArray(action.body) &&
      !("reference" in action.body)
        ? { ...action.body, reference: `OFFLINE-${crypto.randomUUID()}` }
        : action.body,
  };
  writeQueue([...readQueue(), item]);
  return item;
}

export function queuedActions() {
  return readQueue();
}

export async function syncOfflineQueue() {
  if (!navigator.onLine) return { synced: 0, remaining: readQueue().length };

  const queue = readQueue();
  const remaining: OfflineAction[] = [];
  let synced = 0;

  for (const action of queue) {
    try {
      const response = await fetch(action.url, {
        method: action.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action.body),
      });

      if (response.ok) synced += 1;
      else remaining.push(action);
    } catch {
      remaining.push(action);
    }
  }

  writeQueue(remaining);
  return { synced, remaining: remaining.length };
}
