# Glucomove — Data & Calculation Spec

> Last updated: 2026-08-01
> This is the single source of truth for how Glucomove data is structured, how every metric is
> calculated, and why key architecture decisions were made. Read this before changing any
> formula, adding a stored field, or building an analytics view.
>
> Related documents:
> - Table schemas → `DATA_DICTIONARY.md` §Glucomove
> - Analytical questions & hypotheses → `ANALYTICS.md`
> - Implementation → `lib/glucomove-calcs.ts`, `lib/glucomove-queries.ts`

---

## 1. Architecture principles

**Compute, don't store meal metrics.**
Spike, iAUC-120, peak, recovery — none of these are stored in the database. They are computed on every read from the raw readings and meal start time. Rationale: the calculation logic will evolve as understanding matures. Storing derived values would create a migration burden every time a formula changes. Storage is cheap; recomputation from raw data is always possible.

Exception: `waking_glucose_mmol` is stored in `glucomove_day_records` because it represents a human decision (which reading counts as "waking"), not a pure calculation.

**One table per concern.**
Readings, meals, day records, and events are separate tables. They are joined at query time by user + time window, not by rigid FKs. This allows readings from the iOS Shortcuts sync to exist before a meal is logged, and still be associated retrospectively.

**Telegram is a staging layer, not a write path.**
All Telegram-ingested data lands in `glucomove_telegram_drafts` with `status = pending`. Nothing writes to production tables until the user explicitly approves in the Drafts UI. This gives the user a review step for every AI parse.

**WIB (UTC+7) for all day boundaries.**
All timestamps are stored in UTC. All date-window queries use WIB offsets (e.g. `T00:00:00+07:00` to `T23:59:59+07:00`). The day a reading "belongs to" is always its WIB calendar date. Overnight is WIB 00:00–05:59.

---

## 2. Timezone conventions

| Context | Convention |
|---|---|
| Storage | UTC for all `timestamptz` columns |
| Day boundaries | WIB (UTC+7): `T00:00:00+07:00` → `T23:59:59+07:00` |
| Overnight window | WIB hour 00–05 (i.e. UTC hour 17–22 of prior day) |
| Display | WIB local time in all UI labels |
| WIB hour computation | `(new Date(ts).getUTCHours() + 7) % 24` |

Never use `new Date().toLocaleDateString()` or local timezone methods. Always compute WIB explicitly from UTC.

---

## 3. Data ingestion pipeline

```
iOS Shortcuts (Apple Health CGM)
  → POST /api/glucomove/sync-readings
  → glucomove_readings (free-floating, meal_id = null)

Telegram message
  → POST /api/glucomove/telegram-webhook
  → Claude (claude-haiku-4-5) parses to structured JSON
  → glucomove_telegram_drafts (status = pending)
  → User reviews in /glucomove/drafts
  → On approve → writes to glucomove_meals / glucomove_day_records /
                  glucomove_readings / glucomove_events
```

CGM readings arrive continuously and are not associated with any meal at ingest time. Association happens at query time via `getReadingsForMeal()`.

---

## 4. Reading association (getReadingsForMeal)

When computing metrics for a meal, the system fetches two sets of readings and merges them:

1. **Explicitly attached** — `glucomove_readings` where `meal_id = this meal's id`
2. **Free-floating in window** — `glucomove_readings` where `meal_id IS NULL` and `timestamp` is within `[mealStart − 30min, mealStart + 240min]`

The two sets are merged and deduplicated by `id`, then sorted ascending by timestamp. The pre-meal window (−30 min) captures the baseline reading. The post-meal window (240 min) captures the full glucose response without prejudging the observation length.

**Why 30 min pre and 240 min post?**
- 30 min pre: typical CGM lag means the reading taken immediately before a meal may have been captured 5–30 min earlier.
- 240 min post: conservative upper bound — most glucose responses resolve within 120–180 min, but some meals (high fat/protein) can have delayed effects. The observation window is then capped analytically by the peak cutoff logic (§7).

---

## 5. Baseline selection

The baseline reading is the pre-meal glucose level used as t=0 reference for all metrics.

**Priority order:**
1. A reading with `is_baseline = true` (explicitly marked by the user)
2. The latest reading with `timestamp ≤ meal_start_time` in the merged reading set

If neither exists (no readings at or before meal start), all metrics return `null` with `responseShape = "insufficient_data"`.

**Why latest-before rather than last-30-min average?**
A single point is simpler and more reproducible. CGM readings have small variation (~0.1–0.2 mmol/L) minute-to-minute; averaging adds complexity without meaningfully improving accuracy at this scale.

---

## 6. Observation window (peak cutoff)

The **observation window** for a meal is the time range used for peak detection and all peak-derived metrics. It is distinct from the physical reading fetch window (§4).

**Rule: cap at next activity, with 60-minute minimum floor.**

```
effectiveCutoff = max(mealStart + 60min, nextActivityStart)
```

Where `nextActivityStart` is the earliest of:
- Start time of the next logged meal after this meal
- Start time of the next logged event after this meal
- `undefined` if no subsequent activity on that day

If `nextActivityStart` is undefined (this is the last activity of the day), the observation window is uncapped — all available readings are used.

**Why the 60-minute floor?**
If a snack is logged 30 min after a meal, a strict cutoff would only give 30 min of observation — not enough to see the peak. The floor ensures at least 60 min of data regardless of how soon the next meal starts.

**Why cap at next activity at all?**
Without a cap, the peak for a meal is the global maximum in all subsequent readings, which can be contaminated by glucose rises from the next meal. Example: salmon + potato shows "peak" at t=+130 min because a subsequent yoghurt whey snack caused a new glucose rise. The cap isolates this meal's own glucose response.

**iAUC-120 is not affected by the observation window cap.** iAUC-120 has its own hard 120-min window (§7) and is computed independently.

---

## 7. Metric definitions

All metrics are computed in `lib/glucomove-calcs.ts:calcMealMetrics()`.
All glucose values are in **mmol/L**. All times are in **minutes** unless noted.

### 7.1 Baseline glucose
The glucose value of the baseline reading (§5). All spike calculations are relative to this value.

### 7.2 Peak glucose
The highest `glucose_mmol` reading within the observation window (§6).

### 7.3 Spike (movement)
```
spike = peak_glucose − baseline_glucose
```
Displayed as `+X.X mmol/L`. Can be negative if glucose drops after the meal.

### 7.4 Time to peak
```
timeToPeak = (peak_reading.timestamp − meal_start_time) / 60000   [minutes]
```
Rounded to nearest integer. Measured from meal start, not from baseline reading.

### 7.5 iAUC-120 (incremental Area Under Curve, 120 minutes)

**Definition**: the positive area between the glucose curve and the baseline level, integrated from t=0 (meal start) to t=120 min. Only positive excursions above baseline count — drops below baseline contribute zero.

**Unit**: mmol/L·min

**Requires**: at least one reading at or after t=+120 min from meal start. If this reading doesn't exist, returns `null` (displayed as "In progress").

**Algorithm**:
1. Anchor at `{ t: 0, g: baseline_glucose }`
2. Add all readings where `mealStart < timestamp ≤ mealStart + 120min`
3. If the last in-window reading is before t=120 and there is a reading after t=120, interpolate to get the exact value at t=120:
   ```
   frac = (endMs − lastBeforeMs) / (firstAfterMs − lastBeforeMs)
   g_120 = lastBefore.glucose + frac × (firstAfter.glucose − lastBefore.glucose)
   ```
4. Trapezoidal integration:
   ```
   area += (max(0, g[i-1] − baseline) + max(0, g[i] − baseline)) / 2 × (t[i] − t[i-1])
   ```

**Why iAUC-120 rather than full-window iAUC?**
A full-window iAUC grows with observation length — a 3-hour window gives a larger value than a 2-hour window for the same curve, making meals non-comparable. The 120-min fixed window standardises comparison. Values are comparable across meals, meals across days, and hypothetically against reference populations.

**Why 120 min?**
Most glucose responses resolve by 120 min. At 120 min, the curve has typically returned close to baseline or is descending. This is also the standard window used in clinical oral glucose tolerance test (OGTT) analysis.

### 7.6 Return to baseline
```
returnToBaselineMinutes = (first_post_peak_reading_where_glucose ≤ baseline + 0.6 − peak.timestamp) / 60000
```

**RETURN_TOLERANCE = 0.6 mmol/L.** A reading within 0.6 mmol/L of baseline is considered "near baseline." This accommodates normal CGM noise and prevents "never returns" from being reported when glucose is at 5.3 vs a baseline of 5.0.

**Open question**: 0.6 may be too generous — could report artificially short recovery times. Revisit after ~15 meals with sufficient post-peak data.

### 7.7 Minutes above 7.8
```
minutesAbove7_8 = firstBelow7_8_after_peak.timestamp − firstAbove7_8.timestamp   [minutes]
```
`7.8 mmol/L` is the clinical postprandial threshold (equivalent to 140 mg/dL). Null if peak never exceeded 7.8.

### 7.8 Peak to below 7.8
```
minutesPeakToBelow7_8 = firstBelow7_8_after_peak.timestamp − peak.timestamp   [minutes]
```
Measures how long from the peak until glucose drops back below 7.8. Different from "minutes above 7.8" which measures the full elevated window. Null if peak ≤ 7.8 or glucose hasn't dropped below 7.8 yet.

### 7.9 Post-peak low
The minimum glucose reading in the post-peak portion of the observation window. Used to detect reactive hypoglycaemia or significant drops after the peak.

```
dropFromPeak = peak_glucose − post_peak_low
```

### 7.10 Final reading / observation duration
```
finalGlucose = last reading in observation window
finalDiffFromBaseline = finalGlucose − baseline_glucose
observationDuration = (finalReading.timestamp − baseline.timestamp) / 60000   [minutes]
```

---

## 8. Classification systems

### 8.1 Response band
Classifies the magnitude of the glucose spike.

| Band | Spike threshold | Rationale |
|---|---|---|
| `low` | ≤ 1.7 mmol/L | Flat or blunted response — metabolically benign |
| `moderate` | 1.7–2.8 mmol/L | Noticeable rise but within typical range |
| `high` | > 2.8 mmol/L | Significant spike — warrants attention |

### 8.2 Response shape
Classifies the temporal pattern of the glucose curve. Evaluated in priority order — first match wins.

| Shape | Condition |
|---|---|
| `insufficient_data` | Fewer than 3 readings in observation window |
| `flat` | Spike ≤ 0.5 mmol/L |
| `below_baseline` | Post-peak low < baseline − 0.3 mmol/L (reactive dip) |
| `still_elevated` | No return to baseline AND final reading > baseline + 0.6 |
| `double_rise` | Post-peak: first half min + second half max differ by > 1.0 mmol/L |
| `sharp_quick_recovery` | Time to peak ≤ 45 min AND return to baseline ≤ 60 min |
| `sharp_slow_recovery` | Time to peak ≤ 45 min AND return to baseline > 60 min (or not yet) |
| `gradual_rise` | Default (time to peak > 45 min) |

---

## 9. Day-level metrics

### 9.1 Daily average glucose
```
daily_avg = mean(glucose_mmol) for all glucomove_readings on this WIB date
```
Computed on read from `glucomove_readings`. **Not stored** in `glucomove_day_records` (the column exists for backward compatibility but is not written or read for display).

Minimum readings to show: 1. Below ~6 readings, treat as directional only.

### 9.2 Overnight average glucose
```
overnight_avg = mean(glucose_mmol) for readings where WIBhour < 6
WIBhour = (UTC_hour + 7) % 24
```
Computed on read. Covers midnight to 05:59 WIB. Not stored.

### 9.3 Waking glucose
Stored in `glucomove_day_records.waking_glucose_mmol`. Set via:
- Telegram message: `"waking 5.2"` → explicit value
- Telegram message: `"wake up 5am"` → auto-lookup: find the reading in `glucomove_readings` on that WIB date closest by timestamp distance to 05:00 WIB
- Telegram message: `"wake up"` (no time) → auto-lookup: closest reading to the message sent-at time

---

## 10. Categorical vocabularies

These are the canonical values. Any value outside these lists is a data quality issue.

### Meal type
`breakfast` | `lunch` | `dinner` | `snack` | `other`

### Primary carb source (array, pick all that apply)
| Value | Display label |
|---|---|
| `none` | No meaningful carbohydrate |
| `white_rice` | White rice |
| `red_brown_rice` | Red or brown rice |
| `bread` | Bread |
| `fibrous_bread` | Fibrous bread |
| `pasta` | Pasta |
| `wholewheat_pasta` | Wholewheat pasta |
| `noodles_flour` | Noodles or flour-based dish |
| `sugar_dessert` | Sugar or dessert |
| `quinoa` | Quinoa |
| `cauliflower_rice` | Cauliflower rice |
| `potato` | Potato |
| `other` | Other |

Rule: `["none"]` must not be mixed with other values. If a meal has no carbs, it must be `["none"]` and nothing else.

### Carb prominence
`none` | `supporting` | `moderate` | `hero`

### Fiber / protein / fat prominence
`low` | `moderate` | `high`

### Event type
`stress` | `exercise` | `alcohol` | `illness` | `sleep` | `travel` | `fasting` | `medication` | `other`

### Event intensity
`low` | `moderate` | `high` | null

---

## 11. Carb groupings for analytics

For aggregate analysis, individual carb sources are collapsed into four groups. These are not stored — they are computed at analysis time.

| Analytics group | `primary_carb_source` values included |
|---|---|
| **Simple carbs** | `white_rice`, `bread`, `pasta`, `noodles_flour`, `sugar_dessert` |
| **Complex carbs** | `red_brown_rice`, `fibrous_bread`, `wholewheat_pasta`, `quinoa`, `cauliflower_rice`, `potato` |
| **Fruit** | A meal where the meal type is `snack` and the name/description suggests standalone fruit. No `primary_carb_source` tag today — inferred from context. |
| **Low/no carb** | `none` |
| **Other** | `other`, or mixed (multiple sources spanning groups) |

Note: `potato` is classified as **complex carbs** due to its starch structure, despite being a simple-seeming food.

---

## 12. Computed vs stored — decision table

| Value | Stored? | Computed from |
|---|---|---|
| Raw CGM glucose readings | ✅ Yes | iOS Shortcuts (Apple Health) |
| Baseline glucose | ❌ Computed | Latest reading ≤ meal_start_time |
| Peak glucose | ❌ Computed | Max in observation window |
| Spike (movement) | ❌ Computed | Peak − baseline |
| Time to peak | ❌ Computed | Peak timestamp − meal_start_time |
| iAUC-120 | ❌ Computed | Trapezoidal integration, 0–120 min |
| Return to baseline | ❌ Computed | First post-peak reading ≤ baseline + 0.6 |
| Response band | ❌ Computed | Spike threshold lookup |
| Response shape | ❌ Computed | Multi-condition pattern |
| Daily avg glucose | ❌ Computed | Mean of readings on WIB date |
| Overnight avg glucose | ❌ Computed | Mean of readings where WIB hour < 6 |
| Waking glucose | ✅ Stored | Human decision / closest-reading auto-lookup |
| Meal modifiers (booleans) | ✅ Stored | User entry via Telegram or UI |
| Hypothesis/notes on meal | ✅ Stored | User free text |
| Sensor issue flag | ✅ Stored | User flags manually |

---

## 13. Open questions and deferred decisions

| # | Question | Status | Trigger to revisit |
|---|---|---|---|
| 1 | Is `RETURN_TOLERANCE = 0.6 mmol/L` too generous? | Open | After ~15 meals with full post-peak data |
| 2 | Should `hypothesis` (`notes`) have a structured outcome field (`hypothesis_outcome`)? | Deferred | When AI-assisted analysis is built |
| 3 | How to handle "fruit" as an analytics carb group without a dedicated tag? | Deferred | If fruit analysis becomes a priority question |
| 4 | Should iAUC-120 or spike be the primary modifier-comparison metric in analytics? | Open | When ≥8 meals have iAUC values |
| 5 | Should modifier analysis control for carb prominence? | Deferred | When sample is large enough to stratify |
| 6 | Overnight reading automation (2am + 5:30am iOS Shortcuts) | Deferred | When overnight pattern analysis is needed |
| 7 | Should peak cutoff be applied to iAUC-120 as well? | Decided No | iAUC-120 has its own hard 120-min boundary |
| 8 | Double-rise detection threshold (currently > 1.0 mmol/L) | Open | Review with real data |
