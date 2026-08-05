import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-sync-secret");
  if (!secret || secret !== process.env.NIGHTSCOUT_SYNC_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = process.env.GLUCOMOVE_USER_ID;
  if (!userId) return NextResponse.json({ error: "GLUCOMOVE_USER_ID not configured" }, { status: 500 });

  const supabase = createSupabaseAdminClient();

  // Find all dates that have meals or readings
  const [{ data: meals }, { data: readings }] = await Promise.all([
    supabase.from("glucomove_meals").select("meal_start_time").eq("user_id", userId),
    supabase.from("glucomove_readings").select("timestamp").eq("user_id", userId).limit(50000),
  ]);

  const toWIBDate = (ts: string) => {
    const d = new Date(new Date(ts).getTime() + 7 * 3600000);
    return d.toISOString().slice(0, 10);
  };

  const allDates = new Set([
    ...(meals ?? []).map(m => toWIBDate(m.meal_start_time)),
    ...(readings ?? []).map(r => toWIBDate(r.timestamp)),
  ]);

  // Skip today — it's not complete yet
  const todayWIB = new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10);
  const datesToProcess = [...allDates].filter(d => d < todayWIB).sort();

  const host = req.headers.get("host") ?? "localhost:3000";
  const scheme = host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https";
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? `${scheme}://${host}`;
  const results: { date: string; status: string; error?: string }[] = [];

  for (const date of datesToProcess) {
    try {
      const res = await fetch(`${baseUrl}/api/glucomove/finalize-day`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-sync-secret": process.env.NIGHTSCOUT_SYNC_SECRET!,
        },
        body: JSON.stringify({ date }),
      });
      const body = await res.json().catch(() => ({}));
      results.push({ date, status: res.ok ? "ok" : `error ${res.status}`, ...(res.ok ? {} : { error: JSON.stringify(body) }) });
    } catch (err) {
      results.push({ date, status: "fetch_error", error: String(err) });
    }
  }

  return NextResponse.json({ processed: results.length, results });
}
