"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Keep the current route's server components fresh without a manual F5.
 * Uses THREE mechanisms so it works even if Supabase Realtime isn't configured:
 *   1. Realtime — instant refresh when a subscribed table changes
 *   2. Focus/visibility — refresh when the user returns to the tab
 *   3. Polling — gentle fallback every `pollMs`
 * All paths are debounced so bursts trigger a single refresh.
 */
export function RealtimeRefresh({
  tables,
  channelName,
  debounceMs = 600,
  pollMs = 20000,
}: {
  tables: string[];
  channelName: string;
  debounceMs?: number;
  pollMs?: number;
}) {
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function scheduleRefresh() {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => router.refresh(), debounceMs);
    }

    // 1) Realtime subscription
    const supabase = createClient();
    const channel = supabase.channel(channelName);
    for (const table of tables) {
      channel.on("postgres_changes", { event: "*", schema: "public", table }, scheduleRefresh);
    }
    channel.subscribe();

    // 2) Refresh when tab becomes visible / window regains focus
    function onVisible() {
      if (document.visibilityState === "visible") scheduleRefresh();
    }
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", scheduleRefresh);

    // 3) Polling fallback (only when tab is visible — ไม่ poll ตอนซ่อน)
    const poll = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, pollMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", scheduleRefresh);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelName, debounceMs, pollMs]);

  return null;
}
