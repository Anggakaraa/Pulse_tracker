import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase-service";

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
    const gl = typeof r.glucose_mmol === "number" ? r.glucose_mmol : null;

    if (!ts || !gl || isNaN(new Date(ts).getTime())) {
      invalid.push(i);
      continue;
    }

    rows.push({
      user_id: userId,
      timestamp: new Date(ts).toISOString(),
      glucose_mmol: Math.round(gl * 100) / 100,
      is_baseline: r.is_baseline === true,
      meal_id: null,
      source: "apple_health",
    });
  }

  if (rows.length === 0) {
    return NextResponse.json({ error: "No valid readings", invalid }, { status: 400 });
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
