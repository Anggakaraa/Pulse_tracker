import { createSupabaseServerClient } from "@/lib/supabase";
import { calcMealMetrics } from "@/lib/glucomove-calcs";

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
  const windowStart = new Date(mealMs - 45 * 60 * 1000).toISOString();
  const windowEnd   = new Date(mealMs + 120 * 60 * 1000).toISOString();

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

  const readings = await getReadingsForMeal(supabase, meal.id, meal.user_id, meal.meal_start_time);
  const metrics = calcMealMetrics(readings, meal.meal_start_time);
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

  // Fetch all meals on this date (whether linked to this day record or not)
  const { start, end } = dayWindowWIB(day.date);
  const { data: meals } = await supabase
    .from("glucomove_meals")
    .select("*")
    .eq("user_id", day.user_id)
    .gte("meal_start_time", start)
    .lte("meal_start_time", end)
    .order("meal_start_time", { ascending: true });

  const mealsWithReadings = await Promise.all(
    (meals ?? []).map(async (meal) => {
      const readings = await getReadingsForMeal(supabase, meal.id, meal.user_id, meal.meal_start_time);
      const metrics = calcMealMetrics(readings, meal.meal_start_time);
      return { meal, readings, metrics };
    })
  );

  return { day, meals: mealsWithReadings };
}

export { getDateWIB };
