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
  minutesBelow7_8: number | null;
  iAUC: number | null;
  postPeakLowMmol: number | null;
  dropFromPeakMmol: number | null;
  responseBand: ResponseBand | null;
  responseShape: ResponseShape;
}

const RETURN_TOLERANCE = 0.6; // mmol/L above baseline counts as "near baseline"

export function calcMealMetrics(
  readings: GlucoseReading[],
  mealStartTime: string
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
  const postBaseline = sorted.slice(baselineIdx + 1);

  if (postBaseline.length === 0) {
    return {
      ...nullMetrics("insufficient_data"),
      baselineGlucoseMmol: baseline.glucose_mmol,
    };
  }

  // Peak: highest reading after baseline
  const peak = postBaseline.reduce((a, b) => b.glucose_mmol > a.glucose_mmol ? b : a);
  const peakIdx = postBaseline.indexOf(peak);

  const spikeMmol = round1(peak.glucose_mmol - baseline.glucose_mmol);
  const timeToPeakMinutes = Math.round(
    (new Date(peak.timestamp).getTime() - new Date(mealStartTime).getTime()) / 60000
  );

  const finalReading = sorted.at(-1)!;
  const finalDiff = round1(finalReading.glucose_mmol - baseline.glucose_mmol);
  const observationMinutes = Math.round(
    (new Date(finalReading.timestamp).getTime() - new Date(baseline.timestamp).getTime()) / 60000
  );

  // Post-peak readings
  const postPeak = postBaseline.slice(peakIdx + 1);

  // iAUC: trapezoidal integration of (glucose − baseline) above baseline
  const allFromBaseline = [baseline, ...postBaseline];
  let iAUCRaw = 0;
  for (let i = 1; i < allFromBaseline.length; i++) {
    const r1 = allFromBaseline[i - 1];
    const r2 = allFromBaseline[i];
    const h1 = Math.max(0, r1.glucose_mmol - baseline.glucose_mmol);
    const h2 = Math.max(0, r2.glucose_mmol - baseline.glucose_mmol);
    const dt = (new Date(r2.timestamp).getTime() - new Date(r1.timestamp).getTime()) / 60000;
    iAUCRaw += (h1 + h2) / 2 * dt;
  }
  const iAUC = Math.round(iAUCRaw);

  // Time from meal start until glucose falls back below 7.8 (only when peak > 7.8)
  const minutesBelow7_8 = peak.glucose_mmol <= 7.8
    ? null
    : (() => {
        const firstBelow = postPeak.find(r => r.glucose_mmol <= 7.8);
        return firstBelow
          ? Math.round((new Date(firstBelow.timestamp).getTime() - new Date(mealStartTime).getTime()) / 60000)
          : null;
      })();

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
    sorted.length,
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
    minutesBelow7_8,
    iAUC,
    postPeakLowMmol,
    dropFromPeakMmol,
    responseBand,
    responseShape,
  };
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
    minutesBelow7_8: null,
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

export function mmol(v: number | null): string {
  if (v === null) return "—";
  return `${v.toFixed(1)} mmol/L`;
}

export function mmolDiff(v: number | null): string {
  if (v === null) return "—";
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(1)} mmol/L`;
}
