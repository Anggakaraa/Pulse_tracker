# AGENTS.md
### Implementation Rules — Pulse Tracker

> These rules are **binding**, not advisory. They apply to every session, every feature, every file.
> When in doubt, check before inventing. The cost of asking is zero. The cost of drift is compounding.

---

## Rule 1 — Check before creating

Before writing any new component, check `/components/` first.
If a component already exists that covers the pattern — use it.
If it almost fits — extend it via props, not by duplicating it.
Only create a new component if the pattern is genuinely new.

## Rule 2 — Components live in /components/

All reusable UI lives in `/components/`. No exceptions.
A component is reusable if it could appear on more than one page.
Route-specific orchestration (data fetching, page layout) lives in `/app/`.
Never build a component inside `/app/` and leave it there — move it on creation.

## Rule 3 — Server vs client: default to server, opt in to client

A component is a server component by default.
Add `"use client"` only when you need: `useState`, `useEffect`, `usePathname`, browser APIs, or event handlers that require React state.
Inline `onMouseEnter`/`onMouseLeave` handlers do NOT require `"use client"` — they are valid on server components.
Never add `"use client"` out of habit or caution.

## Rule 4 — Use the Button component for all buttons

Every button in the UI uses `<Button variant="primary">` or `<Button variant="ghost">` from `components/Button.tsx`.
Never construct a button manually with inline styles.
If a new button variant is needed, add it to `Button.tsx` — do not create a one-off.

## Rule 5 — Use TrendChart for all trend charts

Every trend chart uses `<TrendChart>` from `components/TrendChart.tsx`.
Never instantiate Recharts directly in a page or component.
If TrendChart needs new capabilities, add props to it — do not build a parallel chart.

## Rule 6 — Prop naming is canonical

Follow the prop names defined in `documentation/components.md` exactly.
Do not rename props between Putih and human versions of the same concept.
`metricKey`, `value`, `unit`, `rangeLow`, `rangeHigh`, `history` — these names are fixed.
If a prop name conflicts with an existing component, align the new code to the existing name.

## Rule 7 — Style via tokens, never raw values

All colors, spacing, and typography values come from `lib/tokens.ts` or CSS variables.
Never hardcode hex values like `#2A2520` or `#EAE3D3` directly in component files.
Use `colors.ink`, `colors.border`, `colors.surface`, etc.
The one exception: print pages may use raw hex where CSS variables don't resolve in print context.

## Rule 8 — Inline styles, not Tailwind className

This project uses inline styles with token values — not Tailwind utility classes.
The only valid use of `className` is for print media query targets (`.no-print`) and font variables (`var(--font-outfit)`).
Do not mix styles and className.

## Rule 10 — Every schema change requires a migration file

Before altering the database schema, create a numbered SQL file in `migrations/`.
File naming: `[NNN]_[short_description].sql` (e.g. `006_readings_source_url.sql`).
Every migration file must use `ADD COLUMN IF NOT EXISTS` so it is safe to re-run.
Never alter the database directly from the Supabase dashboard without a migration file.
After running the migration, update `DATA_DICTIONARY.md` in the same session.

## Rule 11 — Verify column names against DATA_DICTIONARY.md before querying

Before writing any new Supabase query, check `DATA_DICTIONARY.md` for the exact column names.
Never assume a column exists — verify it.
If a column is needed but doesn't exist, create a migration first.

## Rule 12 — All experiment queries must filter by subject

Any query that joins `experiments` to `tests` must add `.eq("subject", "human")` on the tests side.
Experiments are human-only. Without this filter, Putih test data can contaminate experiment results.
See Known Issues #1 and #2 in `DATA_DICTIONARY.md`.

## Rule 9 — Document deviations

If a rule must be broken (e.g. a genuinely new pattern), document it here or in `documentation/components.md` immediately.
A deviation that is not documented becomes debt — the next session will not know it was intentional.

---

## Canonical component index

| Pattern | Component | Location |
|---|---|---|
| Primary / ghost button | `Button` | `components/Button.tsx` |
| 5-tier status badge | `StatusBadge` | `components/StatusBadge.tsx` |
| Category color pill | `CategoryPill` | `components/CategoryPill.tsx` |
| Metric row (collapsed + expanded) | `MetricRow` | `components/MetricRow.tsx` |
| Sorted metric list | `MetricList` | `components/MetricList.tsx` |
| Trend line chart | `TrendChart` | `components/TrendChart.tsx` |
| Dashboard category card | `CategoryCard` | `components/CategoryCard.tsx` |
| Test list row (human) | `TestLogEntry` | `components/TestLogEntry.tsx` |
| Labeled stat tile | `StatBlock` | `components/StatBlock.tsx` |
| Click-to-edit annotation | `Annotation` | `components/Annotation.tsx` |
| Experiment progression table | `ExperimentTable` | `components/ExperimentTable.tsx` |
| Print header + button shell | `PrintShell` | `components/PrintShell.tsx` |
| Export buttons (PDF + MD) | `ExportButtons` | `components/ExportButtons.tsx` |
| Add marker panel | `AddMarkerPanel` | `components/AddMarkerPanel.tsx` |
