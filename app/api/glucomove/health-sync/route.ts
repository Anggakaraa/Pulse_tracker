import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase-service";

const MONTHS: Record<string, string> = {
  jan:"01",feb:"02",mar:"03",apr:"04",may:"05",jun:"06",
  jul:"07",aug:"08",sep:"09",oct:"10",nov:"11",dec:"12",
};

// Handles ISO strings and Shortcuts locale format: "31 Jul 2026 at 12.53"
function parseShortcutsDate(ts: string): Date | null {
  // Try ISO first
  const iso = new Date(ts);
  if (!isNaN(iso.getTime())) return iso;

  // Shortcuts format: "DD Mon YYYY at HH.MM"
  const m = ts.match(/(\d{1,2})\s+(\w{3})\s+(\d{4})\s+at\s+(\d{1,2})\.(\d{2})/i);
  if (m) {
    const [, day, mon, year, hour, min] = m;
    const mo = MONTHS[mon.toLowerCase()];
    if (!mo) return null;
    // Treat as WIB (UTC+7)
    return new Date(`${year}-${mo}-${day.padStart(2,"0")}T${hour.padStart(2,"0")}:${min}:00+07:00`);
  }
  return null;
}

// Accepts batch:  { readings: [{ timestamp, glucose_mmol }] }
// OR single:      { timestamp, glucose_mmol }
// Authorization: Bearer <HEALTH_SYNC_SECRET>

export async function POST(req: NextRequest) {
  // 1. Authenticate — shared secret in Authorization header
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const secret = process.env.HEALTH_SYNC_SECRET;

  if (!secret || token !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parse body — accept batch { readings: [...] } or single { timestamp, glucose_mmol }
  let rawReadings: unknown[];
  try {
    const body = await req.json();
    if (Array.isArray(body.readings)) {
      rawReadings = body.readings;
    } else if (body.timestamp) {
      rawReadings = [body];
    } else {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // 3. Validate and shape each reading
  type RawReading = { timestamp?: unknown; glucose_mmol?: unknown; is_baseline?: unknown };
  const rows: { user_id: string; timestamp: string; glucose_mmol: number; is_baseline: boolean; meal_id: null; source: string }[] = [];
  const invalid: number[] = [];

  const userId = process.env.GLUCOMOVE_USER_ID;
  if (!userId) {
    return NextResponse.json({ error: "GLUCOMOVE_USER_ID not set in env" }, { status: 500 });
  }

  const supabase = createSupabaseServiceClient();

  for (let i = 0; i < rawReadings.length; i++) {
    const r = rawReadings[i] as RawReading;
    const ts = typeof r.timestamp === "string" ? r.timestamp : null;
    const gl = typeof r.glucose_mmol === "number"
      ? r.glucose_mmol
      : typeof r.glucose_mmol === "string" ? parseFloat(r.glucose_mmol as string) : null;

    const parsedDate = ts ? parseShortcutsDate(ts) : null;
    if (!ts || !gl || gl === 0 || isNaN(gl) || !parsedDate) {
      invalid.push(i);
      continue;
    }

    rows.push({
      user_id: userId,
      timestamp: parsedDate.toISOString(),
      glucose_mmol: Math.round(gl * 100) / 100,
      is_baseline: r.is_baseline === true,
      meal_id: null,
      source: "apple_health",
    });
  }

  if (rows.length === 0) {
    const sample = rawReadings[0] as RawReading;
    return NextResponse.json({
      error: "No valid readings",
      invalid,
      debug: { timestampType: typeof sample?.timestamp, timestampValue: String(sample?.timestamp).slice(0, 50), glucoseType: typeof sample?.glucose_mmol, glucoseValue: sample?.glucose_mmol }
    }, { status: 400 });
  }

  // 4. Upsert — ON CONFLICT (user_id, timestamp) DO NOTHING
  const { error: insertErr, count } = await supabase
    .from("glucomove_readings")
    .upsert(rows, {
      onConflict: "user_id,timestamp",
      ignoreDuplicates: true,
      count: "exact",
    });

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  return NextResponse.json({
    received: rawReadings.length,
    inserted: count ?? rows.length,
    skipped: rows.length - (count ?? rows.length),
    invalid: invalid.length,
  });
}
