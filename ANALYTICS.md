# Glucomove Analytics — Working Document

> Last updated: 2026-07-31 (rev 2)
> Status: Pre-build. Capturing assumptions and design intent before sufficient data exists.
> Revisit when: ~15 meals + ~15 events logged. Build view when sample per category ≥ 8.

---

## Goal

Give a concrete, data-backed strategy for managing glucose. Move from "I know the general rules" to "here's what actually works for my body, with this specific data."

---

## Data context

- **Logging period**: 2 weeks to start
- **Expected sample**: ~15–20 meals, ~15–20 events
- **CGM cadence**: ~5 min readings via Apple Health sync
- **Key constraint**: Small sample size means we must be conservative about how many variables we stratify by. Cross-tab analysis (e.g. modifier × carb type × portion) will likely be underpowered. Start simple.

---

## Carb groupings

Rather than analysing by individual `primary_carb_source`, group into two tiers for the initial pass:

| Group | Sources |
|---|---|
| **Simple carbs** | white rice, bread, pasta, noodles/flour, sugar/dessert |
| **Complex carbs** | red/brown rice, wholewheat pasta, quinoa, cauliflower rice |
| **Fruit** | standalone fruit meals/snacks (kiwi, banana, mango, etc.) |
| **Low/no carb** | none |

*Rationale: individual source categories will have too few meals each at this scale.*

**Why fruit is its own group**: fruit behaves very differently from other simple carbs — fructose metabolism is slower, fiber content varies a lot (kiwi vs mango), and the context (snack vs post-meal) completely changes the glucose impact. Lumping it with "simple carbs" would obscure one of the most actionable questions in this dataset.

**Deferred constraint**: Carb prominence (hero vs supporting vs moderate) matters — hero white rice and supporting white rice are very different metabolically. Omit this split for now; revisit if sample grows or patterns are unclear.

---

## Analytical questions — Priority 1 (single variable)

These need lower sample sizes and are most immediately actionable.

### 1a. Carb group vs glucose response
- **Metric**: average spike (mmol/L), average time to peak, average recovery time
- **Grouping**: simple vs complex vs low/no carb
- **Expected signal**: simple carbs → higher spike, faster peak, potentially slower recovery
- **Minimum data**: ~5 meals per group

### 1b. Modifier efficacy
- **Modifiers to test**: fat buffer before, ACV before, movement after, structured eating, cooled starch, fruit after, dessert after
- **Method**: within same carb group (simple carbs), compare meals with modifier vs without
- **Metric**: spike delta — `avg spike (with modifier) − avg spike (without modifier)`, and recovery time
- **Key caveat**: not controlled for portion. A meal with walking after might also be a lighter meal. Keep this in mind when interpreting.
- **Minimum data**: ~4–5 meals per modifier state within same carb group
- **Note — fruit after and dessert after**: these are not yet in the data model. Needs two new boolean fields: `fruit_after` and `dessert_after` on `glucomove_meals`. Log these via Telegram until then with a note.

### 1b-special. Fruit timing — snack vs post-meal
- **This is a priority analytical question** — actionable and specific.
- **Question A — snack**: how does standalone fruit (snack meal, fruit carb group) compare to other snack types? Spike, time to peak, recovery.
- **Question B — post-meal**: does eating fruit immediately after a main meal attenuate or amplify the glucose response compared to the same meal without fruit after?
- **Method for B**: compare meals tagged `fruit_after = true` vs same carb group without, looking at the extended curve (90–120 min). The main meal's curve + the fruit contribution will overlap — this is expected and interesting.
- **Hypothesis**: fruit after a meal may blunt the peak slightly (fiber + fructose slowing absorption) or may add a secondary bump. Real data will tell.
- **Minimum data**: ~4 post-meal fruit instances, ~4 standalone fruit snacks

### 1c. Fiber / protein / fat prominence vs spike
- **Question**: does a high-fiber or high-protein meal consistently attenuate the spike vs low-fiber equivalent?
- **Grouping**: same carb group, split by prominence level (low vs high; collapse moderate for now)
- **Minimum data**: ~4 per prominence level per carb group — probably underpowered at this scale. Flag as directional only.

---

## Analytical questions — Priority 2 (contextual / day-level)

These require more data and more careful framing. Build these views later.

### 2a. Spike carryover
- **Question**: does a large morning spike elevate the baseline of the next meal?
- **Method**: for each meal, look at the baseline reading. Classify the previous meal's spike as large (>2.0 mmol/L) or small (≤2.0). Compare baselines.
- **Why it matters**: if yes, morning food choices have downstream consequences — changes the breakfast strategy significantly.
- **Minimum data**: ~10 consecutive day records with multiple meals per day

### 2b. Event impact on subsequent meal glucose
- **Question**: does exercise before a meal lower the spike for that meal?
- **Method**: for each meal, check if an exercise event occurred within the prior 4 hours. Compare spike vs meals without prior exercise.
- **Types**: strength training vs cardio may differ — keep event type in the grouping if sample allows.
- **Minimum data**: ~6–8 meals with prior exercise events

### 2c. Day glucose quality
- **Define a "good glucose day"**:
  - Daily avg ≤ 6.0 mmol/L
  - No spike > 2.5 mmol/L above baseline
  - Overnight avg ≤ 5.5 mmol/L
  - Waking glucose ≤ 5.5 mmol/L
- **Use**: track trend over the 2-week period. Are days getting better, stable, or drifting?
- **View**: simple timeline — good / ok / off — per day. Not statistical, just directional.

### 2d. What habits correlate with good glucose days?
- **Very exploratory** at this sample size — treat as qualitative pattern spotting, not statistics.
- Look across good vs off days: what modifiers were used, what carb groups were eaten, was there exercise, what was the event load?
- This probably needs 3–4 weeks of data before it's readable.

---

## Visualisation assumptions (deferred to build phase)

- Bar/column charts are excluded per design system. Use dot plots or small multiples for distribution.
- Always show N (sample count) alongside any aggregate metric — never show an average without context.
- Flag low-confidence results (N < 4) visually as provisional.
- Outlier meals (potential sensor issue flagged) excluded from aggregates by default.
- Time range filter: default to "all time" for now given small sample. Add date range later.

---

## Open questions to revisit

- [x] ~~Should fruit be its own carb group?~~ Yes — fruit is its own group.
- [ ] How to handle mixed meals (e.g. high-fiber + high-protein + simple carbs)? Currently, each attribute is analysed independently.
- [ ] At what spike magnitude does carryover become meaningful? (Threshold TBD with data)
- [ ] Is 0.6 mmol/L the right return-to-baseline tolerance? Could make recovery times look artificially short.
- [ ] Should modifier analysis weight by carb prominence? (e.g. ACV + hero rice vs ACV + supporting rice are very different)

---

## Update log

| Date | Notes |
|---|---|
| 2026-07-31 | Initial document. Pre-data. Assumptions from design discussion. |
| 2026-07-31 | Rev 2: fruit as own carb group; added fruit-after and dessert-after modifiers; fruit timing as priority analytical question; clarified 0.6 mmol/L return tolerance as open question. |
