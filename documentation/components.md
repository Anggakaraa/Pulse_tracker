# components.md
### UI Components & View Specifications — Personal Health Record

> This document defines every UI component and view in the product.
> It is built on top of design.md — all color, typography, spacing, and motion
> decisions reference that document and are not repeated here.
>
> Status: v1 — ready for implementation.

---

## Layout Shell

### Structure
Every view shares the same shell: a fixed dark sidebar on the left, an ivory main content area on the right.

```
┌─────────────────────────────────────────────────┐
│  Sidebar (185px fixed)  │  Main content (fluid)  │
│  background: #2A2520    │  background: #FBF8F0   │
└─────────────────────────────────────────────────┘
```

- Sidebar is fixed width — never collapses on desktop
- Main content area scrolls independently
- On tablet (768–1279px): sidebar becomes a top navigation bar
- On mobile (≤767px): sidebar becomes a bottom drawer, triggered by a menu icon

### Sidebar anatomy

**Header**
- Product name "Pulse" — Outfit 600, 14px, `#FBF8F0`
- Top padding 20px

**Navigation section**
- Label: "Views" — DM Sans 300, 9px, uppercase, tracked, `rgba(251,248,240,0.30)`
- Items: Dashboard, Experiments, Test log, Upload
- Item typography: DM Sans 400, 12px, `rgba(251,248,240,0.55)`
- Active item: background `rgba(251,248,240,0.08)`, color `#FBF8F0`
- Item padding: 7px 8px, border-radius 4px
- Each item has a small inline SVG icon, 12×12px, same color as text

**Divider**
- 1px, `rgba(251,248,240,0.08)`, margin 10px 0

**Categories section**
- Label: "Categories" — same style as Views label
- Items: one per taxonomy category with a 6px colored dot
- Dot colors match category palette
- Active category: same active state as nav items
- Clicking a category navigates to its metric detail view

---

## Component Library

---

### C-01 · Category Card
> Used on: Dashboard

The primary dashboard surface. Full category color fill, ivory text.

**Anatomy (top to bottom):**
1. **Eyebrow row** — category name (Outfit 600, 10px, uppercase, tracked, `rgba(251,248,240,0.60)`) + status dot (right-aligned, 5px circle)
2. **Featured value** — display number (Outfit 800, 32px, `#FBF8F0`) + unit (DM Sans 300, 11px, `rgba(251,248,240,0.55)`)
3. **Metric name** — DM Sans 400, 11px, `rgba(251,248,240,0.60)`
4. **Footer row** — 5px status dot + plain-language summary (DM Sans 400, 10px, `rgba(251,248,240,0.60)`)

**Status dot logic:**
- Clear: `rgba(251,248,240,0.90)` — white, no border
- Watch: `#A8882A` with `1px solid rgba(251,248,240,0.30)` border
- Sub-optimal: `#B5522A` with `1px solid rgba(251,248,240,0.30)` border
- Needs attention: `#A03828` with `1px solid rgba(251,248,240,0.30)` border

**Featured metric priority stack:**
System shows the highest-priority metric available from the most recent test.
Composite metrics are auto-calculated when component markers are available.

| Category | Priority 1 | Priority 2 | Priority 3 |
|---|---|---|---|
| Metabolic | HOMA-IR (composite) | TyG index (composite) | HbA1c |
| Cardiovascular | ApoB / ApoA1 (ratio) | ApoB | TG / HDL ratio (composite) |
| Inflammation | hs-CRP | Homocysteine | Ferritin |
| Hormonal | Free testosterone | TSH | Free T3 |
| Nutritional | Vitamin D | Ferritin | Vitamin B12 |
| Blood & Organ | eGFR | ALT | Haemoglobin |

**No data state:**
- Card keeps category color fill
- Shows "No recent data" in place of the number — DM Sans 300, italic
- Shows date of last known reading if available

**Dimensions:** flexible width, fixed in a 3-column grid with 12px gaps. Card padding 24px.

**Interaction:** hover → Level 1 elevation (subtle shadow, no border change). Click → navigates to category metric detail view.

---

### C-02 · Metric Row (Collapsed)
> Used on: Metric Detail view

A single scannable row representing one metric within a category.

**Anatomy (left to right):**
1. **Category dot** — 6px circle, category color
2. **Metric name** — DM Sans 400, 12px, `#2A2520`, flex-grow
3. **Current value** — Outfit 600, 13px, `#2A2520` + unit DM Sans 300, 10px, `#8A8178`
4. **Status badge** — see C-04
5. **Range summary** — DM Sans 400, 10px, `#8A8178`, right-aligned (e.g. "Opt 0.7–1.8 · Lab <3.4")
6. **Expand chevron** — ▼, 9px, `#8A8178`

**States:**
- Default: no background, full-width row, 16px 20px padding
- Hover: background `#F4EFE3`, transition 150ms opacity
- Expanded: background `#F4EFE3`, chevron rotates to ▲

**Interaction:** click anywhere on row to expand/collapse. Only one row expanded at a time.

---

### C-03 · Metric Row (Expanded)
> Used on: Metric Detail view — inline below C-02 when expanded

The detail panel that appears below a collapsed metric row when tapped.

**Anatomy (top to bottom):**
1. **Value + deltas** — display number (Outfit 800, 42px) + unit + two delta lines below (DM Sans 400, 11px, attention state color: ↓ green if improving, ↑ red if worsening)
2. **Stat blocks row** — three blocks side by side: Optimal range, Lab range, Last tested. Each block: label DM Sans 300 9px uppercase + value Outfit 600 12–14px
3. **Trend chart** — see C-07
4. **Annotation** — DM Sans 400, 11px, `#8A8178`, italic if empty ("No annotations yet — add a note for context.")

**Background:** `#F4EFE3`, border-radius 0 0 6px 6px (bottom corners only — top connects flush to the collapsed row above)
**Padding:** 14px

---

### C-04 · Status Badge
> Used on: Metric Row, Category Card, Upload review rows

Small inline badge encoding attention state.

| State | Label | Color | Framing |
|---|---|---|---|
| clear | **Optimal** | `#4A8C62` | Positive — within optimal range |
| watch | **Good** | `#A8882A` | Positive — within optimal, near boundary |
| suboptimal | **Pass** | `#B5522A` | Neutral — clinically fine, not longevity-supporting |
| attention | **At risk** | `#A03828` | Concern — outside lab range |

Typography: Outfit 600, 10px, letter-spacing 0.1em, uppercase
Shape: border-radius 0 4px 4px 0 — square left edge, slightly rounded right
Width: fixed `minWidth: 100px` — all badges same width, locked to widest label
No background fill on any state.

Context rules:
- Metric detail view: status label appears alone — category already declared by page header
- Test log: plain text summary count only — no badge needed
- Experiment table: status encoded in value color — no badge needed
- Cross-category summary: status label appears alongside category pill — the only context where both coexist

**Never manually set** — always computed from data

---

### C-05 · Category Pill
> Used on: Experiment view, Test log entries, Upload review

Colored pill identifying which category a metric belongs to.

**Background:** category color
**Text:** `#FBF8F0`, Outfit 600, 10px, uppercase, tracked 0.08em
**Dimensions:** padding 3px 8px, border-radius 4px
**Usage:** always represents a category, never a status

---

### C-06 · Stat Block
> Used on: Metric Row (expanded), Metric Detail

A small labelled data block. Used in groups of 2–4.

**Anatomy:**
- Label: DM Sans 300, 9px, uppercase, tracked, `#8A8178`
- Value: Outfit 600, 12–14px, `#2A2520` (or attention state color where relevant)

**Background:** `#F4EFE3`, border-radius 4px, padding 7px 10px
**Sizing:** equal flex-width within their row

---

### C-07 · Trend Chart
> Used on: Metric Row (expanded), Experiment view

A line chart showing metric progression over time.

**Specifications:**
- Line: 2px, category color, no area fill
- Reference bands: optimal (green `#4A8C62` at 15% opacity), lab range (amber `#A8882A` at 8% opacity)
- Dot behavior: 2px tick dots at data points (default for irregular intervals), no dots for regular intervals
- Hover: value tooltip surfaces on data point hover — DM Sans 400, 12px
- Axes: y-axis 3–4 values max (DM Sans 300, 11px, `#8A8178`), x-axis hairline (0.5px, `#EAE3D3`) with date labels in meta style
- No gridlines
- Background: transparent (inherits parent surface)
- Animation: none — data appears, does not animate in

**Sparse data rules:**
| Readings | Treatment |
|---|---|
| 1 | Single dot + value label. No line, no bands. |
| 2 | Line only. No bands. |
| 3+ | Full treatment — line, bands, tick dots |

**Experiment window:** when a chart appears inside an experiment view, the experiment date range is highlighted as a shaded region (category color at 8% opacity) behind the chart.

---

### C-08 · Experiment Progression Table
> Used on: Experiment view

The primary data surface for experiments. Metrics as rows, test dates as columns.

**Header row:**
- First column: empty (metric names below)
- Date columns: DM Sans 300, 10px, uppercase, right-aligned
- First date column labelled "Baseline"
- Final column: "Optimal" — shows target range

**Data rows:**
- Metric name cell: 6px category dot + DM Sans 400, 12px + unit in `#8A8178`
- Value cells: Outfit 600, 13px, colored by attention state
- Arrow indicator: ↓ (green) or ↑ (red) showing direction vs previous reading, 10px
- Empty cell (metric not tested that date): `—` in `#8A8178`

**Table styling:**
- Row dividers: 1px `#EAE3D3`
- No column borders
- Cell padding: 8px 10px
- Alternating row background: none (white only)

---

### C-09 · Test Log Entry
> Used on: Test log view

A single row representing a complete lab test visit.

**Anatomy:**
- **Left:** Date (Outfit 600, 14px) + lab name and marker count (DM Sans 400, 11px, `#8A8178`) + category pills (C-05, small variant 9px)
- **Right:** Quick status summary (DM Sans 400, 11px, attention state color) + chevron

**Background:** `#F4EFE3`, border-radius 6px, padding 12px 14px
**Interaction:** click → opens Test Detail view for that test
**Older entries:** reduce opacity to 60% for tests older than 12 months

---

### C-10 · Upload Review Row
> Used on: Upload / Entry view

A single parsed metric row in the review step before saving.

**Three states:**

| State | Indicator | Description |
|---|---|---|
| Confirmed | ✓ green icon | Parsed correctly, ready to save |
| Needs review | ✎ amber icon | Value parsed but unit or mapping uncertain |
| Unmapped | ⚠ red border + icon | Metric name not recognised — needs manual mapping |

**Anatomy:** metric name (DM Sans 400, 12px) + value + unit (Outfit 600, 14px) + state indicator
**Background:** `#F4EFE3`, border-radius 4px, padding 8px 12px
**Never auto-saves** — user must confirm before any data writes to database

---

### C-11 · Primary Button
> Used on: Upload (Save test), confirmations

**Background:** `#2A2520` (ink)
**Text:** `#FBF8F0`, DM Sans 400, 12px
**Padding:** 6px 14px, border-radius 4px
**Hover:** opacity 0.85, 150ms

---

### C-12 · Ghost Button
> Used on: Cancel actions, secondary actions

**Background:** transparent
**Border:** 1px `#EAE3D3`
**Text:** `#8A8178`, DM Sans 400, 12px
**Padding:** 6px 14px, border-radius 4px
**Hover:** background `#F4EFE3`, 150ms

---

### C-13 · Drop Zone
> Used on: Upload view

**Default state:** dashed border 1.5px `#EAE3D3`, border-radius 6px, centered content
**Drag-over state:** border color `#2A2520`, background `#F4EFE3`
**Content:** upload icon (24px, `#8A8178`) + instruction text (DM Sans 400, 12px, `#8A8178`)

---

### C-14 · Annotation
> Used on: Metric Row (expanded), Test Detail

Free-text note attached to a specific test entry.

**Display:** DM Sans 400, 13px, `#6A6460`, line-height 1.65
**Empty state:** DM Sans 300, 11px, italic, `#8A8178` — "No annotations yet — add a note for context."
**Edit trigger:** clicking the annotation area opens an inline text input
**Saving:** auto-saves on blur (focus leaving the field)

---

## View Specifications

---

### V-01 · Dashboard

**Purpose:** health overview across all six categories at a glance.
**Primary question answered:** how am I trending overall?

**Layout:**
```
Header (page title + last test date + New test button)
─────────────────────────────────────────────────────
Category cards (3-column grid, C-01 × 6)
─────────────────────────────────────────────────────
Active experiment panel (2/3 width) | Recent tests (1/3 width)
```

**Active experiment panel:**
- Eyebrow: "Active experiment" — Outfit 600, 10px, uppercase
- Experiment name: Outfit 400, 14–15px
- Date range + metric count: DM Sans 400, 11px, `#8A8178`
- Metric pills: C-05 × tracked metrics
- Background: `#F4EFE3`, border 1px `#EAE3D3`, border-radius 6px
- Click → navigates to experiment view
- If no active experiment: "No active experiment — start one" with a subtle prompt

**Recent tests panel:**
- Eyebrow: "Recent tests"
- List of last 3 test dates + lab name
- "View all →" link at bottom
- Background: same as experiment panel

**Empty state (no data yet):**
- Category cards show "Not yet tested" with a prompt to upload first test
- Experiment and recent tests panels show onboarding prompts

---

### V-02 · Metric Detail

**Purpose:** deep view into a single category — all metrics listed, one expanded at a time.
**Navigation:** accessed by clicking a category card on dashboard or a category in the sidebar.

**Layout:**
```
Category header (dot + category name)
─────────────────────────────────────
Metric rows (C-02, collapsible)
  └─ Expanded metric (C-03, inline)
```

**Category header:**
- 8px category color dot + Outfit 600, 18px category name
- Margin bottom 16px

**Metric rows:**
- All metrics for the category listed
- Sorted by attention state: Needs attention → Sub-optimal → Watch → Clear
- Within same state: alphabetical
- Composite/ratio metrics appear at the top of the list (they are the most meaningful)
- One expanded at a time — expanding a new row collapses the previous

**No data state for individual metric:**
- Row still appears with metric name and "Not tested" in place of value
- No status badge
- Range info still shown (so you know what to aim for)

---

### V-03 · Experiment

**Purpose:** track progression of selected metrics across a defined observation window.
**Navigation:** accessed via Experiments in sidebar.

**Layout:**
```
Experiment name + hypothesis + date range
Metric pills (C-05)
─────────────────────────────────────────
Progression table (C-08)
─────────────────────────────────────────
Combined trend chart (C-07, optional, collapsed by default)
```

**Experiment header:**
- Name: Outfit 600, 18px
- Hypothesis: DM Sans 400, 12px, `#8A8178`
- Date range + status (active/completed): DM Sans 300, 11px, uppercase, `#8A8178`

**Sidebar for experiments:**
- Active experiments listed first
- Past experiments below a divider
- "+ New" at the bottom

**New experiment creation:**
- Name + hypothesis (text inputs)
- Start date + end date (end date optional for ongoing)
- Metric selector: searchable list of all metrics in taxonomy
- Minimum 1 metric, maximum 8

**Empty experiment:**
- Table shows metric rows with no date columns
- Prompt: "No tests recorded during this experiment window yet."

---

### V-04 · Test Log

**Purpose:** chronological archive of all lab visits.
**Navigation:** accessed via Test log in sidebar.

**Layout:**
```
Page title "Test log"
─────────────────────
Test entries (C-09, chronological, newest first)
```

**Test Detail (sub-view, accessed by clicking a log entry):**
```
Date + lab name + marker count (header)
─────────────────────────────────────────
Metrics grouped by category (collapsible, same pattern as V-02)
─────────────────────────────────────────
Source document link + Print button
```

**Print view:**
- Clean stylesheet — no sidebar, no navigation
- Page title: date + lab name
- All metrics grouped by category
- Each metric: name, value, unit, lab range, optimal range, status
- Annotations shown inline below relevant metrics
- Product name and print date in footer

---

### V-05 · Upload / Entry

**Purpose:** add a new test to the database via PDF/image upload with human review.
**Navigation:** accessed via Upload in sidebar or "+ New test" button on dashboard.

**Flow:**
```
Step 1: Drop zone (C-13) — upload PDF or image
         ↓
Step 2: Review parsed rows (C-10) — confirm, edit, or map each metric
         ↓
Step 3: Add test metadata — date, lab name, optional annotation
         ↓
Step 4: Save (C-11) — commits to database
```

**Step 2 — Parsing review:**
- Parsed rows appear as soon as processing completes
- Three states per row: confirmed, needs review, unmapped (C-10)
- Unmapped metrics can be manually linked to a taxonomy metric from a dropdown
- User can delete rows they don't want to import
- "Save test" button disabled until all rows are either confirmed or deleted (no unmapped rows)

**Step 3 — Metadata:**
- Test date (pre-filled from document if detected, editable)
- Lab / clinic name (text input)
- Optional annotation for the whole test (DM Sans 400, 14px input)

**Unit conversion:**
- If a parsed value appears in a non-SI unit, a small note shows: "Converted from mg/dL"
- Original value shown in muted text below

**Never auto-saves.** All data requires explicit user confirmation before writing to the database.

---

## Component Inventory by View

| Component | Dashboard | Metric Detail | Experiment | Test Log | Upload |
|---|---|---|---|---|---|
| C-01 Category Card | ✓ | — | — | — | — |
| C-02 Metric Row (collapsed) | — | ✓ | — | ✓ (detail) | — |
| C-03 Metric Row (expanded) | — | ✓ | — | ✓ (detail) | — |
| C-04 Status Badge | ✓ | ✓ | ✓ | ✓ | ✓ |
| C-05 Category Pill | ✓ | — | ✓ | ✓ | — |
| C-06 Stat Block | — | ✓ | — | — | — |
| C-07 Trend Chart | — | ✓ | ✓ | — | — |
| C-08 Experiment Table | — | — | ✓ | — | — |
| C-09 Test Log Entry | — | — | — | ✓ | — |
| C-10 Upload Review Row | — | — | — | — | ✓ |
| C-11 Primary Button | — | — | — | — | ✓ |
| C-12 Ghost Button | — | — | — | — | ✓ |
| C-13 Drop Zone | — | — | — | — | ✓ |
| C-14 Annotation | — | ✓ | — | ✓ (detail) | ✓ |

---

## Deferred to Implementation

- Iconography system — style (outline, 12×12px) and specific icons per nav item
- Loading and skeleton states
- Toast notifications (save confirmation, parse complete)
- Error states (parse failed, network error)
- Mobile-specific navigation patterns

---

*Last updated: v1*
*Previous: design.md · taxonomy.md*
*Next: schema design → Supabase setup → implementation*

---

---

## Implementation Conventions (Layer 2 + Layer 3)

> Added 2026-06-23. This section defines canonical behaviour and code patterns.
> These are binding — see `AGENTS.md` for enforcement rules.

---

### Server vs Client decision rule

| Use `"use client"` | Stay server component |
|---|---|
| `useState`, `useEffect`, `useRef` | Static render, no state |
| `usePathname`, `useRouter` | `onMouseEnter`/`onMouseLeave` inline handlers |
| Recharts (all chart components) | Supabase data fetching |
| Direct Supabase writes (mutations) | Token/style-only components |
| `window`, `document` browser APIs | |

`Button.tsx` and `UploadReviewRow.tsx` currently have `"use client"` unnecessarily — this is a known issue to fix.

---

### Component interaction states

#### Button
```tsx
// Primary — dark fill, ivory text
<Button variant="primary" onClick={...}>Label</Button>

// Ghost — transparent, ink border
<Button variant="ghost" onClick={...}>Label</Button>

// Disabled — add disabled prop, opacity handled internally
<Button variant="primary" disabled>Label</Button>

// Never construct a button manually. Always use Button.tsx.
```

#### MetricRow
- **Collapsed:** name + category dot + value + unit + badge + last-tested date
- **Expanded:** adds BandSpectrum or LabRangeBar + TrendChart + delta arrow + annotation
- Toggle is controlled by parent (`MetricList`) via `expanded` + `onToggle` props
- Never manage expand state inside `MetricRow` itself

#### TrendChart
- Single data point: renders a dot only, no line
- Multiple points: line + dots, optional reference bands
- Always pass `category` prop — it controls line colour
- For Putih metrics: pass `labLow`/`labHigh` as reference bands (no `optimalLow`/`optimalHigh`)
- Never use Recharts directly in a page — always go through `TrendChart`

#### StatusBadge
- Left-border only, no fill
- Used on metric detail pages and expanded rows
- Never use inside experiment tables (values are coloured text there, not badged)

#### PrintShell
- Wraps all print pages
- Accepts `title: string` prop — shown in the no-print header bar
- Contains the `window.print()` button
- All print pages must use this — never build a print header inline

#### ExportButtons
- Accepts `printHref: string` (link to print page) + `onDownloadMd: () => void`
- Used on Dashboard and Putih Health Journey
- Single component, not two parallel components

---

### Canonical prop names (do not rename between features)

| Concept | Prop name | Type |
|---|---|---|
| Metric identifier | `metricKey` | `string` |
| Display name | `name` | `string` |
| Numeric result | `value` | `number` |
| SI unit label | `unit` | `string` |
| Lower reference bound | `rangeLow` / `labLow` | `number \| null` or `number \| undefined` |
| Upper reference bound | `rangeHigh` / `labHigh` | `number \| null` or `number \| undefined` |
| Historical data points | `history` | `{ date: string; value: number }[]` |
| Scoring badge | `badge` | `StatusBadge \| null` |
| Category | `category` | `CategoryKey` |

Note: `MetricRow` uses `labLow`/`labHigh` (human, scored system). Putih uses `rangeLow`/`rangeHigh` (vet reference ranges, no scoring). These are intentionally distinct because they carry different semantics. Do not merge them into one name.

---

### File structure rules

```
components/          ← all reusable UI, no exceptions
app/(app)/[route]/   ← page.tsx for data fetching + layout only
                     ← client sub-components that are genuinely route-specific
lib/                 ← data fetching (queries.ts), metric catalog (metrics.ts), tokens (tokens.ts)
```

A component is route-specific only if it imports from the route's data types and has no conceivable use elsewhere. If in doubt, put it in `/components/`.

Known misplacements to fix:
- `app/(app)/experiments/[id]/ExperimentCharts.tsx` → move to `components/`
- `app/(app)/putih/tests/PutihTestRow.tsx` → move to `components/`
- `app/(app)/dashboard/print/PrintShell.tsx` → consolidate to `components/PrintShell.tsx`
- `app/(app)/putih/journey/print/PrintShell.tsx` → same

---

### Known technical debt (as of 2026-06-23)

| Issue | File | Fix |
|---|---|---|
| `PutihMetricRow` duplicates `MetricRow` + `TrendChart` | `components/PutihMetricRow.tsx` | Refactor to use `TrendChart` internally |
| Two identical `PrintShell` components | Both print folders | Merge to `components/PrintShell.tsx` with `title` prop |
| Two parallel export button components | `HumanExportButtons`, `PutihExportButtons` | Merge to `components/ExportButtons.tsx` |
| `Button.tsx` has unnecessary `"use client"` | `components/Button.tsx` | Remove directive |
| `UploadReviewRow.tsx` has unnecessary `"use client"` | `components/UploadReviewRow.tsx` | Remove directive |
| `TrendChart` uses raw `"DM Sans"` string in tick config | `components/TrendChart.tsx` | Replace with `"var(--font-dm-sans)"` |
| `metricKey` prop in `PutihMetricRow` is declared but never used | `components/PutihMetricRow.tsx` | Remove from interface |
