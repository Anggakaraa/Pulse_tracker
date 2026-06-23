# design.md
### Visual Design System — Personal Health Record

> This document is the single source of truth for all visual design decisions.
> Every decision here was derived from a deliberate design process — not defaults,
> not conventions, not what other health apps do.
>
> Status: v1 — locked. Changes require conscious revision, not drift.

---

## Personality

> *This product treats health data as something worth looking at — not scanning,
> not reacting to, but actually seeing. The design earns that attention through
> subtraction: every element present is there because removing it would cost something.
> Color is used the way natural light is used — not to illuminate everything equally,
> but to draw the eye to what matters. The numbers are the protagonists.
> Everything else is the room they live in.*

**References that shaped this:**
- Neko Health — tonal restraint, editorial typography, human softness
- Lumon Industries (Severance) — grid rigidity, typographic hierarchy doing real work, data treated with formality
- Personal framework poster — semantic color as taxonomy, structural whitespace, information design over UI design
- Scandinavian dogma cinema — beauty through subtraction, natural light not studio light

**What this means in practice:**
- If removing an element wouldn't be noticed, remove it
- Color encodes meaning — it is never decorative
- The data value is always the most visually dominant element on any card
- Whitespace categorizes; it does not merely breathe
- Nothing should feel clinical, urgent, or alarming by default

---

## Color

### Foundation

| Token | Hex | Usage |
|---|---|---|
| `background` | `#FBF8F0` | Page base — warm ivory, like sunlight through a sheer curtain |
| `surface` | `#F4EFE3` | Cards, panels — one step deeper toward beeswax |
| `border` | `#EAE3D3` | Dividers, card outlines, hairlines |
| `ink` | `#2A2520` | Primary text — warm-black, brown-leaning, never pure black |
| `ink-muted` | `#8A8178` | Secondary text, labels, metadata |

### Taxonomy Categories

Colors are **thick pigment** — organic saturation, not synthetic. Each color has body, like oil paint rather than screen light. They are distinct without competing; they read as a family because they share the same muddied, grounded character.

| Token | Hex | Category |
|---|---|---|
| `cat-metabolic` | `#5C8A6A` | Metabolic Health |
| `cat-cardiovascular` | `#2E547A` | Cardiovascular Risk |
| `cat-inflammation` | `#B5522A` | Inflammation & Oxidative Stress |
| `cat-hormonal` | `#6E3D8C` | Hormonal Balance |
| `cat-nutritional` | `#A8882A` | Nutritional Status |
| `cat-blood` | `#7A3A4A` | Blood & Organ Function |

**Rules:**
- Category color appears on eyebrow labels, category pills, chart trend lines, and dot markers
- Never use category color as a background fill on cards — only as an accent
- Color encodes category identity, not status — status has its own system

### Attention States

Computed automatically from data. Never manually assigned. The progression reads as a scale — forest green through amber through terracotta through brick — without feeling like a traffic light.

| Token | Hex | State | Definition |
|---|---|---|---|
| `state-clear` | `#4A8C62` | Optimal | Within optimal range, not near boundary — positive framing |
| `state-watch` | `#A8882A` | Good | Within optimal but within 10% of boundary — still positive |
| `state-suboptimal` | `#B5522A` | Pass | Within lab range but outside optimal range — neutral, clinically fine but not longevity-supporting |
| `state-attention` | `#A03828` | At risk | Outside lab range — the only state warranting concern |

**Rules:**
- Attention state colors appear as small indicators only — dots, left-border accents, or left-bordered text badges
- Never flood a card with attention state color — a thin left border or a small dot is sufficient
- The sub-optimal state is the most important for this product — it is the proactive gap

Status badges use no background fill. Each badge has a 3px left border in the status color, uppercase tracked text in the status color, no border-radius on the left edge. All badges share the same fixed width (locked to the widest label — "At risk"). Typography: Outfit 600, 10px, letter-spacing 0.1em, uppercase. This distinguishes them visually from category pills (which are filled, rounded) — different shape language, different job.

Labels use positive/neutral/negative framing by design: Optimal and Good are encouraging, Pass is neutral (clinically fine, not longevity-supporting), At risk is the only state that signals concern.

```css
border-left: 3px solid {state-color};
padding: 3px 9px;
border-radius: 0 4px 4px 0;
font-family: Outfit;
font-weight: 600;
font-size: 10px;
letter-spacing: 0.1em;
text-transform: uppercase;
color: {state-color};
background: none;
```

### Color Philosophy

- Never pure `#000` or `#fff` — always warm off-tones
- Shadow color is always `rgba(42,37,32,x)` — warm ink, never cool black
- All six category colors and all four attention states belong to the same palette family — they can appear together without conflict

---

## Typography

### Typefaces

| Font | Role | Why |
|---|---|---|
| **Outfit** | Display, headings, labels, numbers | Geometric with warmth — confident at heavy weight, distinctive without being decorative |
| **DM Sans** | Body, annotations, metadata | Humanist warmth at the reading level — organic, approachable, never software-generic |

The pairing creates two distinct zones on any card: *the data* (Outfit — geometric, authoritative) and *the context* (DM Sans — humanist, interpretive). The font switch is the hierarchy.

### Type Scale

| Role | Font | Weight | Size | Line Height | Tracking | Notes |
|---|---|---|---|---|---|---|
| Display number | Outfit | 800 | 56px | 1.0 | -0.02em | Metric value — expanded state |
| Display number (collapsed) | Outfit | 800 | 32px | 1.0 | -0.02em | Metric value — collapsed card state |
| Section title | Outfit | 600 | 28px | 1.05 | -0.01em | Page and section headings |
| Card title | Outfit | 400 | 20px | 1.2 | 0 | Metric name on a card |
| Eyebrow label | Outfit | 600 | 13px | 1.0 | 0.12em | Category identifier — always uppercase |
| Body / annotation | DM Sans | 400 | 16px | 1.65 | 0 | Notes, descriptions, contextual text |
| Supporting / range | DM Sans | 300 | 14px | 1.5 | 0 | Reference ranges, secondary data |
| Timestamp / meta | DM Sans | 300 | 12px | 1.0 | 0.04em | Dates, lab names — always uppercase |

Minimum readable size is 12px (meta only). Nothing in the product should
appear below 12px. Body text floor is 16px per WCAG guidelines. Supporting
text floor is 14px. Never reduce font sizes to fit more content — reduce
content instead.

### Rules

- Eyebrow labels and timestamps are always uppercase — they are system labels, not prose
- All other text is sentence case — never title case
- The display number is always the most visually dominant element on a card
- Never use Outfit below 13px — use DM Sans for anything smaller
- Body text never competes with the number — size and weight difference must be stark

---

## Spacing

### Scale

Base unit: **4px**. Every spacing value is a multiple of 4.

| Token | Value | Primary Usage |
|---|---|---|
| `space-1` | 4px | Icon gaps, tight inline spacing |
| `space-2` | 8px | Between label and value |
| `space-3` | 12px | Between metric rows within a card |
| `space-4` | 16px | Card inner padding |
| `space-5` | 24px | Between cards in a grid |
| `space-6` | 40px | Section breaks |
| `space-7` | 64px | Page top padding, major section separators |

### Whitespace Philosophy

Whitespace **categorizes** — it is not decoration. The gap between a section header and its cards is structural; it tells you where one thing ends and another begins. Do not reduce spacing to fit more on screen; reduce content instead.

---

## Layout

### Breakpoints

| Name | Range | Behavior |
|---|---|---|
| Desktop | ≥1280px | Primary design target — full layout |
| Tablet | 768–1279px | Sidebar collapses, layout reflows |
| Mobile | ≤767px | Single column, stacked cards, nav drawer |

### Global Constraints

- Max content width: **1280px**
- Page margins: **64px** desktop · **24px** mobile
- Design target: **desktop-first**. Mobile is usable, not optimized.

> Layout structure (sidebar, grid columns, view-specific arrangements) is defined in `components.md`. Only tokens and breakpoints are defined here.

---

## Elevation

Flat by default. Elevation is earned, not applied. If flatness already communicates clearly, shadow is noise.

| Level | Usage | CSS |
|---|---|---|
| 0 — Flat | All cards, default state | `box-shadow: none; border: 1px solid #EAE3D3;` |
| 1 — Raised | Hover state only | `box-shadow: 0px 2px 8px rgba(42,37,32,0.07); border-color: transparent;` |
| 2 — Floating | Modals, drawers, overlays | `box-shadow: 0px 8px 32px rgba(42,37,32,0.10); border-color: transparent;` |

**Rules:**
- Default card state is always Level 0 — flat with border
- On hover, border fades out as shadow fades in — never both simultaneously
- Never skip levels — flat to floating without raised is jarring
- Never add elevation to communicate importance — use typographic hierarchy instead
- Shadow color is always warm ink `rgba(42,37,32,x)`, never cool black

---

## Border Radius

| Element | Radius |
|---|---|
| Cards, panels, containers | 6px |
| Pills, badges, tags | 4px |
| Inputs | 4px |

6px is the primary radius — present but restrained. Rigorous enough to avoid generic consumer-app softness, rounded enough to avoid clinical coldness.

---

## Motion

> Restraint is the principle. If removing an animation would not be noticed, it should not exist.

| Use | Duration | Properties |
|---|---|---|
| Hover state | 150ms | opacity, box-shadow |
| Drawer / overlay open | 250ms | transform (translateY), opacity |
| Page element enter | 200ms | opacity only |

**Easing:** `cubic-bezier(0.4, 0, 0.2, 1)` — standard ease-in-out. Single curve throughout. No bounces, no springs, no cinematic reveals.

**Rules:**
- Only animate `transform` and `opacity` — never layout properties
- Never use `transition: all`
- No entrance animations on data — data appears, it does not perform
- No loading skeletons with pulse animations — a simple opacity fade is sufficient

---

## Data Visualization

### The five principles

**1. The line is the protagonist**
Trend lines are 2px, drawn in the metric's category color. No area fill under the curve. The line alone carries the story — fill creates visual weight that competes with the reference bands.

**2. Reference ranges as bands, not lines**
Lab range and optimal range are shown as semi-transparent filled bands. The optimal band (green, inner) sits inside the lab range band (amber, outer). The space between them is the sub-optimal zone — visible without needing a label. No border on bands — they are atmospheric, not structural.

| Band | Color | Opacity |
|---|---|---|
| Optimal range | `#4A8C62` | 15% |
| Lab range (outer) | `#A8882A` | 8% |

**3. Sparse data is honest**
Never interpolate or imply continuity that does not exist.

| Data points | Treatment |
|---|---|
| 1 reading | Single dot with value label. No line. |
| 2 readings | Line connecting the two points. No bands. |
| 3+ readings | Full treatment — line, bands, tick dots |

**4. Axis restraint**
No gridlines. No background grid. The reference bands provide the visual anchoring that gridlines usually do.
- Y-axis: 3–4 tick values maximum, DM Sans 300, muted ink
- X-axis: single hairline (0.5px, border color), date labels in meta style
- Chart area is always clean

**5. Dot behavior by regularity**
- Regular test intervals → no dots at rest. Line only. Exact value surfaces on hover.
- Irregular test intervals → 2px tick dots to mark when readings were taken. Spacing between dots reflects time elapsed.

In practice, data will almost always be irregular. The 2px tick is the default — it should feel like punctuation, not decoration.

### Chart typography

- Axis labels: DM Sans 300, 11px, `ink-muted`
- Value tooltips on hover: DM Sans 400, 12px, `ink`
- Chart title: Outfit 400, 15px (card title scale)
- Category eyebrow above chart: Outfit 600, 11px, uppercase, category color

### What charts never do

- No pie or donut charts — proportional comparisons are less useful than trends for this product
- No bar charts for single metrics — line charts show progression; bars imply comparison
- No dual-axis charts — if two metrics need comparison, use an experiment view with two stacked charts
- No decorative chart elements — no rounded bar ends, no gradient fills, no glow effects

---

## Component Patterns

Visual patterns that recur across components. Each defines exact usage rules so the same element is never rendered two different ways.

---

### Accents

Category color used as a visual anchor — never as a fill, always as a thin structural signal.

**Left border stripe**
- Applied to: metric list rows (collapsed and expanded), any list item that belongs to a single category
- Spec: `border-left: 3px solid {category-color}`, padding on the left reduced by 3px to maintain alignment
- The border runs the full height of the element including when expanded
- Never apply both a left border stripe and a category dot to the same element — they carry the same meaning, one is redundant

**Category dot**
- Applied to: sidebar navigation items, longevity marker list, cross-category summaries (where category identity isn't declared by page context)
- Spec: 6px circle, `background-color: {category-color}`, no border
- Use dots when the list contains mixed categories. Use border stripe when the list is single-category.

**Rule:** If the page header already declares the category (eyebrow label + page title), dot and border are both optional. If the list is cross-category, use dots. If the list is single-category, use border stripe.

---

### Containers

Four-level surface hierarchy. Each level is one step warmer/deeper than the one above.

| Level | Token | Hex | Usage |
|---|---|---|---|
| 0 — Page | `background` | `#FBF8F0` | The canvas everything sits on |
| 1 — Container | `surface` | `#F4EFE3` | List containers, panels, cards — the "room" |
| 2 — Row | `background` | `#FBF8F0` | Individual rows inside a container — back to page color, "inset" feel |
| 3 — Expanded panel | `surface` | `#F4EFE3` | Detail area that opens below a row — returns to container color, signals depth |

**Rules:**
- Rows sit inside containers. They use `background` so they contrast against the `surface` container.
- The expanded panel uses `surface` again — it is conceptually a sub-container, not a row.
- The 1px gap between rows in a list shows the container color through, acting as a warm divider. No explicit `border-bottom` needed between rows.
- Never go deeper than Level 3. Nesting containers beyond this level creates visual complexity without meaning.

---

### Spectrum (Metric Band Visualization)

The 5-band spectrum shows a metric's current position within its scoring range. It appears in the expanded metric row, below the display value.

**Anatomy:**
- Five tiles side by side, equal width, spanning the full container width
- Each tile: band label (Outfit 600, 10px, uppercase, tracked) + range value (DM Sans 300, 12px) below it
- Active tile: filled with the band's status color at full opacity, label and range in `#FBF8F0`
- Inactive tiles: background `#F4EFE3`, label in status color at 60% opacity, range in `#8A8178`
- Border radius: 4px on each tile
- Gap between tiles: 4px

**Band color mapping:**

| Band | Color |
|---|---|
| Optimal | `#4A8C62` |
| Strong | `#A8882A` |
| Stable | `#A8882A` at 70% |
| Improve | `#B5522A` |
| Act | `#A03828` |

**Rules:**
- Only shown for scored metrics (`isScored: true`). Unscored metrics show lab range only.
- If no band contains the current value (edge case), no tile is highlighted.
- The spectrum is read left to right: Optimal → Strong → Stable → Improve → Act. This order is fixed regardless of metric direction.

---

### Notes (Editable Text Field)

Free-text notes attached to a record — currently used on experiment detail pages (Protocol notes). Distinct from annotations, which are per-reading.

**Display state:**
- Container: `background: #FBF8F0`, `border: 1px solid #EAE3D3`, `border-radius: 6px`, `padding: 16px 20px`
- Typography: DM Sans 300, 14px, line-height 1.7, `#2A2520`
- Empty placeholder: same container, placeholder text in DM Sans 300, 14px, italic, `#8A8178`

**Edit state:**
- Triggered on click anywhere in the container
- `<textarea>` replaces the display text, inheriting the same container styles
- `resize: vertical` allowed — user can expand if needed
- Border color transitions to `#8A8178` on focus (150ms)

**Save behaviour:**
- Auto-saves on blur (focus leaving the field)
- "Saved ✓" confirmation appears top-right of the field in DM Sans 300, 12px, `#4A8C62`, fades after 2 seconds
- "Saving…" shown during the write (DM Sans 300, 12px, `#8A8178`)
- Never shows a save button — auto-save on blur is the contract

**Eyebrow:**
- Section label above the field: Outfit 600, 11px, uppercase, tracked, `#8A8178`
- Save status indicator sits on the same baseline, right-aligned

---

## Decisions Log

| Decision | Resolution | Rationale |
|---|---|---|
| Background warmth | Ivory-warm `#FBF8F0` | Warm linen base — sunlight through a sheer curtain, not clinical white |
| Category color philosophy | Thick pigment, organic saturation | Film-era analog quality — colors have body, not synthetic brightness |
| Typography approach | Sans throughout | Serif-for-display is overused; sans with high weight contrast is more distinctive |
| Font pairing | Outfit (display) + DM Sans (body) | Geometric confidence at display level, humanist warmth at reading level |
| Dot behavior | None at rest (regular) / 2px tick (irregular) | Restraint — dots are punctuation, not decoration |
| Elevation philosophy | Flat by default, two levels only | Scandinavian restraint — shadow earns its place |
| Border radius | 6px cards / 4px pills | Rigorous without coldness — avoids both clinical and consumer-app extremes |
| Motion | 150–250ms, transform+opacity only | If it wouldn't be noticed if removed, it shouldn't exist |
| Reference ranges | Dual bands (optimal + lab) | The sub-optimal gap is the most important state for proactive health tracking |
| Area fill on charts | None | Fill competes with reference bands — the line is the protagonist |

---

*Last updated: v1*
*Next: components.md*
