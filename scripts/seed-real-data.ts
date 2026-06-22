/**
 * Real data ingestion script — KA health records
 *
 * Sources (chronological):
 *   1. Siloam Hospitals,    01-07-2023  (KA_MCU_2023_07.pdf)
 *   2. Prodia Tabanan,      02-05-2024  (KA_MCU_2024_06.pdf — actual date 02-05-2024)
 *   3. Prodia Tabanan,      04-09-2024  (KA_MCU_2024_09.pdf)
 *   4. Siloam MRCCC,        11-03-2026  (MCU_KA_2026_03.pdf)
 *
 * CANONICAL UNITS (Siloam standard):
 *   Lipids, ApoB, glucose, creatinine, uric acid, bilirubin → mg/dL
 *   HbA1c → % (NGSP)
 *   Haemoglobin, MCHC → g/dL
 *   Free T3, Free T4 → pmol/L  |  TSH → uIU/mL
 *
 * Prodia Sep 2024 values that differ are converted TO canonical units here.
 * All other reports already use canonical units.
 *
 * attention_state is computed from METRIC_CATALOG bands via computeStatusBadge().
 * Unscored metrics (Tier L) get null.
 *
 * Run with: npx tsx scripts/seed-real-data.ts
 *
 * ⚠️  This script CLEARS all existing tests + readings before inserting.
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";
import { METRIC_CATALOG, computeStatusBadge } from "../lib/metrics";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ─── Unit conversion helpers (Prodia Sep 2024 → canonical) ───────────────────
const mmol_to_mgdl_lipid   = (v: number) => +(v * 38.67).toFixed(1);
const mmol_to_mgdl_tg      = (v: number) => +(v * 88.57).toFixed(1);
const mmol_to_mgdl_glucose = (v: number) => +(v * 18.02).toFixed(1);
const gl_to_gdl            = (v: number) => +(v / 10).toFixed(2);
const umol_to_mgdl_creat   = (v: number) => +(v / 88.42).toFixed(2);
const umol_to_mgdl_uric    = (v: number) => +(v / 59.48).toFixed(2);
const pgml_to_pmol_t3      = (v: number) => +(v / 0.6512).toFixed(2);
const ngdl_to_pmol_t4      = (v: number) => +(v / 0.07772).toFixed(2);

// ─── Badge helper ─────────────────────────────────────────────────────────────
function badge(metricKey: string, value: number): string | null {
  const meta = METRIC_CATALOG[metricKey];
  if (!meta) return null;
  return computeStatusBadge(value, meta);
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {

  // ── Clear existing data ────────────────────────────────────────────────────
  console.log("── Clearing existing data ──");
  const { error: delReadings } = await supabase.from("readings").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (delReadings) { console.error("Failed to clear readings:", delReadings); return; }
  const { error: delTests } = await supabase.from("tests").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (delTests) { console.error("Failed to clear tests:", delTests); return; }
  console.log("✓ Cleared existing tests and readings\n");


  // ══════════════════════════════════════════════════════════════════════════════
  // TEST 1 — Siloam Hospitals, 01 Jul 2023
  // All values in canonical units. No ApoB, HbA1c, thyroid or hs-CRP in this report.
  // ══════════════════════════════════════════════════════════════════════════════

  console.log("── Inserting Test 1: Siloam Hospitals, 2023-07-01 ──");

  const { data: test1, error: t1err } = await supabase
    .from("tests")
    .insert({
      date:     "2023-07-01",
      lab_name: "Siloam Hospitals",
      notes:    "MCU July 2023. No ApoB, HbA1c, or thyroid panel in this report.",
    })
    .select()
    .single();

  if (t1err || !test1) { console.error("Failed to insert test 1:", t1err); return; }
  console.log("Test 1 created:", test1.id);

  const t1rows = [
    // ── Vitals ───────────────────────────────────────────────────────────────
    { metric_key: "systolic_bp",  value: 112,   unit: "mmHg",          lab_range_low: null, lab_range_high: 140 },
    { metric_key: "diastolic_bp", value: 76,    unit: "mmHg",          lab_range_low: null, lab_range_high: 90 },
    { metric_key: "heart_rate",   value: 87,    unit: "bpm",           lab_range_low: 60,   lab_range_high: 100 },
    { metric_key: "weight_kg",    value: 72.1,  unit: "kg",            lab_range_low: null, lab_range_high: null },
    { metric_key: "height_cm",    value: 170,   unit: "cm",            lab_range_low: null, lab_range_high: null },
    { metric_key: "bmi",          value: 24.95, unit: "kg/m²",         lab_range_low: 18.5, lab_range_high: 29.9 },
    // ── Haematology (Tier L — unscored) ─────────────────────────────────────
    { metric_key: "haemoglobin",  value: 15.0,  unit: "g/dL",          lab_range_low: 13.0, lab_range_high: 18.0 },
    { metric_key: "haematocrit",  value: 44.1,  unit: "%",             lab_range_low: 40.0, lab_range_high: 54.0 },
    { metric_key: "rbc",          value: 4.92,  unit: "10¹²/L",        lab_range_low: 4.50, lab_range_high: 6.20 },
    { metric_key: "mcv",          value: 89.6,  unit: "fL",            lab_range_low: 81.0, lab_range_high: 96.0 },
    { metric_key: "mch",          value: 30.5,  unit: "pg",            lab_range_low: 27.0, lab_range_high: 36.0 },
    { metric_key: "mchc",         value: 34.0,  unit: "g/dL",          lab_range_low: 31.0, lab_range_high: 37.0 },
    { metric_key: "rdw_cv",       value: 11.7,  unit: "%",             lab_range_low: 11.0, lab_range_high: 16.0 },
    { metric_key: "platelets",    value: 210,   unit: "10⁹/L",         lab_range_low: 150,  lab_range_high: 400 },
    { metric_key: "wbc",          value: 3.70,  unit: "10⁹/L",         lab_range_low: 4.0,  lab_range_high: 10.0 },
    // ── Inflammation ────────────────────────────────────────────────────────
    { metric_key: "esr",          value: 10,    unit: "mm/hr",         lab_range_low: 0,    lab_range_high: 15 },
    // ── Liver ───────────────────────────────────────────────────────────────
    { metric_key: "ast",          value: 17,    unit: "U/L",           lab_range_low: null, lab_range_high: 40 },
    { metric_key: "alt",          value: 13,    unit: "U/L",           lab_range_low: null, lab_range_high: 41 },
    { metric_key: "ggt",          value: 23,    unit: "U/L",           lab_range_low: 8,    lab_range_high: 61 },
    // ── Metabolic ───────────────────────────────────────────────────────────
    { metric_key: "fasting_glucose", value: 95, unit: "mg/dL",         lab_range_low: 70,   lab_range_high: 126 },
    // ── Cardiovascular ──────────────────────────────────────────────────────
    { metric_key: "total_cholesterol", value: 305, unit: "mg/dL",      lab_range_low: null, lab_range_high: 200 },
    { metric_key: "ldl_c",        value: 206,   unit: "mg/dL",         lab_range_low: null, lab_range_high: 100 },
    { metric_key: "hdl_c",        value: 64,    unit: "mg/dL",         lab_range_low: 40,   lab_range_high: null },
    { metric_key: "triglycerides", value: 130,  unit: "mg/dL",         lab_range_low: null, lab_range_high: 150 },
    { metric_key: "tg_hdl_ratio", value: +(130 / 64).toFixed(3), unit: "", lab_range_low: null, lab_range_high: null },
    // ── Renal ───────────────────────────────────────────────────────────────
    { metric_key: "creatinine",   value: 1.02,  unit: "mg/dL",         lab_range_low: 0.67, lab_range_high: 1.17 },
    { metric_key: "uric_acid",    value: 7.6,   unit: "mg/dL",         lab_range_low: 3.4,  lab_range_high: 7.0 },
    // ── Bilirubin (Tier L) ───────────────────────────────────────────────────
    { metric_key: "bilirubin_total",    value: 1.09, unit: "mg/dL",    lab_range_low: null, lab_range_high: 1.3 },
    { metric_key: "bilirubin_direct",   value: 0.29, unit: "mg/dL",    lab_range_low: null, lab_range_high: 0.3 },
    { metric_key: "bilirubin_indirect", value: 0.80, unit: "mg/dL",    lab_range_low: 0.0,  lab_range_high: 0.70 },
  ].map(r => ({ ...r, test_id: test1.id, attention_state: badge(r.metric_key, r.value) }));

  const { error: r1err } = await supabase.from("readings").insert(t1rows);
  if (r1err) { console.error("Failed to insert readings for test 1:", r1err); return; }
  console.log(`✓ Inserted ${t1rows.length} readings for Siloam 2023-07-01\n`);


  // ══════════════════════════════════════════════════════════════════════════════
  // TEST 2 — Prodia Tabanan, 02 May 2024
  // Reg No. 2404300003. Specimen collected 02-05-2024.
  // All values already in canonical units (mg/dL for lipids/glucose, g/dL for Hb).
  // APOE genotype: e2/e3 — low CVD risk, not Alzheimer's-associated.
  // ══════════════════════════════════════════════════════════════════════════════

  console.log("── Inserting Test 2: Prodia Tabanan, 2024-05-02 ──");

  const { data: test2, error: t2err } = await supabase
    .from("tests")
    .insert({
      date:     "2024-05-02",
      lab_name: "Prodia Tabanan",
      notes:    "Reg No. 2404300003. Specimen collected 02-05-2024 09:48. APOE genotype: e2/e3 — low cardiovascular disease risk, not associated with increased Alzheimer's risk.",
    })
    .select()
    .single();

  if (t2err || !test2) { console.error("Failed to insert test 2:", t2err); return; }
  console.log("Test 2 created:", test2.id);

  const t2rows = [
    // ── Haematology (Tier L — unscored) ─────────────────────────────────────
    { metric_key: "haemoglobin",  value: 14.6,   unit: "g/dL",          lab_range_low: 13.2, lab_range_high: 17.3 },
    { metric_key: "haematocrit",  value: 43.0,   unit: "%",             lab_range_low: 40,   lab_range_high: 52 },
    { metric_key: "rbc",          value: 4.82,   unit: "10¹²/L",        lab_range_low: 4.4,  lab_range_high: 5.9 },
    { metric_key: "mcv",          value: 89.2,   unit: "fL",            lab_range_low: 80,   lab_range_high: 100 },
    { metric_key: "mch",          value: 30.3,   unit: "pg",            lab_range_low: 26,   lab_range_high: 34 },
    { metric_key: "mchc",         value: 34.0,   unit: "g/dL",          lab_range_low: 32.0, lab_range_high: 36.0 },
    { metric_key: "rdw_cv",       value: 12.1,   unit: "%",             lab_range_low: 11.5, lab_range_high: 14.5 },
    { metric_key: "platelets",    value: 218,    unit: "10⁹/L",         lab_range_low: 150,  lab_range_high: 440 },
    { metric_key: "wbc",          value: 3.45,   unit: "10⁹/L",         lab_range_low: 3.8,  lab_range_high: 10.6 },
    // ── Inflammation ────────────────────────────────────────────────────────
    { metric_key: "esr",          value: 4,      unit: "mm/hr",         lab_range_low: 0,    lab_range_high: 15 },
    // ── Liver ───────────────────────────────────────────────────────────────
    { metric_key: "ast",          value: 19.1,   unit: "U/L",           lab_range_low: null, lab_range_high: 33 },
    { metric_key: "alt",          value: 25.4,   unit: "U/L",           lab_range_low: null, lab_range_high: 50 },
    { metric_key: "ggt",          value: 21.0,   unit: "U/L",           lab_range_low: null, lab_range_high: 66 },
    // ── Metabolic ───────────────────────────────────────────────────────────
    { metric_key: "fasting_glucose", value: 97.25, unit: "mg/dL",       lab_range_low: null, lab_range_high: 100 },
    { metric_key: "hba1c",        value: 5.5,    unit: "%",             lab_range_low: null, lab_range_high: 5.7 },
    // ── Cardiovascular (all already in mg/dL) ───────────────────────────────
    { metric_key: "total_cholesterol", value: 340,   unit: "mg/dL",     lab_range_low: null, lab_range_high: 200 },
    { metric_key: "ldl_c",        value: 223.6,  unit: "mg/dL",         lab_range_low: null, lab_range_high: 100 },
    { metric_key: "hdl_c",        value: 60.3,   unit: "mg/dL",         lab_range_low: 40,   lab_range_high: null },
    { metric_key: "triglycerides", value: 56,    unit: "mg/dL",         lab_range_low: null, lab_range_high: 150 },
    { metric_key: "apob",         value: 162,    unit: "mg/dL",         lab_range_low: 66,   lab_range_high: 133 },
    { metric_key: "tg_hdl_ratio", value: +(56 / 60.3).toFixed(3), unit: "", lab_range_low: null, lab_range_high: null },
    { metric_key: "lp_a",         value: 12.5,   unit: "mg/dL",         lab_range_low: null, lab_range_high: 20 },
    // ── Renal ───────────────────────────────────────────────────────────────
    { metric_key: "creatinine",   value: 0.96,   unit: "mg/dL",         lab_range_low: 0.70, lab_range_high: 1.20 },
    { metric_key: "egfr",         value: 99.2,   unit: "mL/min/1.73m²", lab_range_low: 60,   lab_range_high: null },
    { metric_key: "uric_acid",    value: 7.02,   unit: "mg/dL",         lab_range_low: null, lab_range_high: 7.0 },
    // ── Gut microbiome (Tier L) ──────────────────────────────────────────────
    { metric_key: "scfa_total",         value: 6,    unit: "mg/mL",     lab_range_low: 4,    lab_range_high: 18 },
    { metric_key: "butyric_acid_abs",   value: 1.1,  unit: "mg/mL",     lab_range_low: 0.8,  lab_range_high: 4.8 },
    { metric_key: "butyric_acid_pct",   value: 14.0, unit: "%",         lab_range_low: 9,    lab_range_high: 37 },
    { metric_key: "acetic_acid_pct",    value: 61,   unit: "%",         lab_range_low: 40,   lab_range_high: 75 },
    { metric_key: "propionic_acid_pct", value: 18,   unit: "%",         lab_range_low: 9,    lab_range_high: 29 },
  ].map(r => ({ ...r, test_id: test2.id, attention_state: badge(r.metric_key, r.value) }));

  const { error: r2err } = await supabase.from("readings").insert(t2rows);
  if (r2err) { console.error("Failed to insert readings for test 2:", r2err); return; }
  console.log(`✓ Inserted ${t2rows.length} readings for Prodia 2024-05-02\n`);


  // ══════════════════════════════════════════════════════════════════════════════
  // TEST 3 — Prodia Tabanan, 04 Sep 2024
  // Reg No. 2409040036. Specimen collected 07-09-2024 08:43.
  // Prodia uses mmol/L for lipids/glucose, g/L for Hb/MCHC, μmol/L for creatinine/uric acid.
  // All converted to canonical units below.
  // ══════════════════════════════════════════════════════════════════════════════

  console.log("── Inserting Test 3: Prodia Tabanan, 2024-09-04 ──");

  const { data: test3, error: t3err } = await supabase
    .from("tests")
    .insert({
      date:     "2024-09-04",
      lab_name: "Prodia Tabanan",
      notes:    "Reg No. 2409040036. Specimen collected 07-09-2024 08:43. Gut microbiome panel included.",
    })
    .select()
    .single();

  if (t3err || !test3) { console.error("Failed to insert test 3:", t3err); return; }
  console.log("Test 3 created:", test3.id);

  const t3rows = [
    // ── Haematology (Tier L — unscored) ─────────────────────────────────────
    { metric_key: "haemoglobin",  value: gl_to_gdl(150),              unit: "g/dL",      original_value: 150,  original_unit: "g/L",    lab_range_low: 13.2, lab_range_high: 17.3 },
    { metric_key: "haematocrit",  value: 44.6,                         unit: "%",         lab_range_low: 40,   lab_range_high: 52 },
    { metric_key: "rbc",          value: 5.03,                         unit: "10¹²/L",    lab_range_low: 4.4,  lab_range_high: 5.9 },
    { metric_key: "mcv",          value: 88.7,                         unit: "fL",        lab_range_low: 80,   lab_range_high: 100 },
    { metric_key: "mch",          value: 29.8,                         unit: "pg",        lab_range_low: 26,   lab_range_high: 34 },
    { metric_key: "mchc",         value: gl_to_gdl(336),               unit: "g/dL",      original_value: 336, original_unit: "g/L",    lab_range_low: 32.0, lab_range_high: 36.0 },
    { metric_key: "rdw_cv",       value: 11.6,                         unit: "%",         lab_range_low: 11.5, lab_range_high: 14.5 },
    { metric_key: "platelets",    value: 199,                          unit: "10⁹/L",     lab_range_low: 150,  lab_range_high: 440 },
    { metric_key: "wbc",          value: 6.8,                          unit: "10⁹/L",     lab_range_low: 3.8,  lab_range_high: 10.6 },
    // ── Inflammation ────────────────────────────────────────────────────────
    { metric_key: "esr",          value: 15,                           unit: "mm/hr",     lab_range_low: 0,    lab_range_high: 15 },
    // ── Liver ───────────────────────────────────────────────────────────────
    { metric_key: "ast",          value: 19.6,                         unit: "U/L",       lab_range_low: null, lab_range_high: 33 },
    { metric_key: "alt",          value: 22.7,                         unit: "U/L",       lab_range_low: null, lab_range_high: 50 },
    { metric_key: "ggt",          value: 24.0,                         unit: "U/L",       lab_range_low: null, lab_range_high: 66 },
    // ── Metabolic ───────────────────────────────────────────────────────────
    { metric_key: "fasting_glucose", value: mmol_to_mgdl_glucose(4.6), unit: "mg/dL",    original_value: 4.6, original_unit: "mmol/L", lab_range_low: null, lab_range_high: 100 },
    { metric_key: "hba1c",        value: 5.3,                          unit: "%",         lab_range_low: null, lab_range_high: 5.7 },
    // ── Cardiovascular ──────────────────────────────────────────────────────
    { metric_key: "total_cholesterol", value: mmol_to_mgdl_lipid(8.57), unit: "mg/dL",   original_value: 8.57, original_unit: "mmol/L", lab_range_low: null, lab_range_high: 200 },
    { metric_key: "ldl_c",        value: mmol_to_mgdl_lipid(6.22),     unit: "mg/dL",    original_value: 6.22, original_unit: "mmol/L", lab_range_low: null, lab_range_high: 100 },
    { metric_key: "hdl_c",        value: mmol_to_mgdl_lipid(1.72),     unit: "mg/dL",    original_value: 1.72, original_unit: "mmol/L", lab_range_low: 40,   lab_range_high: null },
    { metric_key: "triglycerides", value: mmol_to_mgdl_tg(0.59),       unit: "mg/dL",    original_value: 0.59, original_unit: "mmol/L", lab_range_low: null, lab_range_high: 150 },
    { metric_key: "apob",         value: 160,                          unit: "mg/dL",     original_value: 1.60, original_unit: "g/L",    lab_range_low: 66,   lab_range_high: 133 },
    { metric_key: "tg_hdl_ratio", value: +(mmol_to_mgdl_tg(0.59) / mmol_to_mgdl_lipid(1.72)).toFixed(3), unit: "", lab_range_low: null, lab_range_high: null },
    // ── Renal ───────────────────────────────────────────────────────────────
    { metric_key: "creatinine",   value: umol_to_mgdl_creat(101.7),    unit: "mg/dL",    original_value: 101.7, original_unit: "μmol/L", lab_range_low: 0.70, lab_range_high: 1.20 },
    { metric_key: "egfr",         value: 79,                           unit: "mL/min/1.73m²", lab_range_low: 60, lab_range_high: null },
    { metric_key: "uric_acid",    value: umol_to_mgdl_uric(437.92),    unit: "mg/dL",    original_value: 437.92, original_unit: "μmol/L", lab_range_low: null, lab_range_high: 7.0 },
    // ── Gut microbiome (Tier L) ──────────────────────────────────────────────
    { metric_key: "scfa_total",         value: 6,    unit: "mg/mL",    lab_range_low: 4,   lab_range_high: 18 },
    { metric_key: "butyric_acid_abs",   value: 1.2,  unit: "mg/mL",    lab_range_low: 0.8, lab_range_high: 4.8 },
    { metric_key: "butyric_acid_pct",   value: 17.0, unit: "%",        lab_range_low: 9,   lab_range_high: 37 },
    { metric_key: "acetic_acid_pct",    value: 60,   unit: "%",        lab_range_low: 40,  lab_range_high: 75 },
    { metric_key: "propionic_acid_pct", value: 16,   unit: "%",        lab_range_low: 9,   lab_range_high: 29 },
  ].map(r => ({ ...r, test_id: test3.id, attention_state: badge(r.metric_key, r.value) }));

  const { error: r3err } = await supabase.from("readings").insert(t3rows);
  if (r3err) { console.error("Failed to insert readings for test 3:", r3err); return; }
  console.log(`✓ Inserted ${t3rows.length} readings for Prodia 2024-09-04\n`);


  // ══════════════════════════════════════════════════════════════════════════════
  // TEST 4 — Siloam MRCCC, 11 Mar 2026
  // Appointment No. 1194371.
  // Lipid panel from image-only Lampiran page — values entered manually.
  // T3/T4 converted from pg/mL and ng/dL → pmol/L.
  // ══════════════════════════════════════════════════════════════════════════════

  console.log("── Inserting Test 4: Siloam MRCCC, 2026-03-11 ──");

  const { data: test4, error: t4err } = await supabase
    .from("tests")
    .insert({
      date:     "2026-03-11",
      lab_name: "Siloam MRCCC",
      notes:    "Appointment No. 1194371. Lipid panel from image-only Lampiran page — values entered manually. ECG: Suspect CAD Anterior. USG: Multiple cystic lesion both kidneys. ApoB 163 mg/dL.",
    })
    .select()
    .single();

  if (t4err || !test4) { console.error("Failed to insert test 4:", t4err); return; }
  console.log("Test 4 created:", test4.id);

  const t4rows = [
    // ── Vitals ───────────────────────────────────────────────────────────────
    { metric_key: "systolic_bp",  value: 130,   unit: "mmHg",          lab_range_low: null, lab_range_high: 140 },
    { metric_key: "diastolic_bp", value: 85,    unit: "mmHg",          lab_range_low: null, lab_range_high: 90 },
    { metric_key: "heart_rate",   value: 70,    unit: "bpm",           lab_range_low: 60,   lab_range_high: 100 },
    { metric_key: "weight_kg",    value: 74,    unit: "kg",            lab_range_low: null, lab_range_high: null },
    { metric_key: "height_cm",    value: 170.5, unit: "cm",            lab_range_low: null, lab_range_high: null },
    { metric_key: "bmi",          value: 25.46, unit: "kg/m²",         lab_range_low: 18.5, lab_range_high: 29.9 },
    { metric_key: "whr",          value: 0.86,  unit: "",              lab_range_low: null, lab_range_high: 0.90 },
    // ── Haematology (Tier L — unscored) ─────────────────────────────────────
    { metric_key: "haemoglobin",  value: 16.1,  unit: "g/dL",          lab_range_low: 13.2, lab_range_high: 17.3 },
    { metric_key: "haematocrit",  value: 47.2,  unit: "%",             lab_range_low: 40,   lab_range_high: 52 },
    { metric_key: "rbc",          value: 5.4,   unit: "10¹²/L",        lab_range_low: 4.4,  lab_range_high: 5.9 },
    { metric_key: "wbc",          value: 4.0,   unit: "10⁹/L",         lab_range_low: 3.8,  lab_range_high: 10.6 },
    { metric_key: "platelets",    value: 226,   unit: "10⁹/L",         lab_range_low: 150,  lab_range_high: 440 },
    { metric_key: "mcv",          value: 88.1,  unit: "fL",            lab_range_low: 80,   lab_range_high: 100 },
    { metric_key: "mch",          value: 30.0,  unit: "pg",            lab_range_low: 26,   lab_range_high: 34 },
    { metric_key: "mchc",         value: 34.1,  unit: "g/dL",          lab_range_low: 32.0, lab_range_high: 36.0 },
    { metric_key: "rdw_cv",       value: 11.6,  unit: "%",             lab_range_low: 11.6, lab_range_high: 14.4 },
    // ── Inflammation ────────────────────────────────────────────────────────
    { metric_key: "esr",          value: 2,     unit: "mm/hr",         lab_range_low: 0,    lab_range_high: 10 },
    { metric_key: "hs_crp",       value: 0.6,   unit: "mg/L",          lab_range_low: null, lab_range_high: 5.0 },
    // ── Liver / Bilirubin (Tier L) ───────────────────────────────────────────
    { metric_key: "bilirubin_total",    value: 1.5, unit: "mg/dL",     lab_range_low: 0.2,  lab_range_high: 1.2 },
    { metric_key: "bilirubin_direct",   value: 0.6, unit: "mg/dL",     lab_range_low: 0.0,  lab_range_high: 0.5 },
    { metric_key: "bilirubin_indirect", value: 0.9, unit: "mg/dL",     lab_range_low: 0.0,  lab_range_high: 0.7 },
    // ── Metabolic ───────────────────────────────────────────────────────────
    { metric_key: "fasting_glucose", value: 94, unit: "mg/dL",         lab_range_low: 70,   lab_range_high: 100 },
    { metric_key: "hba1c",        value: 5.6,   unit: "%",             lab_range_low: null, lab_range_high: 5.7 },
    { metric_key: "uric_acid",    value: 6.9,   unit: "mg/dL",         lab_range_low: 3.5,  lab_range_high: 7.2 },
    // ── Cardiovascular (from image-only Lampiran page) ───────────────────────
    { metric_key: "total_cholesterol", value: 339,   unit: "mg/dL",    lab_range_low: null, lab_range_high: 200 },
    { metric_key: "ldl_c",        value: 288,   unit: "mg/dL",         lab_range_low: null, lab_range_high: 100 },
    { metric_key: "hdl_c",        value: 64.9,  unit: "mg/dL",         lab_range_low: 40,   lab_range_high: null },
    { metric_key: "triglycerides", value: 69,   unit: "mg/dL",         lab_range_low: null, lab_range_high: 150 },
    { metric_key: "non_hdl_cholesterol", value: 274.1, unit: "mg/dL",  lab_range_low: null, lab_range_high: 130 },
    { metric_key: "apob",         value: 163,   unit: "mg/dL",         lab_range_low: null, lab_range_high: 133 },
    { metric_key: "tg_hdl_ratio", value: +(69 / 64.9).toFixed(3), unit: "", lab_range_low: null, lab_range_high: null },
    // ── Renal ───────────────────────────────────────────────────────────────
    { metric_key: "creatinine",   value: 1.03,  unit: "mg/dL",         lab_range_low: 0.67, lab_range_high: 1.17 },
    { metric_key: "egfr",         value: 94,    unit: "mL/min/1.73m²", lab_range_low: 60,   lab_range_high: null },
    // ── Hormonal ────────────────────────────────────────────────────────────
    { metric_key: "tsh",          value: 1.46,                          unit: "uIU/mL",  lab_range_low: 0.27, lab_range_high: 4.20 },
    { metric_key: "free_t3",      value: pgml_to_pmol_t3(2.42),         unit: "pmol/L",  original_value: 2.42, original_unit: "pg/mL", lab_range_low: pgml_to_pmol_t3(2.00), lab_range_high: pgml_to_pmol_t3(4.40) },
    { metric_key: "free_t4",      value: ngdl_to_pmol_t4(1.42),         unit: "pmol/L",  original_value: 1.42, original_unit: "ng/dL", lab_range_low: ngdl_to_pmol_t4(0.92), lab_range_high: ngdl_to_pmol_t4(1.68) },
    { metric_key: "psa_total",    value: 1.17,                          unit: "ng/mL",   lab_range_low: null, lab_range_high: 4.0 },
  ].map(r => ({ ...r, test_id: test4.id, attention_state: badge(r.metric_key, r.value) }));

  const { error: r4err } = await supabase.from("readings").insert(t4rows);
  if (r4err) { console.error("Failed to insert readings for test 4:", r4err); return; }
  console.log(`✓ Inserted ${t4rows.length} readings for Siloam 2026-03-11\n`);

  console.log(`✓ Inserted ${t4rows.length} readings for Siloam 2026-03-11\n`);


  // ══════════════════════════════════════════════════════════════════════════════
  // TEST 5 — Prodia Kebayoran, 09 Apr 2026
  // Targeted lipid/metabolic panel — experiment tracking post-intervention.
  // ══════════════════════════════════════════════════════════════════════════════

  console.log("── Inserting Test 5: Prodia Kebayoran, 2026-04-09 ──");

  const { data: test5, error: t5err } = await supabase
    .from("tests")
    .insert({
      date:     "2026-04-09",
      lab_name: "Prodia Kebayoran",
      notes:    "Targeted panel for experiment tracking. ~4 weeks post Siloam MRCCC.",
    })
    .select()
    .single();

  if (t5err || !test5) { console.error("Failed to insert test 5:", t5err); return; }
  console.log("Test 5 created:", test5.id);

  const t5rows = [
    // ── Cardiovascular ──────────────────────────────────────────────────────
    { metric_key: "total_cholesterol", value: 167,  unit: "mg/dL",     lab_range_low: null, lab_range_high: 200 },
    { metric_key: "ldl_c",        value: 73,    unit: "mg/dL",         lab_range_low: null, lab_range_high: 100 },
    { metric_key: "hdl_c",        value: 77,    unit: "mg/dL",         lab_range_low: 40,   lab_range_high: null },
    { metric_key: "triglycerides", value: 73,   unit: "mg/dL",         lab_range_low: null, lab_range_high: 150 },
    { metric_key: "apob",         value: 69,    unit: "mg/dL",         lab_range_low: null, lab_range_high: 133 },
    { metric_key: "tg_hdl_ratio", value: +(73 / 77).toFixed(3), unit: "", lab_range_low: null, lab_range_high: null },
    // ── Metabolic ───────────────────────────────────────────────────────────
    { metric_key: "fasting_glucose", value: 97, unit: "mg/dL",         lab_range_low: null, lab_range_high: 100 },
    // ── Liver ───────────────────────────────────────────────────────────────
    { metric_key: "ast",          value: 25,    unit: "U/L",           lab_range_low: null, lab_range_high: 33 },
  ].map(r => ({ ...r, test_id: test5.id, attention_state: badge(r.metric_key, r.value) }));

  const { error: r5err } = await supabase.from("readings").insert(t5rows);
  if (r5err) { console.error("Failed to insert readings for test 5:", r5err); return; }
  console.log(`✓ Inserted ${t5rows.length} readings for Prodia Kebayoran 2026-04-09\n`);


  // ══════════════════════════════════════════════════════════════════════════════
  // TEST 6 — Prodia Kebayoran, 03 Jun 2026
  // Targeted metabolic + lipid panel. First test with fasting insulin.
  // HOMA-IR computed: (glucose × insulin) / 405 = (104 × 6.8) / 405 = 1.74
  // Note: fasting glucose 104 mg/dL — above optimal threshold.
  // ══════════════════════════════════════════════════════════════════════════════

  console.log("── Inserting Test 6: Prodia Kebayoran, 2026-06-03 ──");

  const { data: test6, error: t6err } = await supabase
    .from("tests")
    .insert({
      date:     "2026-06-03",
      lab_name: "Prodia Kebayoran",
      notes:    "Targeted panel. First fasting insulin measurement. HOMA-IR 1.74.",
    })
    .select()
    .single();

  if (t6err || !test6) { console.error("Failed to insert test 6:", t6err); return; }
  console.log("Test 6 created:", test6.id);

  const fastedGlucose6 = 104;
  const fastingInsulin6 = 6.8;
  const homaIr6 = +((fastedGlucose6 * fastingInsulin6) / 405).toFixed(2);

  const t6rows = [
    // ── Cardiovascular ──────────────────────────────────────────────────────
    { metric_key: "ldl_c",        value: 132,   unit: "mg/dL",         lab_range_low: null, lab_range_high: 100 },
    { metric_key: "triglycerides", value: 56,   unit: "mg/dL",         lab_range_low: null, lab_range_high: 150 },
    { metric_key: "apob",         value: 89,    unit: "mg/dL",         lab_range_low: null, lab_range_high: 133 },
    // ── Metabolic ───────────────────────────────────────────────────────────
    { metric_key: "fasting_glucose", value: fastedGlucose6, unit: "mg/dL", lab_range_low: null, lab_range_high: 100 },
    { metric_key: "hba1c",        value: 5.4,   unit: "%",             lab_range_low: null, lab_range_high: 5.7 },
    { metric_key: "fasting_insulin", value: fastingInsulin6, unit: "uIU/mL", lab_range_low: null, lab_range_high: 10 },
    { metric_key: "homa_ir",      value: homaIr6, unit: "",            lab_range_low: null, lab_range_high: null },
    // ── Liver ───────────────────────────────────────────────────────────────
    { metric_key: "ast",          value: 20,    unit: "U/L",           lab_range_low: null, lab_range_high: 33 },
    { metric_key: "alt",          value: 25,    unit: "U/L",           lab_range_low: null, lab_range_high: 50 },
  ].map(r => ({ ...r, test_id: test6.id, attention_state: badge(r.metric_key, r.value) }));

  const { error: r6err } = await supabase.from("readings").insert(t6rows);
  if (r6err) { console.error("Failed to insert readings for test 6:", r6err); return; }
  console.log(`✓ Inserted ${t6rows.length} readings for Prodia Kebayoran 2026-06-03\n`);

  console.log("✓ Done. Six tests inserted.");
  console.log("\nNext step: wire app views to Supabase");
}

main().catch(console.error);
