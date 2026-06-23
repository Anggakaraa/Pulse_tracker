export type PutihSection = "chemistry" | "hematology" | "general";

export interface PutihMetric {
  key: string;
  name: string;
  unit: string;
  section: PutihSection;
  rangeLow: number | null;
  rangeHigh: number | null;
}

export const PUTIH_METRICS: PutihMetric[] = [
  // General
  { key: "weight_kg", name: "Weight", unit: "kg", section: "general", rangeLow: null, rangeHigh: null },

  // Chemistry — organ function
  { key: "alb",  name: "Albumin",               unit: "g/L",     section: "chemistry",   rangeLow: 25,   rangeHigh: 44   },
  { key: "alp",  name: "Alkaline Phosphatase",   unit: "µ/L",     section: "chemistry",   rangeLow: 20,   rangeHigh: 150  },
  { key: "alt",  name: "ALT",                    unit: "µ/L",     section: "chemistry",   rangeLow: 10,   rangeHigh: 118  },
  { key: "amy",  name: "Amylase",                unit: "µ/L",     section: "chemistry",   rangeLow: 200,  rangeHigh: 1200 },
  { key: "tbil", name: "Total Bilirubin",         unit: "µmol/L",  section: "chemistry",   rangeLow: 2,    rangeHigh: 10   },
  { key: "bun",  name: "BUN",                    unit: "mmol/L",  section: "chemistry",   rangeLow: 2.5,  rangeHigh: 8.9  },
  { key: "ca",   name: "Calcium",                unit: "mmol/L",  section: "chemistry",   rangeLow: 2.15, rangeHigh: 2.95 },
  { key: "phos", name: "Phosphorus",             unit: "mmol/L",  section: "chemistry",   rangeLow: 0.94, rangeHigh: 2.13 },
  { key: "cre",  name: "Creatinine",             unit: "µmol/L",  section: "chemistry",   rangeLow: 27,   rangeHigh: 124  },
  { key: "glu",  name: "Glucose",                unit: "mmol/L",  section: "chemistry",   rangeLow: 3.3,  rangeHigh: 6.1  },
  { key: "na",   name: "Sodium",                 unit: "mmol/L",  section: "chemistry",   rangeLow: 138,  rangeHigh: 160  },
  { key: "k",    name: "Potassium",              unit: "mmol/L",  section: "chemistry",   rangeLow: 3.7,  rangeHigh: 5.8  },
  { key: "tp",   name: "Total Protein",          unit: "g/L",     section: "chemistry",   rangeLow: 54,   rangeHigh: 82   },
  { key: "glob", name: "Globulin",               unit: "g/L",     section: "chemistry",   rangeLow: 23,   rangeHigh: 52   },

  // Hematology — blood count
  { key: "wbc",  name: "WBC",                    unit: "10⁹/L",   section: "hematology",  rangeLow: 6.0,  rangeHigh: 17.0 },
  { key: "lym",  name: "Lymphocytes",            unit: "10⁹/L",   section: "hematology",  rangeLow: 1.0,  rangeHigh: 4.8  },
  { key: "mon",  name: "Monocytes",              unit: "10⁹/L",   section: "hematology",  rangeLow: 0.2,  rangeHigh: 1.5  },
  { key: "neu",  name: "Neutrophils",            unit: "10⁹/L",   section: "hematology",  rangeLow: 3.0,  rangeHigh: 12.0 },
  { key: "eos",  name: "Eosinophils",            unit: "10⁹/L",   section: "hematology",  rangeLow: 0.0,  rangeHigh: 0.8  },
  { key: "bas",  name: "Basophils",              unit: "10⁹/L",   section: "hematology",  rangeLow: 0.0,  rangeHigh: 0.4  },
  { key: "rbc",  name: "RBC",                    unit: "10¹²/L",  section: "hematology",  rangeLow: 5.5,  rangeHigh: 8.5  },
  { key: "hgb",  name: "Haemoglobin",            unit: "g/dL",    section: "hematology",  rangeLow: 12.0, rangeHigh: 18.0 },
  { key: "hct",  name: "Haematocrit",            unit: "%",       section: "hematology",  rangeLow: 37.0, rangeHigh: 55.0 },
  { key: "mcv",  name: "MCV",                    unit: "fL",      section: "hematology",  rangeLow: 60,   rangeHigh: 77   },
  { key: "mch",  name: "MCH",                    unit: "pg",      section: "hematology",  rangeLow: 19.5, rangeHigh: 24.5 },
  { key: "mchc", name: "MCHC",                   unit: "g/dL",    section: "hematology",  rangeLow: 31.0, rangeHigh: 39.0 },
  { key: "rdw",  name: "RDW",                    unit: "%",       section: "hematology",  rangeLow: 14.0, rangeHigh: 20.0 },
  { key: "plt",  name: "Platelets",              unit: "10⁹/L",   section: "hematology",  rangeLow: 165,  rangeHigh: 500  },
  { key: "mpv",  name: "MPV",                    unit: "fL",      section: "hematology",  rangeLow: 3.9,  rangeHigh: 11.1 },
];

export const PUTIH_METRIC_MAP = Object.fromEntries(PUTIH_METRICS.map(m => [m.key, m]));

export function getPutihRangeStatus(value: number, low: number | null, high: number | null): "normal" | "high" | "low" {
  if (high !== null && value > high) return "high";
  if (low !== null && value < low) return "low";
  return "normal";
}
