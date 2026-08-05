import { createSupabaseServerClient } from "@/lib/supabase";
import { calcMealMetrics, isInSensorErrorPeriod, type SensorErrorPeriod } from "@/lib/glucomove-calcs";

// WIB = UTC+7; used for all "today" date calculations
function getDateWIB(): string {
  const now = new Date();
  const wib = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  return wib.toISOString().slice(0, 10);
}

// Date window in WIB for a given YYYY-MM-DD date
function dayWindowWIB(date: string): { start: string; end: string } {
  return {
    start: `${date}T00:00:00+07:00`,
    end:   `${date}T23:59:59+07:00`,
  };
}

export async function getTodayDayRecord(userId: string) {
  const supabase = await createSupabaseServerClient();
  const today = getDateWIB();
  const { data } = await supabase
    .from("glucomove_day_records")
    .select("*")
    .eq("user_id", userId)
    .eq("date", today)
    .maybeSingle();
  return data;
}

export async function getDayRecord(id: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("glucomove_day_records")
    .select("*")
    .eq("id", id)
    .single();
  return data;
}

export async function getAllDayRecords() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("glucomove_day_records")
    .select("*")
    .order("date", { ascending: false });
  return data ?? [];
}

// Fetch meals for a date in WIB, by user (no day_record_id dependency)
export async function getMealsByDate(date: string, userId: string) {
  const supabase = await createSupabaseServerClient();
  const { start, end } = dayWindowWIB(date);
  const { data } = await supabase
    .from("glucomove_meals")
    .select("*")
    .eq("user_id", userId)
    .gte("meal_start_time", start)
    .lte("meal_start_time", end)
    .order("meal_start_time", { ascending: true });
  return data ?? [];
}

// Kept for backward compat (day record pages)
export async function getMealsForDay(dayRecordId: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("glucomove_meals")
    .select("*")
    .eq("day_record_id", dayRecordId)
    .order("meal_start_time", { ascending: true });
  return data ?? [];
}

// Fetch readings for a meal: explicitly attached OR free-floating in ±window
async function getReadingsForMeal(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  mealId: string,
  userId: string,
  mealStartTime: string
) {
  const mealMs = new Date(mealStartTime).getTime();
  const windowStart = new Date(mealMs - 30 * 60 * 1000).toISOString();
  const windowEnd   = new Date(mealMs + 240 * 60 * 1000).toISOString();

  const [{ data: attached }, { data: floating }] = await Promise.all([
    supabase
      .from("glucomove_readings")
      .select("*")
      .eq("meal_id", mealId)
      .order("timestamp", { ascending: true }),
    supabase
      .from("glucomove_readings")
      .select("*")
      .eq("user_id", userId)
      .is("meal_id", null)
      .gte("timestamp", windowStart)
      .lte("timestamp", windowEnd)
      .order("timestamp", { ascending: true }),
  ]);

  const seen = new Set<string>();
  const merged = [...(attached ?? []), ...(floating ?? [])].filter(r => {
    if (seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  });
  merged.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  return merged;
}

export async function getMealWithReadings(mealId: string) {
  const supabase = await createSupabaseServerClient();
  const { data: meal } = await supabase
    .from("glucomove_meals")
    .select("*")
    .eq("id", mealId)
    .single();
  if (!meal) return null;

  const [readings, nextMealResult, nextEventResult] = await Promise.all([
    getReadingsForMeal(supabase, meal.id, meal.user_id, meal.meal_start_time),
    supabase
      .from("glucomove_meals")
      .select("meal_start_time")
      .eq("user_id", meal.user_id)
      .gt("meal_start_time", meal.meal_start_time)
      .order("meal_start_time", { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("glucomove_events")
      .select("start_time")
      .eq("user_id", meal.user_id)
      .gt("start_time", meal.meal_start_time)
      .order("start_time", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  const cutoffCandidates = [
    nextMealResult.data?.meal_start_time,
    nextEventResult.data?.start_time,
  ].filter(Boolean).map(t => new Date(t!).getTime());
  const peakCutoffMs = cutoffCandidates.length > 0 ? Math.min(...cutoffCandidates) : undefined;

  const metrics = calcMealMetrics(readings, meal.meal_start_time, peakCutoffMs);
  return { meal, readings, metrics };
}

export async function getDayWithMealsAndMetrics(dayRecordId: string) {
  const supabase = await createSupabaseServerClient();
  const { data: day } = await supabase
    .from("glucomove_day_records")
    .select("*")
    .eq("id", dayRecordId)
    .single();
  if (!day) return null;

  // Fetch all meals and events on this date
  const { start, end } = dayWindowWIB(day.date);
  const [{ data: meals }, { data: events }] = await Promise.all([
    supabase
      .from("glucomove_meals")
      .select("*")
      .eq("user_id", day.user_id)
      .gte("meal_start_time", start)
      .lte("meal_start_time", end)
      .order("meal_start_time", { ascending: true }),
    supabase
      .from("glucomove_events")
      .select("start_time")
      .eq("user_id", day.user_id)
      .gte("start_time", start)
      .lte("start_time", end)
      .order("start_time", { ascending: true }),
  ]);

  // Activity timeline: all meal starts + event starts, for computing per-meal cutoffs
  const activityMs = [
    ...(meals ?? []).map(m => new Date(m.meal_start_time).getTime()),
    ...(events ?? []).map(e => new Date(e.start_time).getTime()),
  ];

  const mealsWithReadings = await Promise.all(
    (meals ?? []).map(async (meal) => {
      const mealMs = new Date(meal.meal_start_time).getTime();
      const nextActivityMs = activityMs
        .filter(t => t > mealMs)
        .sort((a, b) => a - b)[0];
      const readings = await getReadingsForMeal(supabase, meal.id, meal.user_id, meal.meal_start_time);
      const metrics = calcMealMetrics(readings, meal.meal_start_time, nextActivityMs);
      return { meal, readings, metrics };
    })
  );

  return { day, meals: mealsWithReadings };
}

// Convert any UTC timestamp to a WIB (UTC+7) date string
function getDateWIBFromTimestamp(timestamp: string): string {
  const d = new Date(new Date(timestamp).getTime() + 7 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

// All readings in WIB date window for a user (free-floating + meal-attached)
export async function getReadingsForDate(date: string, userId: string) {
  const supabase = await createSupabaseServerClient();
  const { start, end } = dayWindowWIB(date);
  const { data } = await supabase
    .from("glucomove_readings")
    .select("*")
    .eq("user_id", userId)
    .gte("timestamp", start)
    .lte("timestamp", end)
    .order("timestamp", { ascending: true });
  return data ?? [];
}

// Union of all dates that have a day record OR meals
export async function getAllDatesWithActivity(userId: string) {
  const supabase = await createSupabaseServerClient();

  const [{ data: dayRecords }, { data: meals }, { data: readings }] = await Promise.all([
    supabase
      .from("glucomove_day_records")
      .select("id, date, waking_glucose_mmol, potential_sensor_issue, sensor_error_periods")
      .eq("user_id", userId),
    supabase
      .from("glucomove_meals")
      .select("id, meal_start_time")
      .eq("user_id", userId),
    supabase
      .from("glucomove_readings")
      .select("timestamp, glucose_mmol")
      .eq("user_id", userId)
      .limit(50000),
  ]);

  const dayRecordByDate = new Map(
    (dayRecords ?? []).map(r => [r.date, r])
  );

  const mealCountByDate = new Map<string, number>();
  for (const meal of meals ?? []) {
    const date = getDateWIBFromTimestamp(meal.meal_start_time);
    mealCountByDate.set(date, (mealCountByDate.get(date) ?? 0) + 1);
  }

  // Group readings by WIB date, keeping timestamps for sensor error filtering
  const readingsByDate = new Map<string, { timestamp: string; glucose_mmol: number }[]>();
  for (const r of readings ?? []) {
    const date = getDateWIBFromTimestamp(r.timestamp);
    const arr = readingsByDate.get(date) ?? [];
    arr.push(r);
    readingsByDate.set(date, arr);
  }

  const allDates = new Set([
    ...Array.from(dayRecordByDate.keys()),
    ...Array.from(mealCountByDate.keys()),
  ]);

  return [...allDates]
    .sort((a, b) => b.localeCompare(a))
    .map(date => {
      const raw = readingsByDate.get(date) ?? [];
      const dayRecord = dayRecordByDate.get(date) ?? null;
      const errorPeriods = (Array.isArray(dayRecord?.sensor_error_periods) ? dayRecord.sensor_error_periods : []) as SensorErrorPeriod[];
      const clean = raw.filter(r => !isInSensorErrorPeriod(r.timestamp, errorPeriods));
      const vals = clean.map(r => r.glucose_mmol);
      const avgGlucose = vals.length >= 1
        ? Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 10) / 10
        : null;
      const twlPct = vals.length >= 6
        ? Math.round(vals.filter(v => v <= 7.8).length / vals.length * 100)
        : null;
      const sd = vals.length >= 6 && avgGlucose !== null
        ? Math.round(Math.sqrt(vals.reduce((s, v) => s + Math.pow(v - avgGlucose, 2), 0) / vals.length) * 10) / 10
        : null;
      const cv = sd !== null && avgGlucose ? Math.round((sd / avgGlucose) * 100) : null;
      return {
        date,
        dayRecord,
        mealCount: mealCountByDate.get(date) ?? 0,
        avgGlucose,
        twlPct,
        cv,
      };
    });
}

export async function getEventById(id: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("glucomove_events")
    .select("*")
    .eq("id", id)
    .single();
  return data;
}

export async function getEventWithReadings(eventId: string) {
  const supabase = await createSupabaseServerClient();
  const { data: event } = await supabase
    .from("glucomove_events")
    .select("*")
    .eq("id", eventId)
    .single();
  if (!event) return null;

  const startMs = new Date(event.start_time).getTime();
  const endMs = event.end_time ? new Date(event.end_time).getTime() : startMs;
  const windowStart = new Date(startMs - 30 * 60 * 1000).toISOString();
  const windowEnd   = new Date(endMs + 240 * 60 * 1000).toISOString();

  const { data: readings } = await supabase
    .from("glucomove_readings")
    .select("*")
    .eq("user_id", event.user_id)
    .gte("timestamp", windowStart)
    .lte("timestamp", windowEnd)
    .order("timestamp", { ascending: true });

  return { event, readings: readings ?? [] };
}

// Events for a given date (keyed by start_time in WIB window)
export async function getEventsForDate(date: string, userId: string) {
  const supabase = await createSupabaseServerClient();
  const { start, end } = dayWindowWIB(date);
  const { data } = await supabase
    .from("glucomove_events")
    .select("*")
    .eq("user_id", userId)
    .gte("start_time", start)
    .lte("start_time", end)
    .order("start_time", { ascending: true });
  return data ?? [];
}

export { getDateWIB };
