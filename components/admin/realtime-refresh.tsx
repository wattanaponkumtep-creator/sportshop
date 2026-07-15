"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Keep the current route's server components fresh without a manual F5.
 * Lightweight: only refreshes on ACTUAL events — never polls on a timer.
 *   1. Realtime — instant refresh when a subscribed table changes (if enabled)
 *   2. Focus/visibility — refresh when the user returns to the tab
 * Debounced so bursts trigger a single refresh, and rate-limited so it can't
 * fire more than once every few seconds (protects the DB from overload).
 */
export function RealtimeRefresh({
  tables,
  channelName,
  debounceMs = 800,
  minGapMs = 4000,
}: {
  tables: string[];
  channelName: string;
  debounceMs?: number;
  minGapMs?: number;
}) {
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastRef = useRef(0);

  useEffect(() => {
    function doRefresh() {
      const now = Date.now();
      if (now - lastRef.current < minGapMs) return; // rate limit — กัน DB ถล่ม
      lastRef.current = now;
      router.refresh();
    }
    function scheduleRefresh() {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(doRefresh, debounceMs);
    }

    // 1) Realtime subscription (fires only when data actually changes)
    const supabase = createClient();
    const channel = supabase.channel(channelName);
    for (const table of tables) {
      channel.on("postgres_changes", { event: "*", schema: "public", table }, scheduleRefresh);
    }
    channel.subscribe();

    // 2) Refresh when tab becomes visible again (no timer/polling)
    function onVisible() {
      if (document.visibilityState === "visible") scheduleRefresh();
    }
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      document.removeEventListener("visibilitychange", onVisible);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelName, debounceMs, minGapMs]);

  return null;
}
