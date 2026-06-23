import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://cfybwyypcttazfinxhvz.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmeWJ3eXlwY3R0YXpmaW54aHZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0OTQzMzgsImV4cCI6MjA5NjA3MDMzOH0.vFhAGWfTRjzpieX3iujY3oM9InWIYITA0qSlTewl-2k"
);

async function seed() {
  // ── Test 1: Mar 12, 2021 — Sunset Vet Kuta (Hematology only) ──────────────
  const { data: t1, error: e1 } = await supabase
    .from("tests")
    .insert({ date: "2021-03-12", lab_name: "Sunset Vet Kuta", subject: "putih" })
    .select("id").single();

  if (e1 || !t1) { console.error("Failed test 1:", e1); return; }

  const { error: r1err } = await supabase.from("readings").insert([
    { test_id: t1.id, metric_key: "wbc",  value: 22.18, unit: "10⁹/L",  lab_range_low: 6.0,  lab_range_high: 17.0 },
    { test_id: t1.id, metric_key: "lym",  value: 3.05,  unit: "10⁹/L",  lab_range_low: 1.0,  lab_range_high: 4.8  },
    { test_id: t1.id, metric_key: "mon",  value: 1.63,  unit: "10⁹/L",  lab_range_low: 0.2,  lab_range_high: 1.5  },
    { test_id: t1.id, metric_key: "neu",  value: 15.03, unit: "10⁹/L",  lab_range_low: 3.0,  lab_range_high: 12.0 },
    { test_id: t1.id, metric_key: "eos",  value: 2.12,  unit: "10⁹/L",  lab_range_low: 0.0,  lab_range_high: 0.8  },
    { test_id: t1.id, metric_key: "bas",  value: 0.33,  unit: "10⁹/L",  lab_range_low: 0.0,  lab_range_high: 0.4  },
    { test_id: t1.id, metric_key: "rbc",  value: 7.53,  unit: "10¹²/L", lab_range_low: 5.5,  lab_range_high: 8.5  },
    { test_id: t1.id, metric_key: "hgb",  value: 14.6,  unit: "g/dL",   lab_range_low: 12.0, lab_range_high: 18.0 },
    { test_id: t1.id, metric_key: "hct",  value: 50.92, unit: "%",       lab_range_low: 37.0, lab_range_high: 55.0 },
    { test_id: t1.id, metric_key: "mcv",  value: 68,    unit: "fL",      lab_range_low: 60.0, lab_range_high: 77.0 },
    { test_id: t1.id, metric_key: "mch",  value: 19.4,  unit: "pg",      lab_range_low: 19.5, lab_range_high: 24.5 },
    { test_id: t1.id, metric_key: "mchc", value: 28.7,  unit: "g/dL",   lab_range_low: 31.0, lab_range_high: 39.0 },
    { test_id: t1.id, metric_key: "rdw",  value: 16.6,  unit: "%",       lab_range_low: 14.0, lab_range_high: 20.0 },
    { test_id: t1.id, metric_key: "plt",  value: 182,   unit: "10⁹/L",  lab_range_low: 165,  lab_range_high: 500  },
    { test_id: t1.id, metric_key: "mpv",  value: 9.7,   unit: "fL",      lab_range_low: 3.9,  lab_range_high: 11.1 },
  ]);
  if (r1err) { console.error("Failed readings test 1:", r1err); return; }
  console.log("✓ Test 1 seeded:", t1.id);

  // ── Test 2: Sep 21, 2024 — Chemistry + Hematology (Drh. Chris Nariasih) ──
  const { data: t2, error: e2 } = await supabase
    .from("tests")
    .insert({
      date: "2024-09-21",
      lab_name: "Drh. Chris Nariasih",
      notes: "Diagnosis: Chronic Liver Disease, Susp. Liver Edema, Hepatitis chronic. Comment: Eosinophilic.",
      subject: "putih",
    })
    .select("id").single();

  if (e2 || !t2) { console.error("Failed test 2:", e2); return; }

  const { error: r2err } = await supabase.from("readings").insert([
    // Chemistry
    { test_id: t2.id, metric_key: "alb",  value: 29,    unit: "g/L",     lab_range_low: 25,   lab_range_high: 44   },
    { test_id: t2.id, metric_key: "alp",  value: 74,    unit: "µ/L",     lab_range_low: 20,   lab_range_high: 150  },
    { test_id: t2.id, metric_key: "alt",  value: 2000,  unit: "µ/L",     lab_range_low: 10,   lab_range_high: 118, annotation: "Reported as >2000 on lab report" },
    { test_id: t2.id, metric_key: "amy",  value: 483,   unit: "µ/L",     lab_range_low: 200,  lab_range_high: 1200 },
    { test_id: t2.id, metric_key: "tbil", value: 5,     unit: "µmol/L",  lab_range_low: 2,    lab_range_high: 10   },
    { test_id: t2.id, metric_key: "bun",  value: 6.1,   unit: "mmol/L",  lab_range_low: 2.5,  lab_range_high: 8.9  },
    { test_id: t2.id, metric_key: "ca",   value: 2.53,  unit: "mmol/L",  lab_range_low: 2.15, lab_range_high: 2.95 },
    { test_id: t2.id, metric_key: "phos", value: 1.35,  unit: "mmol/L",  lab_range_low: 0.94, lab_range_high: 2.13 },
    { test_id: t2.id, metric_key: "cre",  value: 81,    unit: "µmol/L",  lab_range_low: 27,   lab_range_high: 124  },
    { test_id: t2.id, metric_key: "glu",  value: 4.4,   unit: "mmol/L",  lab_range_low: 3.3,  lab_range_high: 6.1  },
    { test_id: t2.id, metric_key: "na",   value: 143,   unit: "mmol/L",  lab_range_low: 138,  lab_range_high: 160  },
    { test_id: t2.id, metric_key: "k",    value: 3.9,   unit: "mmol/L",  lab_range_low: 3.7,  lab_range_high: 5.8  },
    { test_id: t2.id, metric_key: "tp",   value: 66,    unit: "g/L",     lab_range_low: 54,   lab_range_high: 82   },
    { test_id: t2.id, metric_key: "glob", value: 37,    unit: "g/L",     lab_range_low: 23,   lab_range_high: 52   },
    // Hematology
    { test_id: t2.id, metric_key: "wbc",  value: 15.95, unit: "10⁹/L",  lab_range_low: 6.0,  lab_range_high: 17.0 },
    { test_id: t2.id, metric_key: "lym",  value: 3.42,  unit: "10⁹/L",  lab_range_low: 1.0,  lab_range_high: 4.8  },
    { test_id: t2.id, metric_key: "mon",  value: 1.11,  unit: "10⁹/L",  lab_range_low: 0.2,  lab_range_high: 1.5  },
    { test_id: t2.id, metric_key: "neu",  value: 10.04, unit: "10⁹/L",  lab_range_low: 3.0,  lab_range_high: 12.0 },
    { test_id: t2.id, metric_key: "eos",  value: 1.36,  unit: "10⁹/L",  lab_range_low: 0.0,  lab_range_high: 0.8  },
    { test_id: t2.id, metric_key: "bas",  value: 0.02,  unit: "10⁹/L",  lab_range_low: 0.0,  lab_range_high: 0.4  },
    { test_id: t2.id, metric_key: "rbc",  value: 7.12,  unit: "10¹²/L", lab_range_low: 5.5,  lab_range_high: 8.5  },
    { test_id: t2.id, metric_key: "hgb",  value: 15.6,  unit: "g/dL",   lab_range_low: 12.0, lab_range_high: 18.0 },
    { test_id: t2.id, metric_key: "hct",  value: 40.6,  unit: "%",       lab_range_low: 37.0, lab_range_high: 55.0 },
    { test_id: t2.id, metric_key: "mcv",  value: 57.1,  unit: "fL",      lab_range_low: 60,   lab_range_high: 77   },
    { test_id: t2.id, metric_key: "mch",  value: 21.9,  unit: "pg",      lab_range_low: 19.5, lab_range_high: 24.5 },
    { test_id: t2.id, metric_key: "mchc", value: 38.4,  unit: "g/dL",   lab_range_low: 31.0, lab_range_high: 39.0 },
    { test_id: t2.id, metric_key: "rdw",  value: 17.4,  unit: "%",       lab_range_low: 14.0, lab_range_high: 20.0 },
    { test_id: t2.id, metric_key: "plt",  value: 298,   unit: "10⁹/L",  lab_range_low: 165,  lab_range_high: 500  },
    { test_id: t2.id, metric_key: "mpv",  value: 10.6,  unit: "fL",      lab_range_low: 3.9,  lab_range_high: 11.1 },
  ]);
  if (r2err) { console.error("Failed readings test 2:", r2err); return; }
  console.log("✓ Test 2 seeded:", t2.id);

  console.log("Done — 2 tests seeded for Putih.");
}

seed();
