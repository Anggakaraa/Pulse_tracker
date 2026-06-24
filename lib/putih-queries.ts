import { createSupabaseServerClient } from "./supabase";
import { PUTIH_METRIC_MAP } from "./putih-metrics";

export interface PutihTest {
  id: string;
  date: string;
  lab_name: string | null;
  notes: string | null;
  reading_count: number;
}

export interface PutihReading {
  metric_key: string;
  value: number;
  unit: string;
  lab_range_low: number | null;
  lab_range_high: number | null;
}

export interface PutihTestDetail extends PutihTest {
  readings: PutihReading[];
}

export interface PutihLatestReading {
  metric_key: string;
  value: number;
  unit: string;
  lab_range_low: number | null;
  lab_range_high: number | null;
  test_date: string;
}

export async function getPutihTests(): Promise<PutihTest[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("tests")
    .select("id, date, lab_name, notes")
    .eq("subject", "putih")
    .order("date", { ascending: false });

  if (error) throw error;

  const tests = data ?? [];
  const ids = tests.map(t => t.id);
  if (ids.length === 0) return [];

  const { data: counts } = await supabase
    .from("readings")
    .select("test_id")
    .in("test_id", ids);

  const countMap: Record<string, number> = {};
  (counts ?? []).forEach(r => {
    countMap[r.test_id] = (countMap[r.test_id] ?? 0) + 1;
  });

  return tests.map(t => ({
    ...t,
    reading_count: countMap[t.id] ?? 0,
  }));
}

export async function getPutihTestDetail(id: string): Promise<PutihTestDetail | null> {
  const supabase = await createSupabaseServerClient();
  const { data: test, error } = await supabase
    .from("tests")
    .select("id, date, lab_name, notes")
    .eq("id", id)
    .eq("subject", "putih")
    .single();

  if (error || !test) return null;

  const { data: readings } = await supabase
    .from("readings")
    .select("metric_key, value, unit, lab_range_low, lab_range_high")
    .eq("test_id", id)
    .order("metric_key");

  return {
    ...test,
    reading_count: (readings ?? []).length,
    readings: readings ?? [],
  };
}

export async function getPutihLatestReadings(): Promise<PutihLatestReading[]> {
  const supabase = await createSupabaseServerClient();
  // Get all putih test IDs ordered by date
  const { data: tests } = await supabase
    .from("tests")
    .select("id, date")
    .eq("subject", "putih")
    .order("date", { ascending: false });

  if (!tests || tests.length === 0) return [];

  const testIds = tests.map(t => t.id);
  const dateMap: Record<string, string> = Object.fromEntries(tests.map(t => [t.id, t.date]));

  const { data: readings } = await supabase
    .from("readings")
    .select("metric_key, value, unit, lab_range_low, lab_range_high, test_id")
    .in("test_id", testIds)
    .in("metric_key", Object.keys(PUTIH_METRIC_MAP));

  if (!readings) return [];

  // Keep only the most recent reading per metric
  const latest: Record<string, PutihLatestReading> = {};
  for (const r of readings) {
    const date = dateMap[r.test_id];
    if (!latest[r.metric_key] || date > latest[r.metric_key].test_date) {
      latest[r.metric_key] = {
        metric_key: r.metric_key,
        value: r.value,
        unit: r.unit,
        lab_range_low: r.lab_range_low,
        lab_range_high: r.lab_range_high,
        test_date: date,
      };
    }
  }

  return Object.values(latest);
}

export async function getPutihReadingsHistory(metricKey: string): Promise<{ date: string; value: number }[]> {
  const supabase = await createSupabaseServerClient();
  const { data: tests } = await supabase
    .from("tests")
    .select("id, date")
    .eq("subject", "putih")
    .order("date", { ascending: true });

  if (!tests || tests.length === 0) return [];

  const testIds = tests.map(t => t.id);
  const dateMap: Record<string, string> = Object.fromEntries(tests.map(t => [t.id, t.date]));

  const { data: readings } = await supabase
    .from("readings")
    .select("test_id, value")
    .in("test_id", testIds)
    .eq("metric_key", metricKey);

  return (readings ?? []).map(r => ({ date: dateMap[r.test_id], value: r.value }));
}

export function formatPutihDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export interface PutihProgressionMatrix {
  tests: { id: string; date: string; lab_name: string | null }[];
  // metric_key → test_id → { value, lab_range_low, lab_range_high }
  matrix: Record<string, Record<string, { value: number; lab_range_low: number | null; lab_range_high: number | null } | null>>;
}

export async function getPutihProgressionMatrix(): Promise<PutihProgressionMatrix> {
  const supabase = await createSupabaseServerClient();
  const { data: tests } = await supabase
    .from("tests")
    .select("id, date, lab_name")
    .eq("subject", "putih")
    .order("date", { ascending: true });

  if (!tests || tests.length === 0) return { tests: [], matrix: {} };

  const testIds = tests.map(t => t.id);

  const { data: readings } = await supabase
    .from("readings")
    .select("test_id, metric_key, value, lab_range_low, lab_range_high")
    .in("test_id", testIds)
    .in("metric_key", Object.keys(PUTIH_METRIC_MAP));

  const matrix: PutihProgressionMatrix["matrix"] = {};
  for (const r of readings ?? []) {
    if (!matrix[r.metric_key]) matrix[r.metric_key] = {};
    matrix[r.metric_key][r.test_id] = {
      value: r.value,
      lab_range_low: r.lab_range_low,
      lab_range_high: r.lab_range_high,
    };
  }

  return { tests, matrix };
}
