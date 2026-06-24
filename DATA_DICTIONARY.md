# DATA_DICTIONARY.md
### Pulse Tracker — Database Reference

> Last updated: 2026-06-23
> Source of truth for table structure, column semantics, and data relationships.
> Update this file in the same session as any schema change. Never let it fall behind migrations.
> Applied migrations: 001 → 005

---

## Table inventory

| Table | Purpose | Subject-scoped? |
|---|---|---|
| `tests` | A single lab/vet visit — date, lab name, notes | Yes (`subject` column) |
| `readings` | Individual metric values from a test | Via `test_id → tests.subject` |
| `experiments` | Named observation windows for tracking interventions | Human only (no subject column) |
| `experiment_metrics` | Which metrics belong to which experiment, with target ranges | — |

---

## `tests`

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | uuid | PK | Auto-generated |
| `date` | date | NOT NULL | ISO date of the lab visit |
| `lab_name` | text | nullable | Name of clinic or vet |
| `notes` | text | nullable | Free text — diagnoses, context |
| `document_url` | text | nullable | Supabase Storage URL for original PDF/image. Not yet wired in UI. |
| `subject` | text | NOT NULL, default `'human'` | `'human'` or `'putih'`. Added in migration 004. All queries must filter on this. |
| `created_at` | timestamptz | default now() | Insert timestamp |

**Lifecycle:** Immutable once saved. Deletion cascades to `readings`.

**Query rule:** Every query against `tests` must include `.eq("subject", ...)`. Never fetch all subjects together. See `lib/queries.ts:fetchAll()` (human) and `lib/putih-queries.ts` (Putih).

---

## `readings`

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | uuid | PK | Auto-generated |
| `test_id` | uuid | FK → `tests.id` ON DELETE CASCADE | Parent test |
| `metric_key` | text | NOT NULL | Snake_case identifier. Human keys defined in `lib/metrics.ts` METRIC_CATALOG. Putih keys defined in `lib/putih-metrics.ts` PUTIH_METRIC_MAP. |
| `value` | numeric | NOT NULL | Stored in the canonical unit for that metric as defined in `METRIC_CATALOG`. If a lab reports in a different unit, convert before storing. |
| `unit` | text | NOT NULL | The canonical unit for the metric (e.g. `"mg/dL"` for LDL, `"U/L"` for ALT). Must match what `METRIC_CATALOG` expects for scoring to work. |
| `original_value` | numeric | nullable | Pre-conversion value if the lab reported in different units (e.g. mmol/L when canonical is mg/dL). |
| `original_unit` | text | nullable | Pre-conversion unit string. |
| `lab_range_low` | numeric | nullable | Lower bound of lab's reference range for this reading |
| `lab_range_high` | numeric | nullable | Upper bound of lab's reference range |
| `optimal_range_low` | numeric | nullable | Lower bound of optimal range. Reserved — not currently used in queries. |
| `optimal_range_high` | numeric | nullable | Upper bound of optimal range. Reserved — not currently used. |
| `attention_state` | text | nullable | Computed badge: `'optimal'` `'strong'` `'stable'` `'improve'` `'act'`. Computed at save time via `computeStatusBadge()` in `lib/metrics.ts`. Null for unscored metrics. |
| `annotation` | text | nullable | User-written note on this specific reading |
| `created_at` | timestamptz | default now() | Insert timestamp |

**Lifecycle:** Immutable once saved (no update UI currently exists). Deletion cascades if parent `test` is deleted.

**Important:** `attention_state` is stored at save time and never recomputed on read. If band thresholds change in `METRIC_CATALOG`, existing rows are not retroactively updated.

**Metric key namespaces:**
- Human keys: `ldl_c`, `apob`, `hba1c`, `homa_ir`, `vo2_max`, `whr`, etc. Full list in `lib/metrics.ts`.
- Putih keys: `alb`, `alt`, `wbc`, `hgb`, `weight_kg`, etc. Full list in `lib/putih-metrics.ts`.
- Keys must never be mixed — a reading's subject is derived from its parent test's `subject` column.

---

## Canonical unit reference

> This is the source of truth for what unit to store per metric key.
> If a lab reports in a different unit, **convert to canonical before storing**.
> Preserve the original in `original_value` / `original_unit`.

### Cardiovascular
| Metric key | Canonical unit | Notes |
|---|---|---|
| `ldl_c` | mg/dL | |
| `hdl_c` | mg/dL | |
| `total_cholesterol` | mg/dL | |
| `non_hdl_cholesterol` | mg/dL | |
| `triglycerides` | mg/dL | |
| `apob` | mg/dL | |
| `lp_a` | mg/dL | |
| `tg_hdl_ratio` | — | Unitless ratio |
| `apob_apoa1_ratio` | — | Unitless ratio |
| `systolic_bp` | mmHg | |
| `diastolic_bp` | mmHg | |

### Metabolic
| Metric key | Canonical unit | Notes |
|---|---|---|
| `fasting_glucose` | mg/dL | |
| `hba1c` | % | |
| `fasting_insulin` | μIU/mL | |
| `homa_ir` | — | Computed, unitless |
| `tyg_index` | — | Computed, unitless |
| `uric_acid` | mg/dL | |

### Inflammation
| Metric key | Canonical unit | Notes |
|---|---|---|
| `hs_crp` | mg/L | |
| `homocysteine` | μmol/L | |
| `ferritin` | μg/L | |
| `esr` | mm/hr | |

### Hormonal
| Metric key | Canonical unit | Notes |
|---|---|---|
| `testosterone_total` | nmol/L | |
| `testosterone_free` | nmol/L | |
| `shbg` | nmol/L | |
| `cortisol` | nmol/L | |
| `dhea_s` | μmol/L | |
| `tsh` | uIU/mL | |
| `psa_total` | ng/mL | |

### Nutritional
| Metric key | Canonical unit | Notes |
|---|---|---|
| `vitamin_d` | nmol/L | |
| `folate` | nmol/L | |
| `serum_iron` | μmol/L | |
| `transferrin_saturation` | % | |
| `magnesium` | mmol/L | |
| `zinc` | μmol/L | |

### Blood & Organ
| Metric key | Canonical unit | Notes |
|---|---|---|
| `rbc` | 10¹²/L | |
| `haemoglobin` | g/dL | |
| `haematocrit` | % | |
| `mcv` | fL | |
| `mch` | pg | |
| `mchc` | g/dL | |
| `rdw_cv` | % | |
| `wbc` | 10⁹/L | |
| `platelets` | 10⁹/L | |
| `ast` | U/L | |
| `alt` | U/L | |
| `ggt` | U/L | |
| `alp` | U/L | |
| `bilirubin_total` | mg/dL | |
| `bilirubin_direct` | mg/dL | |
| `bilirubin_indirect` | mg/dL | |
| `creatinine` | mg/dL | |
| `egfr` | mL/min/1.73m² | |
| `urea` | mg/dL | |

### Vitals & Fitness
| Metric key | Canonical unit | Notes |
|---|---|---|
| `heart_rate` | bpm | |
| `weight_kg` | kg | |
| `height_cm` | cm | |
| `whr` | — | Unitless ratio |
| `body_fat_pct` | % | |
| `visceral_fat` | rating | Tanita 1–12 scale |
| `muscle_mass_kg` | kg | |
| `vo2_max` | ml/min/kg | |
| `at_hr` | bpm | |
| `max_hr` | bpm | |
| `hr_recovery_1min` | bpm | |

---

## `experiments`

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | uuid | PK | Auto-generated |
| `name` | text | NOT NULL | User-defined experiment name |
| `hypothesis` | text | nullable | What the experiment is testing |
| `start_date` | date | NOT NULL | Observation window start |
| `end_date` | date | nullable | Null = ongoing |
| `status` | text | default `'active'` | `'active'` or `'completed'` |
| `notes` | text | nullable | Protocol notes. Added in migration 005. Auto-saved via `ExperimentNotes` component. |
| `column_labels` | jsonb | default `{}` | Maps `test_id (string) → caption (string)`. User-editable per column in progression table. Added in migration 002. |
| `excluded_test_ids` | jsonb | default `[]` | Array of test UUIDs hidden from this experiment's table. Added in migration 002. |
| `created_at` | timestamptz | default now() | Insert timestamp |

**Lifecycle:** Mutable. `column_labels` and `excluded_test_ids` are updated in place as user edits the progression table.

**Subject scope:** Experiments are human-only. No `subject` column. Queries that join experiments to tests must add `.eq("subject", "human")` on the tests side — this is a known bug in `getActiveExperiments` and `getExperimentDetail` (see Known Issues below).

---

## `experiment_metrics`

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | uuid | PK | Auto-generated |
| `experiment_id` | uuid | FK → `experiments.id` ON DELETE CASCADE | Parent experiment |
| `metric_key` | text | NOT NULL | Which metric this experiment tracks |
| `target_low` | numeric | nullable | Lower bound of user-defined target band. Added in migration 003. |
| `target_high` | numeric | nullable | Upper bound of user-defined target band. Added in migration 003. |

**Lifecycle:** Created when an experiment is set up. Deleted with the parent experiment. `target_low`/`target_high` may be updated.

---

## Relationships

```
tests (1) ──────────── (many) readings
              test_id FK

experiments (1) ──────── (many) experiment_metrics
                    experiment_id FK

experiments read tests indirectly:
  getExperimentDetail() fetches tests by date range (start_date → end_date)
  and then fetches readings for those test IDs.
  ⚠ Must always filter tests by subject = 'human' in this join.
```

---

## Data lifecycle summary

| Table | Immutable | Recalculable | Deletable |
|---|---|---|---|
| `tests` | Yes (no edit UI) | No | Yes (cascades to readings) |
| `readings` | Yes (no edit UI) | `attention_state` could be recomputed | Yes (via parent test) |
| `experiments` | No (`column_labels`, `excluded_test_ids`, `notes` are updated) | No | Yes (cascades to experiment_metrics) |
| `experiment_metrics` | No (`target_low/high` editable) | No | Yes (via parent experiment) |

---

## Known issues (data layer)

| # | Issue | Location | Status |
|---|---|---|---|
| 1 | `getActiveExperiments` fetches tests without `subject = 'human'` filter | `lib/queries.ts` | ✅ Fixed 2026-06-23 |
| 2 | `getExperimentDetail` fetches tests without `subject = 'human'` filter | `lib/queries.ts` | ✅ Fixed 2026-06-23 |
| 3 | `getPutihProgressionMatrix` fetches all readings without metric_key filter | `lib/putih-queries.ts` | ✅ Fixed 2026-06-23 |

---

## Migration log

| # | File | What it does |
|---|---|---|
| 001 | `001_initial_schema.sql` | Creates `tests`, `readings`, `experiments`, `experiment_metrics` |
| 002 | `002_experiments_column_labels_excluded.sql` | Adds `column_labels`, `excluded_test_ids` to `experiments` |
| 003 | `003_experiment_metrics_target_range.sql` | Adds `target_low`, `target_high` to `experiment_metrics` |
| 004 | `004_tests_subject.sql` | Adds `subject` to `tests` — separates human and Putih records |
| 005 | `005_experiments_notes.sql` | Adds `notes` to `experiments` |
| 006 | `006_tests_user_id.sql` | Adds `user_id` to `tests` — enables per-user isolation |
| 007 | `007_experiments_user_id.sql` | Adds `user_id` to `experiments` |
| 008 | `008_rls_policies.sql` | Enables RLS on all tables with access policies |
