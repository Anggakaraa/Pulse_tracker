/**
 * lib/queries.ts — all Supabase data fetching for Pulse Tracker.
 *
 * All functions are async and safe to call in Next.js server components.
 * Data is always returned in canonical units (as stored in DB).
 */

import { supabase } from "./supabase";
import { METRIC_CATALOG, computeStatusBadge } from "./metrics";
import type { StatusBadge, CategoryKey } from "./tokens";
import type { MetricData } from "@/components/MetricList";
import type { DataPoint } from "@/components/TrendChart";

// ─── DB row types ─────────────────────────────────────────────────────────────

interface DbTest {
  id: string;
  date: string;
  lab_name: string | null;
  notes: string | null;
}

interface DbReading {
  id: string;
  test_id: string;
  metric_key: string;
  value: number;
  unit: string;
  lab_range_low: number | null;
  lab_range_high: number | null;
  attention_state: string | null;
  annotation: string | null;
}

// Augmented reading with test date attached
interface ReadingWithDate extends DbReading {
  test_date: string;  // ISO date string from parent test
}

// ─── Public types ─────────────────────────────────────────────────────────────

export interface TestSummary {
  id: string;
  date: string;          // ISO: "2026-03-11"
  dateFormatted: string; // Display: "11 Mar 2026"
  labName: string;
  notes: string | null;
  readingCount: number;
  categories: CategoryKey[];
  worstBadge: StatusBadge | null;
  actCount: number;
  improveCount: number;
}

export interface AttentionItem {
  metricKey: string;
  name: string;
  value: number;
  unit: string;
  badge: StatusBadge;
  category: CategoryKey;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const BADGE_ORDER: (StatusBadge | null)[] = ["act", "improve", "stable", "strong", "optimal", null];

function worstBadge(badges: (string | null)[]): StatusBadge | null {
  const valid = badges.filter(Boolean) as StatusBadge[];
  for (const b of BADGE_ORDER) {
    if (b && valid.includes(b)) return b;
  }
  return null;
}

export function formatTestDate(iso: string): string {
  // "2026-03-11" → "11 Mar 2026"
  const [y, m, d] = iso.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${parseInt(d)} ${months[parseInt(m) - 1]} ${y}`;
}

function labRangeString(low: number | null, high: number | null): string | undefined {
  if (low !== null && high !== null) return `${low}–${high}`;
  if (low !== null) return `> ${low}`;
  if (high !== null) return `< ${high}`;
  return undefined;
}

// Vitals metric keys — shown on the /metrics/vitals page
export const VITALS_KEYS = [
  "systolic_bp", "diastolic_bp", "heart_rate",
  "weight_kg", "height_cm", "whr", "body_fat_pct", "visceral_fat", "muscle_mass_kg",
];

// Fitness metric keys — shown below vitals on the same page
export const FITNESS_KEYS = [
  "vo2_max", "at_hr", "max_hr", "hr_recovery_1min",
];

// ─── Core fetchers ────────────────────────────────────────────────────────────

/**
 * Fetch all tests + all readings in two queries.
 * Returns readings sorted newest-test-first.
 */
async function fetchAll(): Promise<{ tests: DbTest[]; readings: ReadingWithDate[] }> {
  const [{ data: tests }, { data: readings }] = await Promise.all([
    supabase.from("tests").select("id, date, lab_name, notes").order("date", { ascending: false }),
    supabase.from("readings").select("id, test_id, metric_key, value, unit, lab_range_low, lab_range_high, attention_state, annotation"),
  ]);

  if (!tests || !readings) return { tests: [], readings: [] };

  const dateMap = Object.fromEntries(tests.map(t => [t.id, t.date]));
  const readingsWithDate: ReadingWithDate[] = readings
    .map(r => ({ ...r, test_date: dateMap[r.test_id] ?? "" }))
    .sort((a, b) => b.test_date.localeCompare(a.test_date));

  return { tests, readings: readingsWithDate };
}

// ─── Public queries ───────────────────────────────────────────────────────────

/**
 * All tests with derived summaries — for the test log page.
 */
export async function getAllTests(): Promise<TestSummary[]> {
  const { tests, readings } = await fetchAll();

  return tests.map(test => {
    const tr = readings.filter(r => r.test_id === test.id);
    const keys = [...new Set(tr.map(r => r.metric_key))];
    const categories = [...new Set(
      keys.map(k => METRIC_CATALOG[k]?.category).filter((c): c is CategoryKey => !!c)
    )];
    const worst = worstBadge(tr.map(r => r.attention_state));
    const actCount = tr.filter(r => r.attention_state === "act").length;
    const improveCount = tr.filter(r => r.attention_state === "improve").length;

    return {
      id: test.id,
      date: test.date,
      dateFormatted: formatTestDate(test.date),
      labName: test.lab_name ?? "Unknown lab",
      notes: test.notes,
      readingCount: tr.length,
      categories,
      worstBadge: worst,
      actCount,
      improveCount,
    };
  });
}

/**
 * MetricData[] for a given category (for the metric detail page).
 * Includes latest value + full history across all tests.
 */
export async function getMetricDataForCategory(category: CategoryKey): Promise<MetricData[]> {
  const { tests, readings } = await fetchAll();

  // Keys in this category
  const keys = Object.entries(METRIC_CATALOG)
    .filter(([, meta]) => meta.category === category)
    .map(([key]) => key);

  // Build date label map: test_id → short label e.g. "Mar 2026"
  const labelMap = Object.fromEntries(
    tests.map(t => {
      const [y, m] = t.date.split("-");
      const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      return [t.id, `${months[parseInt(m) - 1]} ${y}`];
    })
  );

  return keys
    .map(key => {
      const meta = METRIC_CATALOG[key];
      const keyReadings = readings.filter(r => r.metric_key === key);
      if (keyReadings.length === 0) return null;

      // Latest reading (readings already sorted newest first)
      const latest = keyReadings[0];
      const previous = keyReadings[1] ?? null;

      // History for trend chart (oldest → newest)
      const history: DataPoint[] = [...keyReadings]
        .reverse()
        .map(r => ({ date: labelMap[r.test_id] ?? r.test_date, value: r.value }));

      const badge = latest.attention_state as StatusBadge | null;
      const labRange = labRangeString(latest.lab_range_low, latest.lab_range_high);

      const item: MetricData = {
        key,
        name: meta.name,
        category: meta.category,
        value: latest.value,
        unit: latest.unit,
        badge,
        labRange,
        labLow: latest.lab_range_low ?? undefined,
        labHigh: latest.lab_range_high ?? undefined,
        lastTested: formatTestDate(latest.test_date),
        previousValue: previous?.value,
        annotation: latest.annotation ?? undefined,
        history: history.length > 1 ? history : undefined,
      };
      return item;
    })
    .filter((m): m is NonNullable<typeof m> => m !== null)
    .sort((a, b) => {
      const ai = BADGE_ORDER.indexOf(a.badge);
      const bi = BADGE_ORDER.indexOf(b.badge);
      if (ai !== bi) return ai - bi;
      return a.name.localeCompare(b.name);
    });
}

/**
 * Build MetricData[] for a given list of metric keys.
 */
function buildMetricList(keys: string[], readings: any[], tests: any[]): MetricData[] {
  const labelMap = Object.fromEntries(
    tests.map(t => {
      const [y, m] = t.date.split("-");
      const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      return [t.id, `${months[parseInt(m) - 1]} ${y}`];
    })
  );

  return keys
    .map(key => {
      const meta = METRIC_CATALOG[key];
      if (!meta) return null;
      const keyReadings = readings.filter(r => r.metric_key === key);
      if (keyReadings.length === 0) return null;

      const latest = keyReadings[0];
      const previous = keyReadings[1] ?? null;
      const history: DataPoint[] = [...keyReadings].reverse().map(r => ({
        date: labelMap[r.test_id] ?? r.test_date,
        value: r.value,
      }));

      const badge = latest.attention_state as StatusBadge | null;

      const item: MetricData = {
        key,
        name: meta.name,
        category: meta.category,
        value: latest.value,
        unit: latest.unit,
        badge,
        labRange: labRangeString(latest.lab_range_low, latest.lab_range_high),
        labLow: latest.lab_range_low ?? undefined,
        labHigh: latest.lab_range_high ?? undefined,
        lastTested: formatTestDate(latest.test_date),
        previousValue: previous?.value,
        annotation: latest.annotation ?? undefined,
        history: history.length > 1 ? history : undefined,
      };
      return item;
    })
    .filter((m): m is NonNullable<typeof m> => m !== null);
}

/**
 * MetricData[] for the vitals section of the Vitals & Fitness page.
 */
export async function getVitalsData(): Promise<MetricData[]> {
  const { tests, readings } = await fetchAll();
  return buildMetricList(VITALS_KEYS, readings, tests);
}

/**
 * MetricData[] for the fitness section of the Vitals & Fitness page.
 */
export async function getFitnessData(): Promise<MetricData[]> {
  const { tests, readings } = await fetchAll();
  return buildMetricList(FITNESS_KEYS, readings, tests);
}

// Featured metric priority per category (from claude.md)
const FEATURED_PRIORITY: Partial<Record<CategoryKey, string[]>> = {
  metabolic:      ["homa_ir", "hba1c", "fasting_glucose"],
  cardiovascular: ["apob", "tg_hdl_ratio", "ldl_c"],
  inflammation:   ["hs_crp", "esr"],
  hormonal:       ["tsh", "free_t3", "psa_total"],
  vitals:         ["vo2_max", "visceral_fat", "systolic_bp"],
  blood:          ["egfr", "haemoglobin", "creatinine"],
};

export interface CategoryCardData {
  category: CategoryKey;
  metricName?: string;
  value?: number;
  unit?: string;
  badge?: StatusBadge | null;
  secondaryMetrics: { name: string; value: number; unit: string; badge: StatusBadge | null }[];
}

/**
 * Data for the 6 dashboard category cards.
 */
export async function getDashboardCardData(): Promise<CategoryCardData[]> {
  const { readings } = await fetchAll();

  // Latest reading per metric
  const latestMap = new Map<string, ReadingWithDate>();
  for (const r of readings) {
    if (!latestMap.has(r.metric_key)) latestMap.set(r.metric_key, r);
  }

  return (Object.keys(FEATURED_PRIORITY) as CategoryKey[]).map(category => {
    const priorityKeys = FEATURED_PRIORITY[category] ?? [];
    const available = priorityKeys.filter(k => latestMap.has(k));

    if (available.length === 0) return { category, secondaryMetrics: [] };

    const primaryKey = available[0];
    const primary = latestMap.get(primaryKey)!;
    const meta = METRIC_CATALOG[primaryKey];

    const secondaryMetrics = available.slice(1, 3).map(k => {
      const r = latestMap.get(k)!;
      const m = METRIC_CATALOG[k];
      return {
        name: m?.name ?? k,
        value: r.value,
        unit: r.unit,
        badge: r.attention_state as StatusBadge | null,
      };
    });

    return {
      category,
      metricName: meta?.name ?? primaryKey,
      value: primary.value,
      unit: primary.unit,
      badge: primary.attention_state as StatusBadge | null,
      secondaryMetrics,
    };
  });
}

export interface TestDetail {
  id: string;
  date: string;
  dateFormatted: string;
  labName: string;
  notes: string | null;
  readings: TestDetailReading[];
}

export interface TestDetailReading {
  key: string;
  name: string;
  category: CategoryKey;
  value: number;
  unit: string;
  badge: StatusBadge | null;
  labLow: number | undefined;
  labHigh: number | undefined;
  annotation: string | undefined;
}

/**
 * Single test with all its readings — for the test detail page.
 */
export async function getTestById(id: string): Promise<TestDetail | null> {
  const { tests, readings } = await fetchAll();
  const test = tests.find(t => t.id === id);
  if (!test) return null;

  const testReadings = readings.filter(r => r.test_id === id);

  return {
    id: test.id,
    date: test.date,
    dateFormatted: formatTestDate(test.date),
    labName: test.lab_name ?? "Unknown lab",
    notes: test.notes,
    readings: testReadings.map(r => {
      const meta = METRIC_CATALOG[r.metric_key];
      return {
        key: r.metric_key,
        name: meta?.name ?? r.metric_key,
        category: (meta?.category ?? "blood") as CategoryKey,
        value: r.value,
        unit: r.unit,
        badge: r.attention_state as StatusBadge | null,
        labLow: r.lab_range_low ?? undefined,
        labHigh: r.lab_range_high ?? undefined,
        annotation: r.annotation ?? undefined,
      };
    }),
  };
}

// ─── Experiments ─────────────────────────────────────────────────────────────

export interface ActiveExperimentMetricStat {
  key: string;
  name: string;
  pctChange: number;   // % change from baseline to latest
  improved: boolean;   // true if direction is good
}

export interface ActiveExperiment {
  id: string;
  name: string;
  hypothesis: string | null;
  startDate: string;
  startDateFormatted: string;
  metricKeys: string[];
  metricNames: string[];
  metricStats: ActiveExperimentMetricStat[]; // up to 2, only metrics with targets
}

/**
 * All active experiments — for the dashboard card.
 */
export async function getActiveExperiments(): Promise<ActiveExperiment[]> {
  const [{ data: experiments }, { data: expMetrics }] = await Promise.all([
    supabase
      .from("experiments")
      .select("id, name, hypothesis, start_date, excluded_test_ids")
      .eq("status", "active")
      .order("start_date", { ascending: false }),
    supabase
      .from("experiment_metrics")
      .select("experiment_id, metric_key, target_low, target_high"),
  ]);

  if (!experiments) return [];

  // Group experiment_metrics by experiment
  const emByExp = new Map<string, { key: string; targetLow: number | null; targetHigh: number | null }[]>();
  for (const em of expMetrics ?? []) {
    if (!emByExp.has(em.experiment_id)) emByExp.set(em.experiment_id, []);
    emByExp.get(em.experiment_id)!.push({
      key: em.metric_key,
      targetLow: em.target_low ?? null,
      targetHigh: em.target_high ?? null,
    });
  }

  // For each experiment, fetch tests + baseline/latest readings for target metrics
  const results = await Promise.all(experiments.map(async e => {
    const ems = emByExp.get(e.id) ?? [];
    const keys = ems.map(em => em.key);
    const targetedEms = ems.filter(em => em.targetLow != null || em.targetHigh != null);
    const excludedIds: string[] = (e.excluded_test_ids as string[]) ?? [];

    let metricStats: ActiveExperimentMetricStat[] = [];

    if (targetedEms.length > 0) {
      // Fetch tests within experiment window
      const { data: tests } = await supabase
        .from("tests")
        .select("id, date")
        .gte("date", e.start_date)
        .order("date", { ascending: true });

      const filteredTests = (tests ?? []).filter(t => !excludedIds.includes(t.id));

      if (filteredTests.length >= 2) {
        const baselineId = filteredTests[0].id;
        const latestId = filteredTests[filteredTests.length - 1].id;
        const targetKeys = targetedEms.slice(0, 2).map(em => em.key);

        const { data: readings } = await supabase
          .from("readings")
          .select("test_id, metric_key, value")
          .in("test_id", [baselineId, latestId])
          .in("metric_key", targetKeys);

        const readMap = new Map<string, number>(); // `${testId}:${key}` → value
        for (const r of readings ?? []) {
          readMap.set(`${r.test_id}:${r.metric_key}`, r.value);
        }

        metricStats = targetedEms.slice(0, 2).flatMap(em => {
          const baseline = readMap.get(`${baselineId}:${em.key}`);
          const latest = readMap.get(`${latestId}:${em.key}`);
          if (baseline == null || latest == null || baseline === 0) return [];
          const pctChange = ((latest - baseline) / Math.abs(baseline)) * 100;
          const meta = METRIC_CATALOG[em.key];
          // "improved" = moved in the right direction
          const improved = meta?.direction === "higher_is_better"
            ? latest > baseline
            : latest < baseline;
          return [{
            key: em.key,
            name: meta?.name ?? em.key,
            pctChange,
            improved,
          }];
        });
      }
    }

    return {
      id: e.id,
      name: e.name,
      hypothesis: e.hypothesis,
      startDate: e.start_date,
      startDateFormatted: formatTestDate(e.start_date),
      metricKeys: keys,
      metricNames: keys.map(k => METRIC_CATALOG[k]?.name ?? k),
      metricStats,
    };
  }));

  return results;
}

// ─── Experiment list + detail ─────────────────────────────────────────────────

export interface ExperimentListItem {
  id: string;
  name: string;
  hypothesis: string | null;
  startDate: string;
  startDateFormatted: string;
  endDate: string | null;
  endDateFormatted: string | null;
  status: "active" | "completed";
  metricKeys: string[];
  metricNames: string[];
  categories: CategoryKey[];
}

export interface ExperimentDetailMetric {
  key: string;
  name: string;
  unit: string;
  category: CategoryKey;
  readings: (number | null)[];
  states: (StatusBadge | null)[];
  targetLow: number | null;
  targetHigh: number | null;
}

export interface ExperimentDetail {
  id: string;
  name: string;
  hypothesis: string | null;
  startDate: string;
  startDateFormatted: string;
  endDate: string | null;
  endDateFormatted: string | null;
  status: "active" | "completed";
  notes: string | null;
  categories: CategoryKey[];
  dates: string[];            // display labels e.g. "Mar 2026"
  testDates: string[];        // ISO dates for each column
  testIds: string[];          // UUIDs for each column (used for column_labels key)
  columnLabels: Record<string, string>; // testId → user caption
  excludedTestIds: string[];  // tests excluded from this experiment's progression
  metrics: ExperimentDetailMetric[];
}

/**
 * All experiments (active + completed) — for the experiments list page.
 */
export async function getAllExperiments(): Promise<ExperimentListItem[]> {
  const [{ data: experiments }, { data: expMetrics }] = await Promise.all([
    supabase
      .from("experiments")
      .select("id, name, hypothesis, start_date, end_date, status")
      .order("start_date", { ascending: false }),
    supabase
      .from("experiment_metrics")
      .select("experiment_id, metric_key, target_low, target_high"),
  ]);

  if (!experiments) return [];

  const metricsByExp = new Map<string, string[]>();
  for (const em of expMetrics ?? []) {
    if (!metricsByExp.has(em.experiment_id)) metricsByExp.set(em.experiment_id, []);
    metricsByExp.get(em.experiment_id)!.push(em.metric_key);
  }

  return experiments.map(e => {
    const keys = metricsByExp.get(e.id) ?? [];
    const cats = [...new Set(
      keys.map(k => METRIC_CATALOG[k]?.category).filter((c): c is CategoryKey => !!c)
    )];
    return {
      id: e.id,
      name: e.name,
      hypothesis: e.hypothesis,
      startDate: e.start_date,
      startDateFormatted: formatTestDate(e.start_date),
      endDate: e.end_date,
      endDateFormatted: e.end_date ? formatTestDate(e.end_date) : null,
      status: (e.status ?? "active") as "active" | "completed",
      metricKeys: keys,
      metricNames: keys.map(k => METRIC_CATALOG[k]?.name ?? k),
      categories: cats,
    };
  });
}

/**
 * Full experiment detail — metrics × tests progression table.
 * Fetches tests that fall within the experiment's date range.
 */
export async function getExperimentDetail(id: string): Promise<ExperimentDetail | null> {
  const [{ data: exp }, { data: expMetrics }] = await Promise.all([
    supabase
      .from("experiments")
      .select("id, name, hypothesis, start_date, end_date, status, notes, column_labels, excluded_test_ids")
      .eq("id", id)
      .single(),
    supabase
      .from("experiment_metrics")
      .select("metric_key, target_low, target_high")
      .eq("experiment_id", id),
  ]);

  if (!exp) return null;

  const metricKeys = (expMetrics ?? []).map(em => em.metric_key);
  const targetMap = new Map<string, { low: number | null; high: number | null }>(
    (expMetrics ?? []).map(em => [em.metric_key, { low: em.target_low ?? null, high: em.target_high ?? null }])
  );

  // Fetch tests within experiment date range
  let testQuery = supabase
    .from("tests")
    .select("id, date, lab_name")
    .gte("date", exp.start_date)
    .order("date", { ascending: true });

  if (exp.end_date) {
    testQuery = testQuery.lte("date", exp.end_date);
  }

  const { data: rawTests } = await testQuery;
  const excludedTestIds: string[] = (exp.excluded_test_ids as string[]) ?? [];
  const tests = (rawTests ?? []).filter(t => !excludedTestIds.includes(t.id));

  if (!tests || tests.length === 0 || metricKeys.length === 0) {
    const cats = [...new Set(
      metricKeys.map(k => METRIC_CATALOG[k]?.category).filter((c): c is CategoryKey => !!c)
    )];
    return {
      id: exp.id,
      name: exp.name,
      hypothesis: exp.hypothesis,
      startDate: exp.start_date,
      startDateFormatted: formatTestDate(exp.start_date),
      endDate: exp.end_date,
      endDateFormatted: exp.end_date ? formatTestDate(exp.end_date) : null,
      status: (exp.status ?? "active") as "active" | "completed",
      notes: exp.notes ?? null,
      categories: cats,
      dates: [],
      testDates: [],
      testIds: [],
      columnLabels: (exp.column_labels as Record<string, string>) ?? {},
      excludedTestIds,
      metrics: metricKeys.map(key => ({
        key,
        name: METRIC_CATALOG[key]?.name ?? key,
        unit: METRIC_CATALOG[key]?.unit ?? "",
        category: (METRIC_CATALOG[key]?.category ?? "blood") as CategoryKey,
        readings: [] as (number | null)[],
        states: [] as (StatusBadge | null)[],
        targetLow: targetMap.get(key)?.low ?? null,
        targetHigh: targetMap.get(key)?.high ?? null,
      })),
    };
  }

  const testIds = tests.map(t => t.id);
  const { data: readings } = await supabase
    .from("readings")
    .select("test_id, metric_key, value, unit, attention_state")
    .in("test_id", testIds)
    .in("metric_key", metricKeys);

  // Build lookup: testId → metricKey → reading
  const readingMap = new Map<string, Map<string, { value: number; unit: string; state: string | null }>>();
  for (const r of readings ?? []) {
    if (!readingMap.has(r.test_id)) readingMap.set(r.test_id, new Map());
    readingMap.get(r.test_id)!.set(r.metric_key, {
      value: r.value,
      unit: r.unit,
      state: r.attention_state,
    });
  }

  // Date labels
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const dates = tests.map(t => {
    const [y, m] = t.date.split("-");
    return `${months[parseInt(m) - 1]} ${y}`;
  });

  // Build metrics array
  const cats = [...new Set(
    metricKeys.map(k => METRIC_CATALOG[k]?.category).filter((c): c is CategoryKey => !!c)
  )];

  const metrics: ExperimentDetailMetric[] = metricKeys.map(key => {
    const meta = METRIC_CATALOG[key];
    let inferredUnit = meta?.unit ?? "";
    const readingsArr: (number | null)[] = [];
    const statesArr: (StatusBadge | null)[] = [];

    for (const t of tests) {
      const r = readingMap.get(t.id)?.get(key);
      if (r) {
        inferredUnit = r.unit;
        readingsArr.push(r.value);
        statesArr.push(r.state as StatusBadge | null);
      } else {
        readingsArr.push(null);
        statesArr.push(null);
      }
    }

    return {
      key,
      name: meta?.name ?? key,
      unit: inferredUnit,
      category: (meta?.category ?? "blood") as CategoryKey,
      readings: readingsArr,
      states: statesArr,
      targetLow: targetMap.get(key)?.low ?? null,
      targetHigh: targetMap.get(key)?.high ?? null,
    };
  });

  return {
    id: exp.id,
    name: exp.name,
    hypothesis: exp.hypothesis,
    startDate: exp.start_date,
    startDateFormatted: formatTestDate(exp.start_date),
    endDate: exp.end_date,
    endDateFormatted: exp.end_date ? formatTestDate(exp.end_date) : null,
    status: (exp.status ?? "active") as "active" | "completed",
    notes: exp.notes ?? null,
    categories: cats,
    dates,
    testDates: tests.map(t => t.date),
    testIds: tests.map(t => t.id),
    columnLabels: (exp.column_labels as Record<string, string>) ?? {},
    excludedTestIds,
    metrics,
  };
}

// Ordered longevity marker keys — fixed priority list
export const LONGEVITY_KEYS = [
  "apob", "lp_a", "hba1c", "fasting_insulin",
  "hs_crp", "systolic_bp", "visceral_fat", "vo2_max",
  "heart_rate", "alt",
];

export interface LongevityItem {
  key: string;
  name: string;
  category: CategoryKey;
  value: number | null;   // null = no data yet
  unit: string;
  badge: StatusBadge | null;
}

/**
 * Latest reading for each of the 10 longevity markers.
 * Returns all 10 slots — value is null if no data exists yet.
 */
export async function getLongevityData(): Promise<LongevityItem[]> {
  const { readings } = await fetchAll();

  const latestMap = new Map<string, ReadingWithDate>();
  for (const r of readings) {
    if (!latestMap.has(r.metric_key)) latestMap.set(r.metric_key, r);
  }

  return LONGEVITY_KEYS.map(key => {
    const meta = METRIC_CATALOG[key];
    const r = latestMap.get(key);
    return {
      key,
      name: meta?.name ?? key,
      category: (meta?.category ?? "blood") as CategoryKey,
      value: r?.value ?? null,
      unit: r?.unit ?? meta?.unit ?? "",
      badge: (r?.attention_state as StatusBadge | null) ?? null,
    };
  });
}

/**
 * Metrics at "act" or "improve" from the most recent test.
 */
export async function getAttentionItems(): Promise<AttentionItem[]> {
  const { tests, readings } = await fetchAll();
  if (tests.length === 0) return [];

  const latestTestId = tests[0].id;
  const latestReadings = readings.filter(r => r.test_id === latestTestId);

  return latestReadings
    .filter(r => r.attention_state === "act" || r.attention_state === "improve")
    .map(r => {
      const meta = METRIC_CATALOG[r.metric_key];
      return {
        metricKey: r.metric_key,
        name: meta?.name ?? r.metric_key,
        value: r.value,
        unit: r.unit,
        badge: r.attention_state as StatusBadge,
        category: (meta?.category ?? "blood") as CategoryKey,
      };
    })
    .sort((a, b) => BADGE_ORDER.indexOf(a.badge) - BADGE_ORDER.indexOf(b.badge));
}
