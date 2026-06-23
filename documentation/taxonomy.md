# taxonomy.md
### Personal Health Ontology — Blood Work & Medical Results

> This document defines how health metrics are categorized for decision-making purposes.
> It intentionally departs from standard lab categorization (which is instrument-driven)
> in favor of a question-driven model: each category answers a specific health question.
>
> Status: v2 — decisions locked, ready for schema work.

---

## Principles

1. **Question-driven, not instrument-driven.** Categories are defined by the decision they support, not by how the lab groups the test.
2. **Metrics can belong to multiple categories.** A marker like triglycerides is both metabolic and cardiovascular. The taxonomy reflects this.
3. **Categories are stable; metrics within them may expand.** As new tests are added, they slot into existing categories. New categories should only be created when a new *decision domain* is identified.
4. **DNA and genetic data is out of scope for v1.** It is static, not time-series, and requires a different interpretive model.
5. **Sparse data is honest data.** Metrics that appear on some tests but not others are displayed as-is. The landing view shows the latest available reading per metric regardless of when it was taken. The metric detail view shows full progression across all available data points, gaps included.
6. **Units are standardized to SI at the point of entry.** All conversions happen on input. Everything stored and displayed downstream uses SI units only.

---

## Scoring System

Each scored metric is evaluated against a set of **band ranges** — five half-open intervals covering the full value spectrum. The current value falls into exactly one band, which determines its badge.

### The 5-badge system

| Badge | Label | Meaning |
|---|---|---|
| `optimal` | **Optimal** | Best achievable — longevity-supporting target met |
| `strong` | **Strong** | Very good — above standard clinical normal |
| `stable` | **Stable** | Clinically normal — no concern, room to improve |
| `improve` | **Improve** | Below ideal — worth actively addressing |
| `act` | **Act** | Outside acceptable range — needs attention |

**Framing philosophy:** the scale reads positively downward — Optimal and Strong are wins, Stable is baseline fine, Improve is a prompt, Act is the only genuine concern. Most readings for a health-conscious person should be Optimal or Strong.

### Band ranges

Each band is a half-open interval `[lo, hi)` — meaning `lo ≤ value < hi`. `null` on either end means open (no bound).

Examples:
- `optimal: [null, 70]` → value < 70
- `strong: [70, 100]` → 70 ≤ value < 100
- `act: [190, null]` → value ≥ 190

Bands are defined per metric in `metrics.md`. The full catalog with all band values lives in `lib/metrics.ts`.

### Metric scoring flags

| Flag | Value | Meaning |
|---|---|---|
| `isScored` | `true` | Badge computed from band ranges, shown in UI |
| `isScored` | `false` | Lab range shown only, no badge |
| `evidenceTier` | `A` | Strong outcome data — surface aggressively |
| `evidenceTier` | `B` | Useful preventive marker |
| `evidenceTier` | `C` | Context-dependent — interpret with symptoms/history |
| `evidenceTier` | `L` | Lab range only — unscored by design |

### Direction types

Each scored metric has a `direction` that describes its relationship to health:

| Direction | Meaning | Example |
|---|---|---|
| `lower_is_better` | Lower values are healthier | LDL-C, ApoB, hs-CRP |
| `higher_is_better` | Higher values are healthier | HDL-C, eGFR, Vitamin D |
| `range` | Optimal is a specific window | Fasting glucose, HbA1c, TSH |
| `u_shaped` | Both extremes are problematic | Ferritin, SHBG |

### Unscored metrics

Some metrics are intentionally unscored (`isScored: false`). Reasons:
- **Context-dependent interpretation** — value alone is insufficient (Cortisol, Testosterone total)
- **No meaningful optimal target** — lab range is the only reference (RBC, Platelets, Bilirubin)
- **Requires companion markers** — interpretation depends on other values (SHBG, Free T3)

These still appear in the UI with their lab range shown. No badge is computed or displayed.

---

## Attention States
> Computed automatically from band ranges. Never manually assigned.

| Badge | Key | Color |
|---|---|---|
| Optimal | `optimal` | `#4A8C62` |
| Strong | `strong` | `#A8882A` |
| Stable | `stable` | `#A8882A` (70% opacity in spectrum) |
| Improve | `improve` | `#B5522A` |
| Act | `act` | `#A03828` |

Badge computation is defined in `lib/metrics.ts → computeStatusBadge()`. Stored in `readings.attention_state` at write time — never recalculated on read.

---

## Contextual Annotations

Any test entry can carry a free-text note attached to it. This is especially important for **context-sensitive metrics** — markers whose readings are significantly affected by short-term conditions.

Annotations are attached to the **test entry**, not to the metric globally. They appear when viewing that specific data point in a metric's progression timeline.

**Metrics where annotation is strongly recommended:**

| Metric | Why context matters |
|---|---|
| hs-CRP | Elevated by acute infection, illness, injury |
| Fasting glucose | Affected by sleep, stress, recent diet |
| Cortisol | Highly variable by time of day, stress, sleep |
| WBC | Elevated during infection or immune response |
| Ferritin | Acute phase reactant — rises with inflammation |
| HbA1c | Reflects 3-month average; recent changes not captured |
| Homocysteine | Affected by recent B vitamin intake |

---

## Unit Standardization

Canonical units are chosen to match Siloam MRCCC reporting (the primary lab). Conversions applied at input stage — everything stored and displayed downstream uses canonical units only.

| Metric | Canonical Unit | Common Alternative | Conversion to Canonical |
|---|---|---|---|
| Lipids (LDL, HDL, TC, non-HDL, ApoB, ApoA1) | mg/dL | mmol/L | × 38.67 |
| Triglycerides | mg/dL | mmol/L | × 88.57 |
| Lp(a) | mg/dL | nmol/L | non-linear (particle size dependent) — use lab-reported mg/dL directly |
| Fasting glucose | mg/dL | mmol/L | × 18.0 |
| HbA1c | % (NGSP) | mmol/mol | (mmol/mol + 2.15 × 10.929) / 10.929 |
| Fasting insulin | μIU/mL | pmol/L | ÷ 6.945 |
| Uric acid | mg/dL | μmol/L | ÷ 59.48 |
| Creatinine | mg/dL | μmol/L | ÷ 88.42 |
| Free T3 | pmol/L | pg/mL | × 1.536 |
| Free T4 | pmol/L | ng/dL | × 12.87 |
| TSH | uIU/mL | mIU/L | 1:1 (same) |
| Testosterone (total) | nmol/L | ng/dL | ÷ 28.84 |
| Haemoglobin, MCHC | g/dL | g/L | ÷ 10 |
| Vitamin D (25-OH) | nmol/L | ng/mL | × 2.496 |
| Homocysteine | μmol/L | mg/L | × 7.397 |
| Cortisol | nmol/L | μg/dL | × 27.59 |
| hs-CRP | mg/L | mg/dL | × 10 |

---

## Categories

---

### 1. Metabolic Health
> *How well am I processing energy?*

The metabolic category tracks how efficiently the body converts, stores, and regulates fuel. Most directly modifiable through diet and lifestyle — primary lens for experimentation.

| Metric | SI Unit | Lab Range | Optimal Range (Attia) | Notes |
|---|---|---|---|---|
| Fasting glucose | mmol/L | 3.9–6.0 | 3.9–5.0 | Core metabolic marker |
| HbA1c | mmol/mol | <48 | <39 | 3-month average blood sugar |
| Fasting insulin | μIU/mL | 2.6–24.9 | <6 | Often not in standard panels |
| HOMA-IR | calculated | <2.5 | <1.0 | Glucose × insulin ÷ 405 |
| Triglycerides | mmol/L | <1.7 | <1.1 | Also in cardiovascular |
| Uric acid | μmol/L | 200–420 | 180–320 | Metabolic load indicator |

**Cross-listed in:** Cardiovascular Risk (triglycerides)
**Annotation recommended:** Fasting glucose, HbA1c

---

### 2. Cardiovascular Risk
> *What is my long-term heart and vascular risk?*

Markers most predictive of cardiovascular events over time. Primary domain for lipid experimentation.

| Metric | SI Unit | Lab Range | Optimal Range (Attia) | Notes |
|---|---|---|---|---|
| Total cholesterol | mmol/L | <5.2 | context-dependent | Read with ApoB, not in isolation |
| LDL-C | mmol/L | <3.4 | <1.8 | Standard lipid marker |
| HDL-C | mmol/L | >1.0 (M) / >1.3 (F) | >1.6 | Protective; higher generally better |
| Non-HDL cholesterol | mmol/L | <3.4 | <2.2 | Total minus HDL |
| Triglycerides | mmol/L | <1.7 | <1.1 | Also in metabolic |
| ApoB | g/L | <1.0 | <0.7 | More predictive than LDL-C |
| Lp(a) | nmol/L | <75 | <30 | Largely genetic; treat as stable baseline — retest every 2–3 years only |
| hs-CRP | mg/L | <3.0 | <0.8 | Also in inflammation |

**Cross-listed in:** Metabolic Health (triglycerides), Inflammation & Oxidative Stress (hs-CRP)
**Annotation recommended:** hs-CRP

---

### 3. Inflammation & Oxidative Stress
> *Is something chronically activated that shouldn't be?*

Systemic inflammatory load — useful as a standalone signal and as interpretive context for other categories.

| Metric | SI Unit | Lab Range | Optimal Range | Notes |
|---|---|---|---|---|
| hs-CRP | mg/L | <3.0 | <0.8 | Most common inflammatory marker |
| Homocysteine | μmol/L | <15 | <9 | Cardiovascular + inflammatory risk |
| Ferritin | μg/L | 30–400 (M) | 50–150 | Also acute phase reactant |
| ESR | mm/hr | <20 (M) | <10 | General inflammatory screen |
| WBC | ×10⁹/L | 4.0–11.0 | 4.0–7.0 | Elevated = immune activation |

**Cross-listed in:** Cardiovascular Risk (hs-CRP, homocysteine), Blood & Organ Function (ferritin, WBC)
**Annotation recommended:** hs-CRP, ferritin, WBC

---

### 4. Hormonal Balance
> *Are my regulatory systems functioning and in balance?*

Hormones govern energy, mood, recovery, body composition, and stress response. Changes here are often upstream causes of symptoms visible in other categories.

| Metric | SI Unit | Lab Range | Optimal Range (Attia) | Notes |
|---|---|---|---|---|
| Testosterone (total) | nmol/L | 9.9–27.8 | 17.4–24.3 | Primary androgen |
| Testosterone (free) | pmol/L | 174–729 | 350–600 | Bioavailable fraction; more actionable |
| SHBG | nmol/L | 16.5–55.9 | 20–40 | Binds testosterone; affects free levels |
| Cortisol (AM fasted) | nmol/L | 171–536 | 300–500 | Draw before 9am fasted for consistency |
| DHEA-S | μmol/L | 4.3–12.2 | 6.0–10.0 | Adrenal reserve marker |
| TSH | mIU/L | 0.4–4.0 | 0.5–2.0 | Thyroid screen; lower optimal |
| Free T3 | pmol/L | 3.1–6.8 | 4.5–6.5 | Active thyroid hormone |
| Free T4 | pmol/L | 12–22 | 15–20 | Thyroid precursor |

**Annotation recommended:** Cortisol (note time of draw and fasting status)

---

### 5. Nutritional Status
> *Am I deficient in anything foundational?*

Often silent deficiencies with downstream effects on energy, immunity, cognition, and hormonal function. Most directly correctable category.

| Metric | SI Unit | Lab Range | Optimal Range | Notes |
|---|---|---|---|---|
| Vitamin D (25-OH) | nmol/L | 50–125 | 100–150 | Extremely common deficiency |
| Vitamin B12 | pmol/L | 148–664 | 300–500 | Neurological and energy function |
| Folate | nmol/L | >6.8 | >20 | Methylation and cell production |
| Ferritin | μg/L | 30–400 (M) | 50–150 | Iron stores; also in inflammation |
| Serum iron | μmol/L | 9–30 | 12–25 | Acute iron availability |
| Transferrin saturation | % | 20–50 | 25–40 | Iron transport efficiency |
| Magnesium | mmol/L | 0.7–1.0 | 0.85–1.0 | Often not tested; worth requesting |
| Zinc | μmol/L | 11–18 | 14–18 | Immune and hormonal cofactor |

**Cross-listed in:** Inflammation & Oxidative Stress (ferritin)

---

### 6. Blood & Organ Function
> *Are my organs handling their load, and is my blood healthy?*

Closest to standard lab groupings. Less frequently the focus of active experimentation but essential for baseline monitoring and early detection.

| Metric | SI Unit | Lab Range | Notes |
|---|---|---|---|
| RBC | ×10¹²/L | 4.5–5.9 (M) | Red blood cell count |
| Haemoglobin | g/L | 130–175 (M) | Oxygen carrying capacity |
| Haematocrit | % | 40–52 (M) | RBC volume fraction |
| MCV | fL | 80–100 | B12/iron deficiency signal |
| WBC | ×10⁹/L | 4.0–11.0 | Immune cell count |
| Platelets | ×10⁹/L | 150–400 | Clotting function |
| ALT | U/L | 7–56 | Liver enzyme; most sensitive |
| AST | U/L | 10–40 | Liver + muscle |
| GGT | U/L | 9–48 (M) | Liver/bile; alcohol sensitive |
| ALP | U/L | 44–147 | Liver/bone marker |
| Total bilirubin | μmol/L | 3–21 | Liver clearance |
| Creatinine | μmol/L | 62–115 (M) | Kidney function |
| eGFR | mL/min/1.73m² | >60 | Kidney filtration rate |
| Urea / BUN | mmol/L | 2.5–7.1 | Kidney + protein metabolism |

> Note: Optimal ranges for Blood & Organ Function default to lab ranges unless specific evidence supports a tighter target. This category is primarily reactive monitoring, not optimization.

**Cross-listed in:** Inflammation & Oxidative Stress (WBC)
**Annotation recommended:** WBC

---

## Category Summary

| # | Category | Core Question | Primary Use |
|---|---|---|---|
| 1 | Metabolic Health | How well am I processing energy? | Experimentation, lifestyle tracking |
| 2 | Cardiovascular Risk | What is my long-term heart risk? | Lipid experiments, long-term monitoring |
| 3 | Inflammation & Oxidative Stress | Is something chronically activated? | Context and early warning |
| 4 | Hormonal Balance | Are my regulatory systems in balance? | Symptom correlation, optimization |
| 5 | Nutritional Status | Am I deficient in anything foundational? | Correction and maintenance |
| 6 | Blood & Organ Function | Are my organs handling their load? | Baseline monitoring, reactive screening |

---

## Decisions Log

| Decision | Resolution |
|---|---|
| Scoring system | 5-badge system: Optimal / Strong / Stable / Improve / Act. Replaces original 4-state system. Finer resolution — distinguishes between "great" and "good" which the 4-state system couldn't. |
| Canonical units | mg/dL for all lipids and glucose (Siloam MRCCC standard). Not mmol/L as originally specified. |
| Unscored metrics | TSH, Testosterone total, SHBG, Cortisol, Free T3, Free T4, BMI, Ferritin — marked `isScored: false`. Context-dependent or insufficient standalone signal. |
| Lp(a) units | Stored in mg/dL (lab-reported). Previous spec assumed nmol/L — updated to reflect actual lab output. |
| Sparse metrics | Show latest available on landing; full progression with gaps on metric detail view. |
| Lp(a) frequency | Treat as stable baseline marker. Retest every 2–3 years. No trending needed. |
| Noisy metrics | Contextual annotations attached per experiment, not per reading globally. |
| DNA data | Out of scope for v1. |
| Fitness category | CPET markers (VO₂ max, VT1/VT2, HR recovery) planned for v2 as a `fitness` category. |

---

*Last updated: draft v2*
*Next step: design.md*
