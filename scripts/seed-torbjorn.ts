import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://cfybwyypcttazfinxhvz.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const USER_ID = "c5f2a905-bdd5-4f96-a07b-ca5f4ec0b8b3";

// Unit conversions used:
// mg/dL cholesterol/LDL/HDL → mmol/L: × 0.02586
// mg/dL triglycerides → mmol/L: × 0.01129
// mg/dL glucose → mmol/L: × 0.05551
// mg/dL urea → mmol/L: ÷ 6.006
// mg/dL creatinine → µmol/L: × 88.4
// mg/dL uric acid → µmol/L: × 59.48
// mg/dL bilirubin → µmol/L: × 17.1

async function seed() {

  // ── Test 1: 26 Aug 2021 — Siloam Hospitals ──────────────────────────────
  const { data: t1, error: e1 } = await supabase
    .from("tests")
    .insert({ date: "2021-08-26", lab_name: "Siloam Hospitals", subject: "human", user_id: USER_ID })
    .select("id").single();

  if (e1 || !t1) { console.error("Failed test 1:", e1); return; }

  const { error: r1err } = await supabase.from("readings").insert([
    // Vitals
    { test_id: t1.id, metric_key: "systolic_bp",      value: 114,    unit: "mmHg",     lab_range_low: null,  lab_range_high: null  },
    { test_id: t1.id, metric_key: "diastolic_bp",     value: 68,     unit: "mmHg",     lab_range_low: null,  lab_range_high: null  },
    { test_id: t1.id, metric_key: "heart_rate",       value: 51,     unit: "bpm",      lab_range_low: null,  lab_range_high: null  },
    { test_id: t1.id, metric_key: "weight_kg",        value: 67.9,   unit: "kg",       lab_range_low: null,  lab_range_high: null  },
    { test_id: t1.id, metric_key: "height_cm",        value: 181,    unit: "cm",       lab_range_low: null,  lab_range_high: null  },
    // Hematology
    { test_id: t1.id, metric_key: "haemoglobin",      value: 13.6,   unit: "g/dL",     lab_range_low: 13.0,  lab_range_high: 18.0  },
    { test_id: t1.id, metric_key: "rbc",              value: 4.41,   unit: "10¹²/L",   lab_range_low: 4.50,  lab_range_high: 6.20  },
    { test_id: t1.id, metric_key: "haematocrit",      value: 41.5,   unit: "%",        lab_range_low: 40.0,  lab_range_high: 54.0  },
    { test_id: t1.id, metric_key: "mcv",              value: 94.1,   unit: "fL",       lab_range_low: 81.0,  lab_range_high: 96.0  },
    { test_id: t1.id, metric_key: "wbc",              value: 8.29,   unit: "10⁹/L",    lab_range_low: 4.0,   lab_range_high: 10.0  },
    { test_id: t1.id, metric_key: "platelets",        value: 263,    unit: "10⁹/L",    lab_range_low: 150,   lab_range_high: 400   },
    // Inflammation
    { test_id: t1.id, metric_key: "esr",              value: 10,     unit: "mm/hr",    lab_range_low: 0,     lab_range_high: 15    },
    // Blood & Organ
    { test_id: t1.id, metric_key: "bilirubin",        value: 19.3,   unit: "µmol/L",   lab_range_low: null,  lab_range_high: 22.2  }, // 1.13 mg/dL × 17.1
    { test_id: t1.id, metric_key: "ast",              value: 16,     unit: "U/L",      lab_range_low: null,  lab_range_high: 40    },
    { test_id: t1.id, metric_key: "alt",              value: 14,     unit: "U/L",      lab_range_low: null,  lab_range_high: 41    },
    { test_id: t1.id, metric_key: "alp",              value: 54,     unit: "U/L",      lab_range_low: 53,    lab_range_high: 128   },
    { test_id: t1.id, metric_key: "ggt",              value: 9,      unit: "U/L",      lab_range_low: 8,     lab_range_high: 61    },
    { test_id: t1.id, metric_key: "urea",             value: 2.73,   unit: "mmol/L",   lab_range_low: 2.76,  lab_range_high: 8.07  }, // 16.40 mg/dL ÷ 6.006
    { test_id: t1.id, metric_key: "creatinine",       value: 90.2,   unit: "µmol/L",   lab_range_low: 59.2,  lab_range_high: 103.4 }, // 1.02 mg/dL × 88.4
    // Cardiovascular
    { test_id: t1.id, metric_key: "triglycerides",    value: 0.94,   unit: "mmol/L",   lab_range_low: null,  lab_range_high: 1.69  }, // 83 mg/dL × 0.01129
    { test_id: t1.id, metric_key: "total_cholesterol",value: 3.36,   unit: "mmol/L",   lab_range_low: null,  lab_range_high: 5.17  }, // 130 mg/dL × 0.02586
    { test_id: t1.id, metric_key: "hdl_c",            value: 1.14,   unit: "mmol/L",   lab_range_low: 1.03,  lab_range_high: null  }, // 44 mg/dL × 0.02586
    { test_id: t1.id, metric_key: "ldl_c",            value: 1.99,   unit: "mmol/L",   lab_range_low: null,  lab_range_high: 2.59  }, // 77 mg/dL × 0.02586
    // Metabolic
    { test_id: t1.id, metric_key: "fasting_glucose",  value: 5.38,   unit: "mmol/L",   lab_range_low: 3.89,  lab_range_high: 6.99  }, // 97 mg/dL × 0.05551
    { test_id: t1.id, metric_key: "uric_acid",        value: 303.3,  unit: "µmol/L",   lab_range_low: 202.2, lab_range_high: 416.4 }, // 5.1 mg/dL × 59.48
  ]);

  if (r1err) { console.error("Failed readings t1:", r1err); return; }
  console.log("✓ Test 1 seeded (26 Aug 2021):", t1.id);

  // ── Test 2: 17 Jul 2023 — Siloam Hospitals Denpasar ─────────────────────
  const { data: t2, error: e2 } = await supabase
    .from("tests")
    .insert({ date: "2023-07-17", lab_name: "Siloam Hospitals Denpasar", subject: "human", user_id: USER_ID })
    .select("id").single();

  if (e2 || !t2) { console.error("Failed test 2:", e2); return; }

  const { error: r2err } = await supabase.from("readings").insert([
    // Vitals
    { test_id: t2.id, metric_key: "systolic_bp",      value: 110,    unit: "mmHg",     lab_range_low: null,  lab_range_high: null  },
    { test_id: t2.id, metric_key: "diastolic_bp",     value: 60,     unit: "mmHg",     lab_range_low: null,  lab_range_high: null  },
    { test_id: t2.id, metric_key: "heart_rate",       value: 73,     unit: "bpm",      lab_range_low: null,  lab_range_high: null  },
    { test_id: t2.id, metric_key: "weight_kg",        value: 69,     unit: "kg",       lab_range_low: null,  lab_range_high: null  },
    { test_id: t2.id, metric_key: "height_cm",        value: 178,    unit: "cm",       lab_range_low: null,  lab_range_high: null  },
    // Hematology
    { test_id: t2.id, metric_key: "haemoglobin",      value: 14.5,   unit: "g/dL",     lab_range_low: 13.0,  lab_range_high: 18.0  },
    { test_id: t2.id, metric_key: "rbc",              value: 4.68,   unit: "10¹²/L",   lab_range_low: 4.50,  lab_range_high: 6.20  },
    { test_id: t2.id, metric_key: "haematocrit",      value: 43.3,   unit: "%",        lab_range_low: 40.0,  lab_range_high: 54.0  },
    { test_id: t2.id, metric_key: "mcv",              value: 92.5,   unit: "fL",       lab_range_low: 81.0,  lab_range_high: 96.0  },
    { test_id: t2.id, metric_key: "wbc",              value: 7.04,   unit: "10⁹/L",    lab_range_low: 4.0,   lab_range_high: 10.0  },
    { test_id: t2.id, metric_key: "platelets",        value: 222,    unit: "10⁹/L",    lab_range_low: 150,   lab_range_high: 400   },
    // Inflammation
    { test_id: t2.id, metric_key: "esr",              value: 2,      unit: "mm/hr",    lab_range_low: 0,     lab_range_high: 15    },
    // Blood & Organ
    { test_id: t2.id, metric_key: "bilirubin",        value: 11.97,  unit: "µmol/L",   lab_range_low: null,  lab_range_high: 22.2  }, // 0.70 mg/dL × 17.1
    { test_id: t2.id, metric_key: "ast",              value: 18,     unit: "U/L",      lab_range_low: null,  lab_range_high: 40    },
    { test_id: t2.id, metric_key: "alt",              value: 17,     unit: "U/L",      lab_range_low: null,  lab_range_high: 41    },
    { test_id: t2.id, metric_key: "alp",              value: 49,     unit: "U/L",      lab_range_low: 53,    lab_range_high: 128   },
    { test_id: t2.id, metric_key: "ggt",              value: 13,     unit: "U/L",      lab_range_low: 8,     lab_range_high: 61    },
    { test_id: t2.id, metric_key: "urea",             value: 3.85,   unit: "mmol/L",   lab_range_low: 2.76,  lab_range_high: 8.07  }, // 23.10 mg/dL ÷ 6.006
    { test_id: t2.id, metric_key: "creatinine",       value: 78.7,   unit: "µmol/L",   lab_range_low: 59.2,  lab_range_high: 103.4 }, // 0.89 mg/dL × 88.4
    // Cardiovascular
    { test_id: t2.id, metric_key: "triglycerides",    value: 1.06,   unit: "mmol/L",   lab_range_low: null,  lab_range_high: 1.69  }, // 94 mg/dL × 0.01129
    { test_id: t2.id, metric_key: "total_cholesterol",value: 4.09,   unit: "mmol/L",   lab_range_low: null,  lab_range_high: 5.17  }, // 158 mg/dL × 0.02586
    { test_id: t2.id, metric_key: "hdl_c",            value: 1.16,   unit: "mmol/L",   lab_range_low: 1.03,  lab_range_high: null  }, // 45 mg/dL × 0.02586
    { test_id: t2.id, metric_key: "ldl_c",            value: 2.48,   unit: "mmol/L",   lab_range_low: null,  lab_range_high: 2.59  }, // 96 mg/dL × 0.02586
    // Metabolic
    { test_id: t2.id, metric_key: "fasting_glucose",  value: 5.61,   unit: "mmol/L",   lab_range_low: 3.89,  lab_range_high: 6.99  }, // 101 mg/dL × 0.05551
    { test_id: t2.id, metric_key: "uric_acid",        value: 327.1,  unit: "µmol/L",   lab_range_low: 202.2, lab_range_high: 416.4 }, // 5.5 mg/dL × 59.48
  ]);

  if (r2err) { console.error("Failed readings t2:", r2err); return; }
  console.log("✓ Test 2 seeded (17 Jul 2023):", t2.id);

  console.log("Done — 2 tests seeded for Torbjoern.");
}

seed();
