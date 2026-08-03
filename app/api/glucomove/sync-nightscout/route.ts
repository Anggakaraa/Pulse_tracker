import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase";

const NIGHTSCOUT_URL = process.env.NIGHTSCOUT_URL;
const SYNC_SECRET   = process.env.NIGHTSCOUT_SYNC_SECRET;

// Nightscout stores glucose as mg/dL internally regardless of display units
function mgdlToMmol(mgdl: number): number {
  return Math.round((mgdl / 18.0182) * 10) / 10;
}

export async function POST(req: NextRequest) {
  // Protect the endpoint with a shared secret
  const auth = req.headers.get("authorization");
  if (!SYNC_SECRET || auth !== `Bearer ${SYNC_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!NIGHTSCOUT_URL) {
    return NextResponse.json({ error: "NIGHTSCOUT_URL not configured" }, { status: 500 });
  }

  // How far back to look — default 3h, override via ?hours=N
  const { searchParams } = new URL(req.url);
  const hours = Math.min(parseInt(searchParams.get("hours") ?? "3"), 24);
  const since = Date.now() - hours * 60 * 60 * 1000;

  // Fetch entries from Nightscout
  const nsUrl = `${NIGHTSCOUT_URL}/api/v1/entries.json?find[date][$gte]=${since}&count=300`;
  let entries: Record<string, unknown>[];
  try {
    const res = await fetch(nsUrl);
    if (!res.ok) throw new Error(`Nightscout responded ${res.status}`);
    entries = await res.json();
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }

  if (!Array.isArray(entries) || entries.length === 0) {
    return NextResponse.json({ fetched: 0, inserted: 0, skipped: 0 });
  }

  // Only process SGV (sensor glucose value) entries
  const sgvEntries = entries.filter(e => e.type === "sgv" && e.sgv && e.date);

  const userId = process.env.GLUCOMOVE_USER_ID;
  if (!userId) return NextResponse.json({ error: "GLUCOMOVE_USER_ID not configured" }, { status: 500 });

  const supabase = createSupabaseAdminClient();

  // Fetch existing reading timestamps in the window for deduplication
  const sinceISO = new Date(since).toISOString();
  const { data: existing } = await supabase
    .from("glucomove_readings")
    .select("timestamp")
    .eq("user_id", userId)
    .gte("timestamp", sinceISO);

  const existingMs = (existing ?? []).map(r => new Date(r.timestamp).getTime());

  // Deduplicate: skip if any existing reading is within ±2 minutes
  const TOLERANCE_MS = 2 * 60 * 1000;
  const toInsert = sgvEntries
    .filter(e => {
      const ms = e.date as number;
      return !existingMs.some(t => Math.abs(t - ms) <= TOLERANCE_MS);
    })
    .map(e => ({
      user_id:      userId,
      meal_id:      null,
      timestamp:    new Date(e.date as number).toISOString(),
      glucose_mmol: mgdlToMmol(e.sgv as number),
      is_baseline:  false,
      source:       "nightscout",
    }));

  if (toInsert.length === 0) {
    return NextResponse.json({ fetched: sgvEntries.length, inserted: 0, skipped: sgvEntries.length });
  }

  const { error } = await supabase.from("glucomove_readings").insert(toInsert);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    fetched:  sgvEntries.length,
    inserted: toInsert.length,
    skipped:  sgvEntries.length - toInsert.length,
  });
}
