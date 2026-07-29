import { createSupabaseServerClient } from "@/lib/supabase";
import { calcMealMetrics } from "@/lib/glucomove-calcs";

export async function getTodayDayRecord(userId: string) {
  const supabase = await createSupabaseServerClient();
  const today = new Date().toISOString().slice(0, 10);
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

export async function getMealsForDay(dayRecordId: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("glucomove_meals")
    .select("*")
    .eq("day_record_id", dayRecordId)
    .order("meal_start_time", { ascending: true });
  return data ?? [];
}

export async function getMealWithReadings(mealId: string) {
  const supabase = await createSupabaseServerClient();
  const [{ data: meal }, { data: readings }] = await Promise.all([
    supabase.from("glucomove_meals").select("*").eq("id", mealId).single(),
    supabase
      .from("glucomove_readings")
      .select("*")
      .eq("meal_id", mealId)
      .order("timestamp", { ascending: true }),
  ]);
  if (!meal) return null;
  const metrics = calcMealMetrics(readings ?? [], meal.meal_start_time);
  return { meal, readings: readings ?? [], metrics };
}

export async function getDayWithMealsAndMetrics(dayRecordId: string) {
  const supabase = await createSupabaseServerClient();
  const [{ data: day }, { data: meals }] = await Promise.all([
    supabase.from("glucomove_day_records").select("*").eq("id", dayRecordId).single(),
    supabase
      .from("glucomove_meals")
      .select("*")
      .eq("day_record_id", dayRecordId)
      .order("meal_start_time", { ascending: true }),
  ]);
  if (!day || !meals) return null;

  const mealsWithReadings = await Promise.all(
    meals.map(async (meal) => {
      const { data: readings } = await supabase
        .from("glucomove_readings")
        .select("*")
        .eq("meal_id", meal.id)
        .order("timestamp", { ascending: true });
      const metrics = calcMealMetrics(readings ?? [], meal.meal_start_time);
      return { meal, readings: readings ?? [], metrics };
    })
  );

  return { day, meals: mealsWithReadings };
}
