import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://cfybwyypcttazfinxhvz.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmeWJ3eXlwY3R0YXpmaW54aHZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0OTQzMzgsImV4cCI6MjA5NjA3MDMzOH0.vFhAGWfTRjzpieX3iujY3oM9InWIYITA0qSlTewl-2k"
);

async function seed() {
  // ── Test 3: Nov 6, 2023 — Semer Vet Care (Hematology + Chemistry) ─────────
  // Chemistry values converted to catalog units (g/dL→g/L, mg/dL→mmol/L or µmol/L)
  const { data: t3, error: e3 } = await supabase
    .from("tests")
    .insert({
      date: "2023-11-06",
      lab_name: "Semer Vet Care",
      notes: "Inpatient — chemotherapy period.",
      subject: "putih",
    })
    .select("id").single();

  if (e3 || !t3) { console.error("Failed test 3:", e3); return; }

  const { error: r3err } = await supabase.from("readings").insert([
    // Hematology
    { test_id: t3.id, metric_key: "wbc",  value: 8.26,  unit: "10⁹/L",  lab_range_low: 6.0,  lab_range_high: 17.0 },
    { test_id: t3.id, metric_key: "lym",  value: 1.74,  unit: "10⁹/L",  lab_range_low: 1.0,  lab_range_high: 4.8  },
    { test_id: t3.id, metric_key: "mon",  value: 0.18,  unit: "10⁹/L",  lab_range_low: 0.2,  lab_range_high: 1.5  },
    { test_id: t3.id, metric_key: "neu",  value: 6.24,  unit: "10⁹/L",  lab_range_low: 3.0,  lab_range_high: 12.0 },
    { test_id: t3.id, metric_key: "eos",  value: 0.08,  unit: "10⁹/L",  lab_range_low: 0.0,  lab_range_high: 0.8  },
    { test_id: t3.id, metric_key: "bas",  value: 0.03,  unit: "10⁹/L",  lab_range_low: 0.0,  lab_range_high: 0.4  },
    { test_id: t3.id, metric_key: "rbc",  value: 8.93,  unit: "10¹²/L", lab_range_low: 5.5,  lab_range_high: 8.5  },
    { test_id: t3.id, metric_key: "hgb",  value: 19.2,  unit: "g/dL",   lab_range_low: 12.0, lab_range_high: 18.0 },
    { test_id: t3.id, metric_key: "hct",  value: 55.43, unit: "%",       lab_range_low: 37.0, lab_range_high: 55.0 },
    { test_id: t3.id, metric_key: "mcv",  value: 62,    unit: "fL",      lab_range_low: 60.0, lab_range_high: 77.0 },
    { test_id: t3.id, metric_key: "mch",  value: 21.6,  unit: "pg",      lab_range_low: 19.5, lab_range_high: 24.5 },
    { test_id: t3.id, metric_key: "mchc", value: 34.7,  unit: "g/dL",   lab_range_low: 31.0, lab_range_high: 39.0 },
    { test_id: t3.id, metric_key: "rdw",  value: 16.6,  unit: "%",       lab_range_low: 14.0, lab_range_high: 20.0 },
    { test_id: t3.id, metric_key: "plt",  value: 294,   unit: "10⁹/L",  lab_range_low: 165,  lab_range_high: 500  },
    { test_id: t3.id, metric_key: "mpv",  value: 10.8,  unit: "fL",      lab_range_low: 3.9,  lab_range_high: 11.1 },
    // Chemistry — converted to catalog units
    { test_id: t3.id, metric_key: "alb",  value: 43,    unit: "g/L",     lab_range_low: 25,   lab_range_high: 44   }, // 4.3 g/dL → 43 g/L
    { test_id: t3.id, metric_key: "alp",  value: 32,    unit: "µ/L",     lab_range_low: 20,   lab_range_high: 150  },
    { test_id: t3.id, metric_key: "alt",  value: 27,    unit: "µ/L",     lab_range_low: 10,   lab_range_high: 118  },
    { test_id: t3.id, metric_key: "amy",  value: 336,   unit: "µ/L",     lab_range_low: 200,  lab_range_high: 1200 },
    { test_id: t3.id, metric_key: "tbil", value: 6.84,  unit: "µmol/L",  lab_range_low: 1.7,  lab_range_high: 10.3 }, // 0.4 mg/dL → 6.84 µmol/L
    { test_id: t3.id, metric_key: "bun",  value: 2.86,  unit: "mmol/L",  lab_range_low: 2.5,  lab_range_high: 8.9  }, // 8 mg/dL → 2.86 mmol/L
    { test_id: t3.id, metric_key: "ca",   value: 2.73,  unit: "mmol/L",  lab_range_low: 2.15, lab_range_high: 2.95 }, // 10.9 mg/dL → 2.73 mmol/L
    { test_id: t3.id, metric_key: "phos", value: 1.36,  unit: "mmol/L",  lab_range_low: 0.94, lab_range_high: 2.13 }, // 4.2 mg/dL → 1.36 mmol/L
    { test_id: t3.id, metric_key: "cre",  value: 97.2,  unit: "µmol/L",  lab_range_low: 27,   lab_range_high: 124  }, // 1.1 mg/dL → 97.2 µmol/L
    { test_id: t3.id, metric_key: "glu",  value: 4.72,  unit: "mmol/L",  lab_range_low: 3.3,  lab_range_high: 6.1  }, // 85 mg/dL → 4.72 mmol/L
    { test_id: t3.id, metric_key: "na",   value: 133,   unit: "mmol/L",  lab_range_low: 138,  lab_range_high: 160  },
    { test_id: t3.id, metric_key: "k",    value: 4.5,   unit: "mmol/L",  lab_range_low: 3.7,  lab_range_high: 5.8  },
    { test_id: t3.id, metric_key: "tp",   value: 83,    unit: "g/L",     lab_range_low: 54,   lab_range_high: 82   }, // 8.3 g/dL → 83 g/L
    { test_id: t3.id, metric_key: "glob", value: 40,    unit: "g/L",     lab_range_low: 23,   lab_range_high: 52   }, // 4.0 g/dL → 40 g/L
  ]);
  if (r3err) { console.error("Failed readings test 3:", r3err); return; }
  console.log("✓ Test 3 seeded (Nov 2023 Semer Vet Care):", t3.id);

  // ── Test 4: Apr 2, 2026 — Medivet Hospital Cikajang / IDEXX ───────────────
  const { data: t4, error: e4 } = await supabase
    .from("tests")
    .insert({
      date: "2026-04-02",
      lab_name: "Medivet Hospital Cikajang (IDEXX)",
      notes: "Vet: drh Felix Kurniadi. Notes: PLT aggregates detected — actual platelet count may be higher. Low Retic-HGB suggests decreased iron availability.",
      subject: "putih",
    })
    .select("id").single();

  if (e4 || !t4) { console.error("Failed test 4:", e4); return; }

  const { error: r4err } = await supabase.from("readings").insert([
    // Hematology (K/µL = 10^9/L, M/µL = 10^12/L)
    { test_id: t4.id, metric_key: "rbc",  value: 6.85,  unit: "10¹²/L", lab_range_low: 5.65, lab_range_high: 8.87  },
    { test_id: t4.id, metric_key: "hct",  value: 43.4,  unit: "%",       lab_range_low: 37.3, lab_range_high: 61.7  },
    { test_id: t4.id, metric_key: "hgb",  value: 14.4,  unit: "g/dL",   lab_range_low: 13.1, lab_range_high: 20.5  },
    { test_id: t4.id, metric_key: "mcv",  value: 63.4,  unit: "fL",      lab_range_low: 61.6, lab_range_high: 73.5  },
    { test_id: t4.id, metric_key: "mch",  value: 21.0,  unit: "pg",      lab_range_low: 21.2, lab_range_high: 25.9  },
    { test_id: t4.id, metric_key: "mchc", value: 33.2,  unit: "g/dL",   lab_range_low: 32.0, lab_range_high: 37.9  },
    { test_id: t4.id, metric_key: "rdw",  value: 14.5,  unit: "%",       lab_range_low: 13.6, lab_range_high: 21.7  },
    { test_id: t4.id, metric_key: "wbc",  value: 13.33, unit: "10⁹/L",  lab_range_low: 5.05, lab_range_high: 16.76 },
    { test_id: t4.id, metric_key: "neu",  value: 7.99,  unit: "10⁹/L",  lab_range_low: 2.95, lab_range_high: 11.64 },
    { test_id: t4.id, metric_key: "lym",  value: 2.72,  unit: "10⁹/L",  lab_range_low: 1.05, lab_range_high: 5.10  },
    { test_id: t4.id, metric_key: "mon",  value: 0.50,  unit: "10⁹/L",  lab_range_low: 0.16, lab_range_high: 1.12  },
    { test_id: t4.id, metric_key: "eos",  value: 2.10,  unit: "10⁹/L",  lab_range_low: 0.06, lab_range_high: 1.23  },
    { test_id: t4.id, metric_key: "bas",  value: 0.02,  unit: "10⁹/L",  lab_range_low: 0.00, lab_range_high: 0.10  },
    { test_id: t4.id, metric_key: "plt",  value: 235,   unit: "10⁹/L",  lab_range_low: 148,  lab_range_high: 484   },
    { test_id: t4.id, metric_key: "mpv",  value: 11.3,  unit: "fL",      lab_range_low: 8.7,  lab_range_high: 13.2  },
    // Chemistry — converted to catalog units
    { test_id: t4.id, metric_key: "glu",  value: 3.55,  unit: "mmol/L",  lab_range_low: 3.89, lab_range_high: 7.94  }, // 64 mg/dL → 3.55 mmol/L
    { test_id: t4.id, metric_key: "cre",  value: 97.2,  unit: "µmol/L",  lab_range_low: 44.2, lab_range_high: 159.1 }, // 1.1 mg/dL → 97.2 µmol/L
    { test_id: t4.id, metric_key: "bun",  value: 6.07,  unit: "mmol/L",  lab_range_low: 2.5,  lab_range_high: 9.64  }, // 17 mg/dL → 6.07 mmol/L
    { test_id: t4.id, metric_key: "tp",   value: 69,    unit: "g/L",     lab_range_low: 52,   lab_range_high: 82    }, // 6.9 g/dL → 69 g/L
    { test_id: t4.id, metric_key: "alb",  value: 31,    unit: "g/L",     lab_range_low: 22,   lab_range_high: 39    }, // 3.1 g/dL → 31 g/L
    { test_id: t4.id, metric_key: "glob", value: 38,    unit: "g/L",     lab_range_low: 25,   lab_range_high: 45    }, // 3.8 g/dL → 38 g/L
    { test_id: t4.id, metric_key: "alt",  value: 35,    unit: "µ/L",     lab_range_low: 10,   lab_range_high: 125   },
    { test_id: t4.id, metric_key: "alp",  value: 28,    unit: "µ/L",     lab_range_low: 23,   lab_range_high: 212   },
  ]);
  if (r4err) { console.error("Failed readings test 4:", r4err); return; }
  console.log("✓ Test 4 seeded (Apr 2026 Medivet/IDEXX):", t4.id);

  console.log("Done — 2 additional tests seeded for Putih.");
}

seed();
