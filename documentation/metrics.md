# metrics.md
### Metric Definitions, Scoring Bands & Logic — Personal Health Record

> This document is the implementation reference for all biomarker logic.
> It defines what each metric means, how it is scored, and what the band
> thresholds are. The source of truth for band values in code is
> `lib/metrics.ts` — this document explains the reasoning behind them.
>
> Status: v1 — reflects current implementation.

---

## How the scoring system works

Every scored metric has five bands defined as half-open intervals `[lo, hi)`.
`computeStatusBadge(value, metric)` in `lib/metrics.ts` iterates through the
bands in order (optimal → strong → stable → improve → act) and returns the
first band the value falls into.

```
optimal  → value is in the longevity-optimal range
strong   → above standard clinical normal, not quite optimal
stable   → within standard clinical normal
improve  → below ideal, worth addressing
act      → outside acceptable range
```

Metrics with `isScored: false` skip this entirely — they show their lab
reference range only, with no badge.

---

## Evidence Tiers

| Tier | Meaning | Display behaviour |
|---|---|---|
| A | Strong outcome data — directly linked to mortality/morbidity endpoints | Surfaced aggressively on dashboard; improve/act states flagged prominently |
| B | Useful preventive marker — good supporting evidence | Normal display |
| C | Context-dependent — useful with symptoms/history | Badge shown with implicit caveat; not surfaced on dashboard attention panel |
| L | Lab range only — no meaningful optimal target | Unscored; lab range shown only |

---

## Composite Metrics

Computed from component readings within the same test. Stored as regular
reading rows — no special treatment downstream.

| Metric | Key | Formula | Requires |
|---|---|---|---|
| HOMA-IR | `homa_ir` | `(glucose_mgdl × insulin_uIU) / 405` | `fasting_glucose` (mg/dL) + `fasting_insulin` (μIU/mL) |
| TyG index | `tyg_index` | `ln(TG_mgdl × glucose_mgdl / 2)` | `triglycerides` (mg/dL) + `fasting_glucose` (mg/dL) |
| TG/HDL ratio | `tg_hdl_ratio` | `triglycerides / hdl_c` | Both in same unit (mg/dL) |
| ApoB/ApoA1 ratio | `apob_apoa1_ratio` | `apob / apoa1` | Both in mg/dL |

---

## Metric Catalog

### Cardiovascular

---

#### LDL-C `ldl_c`
**What it measures:** Low-density lipoprotein cholesterol — the primary carrier of atherogenic particles.
**Why it matters:** Elevated LDL-C is one of the strongest causal risk factors for cardiovascular disease. Lower is better with no known floor.
**Evidence tier:** A | **Direction:** lower is better | **Unit:** mg/dL

| Band | Range |
|---|---|
| Optimal | < 70 |
| Strong | 70–100 |
| Stable | 100–130 |
| Improve | 130–190 |
| Act | ≥ 190 |

---

#### HDL-C `hdl_c`
**What it measures:** High-density lipoprotein cholesterol — the "reverse transport" particle.
**Why it matters:** Higher HDL is associated with lower cardiovascular risk. Kept as a scored marker despite imperfect causality — useful as a motivational and metabolic health marker.
**Evidence tier:** B | **Direction:** higher is better | **Unit:** mg/dL

| Band | Range |
|---|---|
| Optimal | ≥ 60 |
| Strong | 50–60 |
| Stable | 40–50 |
| Improve | 35–40 |
| Act | < 35 |

---

#### Total Cholesterol `total_cholesterol`
**What it measures:** Sum of all cholesterol fractions.
**Why it matters:** Not independently meaningful — must be read alongside ApoB and HDL. Kept as an unscored display metric.
**Evidence tier:** L | **isScored:** false | **Unit:** mg/dL

---

#### Triglycerides `triglycerides`
**What it measures:** Blood fat level — primary marker of metabolic and cardiovascular risk overlap.
**Why it matters:** Elevated TG reflects poor metabolic health and drives atherogenic small-dense LDL particles.
**Evidence tier:** A | **Direction:** lower is better | **Unit:** mg/dL

| Band | Range |
|---|---|
| Optimal | < 70 |
| Strong | 70–100 |
| Stable | 100–150 |
| Improve | 150–200 |
| Act | ≥ 200 |

---

#### Non-HDL Cholesterol `non_hdl_cholesterol`
**What it measures:** Total cholesterol minus HDL — all atherogenic lipoprotein fractions combined.
**Why it matters:** More complete than LDL-C alone; captures VLDL and IDL particles.
**Evidence tier:** A | **Direction:** lower is better | **Unit:** mg/dL

| Band | Range |
|---|---|
| Optimal | < 100 |
| Strong | 100–130 |
| Stable | 130–160 |
| Improve | 160–190 |
| Act | ≥ 190 |

---

#### ApoB `apob`
**What it measures:** Apolipoprotein B — one molecule per atherogenic particle; direct count of particle number.
**Why it matters:** Superior to LDL-C for cardiovascular risk prediction. The key metric for lipid management.
**Evidence tier:** A | **Direction:** lower is better | **Unit:** mg/dL

| Band | Range |
|---|---|
| Optimal | < 70 |
| Strong | 70–90 |
| Stable | 90–100 |
| Improve | 100–130 |
| Act | ≥ 130 |

---

#### ApoA1 `apoa1`
**What it measures:** Apolipoprotein A1 — the structural protein of HDL particles.
**Why it matters:** Better marker of HDL functionality than HDL-C alone.
**Evidence tier:** B | **Direction:** higher is better | **Unit:** mg/dL

| Band | Range |
|---|---|
| Optimal | ≥ 140 |
| Strong | 120–140 |
| Stable | 110–120 |
| Improve | 90–110 |
| Act | < 90 |

---

#### Lp(a) `lp_a`
**What it measures:** Lipoprotein(a) — a genetically determined atherogenic particle.
**Why it matters:** Largely genetic; not directly modifiable by lifestyle. Treat as a stable baseline — retest every 2–3 years. Informs long-term risk framing.
**Note:** Units are mg/dL (lab-reported). Conversion from nmol/L is non-linear and particle-size dependent — use lab value directly.
**Evidence tier:** A | **Direction:** lower is better | **Unit:** mg/dL

| Band | Range |
|---|---|
| Optimal | < 20 |
| Strong | 20–30 |
| Stable | 30–50 |
| Improve | 50–100 |
| Act | ≥ 100 |

---

#### TG/HDL Ratio `tg_hdl_ratio`
**What it measures:** Ratio of triglycerides to HDL — a composite insulin resistance proxy.
**Why it matters:** Strong surrogate for small dense LDL particle count and metabolic health.
**Evidence tier:** B | **Direction:** lower is better | **Unit:** ratio (unitless)

| Band | Range |
|---|---|
| Optimal | < 1.0 |
| Strong | 1.0–1.5 |
| Stable | 1.5–2.0 |
| Improve | 2.0–3.0 |
| Act | ≥ 3.0 |

---

#### ApoB/ApoA1 Ratio `apob_apoa1_ratio`
**What it measures:** Ratio of atherogenic to protective apolipoprotein — a balance score.
**Why it matters:** Captures both sides of the lipid equation in one number.
**Evidence tier:** B | **Direction:** lower is better | **Unit:** ratio (unitless)

| Band | Range |
|---|---|
| Optimal | < 0.50 |
| Strong | 0.50–0.65 |
| Stable | 0.65–0.80 |
| Improve | 0.80–1.0 |
| Act | ≥ 1.0 |

---

### Metabolic

---

#### Fasting Glucose `fasting_glucose`
**What it measures:** Blood sugar level after overnight fast.
**Why it matters:** Core metabolic marker. Noisy day-to-day — affected by sleep, stress, dawn phenomenon. Interpret with HbA1c and insulin for full picture.
**Evidence tier:** A | **Direction:** range | **Unit:** mg/dL

| Band | Range |
|---|---|
| Optimal | 75–90 |
| Strong | 90–99 |
| Stable | 100–109 |
| Improve | 110–125 |
| Act | ≥ 126 |

*Lower optimal bound set at 75 (not 70) to avoid penalizing physiologically normal fasting states. Act threshold aligns with ADA pre-diabetes definition.*

---

#### HbA1c `hba1c`
**What it measures:** 3-month average blood glucose (glycated haemoglobin).
**Why it matters:** Removes day-to-day noise from fasting glucose. Best long-term glycaemic marker.
**Evidence tier:** A | **Direction:** range | **Unit:** % (NGSP)

| Band | Range |
|---|---|
| Optimal | 5.0–5.4% |
| Strong | 5.4–5.6% |
| Stable | 5.6–5.7% |
| Improve | 5.7–6.5% |
| Act | ≥ 6.5% |

---

#### Fasting Insulin `fasting_insulin`
**What it measures:** Insulin level after overnight fast.
**Why it matters:** Early insulin resistance signal — often elevated years before glucose rises. Not included in standard panels; worth requesting.
**Evidence tier:** B | **Direction:** lower is better | **Unit:** μIU/mL

| Band | Range |
|---|---|
| Optimal | < 5 |
| Strong | 5–8 |
| Stable | 8–12 |
| Improve | 12–20 |
| Act | ≥ 20 |

---

#### HOMA-IR `homa_ir`
**What it measures:** Homeostatic Model Assessment of Insulin Resistance — composite of glucose × insulin.
**Why it matters:** The most accessible insulin resistance index from standard fasting labs.
**Formula:** `(fasting_glucose_mgdl × fasting_insulin_uIU) / 405`
**Evidence tier:** B | **Direction:** lower is better | **Unit:** ratio (unitless)

| Band | Range |
|---|---|
| Optimal | < 1.5 |
| Strong | 1.5–2.0 |
| Stable | 2.0–2.5 |
| Improve | 2.5–3.0 |
| Act | ≥ 3.0 |

---

#### TyG Index `tyg_index`
**What it measures:** Triglyceride-glucose index — a lean insulin resistance proxy.
**Why it matters:** Better captures insulin resistance in lean individuals where HOMA-IR can miss.
**Formula:** `ln(TG_mgdl × glucose_mgdl / 2)`
**Evidence tier:** B | **Direction:** lower is better | **Unit:** index (unitless)

| Band | Range |
|---|---|
| Optimal | < 8.3 |
| Strong | 8.3–8.6 |
| Stable | 8.6–8.9 |
| Improve | 8.9–9.2 |
| Act | ≥ 9.2 |

---

#### Uric Acid `uric_acid`
**What it measures:** End product of purine metabolism.
**Why it matters:** Elevated uric acid is associated with metabolic syndrome, gout, and cardiovascular risk. Optimal range is a window — both extremes have downsides.
**Evidence tier:** B | **Direction:** range | **Unit:** mg/dL

| Band | Range |
|---|---|
| Optimal | 4.0–5.5 |
| Strong | 5.5–6.0 |
| Stable | 6.0–7.0 |
| Improve | 7.0–8.0 |
| Act | ≥ 8.0 |

---

### Inflammation

---

#### hs-CRP `hs_crp`
**What it measures:** High-sensitivity C-reactive protein — a sensitive inflammatory marker.
**Why it matters:** Elevated hs-CRP signals systemic inflammation and independently predicts cardiovascular events. Context-sensitive — can be acutely elevated by infection.
**Evidence tier:** A | **Direction:** lower is better | **Unit:** mg/L

| Band | Range |
|---|---|
| Optimal | < 0.5 |
| Strong | 0.5–1.0 |
| Stable | 1.0–2.0 |
| Improve | 2.0–3.0 |
| Act | ≥ 3.0 |

---

#### Homocysteine `homocysteine`
**What it measures:** Amino acid reflecting methylation capacity and B vitamin status.
**Why it matters:** Elevated homocysteine is associated with cardiovascular, cognitive, and inflammatory risk.
**Evidence tier:** B | **Direction:** lower is better | **Unit:** μmol/L

| Band | Range |
|---|---|
| Optimal | < 9 |
| Strong | 9–11 |
| Stable | 11–15 |
| Improve | 15–20 |
| Act | ≥ 20 |

---

#### Ferritin `ferritin`
**What it measures:** Iron storage protein — also an acute phase reactant.
**Why it matters:** Context-dependent. Elevated ferritin can mean iron overload or inflammation. Low ferritin means iron depletion. Interpretation requires transferrin saturation, Hb, MCV, and inflammatory context.
**Evidence tier:** L | **isScored:** false | **Unit:** μg/L

*Unscored by design. Lab reference range shown only.*

---

#### ESR `esr`
**What it measures:** Erythrocyte sedimentation rate — non-specific inflammatory screen.
**Evidence tier:** L | **isScored:** false | **Unit:** mm/hr

#### WBC `wbc`
**What it measures:** White blood cell count — immune activation screen.
**Evidence tier:** L | **isScored:** false | **Unit:** 10⁹/L

---

### Hormonal

---

#### Testosterone (total) `testosterone_total`
**What it measures:** Total testosterone in circulation (bound + free).
**Why it matters:** Directionally useful but not independently actionable — interpretation requires free testosterone, SHBG, and symptoms.
**Evidence tier:** C | **isScored:** false | **Unit:** nmol/L

*Unscored. Trend over time is more meaningful than any single value. Complement with free testosterone and SHBG.*

---

#### Testosterone (free) `testosterone_free`
**What it measures:** Bioavailable (unbound) testosterone fraction.
**Why it matters:** More clinically actionable than total testosterone.
**Evidence tier:** C | **Direction:** range | **Unit:** nmol/L

| Band | Range |
|---|---|
| Optimal | 0.35–0.60 |
| Strong | 0.25–0.35 |
| Stable | 0.20–0.25 |
| Improve | 0.15–0.20 |
| Act | < 0.15 |

---

#### SHBG `shbg`
**What it measures:** Sex hormone-binding globulin — binds testosterone, affecting free fraction.
**Evidence tier:** L | **isScored:** false | **Unit:** nmol/L

---

#### Cortisol `cortisol`
**What it measures:** Primary stress hormone — highly variable by time, fasting status, and acute stress.
**Why it matters:** Draw before 9am fasted for consistency. Context-dependent — a single value has limited interpretive value.
**Evidence tier:** L | **isScored:** false | **Unit:** nmol/L

---

#### DHEA-S `dhea_s`
**What it measures:** Adrenal reserve marker.
**Evidence tier:** C | **isScored:** false | **Unit:** μmol/L

---

#### TSH `tsh`
**What it measures:** Thyroid-stimulating hormone — pituitary signal to the thyroid.
**Why it matters:** Primary thyroid screen. Optimal range is debated; interpret with Free T3 and T4 for complete picture.
**Evidence tier:** L | **isScored:** false | **Unit:** uIU/mL

*Unscored by design. Lab reference range shown. A u-shaped scoring model could be added in a future version.*

---

#### Free T3 `free_t3`
**What it measures:** Active thyroid hormone.
**Evidence tier:** L | **isScored:** false | **Unit:** pmol/L

#### Free T4 `free_t4`
**What it measures:** Thyroid precursor hormone.
**Evidence tier:** L | **isScored:** false | **Unit:** pmol/L

---

#### PSA (total) `psa_total`
**What it measures:** Prostate-specific antigen — prostate health screen.
**Why it matters:** Age-dependent. Bands calibrated for age 40–45.
**Evidence tier:** C | **Direction:** lower is better | **Unit:** ng/mL

| Band | Range |
|---|---|
| Optimal | < 1.0 |
| Strong | 1.0–1.5 |
| Stable | 1.5–2.5 |
| Improve | 2.5–4.0 |
| Act | > 4.0 |

---

### Nutritional

---

#### Vitamin D `vitamin_d`
**What it measures:** 25-hydroxyvitamin D — the storage form of vitamin D.
**Why it matters:** Extremely common deficiency. Affects immunity, bone density, hormonal function, and mood. Both deficiency and toxicity are problematic.
**Evidence tier:** B | **Direction:** range (u-shaped) | **Unit:** nmol/L

| Band | Range |
|---|---|
| Optimal | 75–125 |
| Strong | 50–150 |
| Stable | 37–175 |
| Improve | < 50 or 175–200 |
| Act | ≥ 200 (toxicity) |

---

#### Vitamin B12 `vitamin_b12`
**What it measures:** Cobalamin — neurological and energy function.
**Evidence tier:** C | **Direction:** range | **Unit:** pmol/L

| Band | Range |
|---|---|
| Optimal | 350–700 |
| Strong | 300–900 |
| Stable | ≥ 220 |
| Improve | ≥ 150 |
| Act | < 150 |

---

#### Folate `folate`
**What it measures:** B9 vitamin — methylation and cell production.
**Evidence tier:** C | **isScored:** false | **Unit:** nmol/L

---

#### Serum Iron `serum_iron`
**What it measures:** Acute iron availability in circulation.
**Evidence tier:** L | **isScored:** false | **Unit:** μmol/L

---

#### Transferrin Saturation `transferrin_saturation`
**What it measures:** Percentage of transferrin binding sites occupied by iron.
**Evidence tier:** B | **Direction:** range | **Unit:** %

| Band | Range |
|---|---|
| Optimal | 20–35 |
| Strong | 15–45 |
| Stable | 10–50 |
| Improve | < 15 or 50–60 |
| Act | ≥ 60 |

---

#### Magnesium `magnesium`
**What it measures:** Intracellular mineral — involved in 300+ enzymatic reactions.
**Why it matters:** Rarely tested in standard panels. Worth requesting. Serum magnesium is insensitive — RBC magnesium is better but less available.
**Evidence tier:** C | **Direction:** range | **Unit:** mmol/L

| Band | Range |
|---|---|
| Optimal | 0.85–1.05 |
| Strong | 0.75–1.10 |
| Stable | 0.65–1.20 |
| Improve | ≥ 0.50 |
| Act | < 0.50 |

---

#### Zinc `zinc`
**What it measures:** Immune and hormonal cofactor.
**Evidence tier:** C | **Direction:** range | **Unit:** μmol/L

| Band | Range |
|---|---|
| Optimal | 12–18 |
| Strong | 10–20 |
| Stable | ≥ 8 |
| Improve | ≥ 6 |
| Act | < 6 |

---

### Blood & Organ Function

---

#### AST `ast`
**What it measures:** Aspartate aminotransferase — liver and muscle enzyme.
**Why it matters:** Tighter optimal band than standard lab range. Reflects liver metabolic load.
**Evidence tier:** B | **Direction:** lower is better | **Unit:** U/L

| Band | Range |
|---|---|
| Optimal | < 25 |
| Strong | 25–35 |
| Stable | 35–40 |
| Improve | 40–80 |
| Act | ≥ 80 |

---

#### ALT `alt`
**What it measures:** Alanine aminotransferase — most liver-specific enzyme.
**Evidence tier:** B | **Direction:** lower is better | **Unit:** U/L

| Band | Range |
|---|---|
| Optimal | < 30 |
| Strong | 30–40 |
| Stable | 40–50 |
| Improve | 50–100 |
| Act | ≥ 100 |

---

#### GGT `ggt`
**What it measures:** Gamma-glutamyl transferase — liver/bile marker; sensitive to alcohol.
**Evidence tier:** B | **Direction:** lower is better | **Unit:** U/L

| Band | Range |
|---|---|
| Optimal | < 25 |
| Strong | 25–40 |
| Stable | 40–60 |
| Improve | 60–100 |
| Act | ≥ 100 |

---

#### RDW-CV `rdw_cv`
**What it measures:** Red blood cell distribution width — variability in RBC size.
**Why it matters:** Elevated RDW-CV is associated with nutritional deficiencies and inflammatory states.
**Evidence tier:** B | **Direction:** lower is better | **Unit:** %

| Band | Range |
|---|---|
| Optimal | < 13 |
| Strong | 13–14 |
| Stable | 14–15 |
| Improve | 15–16 |
| Act | ≥ 16 |

---

#### eGFR `egfr`
**What it measures:** Estimated glomerular filtration rate — kidney function.
**Why it matters:** Optimal threshold raised to ≥ 100 for age 40–45 (standard lab ≥ 60 is calibrated for older populations).
**Evidence tier:** A | **Direction:** higher is better | **Unit:** mL/min/1.73m²

| Band | Range |
|---|---|
| Optimal | ≥ 100 |
| Strong | 90–100 |
| Stable | 75–90 |
| Improve | 60–75 |
| Act | < 60 |

---

**Unscored blood markers** (lab range only): RBC, Haemoglobin, Haematocrit, MCV, MCH, MCHC, Platelets, Creatinine, Urea, ALP, Bilirubin (total, direct, indirect)

---

### Vitals

---

#### Systolic BP `systolic_bp`
**Evidence tier:** A | **Direction:** lower is better | **Unit:** mmHg

| Band | Range | Optimal | Strong | Stable | Improve | Act |
|---|---|---|---|---|---|---|
| | | < 120 | 120–130 | 130–140 | 140–160 | ≥ 160 |

#### Diastolic BP `diastolic_bp`
**Evidence tier:** A | **Direction:** lower is better | **Unit:** mmHg

| Band | Optimal | Strong | Stable | Improve | Act |
|---|---|---|---|---|---|
| | < 80 | 80–85 | 85–90 | 90–100 | ≥ 100 |

---

#### Heart Rate `heart_rate`
**Why it matters:** Resting HR in the high-40s is normal for fit individuals — optimal lower bound set at 45, not 50.
**Evidence tier:** B | **Direction:** range | **Unit:** bpm

| Band | Range |
|---|---|
| Optimal | 45–60 |
| Strong | 60–70 |
| Stable | 70–80 |
| Improve | 80–90 |
| Act | ≥ 90 |

---

#### BMI `bmi`
**Why it matters:** Waist circumference and body fat % are superior risk markers. BMI is kept as a visible metric but unscored.
**Evidence tier:** C | **isScored:** false | **Unit:** kg/m²

---

#### Waist Circumference `waist_cm`
**Evidence tier:** A | **Direction:** lower is better | **Unit:** cm

| Band | Range |
|---|---|
| Optimal | < 85 |
| Strong | 85–90 |
| Stable | 90–94 |
| Improve | 94–102 |
| Act | ≥ 102 |

---

#### Body Fat % `body_fat_pct`
**Evidence tier:** B | **Direction:** lower_is_better | **Unit:** %
*(Replaces BMI as primary body composition metric)*

| Band | Range |
|---|---|
| Optimal | < 18 |
| Strong | 18–22 |
| Stable | 22–25 |
| Improve | 25–30 |
| Act | ≥ 30 |

---

#### Visceral Fat Rating `visceral_fat`
**Evidence tier:** B | **Direction:** lower_is_better | **Unit:** rating (Tanita scale 1–12)

| Band | Range |
|---|---|
| Optimal | < 5 |
| Strong | 5–7 |
| Stable | 7–9 |
| Improve | 9–13 |
| Act | ≥ 13 |

---

#### Muscle Mass `muscle_mass_kg`
**Evidence tier:** B | **Scored:** No | **Unit:** kg
Tracked but not scored — too age/sex dependent for fixed bands.

---

#### TSH `tsh`
**Evidence tier:** B | **Direction:** u_shaped | **Unit:** uIU/mL

U-shaped metric: both too low (hyperthyroid) and too high (hypothyroid) are harmful.
Scoring rule: only the optimal zone is identified. Outside it, no badge is assigned.

| Band | Range |
|---|---|
| Optimal | 0.5–2.0 |
| Outside | no badge |

---

## Fitness Metrics (implemented in Vitals & Fitness page)

CPET data imported from Welspro Sport Clinic test (9 Jul 2025).
These metrics live under the `vitals` category and display in the FITNESS section of `/metrics/vitals`.

#### VO₂ Max `vo2_max`
**Evidence tier:** A | **Direction:** higher_is_better | **Unit:** ml/min/kg
Strongest single longevity predictor. Bands based on Attia framework (male, age-adjusted for 30s).

| Band | Range |
|---|---|
| Optimal | ≥ 50 |
| Strong | 45–50 |
| Stable | 37–45 |
| Improve | 30–37 |
| Act | < 30 |

#### Anaerobic Threshold HR `at_hr`
**Evidence tier:** B | **Scored:** No | **Unit:** bpm
Training zone calibration. Unscored — value depends on fitness level and test protocol.

#### Max Heart Rate `max_hr`
**Evidence tier:** C | **Scored:** No | **Unit:** bpm
Reference for training zones. Unscored.

#### HR Recovery (1 min) `hr_recovery_1min`
**Evidence tier:** A | **Direction:** higher_is_better | **Unit:** bpm
Drop in heart rate 1 minute after peak exercise. Strong autonomic health marker.

| Band | Range |
|---|---|
| Optimal | ≥ 25 |
| Strong | 20–25 |
| Stable | 15–20 |
| Improve | 12–15 |
| Act | < 12 |

---

*Last updated: 2026-06-05*
*Source of truth for band values: `lib/metrics.ts`*
*Previous: taxonomy.md · design.md · components.md*
