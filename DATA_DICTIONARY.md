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
| `value` | numeric | NOT NULL | Always stored in canonical SI units |
| `unit` | text | NOT NULL | Display unit string (e.g. `"mmol/L"`, `"g/L"`) |
| `original_value` | numeric | nullable | Pre-conversion value if the source used different units |
| `original_unit` | text | nullable | Pre-conversion unit string |
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

| # | Issue | Location | Fix |
|---|---|---|---|
| 1 | `getActiveExperiments` fetches tests without `subject = 'human'` filter | `lib/queries.ts:462` | Add `.eq("subject", "human")` |
| 2 | `getExperimentDetail` fetches tests without `subject = 'human'` filter | `lib/queries.ts:635` | Add `.eq("subject", "human")` |
| 3 | `getPutihProgressionMatrix` fetches all readings without metric_key filter | `lib/putih-queries.ts:170` | Add `.in("metric_key", Object.keys(PUTIH_METRIC_MAP))` |

---

## Migration log

| # | File | What it does |
|---|---|---|
| 001 | `001_initial_schema.sql` | Creates `tests`, `readings`, `experiments`, `experiment_metrics` |
| 002 | `002_experiments_column_labels_excluded.sql` | Adds `column_labels`, `excluded_test_ids` to `experiments` |
| 003 | `003_experiment_metrics_target_range.sql` | Adds `target_low`, `target_high` to `experiment_metrics` |
| 004 | `004_tests_subject.sql` | Adds `subject` to `tests` — separates human and Putih records |
| 005 | `005_experiments_notes.sql` | Adds `notes` to `experiments` |
