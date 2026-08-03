export type ResponseBand = "low" | "moderate" | "high";
export type ResponseShape =
  | "flat"
  | "sharp_quick_recovery"
  | "sharp_slow_recovery"
  | "gradual_rise"
  | "double_rise"
  | "below_baseline"
  | "still_elevated"
  | "insufficient_data";

export interface GlucoseReading {
  id: string;
  meal_id?: string | null;
  user_id?: string | null;
  timestamp: string;
  glucose_mmol: number;
  is_baseline: boolean;
}

export interface MealMetrics {
  baselineGlucoseMmol: number | null;
  peakGlucoseMmol: number | null;
  spikeMmol: number | null;
  peakTimestamp: string | null;
  timeToPeakMinutes: number | null;
  finalGlucoseMmol: number | null;
  finalDiffFromBaselineMmol: number | null;
  observationDurationMinutes: number | null;
  returnToBaselineMinutes: number | null;
  minutesAbove7_8: number | null;
  minutesPeakToBelow7_8: number | null;
  iAUC: number | null;
  postPeakLowMmol: number | null;
  dropFromPeakMmol: number | null;
  responseBand: ResponseBand | null;
  responseShape: ResponseShape;
}

const RETURN_TOLERANCE = 0.6; // mmol/L above baseline counts as "near baseline"

export function calcMealMetrics(
  readings: GlucoseReading[],
  mealStartTime: string,
  // Next meal or event start time (ms); peak search is capped here with a 60-min minimum floor
  peakCutoffMs?: number
): MealMetrics {
  if (readings.length === 0) {
    return nullMetrics("insufficient_data");
  }

  const sorted = [...readings].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Baseline: explicitly marked, or latest reading at/before meal start
  const mealStart = new Date(mealStartTime).getTime();
  const explicit = sorted.find(r => r.is_baseline);
  const baseline = explicit ?? sorted.filter(r => new Date(r.timestamp).getTime() <= mealStart).at(-1);

  if (!baseline) {
    return nullMetrics("insufficient_data");
  }

  const baselineIdx = sorted.indexOf(baseline);
  const allPostBaseline = sorted.slice(baselineIdx + 1);

  if (allPostBaseline.length === 0) {
    return {
      ...nullMetrics("insufficient_data"),
      baselineGlucoseMmol: baseline.glucose_mmol,
    };
  }

  // Cap observation window at next meal/event, with 60-min minimum floor from meal start
  const effectiveCutoff = peakCutoffMs != null
    ? Math.max(mealStart + 60 * 60 * 1000, peakCutoffMs)
    : null;
  const postBaseline = effectiveCutoff
    ? allPostBaseline.filter(r => new Date(r.timestamp).getTime() <= effectiveCutoff)
    : allPostBaseline;

  if (postBaseline.length === 0) {
    return {
      ...nullMetrics("insufficient_data"),
      baselineGlucoseMmol: baseline.glucose_mmol,
    };
  }

  // Peak: highest reading in the observation window
  const peak = postBaseline.reduce((a, b) => b.glucose_mmol > a.glucose_mmol ? b : a);
  const peakIdx = postBaseline.indexOf(peak);

  const spikeMmol = round1(peak.glucose_mmol - baseline.glucose_mmol);
  const timeToPeakMinutes = Math.round(
    (new Date(peak.timestamp).getTime() - new Date(mealStartTime).getTime()) / 60000
  );

  const finalReading = postBaseline.at(-1)!;
  const finalDiff = round1(finalReading.glucose_mmol - baseline.glucose_mmol);
  const observationMinutes = Math.round(
    (new Date(finalReading.timestamp).getTime() - new Date(baseline.timestamp).getTime()) / 60000
  );

  // Post-peak readings
  const postPeak = postBaseline.slice(peakIdx + 1);

  // iAUC-120: positive incremental AUC from meal start to exactly 120 min, above pre-meal baseline
  const iAUC = calcIAUC120(sorted, mealStart, baseline.glucose_mmol);

  // Time above 7.8 and peak-to-below-7.8 (only when meal crossed 7.8)
  const firstBelow7_8AfterPeak = peak.glucose_mmol <= 7.8
    ? null
    : postPeak.find(r => r.glucose_mmol <= 7.8) ?? null;

  const firstAbove7_8 = peak.glucose_mmol <= 7.8
    ? null
    : [baseline, ...postBaseline].find(r => r.glucose_mmol > 7.8) ?? null;

  const minutesAbove7_8 = firstAbove7_8 && firstBelow7_8AfterPeak
    ? Math.round((new Date(firstBelow7_8AfterPeak.timestamp).getTime() - new Date(firstAbove7_8.timestamp).getTime()) / 60000)
    : null;

  const minutesPeakToBelow7_8 = firstBelow7_8AfterPeak
    ? Math.round((new Date(firstBelow7_8AfterPeak.timestamp).getTime() - new Date(peak.timestamp).getTime()) / 60000)
    : null;

  // Return near baseline
  const returnReading = postPeak.find(r => r.glucose_mmol <= baseline.glucose_mmol + RETURN_TOLERANCE);
  const returnToBaselineMinutes = returnReading
    ? Math.round((new Date(returnReading.timestamp).getTime() - new Date(peak.timestamp).getTime()) / 60000)
    : null;

  // Post-peak low
  const postPeakLow = postPeak.length > 0
    ? postPeak.reduce((a, b) => b.glucose_mmol < a.glucose_mmol ? b : a)
    : null;
  const postPeakLowMmol = postPeakLow ? postPeakLow.glucose_mmol : null;
  const dropFromPeakMmol = postPeakLow ? round1(peak.glucose_mmol - postPeakLow.glucose_mmol) : null;

  const responseBand = calcResponseBand(spikeMmol);
  const responseShape = calcResponseShape(
    baseline.glucose_mmol,
    spikeMmol,
    timeToPeakMinutes,
    returnToBaselineMinutes,
    postPeakLowMmol,
    finalReading.glucose_mmol,
    1 + postBaseline.length, // readings in observation window (baseline + post)
    postPeak
  );

  return {
    baselineGlucoseMmol: baseline.glucose_mmol,
    peakGlucoseMmol: peak.glucose_mmol,
    spikeMmol,
    peakTimestamp: peak.timestamp,
    timeToPeakMinutes,
    finalGlucoseMmol: finalReading.glucose_mmol,
    finalDiffFromBaselineMmol: finalDiff,
    observationDurationMinutes: observationMinutes,
    returnToBaselineMinutes,
    minutesAbove7_8,
    minutesPeakToBelow7_8,
    iAUC,
    postPeakLowMmol,
    dropFromPeakMmol,
    responseBand,
    responseShape,
  };
}

function calcIAUC120(
  sorted: GlucoseReading[],
  mealStartMs: number,
  baselineGlucose: number
): number | null {
  const endMs = mealStartMs + 120 * 60 * 1000;

  // Only readings strictly after meal start
  const postMeal = sorted.filter(r => new Date(r.timestamp).getTime() > mealStartMs);

  // Adequate coverage requires at least one reading at or beyond the 120-min mark
  if (!postMeal.some(r => new Date(r.timestamp).getTime() >= endMs)) return null;

  const inWindow = postMeal.filter(r => new Date(r.timestamp).getTime() <= endMs);
  const firstAfter = postMeal.find(r => new Date(r.timestamp).getTime() > endMs);

  // Anchor at t=0 with baseline glucose, then add in-window readings
  const pts: { t: number; g: number }[] = [
    { t: 0, g: baselineGlucose },
    ...inWindow.map(r => ({
      t: (new Date(r.timestamp).getTime() - mealStartMs) / 60000,
      g: r.glucose_mmol,
    })),
  ];

  // Interpolate at exactly t=120 when readings straddle the boundary
  const lastIn = inWindow.at(-1);
  const lastBeforeMs = lastIn ? new Date(lastIn.timestamp).getTime() : mealStartMs;
  const lastBeforeG  = lastIn ? lastIn.glucose_mmol : baselineGlucose;

  if (firstAfter && lastBeforeMs < endMs) {
    const frac = (endMs - lastBeforeMs) / (new Date(firstAfter.timestamp).getTime() - lastBeforeMs);
    pts.push({ t: 120, g: lastBeforeG + frac * (firstAfter.glucose_mmol - lastBeforeG) });
  }

  // Trapezoidal integration — positive increments above baseline only
  let area = 0;
  for (let i = 1; i < pts.length; i++) {
    const h1 = Math.max(0, pts[i - 1].g - baselineGlucose);
    const h2 = Math.max(0, pts[i].g - baselineGlucose);
    area += (h1 + h2) / 2 * (pts[i].t - pts[i - 1].t);
  }
  return Math.round(area * 10) / 10;
}

function calcResponseBand(spikeMmol: number): ResponseBand {
  if (spikeMmol <= 1.7) return "low";
  if (spikeMmol <= 2.8) return "moderate";
  return "high";
}

function calcResponseShape(
  baselineGlucose: number,
  spikeMmol: number,
  timeToPeakMinutes: number,
  returnToBaselineMinutes: number | null,
  postPeakLowMmol: number | null,
  finalGlucose: number,
  totalReadings: number,
  postPeak: GlucoseReading[]
): ResponseShape {
  if (totalReadings < 3) return "insufficient_data";
  if (spikeMmol <= 0.5) return "flat";
  if (postPeakLowMmol !== null && postPeakLowMmol < baselineGlucose - 0.3) return "below_baseline";
  if (returnToBaselineMinutes === null && finalGlucose > baselineGlucose + 0.6) return "still_elevated";

  // Check for double rise: post-peak secondary spike
  if (postPeak.length >= 3) {
    const postPeakValues = postPeak.map(r => r.glucose_mmol);
    const localMin = Math.min(...postPeakValues.slice(0, Math.floor(postPeakValues.length / 2)));
    const laterMax = Math.max(...postPeakValues.slice(Math.floor(postPeakValues.length / 2)));
    if (laterMax - localMin > 1.0) return "double_rise";
  }

  const isSharp = timeToPeakMinutes <= 45;
  if (isSharp && returnToBaselineMinutes !== null && returnToBaselineMinutes <= 60) return "sharp_quick_recovery";
  if (isSharp) return "sharp_slow_recovery";
  return "gradual_rise";
}

function nullMetrics(shape: ResponseShape): MealMetrics {
  return {
    baselineGlucoseMmol: null,
    peakGlucoseMmol: null,
    spikeMmol: null,
    peakTimestamp: null,
    timeToPeakMinutes: null,
    finalGlucoseMmol: null,
    finalDiffFromBaselineMmol: null,
    observationDurationMinutes: null,
    returnToBaselineMinutes: null,
    minutesAbove7_8: null,
    minutesPeakToBelow7_8: null,
    iAUC: null,
    postPeakLowMmol: null,
    dropFromPeakMmol: null,
    responseBand: null,
    responseShape: shape,
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export const RESPONSE_BAND_LABEL: Record<ResponseBand, string> = {
  low: "Low movement",
  moderate: "Moderate movement",
  high: "High movement",
};

export const RESPONSE_BAND_COLOR: Record<ResponseBand, string> = {
  low: "#4A8C62",
  moderate: "#A8882A",
  high: "#A03828",
};

export const RESPONSE_SHAPE_LABEL: Record<ResponseShape, string> = {
  flat: "Flat",
  sharp_quick_recovery: "Sharp rise, quick recovery",
  sharp_slow_recovery: "Sharp rise, slow recovery",
  gradual_rise: "Gradual rise",
  double_rise: "Double rise",
  below_baseline: "Fell below baseline",
  still_elevated: "Still elevated when observation ended",
  insufficient_data: "Insufficient data",
};

export const PRIMARY_CARB_LABEL: Record<string, string> = {
  none: "No meaningful carbohydrate",
  white_rice: "White rice",
  red_brown_rice: "Red or brown rice",
  bread: "Bread",
  fibrous_bread: "Fibrous bread",
  pasta: "Pasta",
  wholewheat_pasta: "Wholewheat pasta",
  noodles_flour: "Noodles or flour-based dish",
  sugar_dessert: "Sugar or dessert",
  quinoa: "Quinoa",
  cauliflower_rice: "Cauliflower rice",
  potato: "Potato",
  fruit: "Fruit",
  other: "Other",
};

export const FIBER_PROMINENCE_LABEL: Record<string, string> = {
  low:      "Low fiber",
  moderate: "Moderate fiber",
  high:     "High fiber",
};

export const PROTEIN_PROMINENCE_LABEL: Record<string, string> = {
  low:      "Low protein",
  moderate: "Moderate protein",
  high:     "High protein",
};

export const FAT_PROMINENCE_LABEL: Record<string, string> = {
  low:      "Low fat",
  moderate: "Moderate fat",
  high:     "High fat",
};

export const CARB_PROMINENCE_LABEL: Record<string, string> = {
  none: "None",
  supporting: "Supporting",
  moderate: "Moderate",
  hero: "Hero",
};

export const MEAL_TYPE_LABEL: Record<string, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
  other: "Other",
};

export interface SensorErrorPeriod {
  start: string; // "HH:MM" WIB
  end: string;   // "HH:MM" WIB; "00:00" = end of day
}

function parseHHMM(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function isInSensorErrorPeriod(
  timestamp: string,
  periods: SensorErrorPeriod[]
): boolean {
  if (!periods.length) return false;
  const wibMs = new Date(timestamp).getTime() + 7 * 60 * 60 * 1000;
  const d = new Date(wibMs);
  const wibMin = d.getUTCHours() * 60 + d.getUTCMinutes();
  return periods.some(({ start, end }) => {
    const s = parseHHMM(start);
    const e = parseHHMM(end);
    const effectiveEnd = e === 0 ? 1440 : e;
    if (effectiveEnd > s) return wibMin >= s && wibMin < effectiveEnd;
    return wibMin >= s || wibMin < effectiveEnd; // spans midnight
  });
}

export function mmol(v: number | null): string {
  if (v === null) return "—";
  return `${v.toFixed(1)} mmol/L`;
}

export function mmolDiff(v: number | null): string {
  if (v === null) return "—";
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(1)} mmol/L`;
}
