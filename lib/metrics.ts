import type { CategoryKey, StatusBadge } from "./tokens";

// ─── Core types ───────────────────────────────────────────────────────────────

export type EvidenceTier = "A" | "B" | "C" | "L";
export type Direction = "lower_is_better" | "higher_is_better" | "range" | "u_shaped";

/**
 * Half-open intervals: [low, high) — null means open end.
 * e.g. optimal: [null, 70]  → value < 70
 *      strong:  [70,   100] → 70 <= value < 100
 *      act:     [190,  null]→ value >= 190
 */
export interface RangeBands {
  optimal: [number | null, number | null];
  strong:  [number | null, number | null];
  stable:  [number | null, number | null];
  improve: [number | null, number | null];
  act:     [number | null, number | null];
}

export interface MetricMeta {
  name: string;
  category: CategoryKey;
  unit?: string;
  evidenceTier: EvidenceTier;
  isScored: boolean;
  direction?: Direction;
  bands?: RangeBands;
}

// ─── Badge computation ────────────────────────────────────────────────────────

/**
 * Returns null for unscored metrics (isScored: false).
 * Uses half-open interval matching: low <= value < high.
 */
export function computeStatusBadge(
  value: number,
  metric: MetricMeta
): StatusBadge | null {
  if (!metric.isScored || !metric.bands) return null;

  // U-shaped metrics: only identify the optimal zone, return null outside it.
  // This avoids mis-scoring a metric where "too low" and "too high" are both bad
  // but we don't have enough evidence to grade the full spectrum.
  if (metric.direction === "u_shaped") {
    const [lo, hi] = metric.bands.optimal;
    const inOptimal = (lo === null || value >= lo) && (hi === null || value < hi);
    return inOptimal ? "optimal" : null;
  }

  const { bands } = metric;
  const order: StatusBadge[] = ["optimal", "strong", "stable", "improve", "act"];

  for (const badge of order) {
    const [lo, hi] = bands[badge];
    const aboveLo = lo === null || value >= lo;
    const belowHi = hi === null || value < hi;
    if (aboveLo && belowHi) return badge;
  }

  return "act"; // fallback — outside all defined bands
}

// ─── Shared formatting helpers ───────────────────────────────────────────────

/**
 * Format a half-open band interval [lo, hi) into a human-readable string.
 * e.g. [null, 70] → "< 70"  |  [70, 100] → "70–100"  |  [190, null] → "≥ 190"
 */
export function formatBandRange(lo: number | null, hi: number | null): string {
  if (lo === null && hi !== null) return `< ${hi}`;
  if (lo !== null && hi === null) return `≥ ${lo}`;
  if (lo !== null && hi !== null) return `${lo}–${hi}`;
  return "—";
}

// ─── Metric catalog ───────────────────────────────────────────────────────────

/**
 * Single source of truth for all biomarkers.
 *
 * CANONICAL UNITS (Siloam MRCCC standard):
 *   Lipids, ApoB, ApoA1, glucose       → mg/dL
 *   HbA1c                               → % (NGSP)
 *   Haemoglobin, MCHC                   → g/dL
 *   Creatinine, bilirubin, uric acid    → mg/dL
 *   Free T3, Free T4                    → pmol/L
 *   TSH                                 → uIU/mL (= mIU/L)
 *
 * Band ranges sourced from ranges.md (project root).
 * Evidence tiers: A = strong outcome data, B = useful preventive,
 *                 C = context-dependent, L = lab range only (unscored).
 *
 * UI rule: evidenceTier drives display prominence, not badge computation.
 * Tier A + improve/act should surface aggressively on dashboard.
 * Tier C badges shown with context note: "interpret with symptoms/history".
 */
export const METRIC_CATALOG: Record<string, MetricMeta> = {

  // ─── Cardiovascular ──────────────────────────────────────────────────────────
  ldl_c: {
    name: "LDL-C", category: "cardiovascular", unit: "mg/dL",
    evidenceTier: "A", isScored: true, direction: "lower_is_better",
    bands: {
      optimal: [null, 70],
      strong:  [70,   100],
      stable:  [100,  130],
      improve: [130,  190],
      act:     [190,  null],
    },
  },
  hdl_c: {
    name: "HDL-C", category: "cardiovascular", unit: "mg/dL",
    evidenceTier: "B", isScored: true, direction: "higher_is_better",
    bands: {
      optimal: [60,  null],
      strong:  [50,  60],
      stable:  [40,  50],
      improve: [35,  40],
      act:     [null, 35],
    },
  },
  total_cholesterol: {
    name: "Total cholesterol", category: "cardiovascular", unit: "mg/dL",
    evidenceTier: "L", isScored: false,
  },
  triglycerides: {
    name: "Triglycerides", category: "cardiovascular", unit: "mg/dL",
    evidenceTier: "A", isScored: true, direction: "lower_is_better",
    bands: {
      optimal: [null, 70],
      strong:  [70,   100],
      stable:  [100,  150],
      improve: [150,  200],
      act:     [200,  null],
    },
  },
  non_hdl_cholesterol: {
    name: "Non-HDL cholesterol", category: "cardiovascular", unit: "mg/dL",
    evidenceTier: "A", isScored: true, direction: "lower_is_better",
    bands: {
      optimal: [null, 100],
      strong:  [100,  130],
      stable:  [130,  160],
      improve: [160,  190],
      act:     [190,  null],
    },
  },
  apob: {
    name: "ApoB", category: "cardiovascular", unit: "mg/dL",
    evidenceTier: "A", isScored: true, direction: "lower_is_better",
    bands: {
      optimal: [null, 70],
      strong:  [70,   90],
      stable:  [90,   100],
      improve: [100,  130],
      act:     [130,  null],
    },
  },
  apoa1: {
    name: "ApoA1", category: "cardiovascular", unit: "mg/dL",
    evidenceTier: "B", isScored: true, direction: "higher_is_better",
    bands: {
      optimal: [140,  null],
      strong:  [120,  140],
      stable:  [110,  120],
      improve: [90,   110],
      act:     [null, 90],
    },
  },
  lp_a: {
    name: "Lp(a)", category: "cardiovascular", unit: "mg/dL",
    evidenceTier: "A", isScored: true, direction: "lower_is_better",
    bands: {
      optimal: [null, 20],
      strong:  [20,   30],
      stable:  [30,   50],
      improve: [50,   100],
      act:     [100,  null],
    },
  },
  tg_hdl_ratio: {
    name: "TG/HDL ratio", category: "cardiovascular",
    evidenceTier: "B", isScored: true, direction: "lower_is_better",
    bands: {
      optimal: [null, 1.0],
      strong:  [1.0,  1.5],
      stable:  [1.5,  2.0],
      improve: [2.0,  3.0],
      act:     [3.0,  null],
    },
  },
  apob_apoa1_ratio: {
    name: "ApoB/ApoA1 ratio", category: "cardiovascular",
    evidenceTier: "B", isScored: true, direction: "lower_is_better",
    bands: {
      optimal: [null, 0.50],
      strong:  [0.50, 0.65],
      stable:  [0.65, 0.80],
      improve: [0.80, 1.0],
      act:     [1.0,  null],
    },
  },

  // ─── Metabolic ───────────────────────────────────────────────────────────────
  fasting_glucose: {
    name: "Fasting glucose", category: "metabolic", unit: "mg/dL",
    evidenceTier: "A", isScored: true, direction: "range",
    bands: {
      optimal: [75,  90],
      strong:  [90,  99],
      stable:  [100, 109],
      improve: [110, 125],
      act:     [126, null],
    },
  },
  hba1c: {
    name: "HbA1c", category: "metabolic", unit: "%",
    evidenceTier: "A", isScored: true, direction: "range",
    bands: {
      optimal: [5.0, 5.4],
      strong:  [5.4, 5.6],
      stable:  [5.6, 5.7],
      improve: [5.7, 6.5],
      act:     [6.5, null],
    },
  },
  fasting_insulin: {
    name: "Fasting insulin", category: "metabolic", unit: "μIU/mL",
    evidenceTier: "B", isScored: true, direction: "lower_is_better",
    bands: {
      optimal: [null, 5],
      strong:  [5,    8],
      stable:  [8,    12],
      improve: [12,   20],
      act:     [20,   null],
    },
  },
  homa_ir: {
    name: "HOMA-IR", category: "metabolic",
    evidenceTier: "B", isScored: true, direction: "lower_is_better",
    bands: {
      optimal: [null, 1.5],
      strong:  [1.5,  2.0],
      stable:  [2.0,  2.5],
      improve: [2.5,  3.0],
      act:     [3.0,  null],
    },
  },
  tyg_index: {
    name: "TyG index", category: "metabolic",
    evidenceTier: "B", isScored: true, direction: "lower_is_better",
    bands: {
      optimal: [null, 8.3],
      strong:  [8.3,  8.6],
      stable:  [8.6,  8.9],
      improve: [8.9,  9.2],
      act:     [9.2,  null],
    },
  },
  uric_acid: {
    name: "Uric acid", category: "metabolic", unit: "mg/dL",
    evidenceTier: "B", isScored: true, direction: "range",
    bands: {
      optimal: [4.0, 5.5],
      strong:  [5.5, 6.0],
      stable:  [6.0, 7.0],
      improve: [7.0, 8.0],
      act:     [8.0, null],
    },
  },

  // ─── Inflammation ────────────────────────────────────────────────────────────
  hs_crp: {
    name: "hs-CRP", category: "inflammation", unit: "mg/L",
    evidenceTier: "A", isScored: true, direction: "lower_is_better",
    bands: {
      optimal: [null, 0.5],
      strong:  [0.5,  1.0],
      stable:  [1.0,  2.0],
      improve: [2.0,  3.0],
      act:     [3.0,  null],
    },
  },
  homocysteine: {
    name: "Homocysteine", category: "inflammation", unit: "μmol/L",
    evidenceTier: "B", isScored: true, direction: "lower_is_better",
    bands: {
      optimal: [null, 9],
      strong:  [9,    11],
      stable:  [11,   15],
      improve: [15,   20],
      act:     [20,   null],
    },
  },
  ferritin: {
    name: "Ferritin", category: "inflammation", unit: "μg/L",
    evidenceTier: "L", isScored: false,
  },
  esr: {
    name: "ESR", category: "inflammation", unit: "mm/hr",
    evidenceTier: "L", isScored: false,
  },
  wbc: {
    name: "WBC", category: "inflammation", unit: "10⁹/L",
    evidenceTier: "L", isScored: false,
  },

  // ─── Hormonal ────────────────────────────────────────────────────────────────
  testosterone_total: {
    name: "Testosterone (total)", category: "hormonal", unit: "nmol/L",
    evidenceTier: "C", isScored: false,
  },
  testosterone_free: {
    name: "Testosterone (free)", category: "hormonal", unit: "nmol/L",
    evidenceTier: "C", isScored: true, direction: "range",
    bands: {
      optimal: [0.35, 0.60],
      strong:  [0.25, 0.35],
      stable:  [0.20, 0.25],
      improve: [0.15, 0.20],
      act:     [null, 0.15],
    },
  },
  shbg: {
    name: "SHBG", category: "hormonal", unit: "nmol/L",
    evidenceTier: "L", isScored: false,
  },
  cortisol: {
    name: "Cortisol", category: "hormonal", unit: "nmol/L",
    evidenceTier: "L", isScored: false,
  },
  dhea_s: {
    name: "DHEA-S", category: "hormonal", unit: "μmol/L",
    evidenceTier: "C", isScored: false, // age-dependent — no hardcoded bands
  },
  tsh: {
    name: "TSH", category: "hormonal", unit: "uIU/mL",
    evidenceTier: "B", isScored: true, direction: "u_shaped",
    bands: {
      optimal: [0.5,  2.0],  // Attia optimal zone
      strong:  [0,    0],    // unused — u_shaped only checks optimal
      stable:  [0,    0],
      improve: [0,    0],
      act:     [0,    0],
    },
  },
  free_t3: {
    name: "Free T3", category: "hormonal", unit: "pmol/L",
    evidenceTier: "L", isScored: false,
  },
  free_t4: {
    name: "Free T4", category: "hormonal", unit: "pmol/L",
    evidenceTier: "L", isScored: false,
  },
  psa_total: {
    name: "PSA (total)", category: "hormonal", unit: "ng/mL",
    evidenceTier: "C", isScored: true, direction: "lower_is_better",
    bands: {
      optimal: [null, 1.0],
      strong:  [1.0,  1.5],
      stable:  [1.5,  2.5],
      improve: [2.5,  4.0],
      act:     [4.0,  null],
    },
  },

  // ─── Nutritional & Gut ───────────────────────────────────────────────────────
  vitamin_d: {
    name: "Vitamin D", category: "nutritional", unit: "nmol/L",
    evidenceTier: "B", isScored: true, direction: "u_shaped",
    bands: {
      optimal: [75,   125],
      strong:  [50,   150],
      stable:  [37,   null],
      improve: [null, 200],  // <50 or 150–200
      act:     [200,  null],
    },
  },
  vitamin_b12: {
    name: "Vitamin B12", category: "nutritional", unit: "pmol/L",
    evidenceTier: "C", isScored: true, direction: "u_shaped",
    bands: {
      optimal: [350,  700],
      strong:  [300,  900],
      stable:  [220,  null],
      improve: [150,  null],
      act:     [null, 150],
    },
  },
  folate: {
    name: "Folate", category: "nutritional", unit: "nmol/L",
    evidenceTier: "C", isScored: true, direction: "higher_is_better",
    bands: {
      optimal: [15,   45],
      strong:  [10,   null],
      stable:  [7,    null],
      improve: [3,    null],
      act:     [null, 3],
    },
  },
  serum_iron: {
    name: "Serum iron", category: "nutritional", unit: "μmol/L",
    evidenceTier: "L", isScored: false,
  },
  transferrin_saturation: {
    name: "Transferrin saturation", category: "nutritional", unit: "%",
    evidenceTier: "B", isScored: true, direction: "u_shaped",
    bands: {
      optimal: [20,   35],
      strong:  [15,   45],
      stable:  [10,   50],
      improve: [null, 60],
      act:     [60,   null],
    },
  },
  magnesium: {
    name: "Magnesium", category: "nutritional", unit: "mmol/L",
    evidenceTier: "C", isScored: true, direction: "u_shaped",
    bands: {
      optimal: [0.85, 1.05],
      strong:  [0.75, 1.10],
      stable:  [0.65, 1.20],
      improve: [0.50, null],
      act:     [null, 0.50],
    },
  },
  zinc: {
    name: "Zinc", category: "nutritional", unit: "μmol/L",
    evidenceTier: "C", isScored: true, direction: "u_shaped",
    bands: {
      optimal: [12,   18],
      strong:  [10,   20],
      stable:  [8,    null],
      improve: [6,    null],
      act:     [null, 6],
    },
  },
  // Gut microbiome — unscored (Tier L)
  scfa_total:         { name: "SCFA total",              category: "nutritional", unit: "mg/mL", evidenceTier: "L", isScored: false },
  butyric_acid_abs:   { name: "Butyric acid (absolute)", category: "nutritional", unit: "mg/mL", evidenceTier: "L", isScored: false },
  butyric_acid_pct:   { name: "Butyric acid (%)",        category: "nutritional", unit: "%",     evidenceTier: "L", isScored: false },
  acetic_acid_pct:    { name: "Acetic acid (%)",         category: "nutritional", unit: "%",     evidenceTier: "L", isScored: false },
  propionic_acid_pct: { name: "Propionic acid (%)",      category: "nutritional", unit: "%",     evidenceTier: "L", isScored: false },

  // ─── Blood & Organ ───────────────────────────────────────────────────────────
  // CBC — all Tier L, unscored
  rbc:         { name: "RBC",         category: "blood", unit: "10¹²/L", evidenceTier: "L", isScored: false },
  haemoglobin: { name: "Haemoglobin", category: "blood", unit: "g/dL",   evidenceTier: "L", isScored: false },
  haematocrit: { name: "Haematocrit", category: "blood", unit: "%",      evidenceTier: "L", isScored: false },
  mcv:         { name: "MCV",         category: "blood", unit: "fL",     evidenceTier: "L", isScored: false },
  mch:         { name: "MCH",         category: "blood", unit: "pg",     evidenceTier: "L", isScored: false },
  mchc:        { name: "MCHC",        category: "blood", unit: "g/dL",   evidenceTier: "L", isScored: false },
  rdw_cv: {
    name: "RDW-CV", category: "blood", unit: "%",
    evidenceTier: "B", isScored: true, direction: "lower_is_better",
    bands: {
      optimal: [null, 13],
      strong:  [13,   14],
      stable:  [14,   15],
      improve: [15,   16],
      act:     [16,   null],
    },
  },
  platelets: { name: "Platelets", category: "blood", unit: "10⁹/L", evidenceTier: "L", isScored: false },
  // Liver enzymes — scored (tighter than lab range)
  ast: {
    name: "AST", category: "blood", unit: "U/L",
    evidenceTier: "B", isScored: true, direction: "lower_is_better",
    bands: {
      optimal: [null, 25],
      strong:  [25,   35],
      stable:  [35,   40],
      improve: [40,   80],
      act:     [80,   null],
    },
  },
  alt: {
    name: "ALT", category: "blood", unit: "U/L",
    evidenceTier: "B", isScored: true, direction: "lower_is_better",
    bands: {
      optimal: [null, 30],
      strong:  [30,   40],
      stable:  [40,   50],
      improve: [50,   100],
      act:     [100,  null],
    },
  },
  ggt: {
    name: "GGT", category: "blood", unit: "U/L",
    evidenceTier: "B", isScored: true, direction: "lower_is_better",
    bands: {
      optimal: [null, 25],
      strong:  [25,   40],
      stable:  [40,   60],
      improve: [60,   100],
      act:     [100,  null],
    },
  },
  alp: { name: "ALP", category: "blood", unit: "U/L", evidenceTier: "L", isScored: false },
  // Bilirubin — all Tier L, unscored
  bilirubin_total:    { name: "Bilirubin (total)",    category: "blood", unit: "mg/dL", evidenceTier: "L", isScored: false },
  bilirubin_direct:   { name: "Bilirubin (direct)",   category: "blood", unit: "mg/dL", evidenceTier: "L", isScored: false },
  bilirubin_indirect: { name: "Bilirubin (indirect)", category: "blood", unit: "mg/dL", evidenceTier: "L", isScored: false },
  creatinine:         { name: "Creatinine",            category: "blood", unit: "mg/dL", evidenceTier: "L", isScored: false },
  egfr: {
    name: "eGFR", category: "blood", unit: "mL/min/1.73m²",
    evidenceTier: "A", isScored: true, direction: "higher_is_better",
    bands: {
      optimal: [100,  null],
      strong:  [90,   100],
      stable:  [75,   90],
      improve: [60,   75],
      act:     [null, 60],
    },
  },
  urea: { name: "Urea", category: "blood", unit: "mg/dL", evidenceTier: "L", isScored: false },

  // ─── Vitals ──────────────────────────────────────────────────────────────────
  systolic_bp: {
    name: "Systolic BP", category: "vitals", unit: "mmHg",
    evidenceTier: "A", isScored: true, direction: "lower_is_better",
    bands: {
      optimal: [null, 120],
      strong:  [120,  130],
      stable:  [130,  140],
      improve: [140,  160],
      act:     [160,  null],
    },
  },
  diastolic_bp: {
    name: "Diastolic BP", category: "vitals", unit: "mmHg",
    evidenceTier: "A", isScored: true, direction: "lower_is_better",
    bands: {
      optimal: [null, 80],
      strong:  [80,   85],
      stable:  [85,   90],
      improve: [90,   100],
      act:     [100,  null],
    },
  },
  heart_rate: {
    name: "Resting heart rate", category: "vitals", unit: "bpm",
    evidenceTier: "B", isScored: true, direction: "range",
    bands: {
      optimal: [45,  60],
      strong:  [60,  70],
      stable:  [70,  80],
      improve: [80,  90],
      act:     [90,  null],
    },
  },
  weight_kg:    { name: "Weight",              category: "vitals", unit: "kg",    evidenceTier: "C", isScored: false },
  height_cm:    { name: "Height",              category: "vitals", unit: "cm",    evidenceTier: "L", isScored: false },
  bmi: {
    name: "BMI", category: "vitals", unit: "kg/m²",
    evidenceTier: "C", isScored: false,
  },
  whr: {
    name: "Waist-to-hip ratio", category: "vitals", unit: "",
    evidenceTier: "A", isScored: true, direction: "lower_is_better",
    bands: {
      optimal: [null, 0.85],
      strong:  [0.85, 0.90],
      stable:  [0.90, 0.95],
      improve: [0.95, 1.00],
      act:     [1.00, null],
    },
  },
  body_fat_pct: {
    name: "Body fat %", category: "vitals", unit: "%",
    evidenceTier: "B", isScored: true, direction: "lower_is_better",
    bands: {
      optimal: [null, 18],
      strong:  [18,   22],
      stable:  [22,   25],
      improve: [25,   30],
      act:     [30,   null],
    },
  },
  visceral_fat: {
    name: "Visceral fat rating", category: "vitals", unit: "rating",
    evidenceTier: "B", isScored: true, direction: "lower_is_better",
    bands: {
      optimal: [null, 5],
      strong:  [5,    7],
      stable:  [7,    9],
      improve: [9,    13],
      act:     [13,   null],
    },
  },
  muscle_mass_kg: {
    name: "Muscle mass", category: "vitals", unit: "kg",
    evidenceTier: "B", isScored: false,
  },

  // ── Fitness (CPET) ──────────────────────────────────────────────────────────
  vo2_max: {
    name: "VO₂ max", category: "vitals", unit: "ml/min/kg",
    evidenceTier: "A", isScored: true, direction: "higher_is_better",
    bands: {
      optimal: [50,   null],
      strong:  [45,   50],
      stable:  [37,   45],
      improve: [30,   37],
      act:     [null, 30],
    },
  },
  at_hr: {
    name: "Anaerobic threshold HR", category: "vitals", unit: "bpm",
    evidenceTier: "B", isScored: false,
  },
  max_hr: {
    name: "Max heart rate", category: "vitals", unit: "bpm",
    evidenceTier: "C", isScored: false,
  },
  hr_recovery_1min: {
    name: "HR recovery (1 min)", category: "vitals", unit: "bpm",
    evidenceTier: "A", isScored: true, direction: "higher_is_better",
    bands: {
      optimal: [25,   null],
      strong:  [20,   25],
      stable:  [15,   20],
      improve: [12,   15],
      act:     [null, 12],
    },
  },
};

// ─── Display config ───────────────────────────────────────────────────────────

export const BADGE_LABELS: Record<StatusBadge, string> = {
  optimal: "Optimal",
  strong:  "Strong",
  stable:  "Stable",
  improve: "Improve",
  act:     "Act",
};

export const CATEGORY_LABELS: Record<CategoryKey, string> = {
  cardiovascular: "Cardiovascular",
  metabolic:      "Metabolic",
  inflammation:   "Inflammation",
  hormonal:       "Hormonal",
  nutritional:    "Nutritional & Gut",
  blood:          "Blood & Organ",
  vitals:         "Vitals",
};

export const CATEGORY_ORDER: CategoryKey[] = [
  "cardiovascular", "metabolic", "inflammation",
  "hormonal", "nutritional", "blood", "vitals",
];
