import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase";
import { calcMealMetrics, isInSensorErrorPeriod, type SensorErrorPeriod } from "@/lib/glucomove-calcs";

function getYesterdayWIB(): string {
  const now = new Date(Date.now() + 7 * 3600000);
  now.setUTCDate(now.getUTCDate() - 1);
  return now.toISOString().slice(0, 10);
}

function dayWindowWIB(date: string) {
  return {
    start: `${date}T00:00:00+07:00`,
    end:   `${date}T23:59:59+07:00`,
  };
}

function avg(vals: number[]): number | null {
  return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 10) / 10 : null;
}

function computeCV(vals: number[], mean: number): number | null {
  if (vals.length < 6) return null;
  const sd = Math.sqrt(vals.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / vals.length);
  return Math.round((sd / mean) * 100);
}

export async function POST(req: NextRequest) {
  // Auth: secret for cron, or cookie session for manual re-finalize from browser
  const secret = req.headers.get("x-sync-secret");
  const isAuthorizedCron = secret && secret === process.env.NIGHTSCOUT_SYNC_SECRET;

  const supabase = createSupabaseAdminClient();

  if (!isAuthorizedCron) {
    // Fall back to cookie auth for browser-triggered re-finalize
    const { createSupabaseServerClient } = await import("@/lib/supabase");
    const browserSupabase = await createSupabaseServerClient();
    const { data: { user } } = await browserSupabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = process.env.GLUCOMOVE_USER_ID;
  if (!userId) return NextResponse.json({ error: "GLUCOMOVE_USER_ID not configured" }, { status: 500 });

  const body = await req.json().catch(() => ({}));
  const date: string = body.date ?? getYesterdayWIB();

  const { start, end } = dayWindowWIB(date);

  // Fetch readings, day record, meals, events in parallel
  const [
    { data: readings },
    { data: dayRecord },
    { data: meals },
    { data: events },
  ] = await Promise.all([
    supabase
      .from("glucomove_readings")
      .select("id, timestamp, glucose_mmol, meal_id, is_baseline, user_id")
      .eq("user_id", userId)
      .gte("timestamp", start)
      .lte("timestamp", end)
      .order("timestamp", { ascending: true }),
    supabase
      .from("glucomove_day_records")
      .select("id, sensor_error_periods")
      .eq("user_id", userId)
      .eq("date", date)
      .maybeSingle(),
    supabase
      .from("glucomove_meals")
      .select("*")
      .eq("user_id", userId)
      .gte("meal_start_time", start)
      .lte("meal_start_time", end)
      .order("meal_start_time", { ascending: true }),
    supabase
      .from("glucomove_events")
      .select("start_time")
      .eq("user_id", userId)
      .gte("start_time", start)
      .lte("start_time", end)
      .order("start_time", { ascending: true }),
  ]);

  // Filter out sensor error periods
  const errorPeriods = (Array.isArray(dayRecord?.sensor_error_periods)
    ? dayRecord.sensor_error_periods : []) as SensorErrorPeriod[];
  const cleanReadings = (readings ?? []).filter(
    r => !isInSensorErrorPeriod(r.timestamp, errorPeriods)
  );
  const glucoseVals = cleanReadings.map(r => r.glucose_mmol);

  // Day-level metrics
  const dailyAvg = avg(glucoseVals);
  const overnightVals = cleanReadings
    .filter(r => (new Date(r.timestamp).getUTCHours() + 7) % 24 < 6)
    .map(r => r.glucose_mmol);
  const overnightAvg = avg(overnightVals);
  const twlPct = glucoseVals.length >= 6
    ? Math.round(glucoseVals.filter(v => v <= 7.8).length / glucoseVals.length * 100)
    : null;
  const cvPct = dailyAvg ? computeCV(glucoseVals, dailyAvg) : null;

  // Upsert day record
  if (dayRecord) {
    await supabase
      .from("glucomove_day_records")
      .update({ daily_avg_mmol: dailyAvg, overnight_avg_mmol: overnightAvg, twl_pct: twlPct, cv_pct: cvPct, updated_at: new Date().toISOString() })
      .eq("id", dayRecord.id);
  } else if (dailyAvg !== null) {
    await supabase
      .from("glucomove_day_records")
      .insert({ user_id: userId, date, daily_avg_mmol: dailyAvg, overnight_avg_mmol: overnightAvg, twl_pct: twlPct, cv_pct: cvPct });
  }

  // Meal-level metrics
  const activityMs = [
    ...(meals ?? []).map(m => new Date(m.meal_start_time).getTime()),
    ...(events ?? []).map(e => new Date(e.start_time).getTime()),
  ];

  const mealResults = await Promise.all(
    (meals ?? []).map(async meal => {
      const mealMs = new Date(meal.meal_start_time).getTime();
      const nextActivityMs = activityMs.filter(t => t > mealMs).sort((a, b) => a - b)[0];

      // Attach readings to meal (free-floating + meal-linked)
      const mealReadings = cleanReadings.filter(r =>
        r.meal_id === meal.id ||
        (r.meal_id == null &&
          new Date(r.timestamp).getTime() >= mealMs - 30 * 60000 &&
          new Date(r.timestamp).getTime() <= (nextActivityMs ?? mealMs + 4 * 3600000))
      );

      const metrics = calcMealMetrics(mealReadings, meal.meal_start_time, nextActivityMs);

      await supabase
        .from("glucomove_meals")
        .update({
          baseline_mmol: metrics.baselineGlucoseMmol,
          spike_mmol: metrics.spikeMmol,
          iauc: metrics.iAUC != null ? Math.round(metrics.iAUC) : null,
          response_band: metrics.responseBand,
          time_to_peak_min: metrics.timeToPeakMinutes,
          recovery_time_min: metrics.returnToBaselineMinutes,
        })
        .eq("id", meal.id);

      return { mealId: meal.id, metrics };
    })
  );

  return NextResponse.json({
    date,
    dayMetrics: { dailyAvg, overnightAvg, twlPct, cvPct },
    mealsFinalized: mealResults.length,
  });
}
