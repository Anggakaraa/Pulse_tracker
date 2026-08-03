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

---

---

# Glucomove — Database Reference

> Section added: 2026-08-01
> Glucomove is the continuous glucose tracking feature. All tables are prefixed `glucomove_`.
> Authoritative calculation spec: `documentation/glucomove-data.md`
> All timestamps stored in UTC. All day-boundary logic uses WIB (UTC+7).

---

## Glucomove table inventory

| Table | Purpose |
|---|---|
| `glucomove_readings` | Raw CGM glucose readings — sourced from iOS Shortcuts / Apple Health |
| `glucomove_meals` | Logged meals with full carb + modifier profile |
| `glucomove_day_records` | One record per calendar day (WIB) — waking glucose and day-level notes |
| `glucomove_events` | Non-meal activities that may affect glucose (exercise, stress, sleep, etc.) |
| `glucomove_telegram_drafts` | Staging table for Telegram-ingested messages awaiting human approval |

---

## `glucomove_readings`

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | uuid | PK | Auto-generated |
| `user_id` | uuid | NOT NULL | FK → auth.users |
| `meal_id` | uuid | nullable | FK → `glucomove_meals.id`. Set when a reading is explicitly attached to a meal. Free-floating readings have `null`. |
| `timestamp` | timestamptz | NOT NULL | UTC. WIB = timestamp + 7h |
| `glucose_mmol` | numeric | NOT NULL | mmol/L |
| `is_baseline` | boolean | NOT NULL, default false | When true, this reading is used as the pre-meal baseline for its attached meal. Only meaningful when `meal_id` is set. |
| `is_fasting` | boolean | NOT NULL, default false | True if recorded as a fasting/morning reading |
| `notes` | text | nullable | Free text annotation |
| `created_at` | timestamptz | default now() | |

**Source**: iOS Shortcuts automation → `/api/glucomove/sync-readings`. Primary CGM cadence ~5 min. Free-floating readings (no `meal_id`) are linked to meals at query time by a ±30–240 min time window in `getReadingsForMeal()`.

**Reading association logic** (in `lib/glucomove-queries.ts:getReadingsForMeal`):
1. Explicitly attached readings (`meal_id = this meal`) — always included
2. Free-floating readings (`meal_id IS NULL`) within `[mealStart − 30min, mealStart + 240min]` — included unless a `meal_id` of a different meal is set

Both sets are merged and deduplicated by id.

---

## `glucomove_meals`

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | uuid | PK | Auto-generated |
| `user_id` | uuid | NOT NULL | FK → auth.users |
| `day_record_id` | uuid | nullable | FK → `glucomove_day_records.id`. Not required — meals and day records are linked by date at query time. |
| `meal_start_time` | timestamptz | NOT NULL | UTC. Used as t=0 for all meal metrics. |
| `meal_type` | text | NOT NULL | `breakfast` \| `lunch` \| `dinner` \| `snack` \| `other` |
| `name` | text | NOT NULL | Short meal name (e.g. "Baked salmon + potato") |
| `description` | text | nullable | Full description of everything eaten |
| `primary_carb_source` | text[] | NOT NULL | Array. Values: `none`, `white_rice`, `red_brown_rice`, `bread`, `fibrous_bread`, `pasta`, `wholewheat_pasta`, `noodles_flour`, `sugar_dessert`, `quinoa`, `cauliflower_rice`, `potato`, `other`. `["none"]` means no meaningful carb. |
| `carb_prominence` | text | NOT NULL | `none` \| `supporting` \| `moderate` \| `hero` |
| `fiber_prominence` | text | NOT NULL | `low` \| `moderate` \| `high` |
| `protein_prominence` | text | NOT NULL | `low` \| `moderate` \| `high` |
| `fat_prominence` | text | NOT NULL | `low` \| `moderate` \| `high` |
| `fat_before` | boolean | NOT NULL, default false | Deliberate fat buffer taken before the meal |
| `acv_before` | boolean | NOT NULL, default false | Apple cider vinegar taken before meal |
| `structured_eating` | boolean | NOT NULL, default false | Eating in fiber→protein→carb order |
| `movement_after` | boolean | NOT NULL, default false | Exercise/walk after meal |
| `movement_duration_minutes` | integer | nullable | Duration of post-meal movement. Null if `movement_after = false`. |
| `with_alcohol` | boolean | NOT NULL, default false | Alcohol consumed with meal |
| `cooled_starch` | boolean | NOT NULL, default false | Starch was cooled/reheated (increases resistant starch) |
| `fruit_after` | boolean | NOT NULL, default false | Fruit eaten immediately after meal |
| `dessert_after` | boolean | NOT NULL, default false | Dessert/sweet eaten immediately after meal |
| `added_sugar` | boolean | NOT NULL, default false | Sugar used as cooking ingredient (glazes, marinades) — not dessert |
| `large_portion` | boolean | NOT NULL, default false | Larger-than-normal serving explicitly noted |
| `eating_out` | boolean | NOT NULL, default false | Restaurant/takeaway — preparation unknown |
| `notes` | text | nullable | Hypothesis field — user's expectation or contextual note. Displayed as "Hypothesis" in UI. Reserved for future AI-assisted analysis. |
| `potential_sensor_issue` | boolean | NOT NULL, default false | Reading quality flag. Meals flagged here are excluded from aggregate analytics. |
| `created_at` | timestamptz | default now() | |

**Meal metrics are not stored** — they are computed on every read in `lib/glucomove-calcs.ts:calcMealMetrics()`. See `documentation/glucomove-data.md` for exact formulas.

---

## `glucomove_day_records`

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | uuid | PK | Auto-generated |
| `user_id` | uuid | NOT NULL | FK → auth.users |
| `date` | date | NOT NULL | WIB calendar date (YYYY-MM-DD). Unique per user. |
| `waking_glucose_mmol` | numeric | nullable | First reading of the day at or near wake-up time. Auto-populated at draft approval via closest-reading lookup. |
| `overnight_avg_mmol` | numeric | nullable | **Deprecated as a manually-stored field.** Now computed on read from `glucomove_readings` where WIB hour is 00:00–05:59. Column kept for backward compatibility. |
| `daily_avg_mmol` | numeric | nullable | **Deprecated as a manually-stored field.** Now computed on read from all `glucomove_readings` for that WIB date. Column kept for backward compatibility. |
| `potential_sensor_issue` | boolean | NOT NULL, default false | Day-level sensor quality flag |
| `notes` | text | nullable | Day-level free text |
| `created_at` | timestamptz | default now() | |

**Upsert key**: `(user_id, date)` — only one record per calendar day per user.

**Computed-on-read fields** (sourced from `glucomove_readings`, not this table):
- `daily_avg_mmol`: mean of all readings on this WIB date
- `overnight_avg_mmol`: mean of readings where WIB hour < 6

---

## `glucomove_events`

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | uuid | PK | Auto-generated |
| `user_id` | uuid | NOT NULL | FK → auth.users |
| `name` | text | NOT NULL | Short event name |
| `event_type` | text | NOT NULL | `stress` \| `exercise` \| `alcohol` \| `illness` \| `sleep` \| `travel` \| `fasting` \| `medication` \| `other` |
| `start_time` | timestamptz | NOT NULL | UTC |
| `end_time` | timestamptz | nullable | Null for instantaneous events (e.g. medication) |
| `intensity` | text | nullable | `low` \| `moderate` \| `high` \| null |
| `notes` | text | nullable | Free text |
| `created_at` | timestamptz | default now() | |

**Role in peak detection**: Event `start_time` is used as a cutoff for meal peak search — see `documentation/glucomove-data.md` §Peak detection.

---

## `glucomove_telegram_drafts`

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | uuid | PK | Auto-generated |
| `user_id` | uuid | NOT NULL | FK → auth.users |
| `raw_text` | text | NOT NULL | Original message text as sent via Telegram |
| `sent_at` | timestamptz | NOT NULL | UTC timestamp when the message was received |
| `parsed_data` | jsonb | NOT NULL | Claude-parsed structured data. Shape varies by `type`. |
| `type` | text | NOT NULL | `day_record` \| `meal` \| `glucose_reading` \| `event` \| `unknown` |
| `date` | date | NOT NULL | WIB date the record belongs to, extracted during parsing |
| `status` | text | NOT NULL, default `'pending'` | `pending` \| `approved` \| `dismissed` |
| `created_at` | timestamptz | default now() | |

**Lifecycle**: Created by `/api/glucomove/telegram-webhook`. Reviewed and approved via the Drafts UI (`/glucomove/drafts`). On approval, data is written to the appropriate target table and `status` set to `approved`. Dismissed drafts have `status = 'dismissed'` and are never written. Pending drafts appear in the Drafts review queue.

**`parsed_data` shape by type**:
- `day_record`: `{ waking_glucose_mmol, overnight_avg_mmol, daily_avg_mmol, notes, time? }`
- `meal`: Full meal object matching `glucomove_meals` columns plus `time` (HH:MM string)
- `glucose_reading`: `{ glucose_mmol, time?, is_fasting, notes }`
- `event`: `{ name, event_type, time?, end_time?, intensity, notes }`
- `unknown`: `{ notes: raw_message }`

---

## Glucomove relationships

```
glucomove_day_records (1) ──── (many) glucomove_meals     [day_record_id, optional]
glucomove_meals       (1) ──── (many) glucomove_readings  [meal_id, optional]
glucomove_readings          free-floating when meal_id IS NULL

Meals and day records are always queryable by (user_id + WIB date window)
without relying on the FK — the FK is supplemental, not required.

glucomove_events are standalone; they influence peak detection logic at
query time but have no FK relationship to meals.
```

---

## Glucomove data lifecycle

| Table | Created by | Mutable | Deleted by |
|---|---|---|---|
| `glucomove_readings` | iOS Shortcuts sync (primary); Telegram draft approval | No | Manual only |
| `glucomove_meals` | Telegram draft approval; manual UI entry | Yes (edit page) | Manual only |
| `glucomove_day_records` | Telegram draft approval (`upsert`) | Yes (waking glucose editable) | Manual only |
| `glucomove_events` | Telegram draft approval | No edit UI yet | Manual only |
| `glucomove_telegram_drafts` | Telegram webhook | Status only (`pending→approved/dismissed`) | Never deleted |
