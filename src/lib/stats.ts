import { supabase } from "@/integrations/supabase/client";

export type StatKind = "view" | "wa" | "call";
type QueuedEvent = { event_id: string; listing_id: string; kind: StatKind; client_timestamp: string };

const QUEUE_KEY = "nova-metrics-queue";
const API = `${(import.meta.env["VITE_API_BASE"] as string | undefined) ?? ""}/api/metrics/batch`;
const BACKOFF = [5000, 15000, 45000, 120000];
let attempt = 0;
let timer: ReturnType<typeof setTimeout> | null = null;
let flushing = false;
const waiters = new Map<string, (views: number | null) => void>();

function readQueue(): QueuedEvent[] {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]"); } catch { return []; }
}
function writeQueue(q: QueuedEvent[]) {
  try { localStorage.setItem(QUEUE_KEY, JSON.stringify(q.slice(-500))); } catch {}
}

function schedule() {
  if (timer) return;
  const delay = BACKOFF[Math.min(attempt, BACKOFF.length - 1)]!;
  attempt++;
  timer = setTimeout(() => { timer = null; void flushQueue(); }, delay);
}

/** Kuyruğu FIFO sırayla toplu gönderir; yalnızca sunucu onayı gelen olaylar silinir. */
export async function flushQueue(): Promise<void> {
  if (flushing || typeof window === "undefined") return;
  const queue = readQueue().sort((a, b) => a.client_timestamp.localeCompare(b.client_timestamp));
  if (!queue.length) return;
  flushing = true;
  const batch = queue.slice(0, 100);
  try {
    const res = await fetch(API, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ events: batch }),
      keepalive: true,
    });
    if (res.status === 200 || res.status === 207) {
      const { results } = (await res.json()) as { results: { event_id: string; ok: boolean; views?: number | null }[] };
      const done = new Set(results.filter((r) => r.ok).map((r) => r.event_id));
      for (const r of results) if (r.ok) { waiters.get(r.event_id)?.(r.views ?? null); waiters.delete(r.event_id); }
      writeQueue(readQueue().filter((e) => !done.has(e.event_id)));
      attempt = 0;
      flushing = false;
      if (res.status === 207) schedule();
      else if (readQueue().length) void flushQueue();
      return;
    }
    if (res.status >= 400 && res.status < 500) {
      // Geçersiz olaylar tekrar denense de düzelmez; kuyruktan çıkar.
      const bad = new Set(batch.map((e) => e.event_id));
      writeQueue(readQueue().filter((e) => !bad.has(e.event_id)));
      flushing = false;
      return;
    }
    flushing = false;
    schedule();
  } catch {
    flushing = false;
    schedule();
  }
}

let started = false;
/** Uygulama açılışında bir kez çağrılır: online olayı + boşta gönderim. */
export function startMetricsQueue() {
  if (started || typeof window === "undefined") return;
  started = true;
  window.addEventListener("online", () => { attempt = 0; if (timer) { clearTimeout(timer); timer = null; } void flushQueue(); });
  const idle = (window as any).requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 1));
  idle(() => void flushQueue());
}

// Aynı ziyaretçi aynı oturumda bir ilanı / tuşu yalnızca 1 kez sayılır.
export async function trackListing(listingId: string, kind: StatKind): Promise<number | null> {
  const key = `nova-stat:${kind}:${listingId}`;
  let already = false;
  try { already = sessionStorage.getItem(key) === "1"; } catch {}

  if (already) {
    if (kind !== "view") return null;
    const { data } = await (supabase.from as any)("listing_stats").select("views").eq("listing_id", listingId).maybeSingle();
    return data?.views ?? null;
  }
  try { sessionStorage.setItem(key, "1"); } catch {}

  startMetricsQueue();
  const event: QueuedEvent = { event_id: crypto.randomUUID(), listing_id: listingId, kind, client_timestamp: new Date().toISOString() };
  writeQueue([...readQueue(), event]);
  const result = new Promise<number | null>((resolve) => {
    waiters.set(event.event_id, resolve);
    setTimeout(() => { if (waiters.delete(event.event_id)) resolve(null); }, 8000);
  });
  void flushQueue();
  return result;
}
