"use client";

import { useState, useRef, useEffect } from "react";
import DropZone from "@/components/DropZone";
import Button from "@/components/Button";
import { colors } from "@/lib/tokens";
import type { CategoryKey } from "@/lib/tokens";
import { METRIC_CATALOG as BASE_CATALOG, CATEGORY_LABELS, CATEGORY_ORDER, computeStatusBadge } from "@/lib/metrics";
import type { MetricMeta } from "@/lib/metrics";
import { supabase } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────
type RowState = "confirmed" | "review" | "unmapped";

interface ParsedRow {
  id: string;
  rawName: string;
  metricKey: string | null;
  metricName: string | null;
  value: number;
  unit: string;
  originalValue?: number;
  originalUnit?: string;
  labRangeLow?: number;
  labRangeHigh?: number;
  rowState: RowState;
  deleted: boolean;
}

type Step = 1 | 2 | 3;

// Derive CATEGORY_COLORS from tokens (all categories including vitals)
const CATEGORY_COLORS = Object.fromEntries(
  Object.entries(colors.category).map(([k, v]) => [k, v])
) as Record<CategoryKey, string>;

// ─── Mock parsed output ───────────────────────────────────────────────────────
const MOCK_PARSED: Omit<ParsedRow, "deleted">[] = [
  { id: "r1",  rawName: "LDL Cholesterol",         metricKey: "ldl_c",           metricName: "LDL-C",           value: 2.8,  unit: "mmol/L",  originalValue: 108,  originalUnit: "mg/dL", labRangeLow: 0,   labRangeHigh: 3.4,  rowState: "confirmed" },
  { id: "r2",  rawName: "HDL Cholesterol",         metricKey: "hdl_c",           metricName: "HDL-C",           value: 1.6,  unit: "mmol/L",  originalValue: 62,   originalUnit: "mg/dL", labRangeLow: 1.0, labRangeHigh: 3.0,  rowState: "confirmed" },
  { id: "r3",  rawName: "Trigliserida",            metricKey: "triglycerides",   metricName: "Triglycerides",   value: 0.9,  unit: "mmol/L",                                            labRangeLow: 0,   labRangeHigh: 1.7,  rowState: "confirmed" },
  { id: "r4",  rawName: "HbA1c",                   metricKey: "hba1c",           metricName: "HbA1c",           value: 36,   unit: "mmol/mol",                                           labRangeLow: 20,  labRangeHigh: 47,   rowState: "confirmed" },
  { id: "r5",  rawName: "Glukosa Puasa",           metricKey: "fasting_glucose", metricName: "Fasting glucose", value: 4.8,  unit: "mmol/L",                                            labRangeLow: 3.5, labRangeHigh: 6.0,  rowState: "confirmed" },
  { id: "r6",  rawName: "Asam Urat",               metricKey: "uric_acid",       metricName: "Uric acid",       value: 380,  unit: "μmol/L",                                            labRangeLow: 150, labRangeHigh: 400,  rowState: "review"    },
  { id: "r7",  rawName: "hs-CRP",                  metricKey: "hs_crp",          metricName: "hs-CRP",          value: 0.6,  unit: "mg/L",                                              labRangeLow: 0,   labRangeHigh: 3.0,  rowState: "confirmed" },
  { id: "r8",  rawName: "Homocysteine",            metricKey: "homocysteine",    metricName: "Homocysteine",    value: 11.2, unit: "μmol/L",                                            labRangeLow: 0,   labRangeHigh: 15.0, rowState: "confirmed" },
  { id: "r9",  rawName: "ApoB",                    metricKey: "apob",            metricName: "ApoB",            value: 0.82, unit: "g/L",                                               labRangeLow: 0.4, labRangeHigh: 1.0,  rowState: "confirmed" },
  { id: "r10", rawName: "Panel Serum XYZ",         metricKey: null,              metricName: null,              value: 14.2, unit: "U/L",                                                                                     rowState: "unmapped"  },
];

// ─── State config ─────────────────────────────────────────────────────────────
const STATE_CONFIG: Record<RowState, { color: string; label: string; icon: string }> = {
  confirmed: { color: colors.badge.optimal,     label: "Confirmed",    icon: "✓" },
  review:    { color: colors.badge.stable,     label: "Needs review", icon: "!" },
  unmapped:  { color: colors.badge.act, label: "Unmapped",     icon: "?" },
};

// ─── Metric key picker ────────────────────────────────────────────────────────
// Converts a display name to a snake_case key suggestion
function toSnakeCase(str: string) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "_");
}

function MetricKeyPicker({
  currentKey,
  catalog,
  onSelect,
  onAddMetric,
  onClose,
}: {
  currentKey: string | null;
  catalog: Record<string, MetricMeta>;
  onSelect: (key: string) => void;
  onAddMetric: (key: string, meta: MetricMeta) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"search" | "add">("search");
  const [newName, setNewName] = useState("");
  const [newKey, setNewKey] = useState("");
  const [newCategory, setNewCategory] = useState<CategoryKey>("metabolic");
  const [keyEdited, setKeyEdited] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  // Auto-generate key from name unless user has manually edited it
  useEffect(() => {
    if (!keyEdited) setNewKey(toSnakeCase(newName));
  }, [newName, keyEdited]);

  const categoryOrder = CATEGORY_ORDER;

  const q = query.toLowerCase();
  const filtered = Object.entries(catalog).filter(([key, meta]) =>
    key.includes(q) || meta.name.toLowerCase().includes(q) || meta.category.includes(q)
  );
  const grouped: [CategoryKey, [string, MetricMeta][]][] = categoryOrder
    .map(cat => [cat, filtered.filter(([, m]) => m.category === cat)] as [CategoryKey, [string, MetricMeta][]])
    .filter(([, items]) => items.length > 0);

  const keyConflict = newKey.length > 0 && !!catalog[newKey];
  const canAdd = newName.trim().length > 0 && newKey.trim().length > 0 && !keyConflict;

  return (
    <div
      ref={containerRef}
      style={{
        position: "absolute",
        top: "100%",
        left: 0,
        zIndex: 100,
        width: "340px",
        backgroundColor: colors.background,
        border: `1px solid ${colors.border}`,
        borderRadius: "6px",
        boxShadow: "0px 8px 32px rgba(42,37,32,0.10)",
        overflow: "hidden",
      }}
    >
      {mode === "search" ? (
        <>
          {/* Search */}
          <div style={{ padding: "8px 12px", borderBottom: `1px solid ${colors.border}` }}>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search markers…"
              style={{ width: "100%", fontFamily: "var(--font-dm-sans)", fontSize: "13px", color: colors.ink, background: "transparent", border: "none", outline: "none" }}
            />
          </div>

          {/* Results */}
          <div style={{ maxHeight: "260px", overflowY: "auto" }}>
            {grouped.length === 0 && (
              <div style={{ padding: "14px 12px", fontFamily: "var(--font-dm-sans)", fontSize: "13px", color: colors.inkMuted }}>
                No match — try a synonym or add a new metric below
              </div>
            )}
            {grouped.map(([cat, items]) => (
              <div key={cat}>
                <div style={{ padding: "6px 12px 4px", display: "flex", alignItems: "center", gap: "6px", position: "sticky", top: 0, backgroundColor: colors.surface }}>
                  <span style={{ display: "inline-block", width: "6px", height: "6px", borderRadius: "50%", backgroundColor: CATEGORY_COLORS[cat], flexShrink: 0 }} />
                  <span style={{ fontFamily: "var(--font-outfit)", fontSize: "10px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: CATEGORY_COLORS[cat] }}>
                    {cat}
                  </span>
                </div>
                {items.map(([key, meta]) => (
                  <button
                    key={key}
                    onClick={() => onSelect(key)}
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "7px 12px 7px 24px", background: key === currentKey ? colors.surface : "none", border: "none", cursor: "pointer", textAlign: "left", gap: "8px" }}
                    onMouseEnter={e => { if (key !== currentKey) (e.currentTarget as HTMLButtonElement).style.backgroundColor = colors.surface; }}
                    onMouseLeave={e => { if (key !== currentKey) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent"; }}
                  >
                    <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "13px", color: colors.ink }}>{meta.name}</span>
                    <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "11px", color: colors.inkMuted, flexShrink: 0 }}>{key}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>

          {/* Add new metric CTA */}
          <div style={{ borderTop: `1px solid ${colors.border}` }}>
            <button
              onClick={() => { setMode("add"); setNewName(query); }}
              style={{
                display: "flex", alignItems: "center", gap: "8px",
                width: "100%", padding: "10px 12px",
                background: "none", border: "none", cursor: "pointer", textAlign: "left",
              }}
              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.backgroundColor = colors.surface}
              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent"}
            >
              <span style={{ fontSize: "14px", color: colors.inkMuted, lineHeight: 1 }}>+</span>
              <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "13px", color: colors.ink }}>
                Add new metric{query ? ` "${query}"` : ""}
              </span>
            </button>
          </div>
        </>
      ) : (
        /* ── Add new metric form ── */
        <div style={{ padding: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
            <span style={{ fontFamily: "var(--font-outfit)", fontSize: "13px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: colors.ink }}>
              New metric
            </span>
            <button
              onClick={() => setMode("search")}
              style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-dm-sans)", fontSize: "12px", color: colors.inkMuted }}
            >
              ← Back
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {/* Display name */}
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontFamily: "var(--font-outfit)", fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: colors.inkMuted }}>
                Name
              </label>
              <input
                ref={inputRef}
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="e.g. Fibrinogen"
                style={{ fontFamily: "var(--font-dm-sans)", fontSize: "13px", color: colors.ink, backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: "4px", padding: "6px 10px", outline: "none", width: "100%", boxSizing: "border-box" }}
              />
            </div>

            {/* Key */}
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontFamily: "var(--font-outfit)", fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: colors.inkMuted }}>
                Key <span style={{ fontWeight: 300, textTransform: "none", letterSpacing: 0, fontSize: "11px" }}>(auto-generated, editable)</span>
              </label>
              <input
                type="text"
                value={newKey}
                onChange={e => { setNewKey(e.target.value); setKeyEdited(true); }}
                placeholder="e.g. fibrinogen"
                style={{
                  fontFamily: "var(--font-dm-sans)", fontSize: "13px",
                  color: keyConflict ? colors.badge.act : colors.ink,
                  backgroundColor: colors.surface,
                  border: `1px solid ${keyConflict ? colors.badge.act : colors.border}`,
                  borderRadius: "4px", padding: "6px 10px", outline: "none", width: "100%", boxSizing: "border-box",
                }}
              />
              {keyConflict && (
                <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "11px", color: colors.badge.act }}>
                  Key already exists — choose a different one
                </span>
              )}
            </div>

            {/* Category */}
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontFamily: "var(--font-outfit)", fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: colors.inkMuted }}>
                Category
              </label>
              <select
                value={newCategory}
                onChange={e => setNewCategory(e.target.value as CategoryKey)}
                style={{ fontFamily: "var(--font-dm-sans)", fontSize: "13px", color: colors.ink, backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: "4px", padding: "6px 10px", outline: "none", width: "100%", boxSizing: "border-box" }}
              >
                {categoryOrder.map(cat => (
                  <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                ))}
              </select>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
              <button
                onClick={() => setMode("search")}
                style={{ flex: 1, fontFamily: "var(--font-dm-sans)", fontSize: "13px", color: colors.inkMuted, backgroundColor: "transparent", border: `1px solid ${colors.border}`, borderRadius: "4px", padding: "7px 0", cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!canAdd) return;
                  onAddMetric(newKey.trim(), { name: newName.trim(), category: newCategory, evidenceTier: "C", isScored: false });
                  onSelect(newKey.trim());
                }}
                disabled={!canAdd}
                style={{
                  flex: 2, fontFamily: "var(--font-dm-sans)", fontSize: "13px",
                  color: canAdd ? colors.background : colors.inkMuted,
                  backgroundColor: canAdd ? colors.ink : colors.surface,
                  border: "none", borderRadius: "4px", padding: "7px 0",
                  cursor: canAdd ? "pointer" : "default",
                  transition: `background-color var(--duration-micro) var(--ease)`,
                }}
              >
                Add &amp; select
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Edit input style (ghost underline on focus) ──────────────────────────────
const editInputStyle: React.CSSProperties = {
  fontFamily: "var(--font-dm-sans)",
  fontSize: "14px",
  fontWeight: 400,
  color: colors.ink,
  background: "transparent",
  border: "none",
  borderBottom: "1px solid transparent",
  outline: "none",
  padding: "0",
  width: "100%",
  transition: `border-color var(--duration-micro) var(--ease)`,
};

// ─── Review row ───────────────────────────────────────────────────────────────
function ReviewRow({
  row,
  catalog,
  onDelete,
  onToggleState,
  onUpdate,
  onRemap,
  onAddMetric,
}: {
  row: ParsedRow;
  catalog: Record<string, MetricMeta>;
  onDelete: (id: string) => void;
  onToggleState: (id: string) => void;
  onUpdate: (id: string, field: "metricName" | "value" | "unit", value: string) => void;
  onRemap: (id: string, key: string) => void;
  onAddMetric: (key: string, meta: MetricMeta) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const cfg = STATE_CONFIG[row.rowState];
  const catalogMeta = row.metricKey ? catalog[row.metricKey] : null;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "grid",
        gridTemplateColumns: "16px 1fr 150px 120px 60px",
        alignItems: "center",
        gap: "12px",
        padding: "10px 16px",
        backgroundColor: hovered ? colors.surface : "transparent",
        borderBottom: `1px solid ${colors.border}`,
        transition: `background-color var(--duration-micro) var(--ease)`,
        opacity: row.deleted ? 0.35 : 1,
        position: "relative",
      }}
    >
      {/* State icon */}
      <span style={{ color: cfg.color, fontSize: "12px", textAlign: "center", fontFamily: "var(--font-dm-sans)" }}>
        {cfg.icon}
      </span>

      {/* Name column */}
      <div style={{ display: "flex", flexDirection: "column", gap: "2px", minWidth: 0, position: "relative" }}>
        {/* Editable display name */}
        <input
          type="text"
          value={row.metricName ?? ""}
          disabled={row.deleted}
          placeholder="Enter marker name"
          onChange={e => onUpdate(row.id, "metricName", e.target.value)}
          onFocus={() => setFocusedField("name")}
          onBlur={() => setFocusedField(null)}
          style={{
            ...editInputStyle,
            color: row.metricName ? colors.ink : colors.inkMuted,
            borderBottomColor: focusedField === "name" ? colors.border : "transparent",
          }}
        />

        {/* Raw name from document */}
        <span style={{
          fontFamily: "var(--font-dm-sans)",
          fontSize: "11px",
          fontWeight: 300,
          color: colors.inkMuted,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}>
          {row.rawName}
        </span>

        {/* Metric key assignment */}
        <button
          onClick={() => !row.deleted && setPickerOpen(v => !v)}
          disabled={row.deleted}
          style={{
            background: "none",
            border: "none",
            padding: 0,
            cursor: row.deleted ? "default" : "pointer",
            textAlign: "left",
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            marginTop: "2px",
          }}
        >
          {row.metricKey ? (
            <>
              {catalogMeta && (
                <span style={{
                  display: "inline-block",
                  width: "5px", height: "5px",
                  borderRadius: "50%",
                  backgroundColor: CATEGORY_COLORS[catalogMeta.category],
                  flexShrink: 0,
                }} />
              )}
              <span style={{
                fontFamily: "var(--font-dm-sans)",
                fontSize: "11px",
                fontWeight: 300,
                color: colors.inkMuted,
                textDecoration: hovered ? "underline" : "none",
              }}>
                {row.metricKey}
              </span>
            </>
          ) : (
            <span style={{
              fontFamily: "var(--font-dm-sans)",
              fontSize: "11px",
              fontWeight: 400,
              color: colors.badge.act,
            }}>
              Select metric →
            </span>
          )}
        </button>

        {/* Picker dropdown */}
        {pickerOpen && (
          <MetricKeyPicker
            currentKey={row.metricKey}
            catalog={catalog}
            onSelect={key => { onRemap(row.id, key); setPickerOpen(false); }}
            onAddMetric={onAddMetric}
            onClose={() => setPickerOpen(false)}
          />
        )}
      </div>

      {/* Value + unit */}
      <div style={{ display: "flex", alignItems: "baseline", gap: "4px", justifyContent: "flex-end" }}>
        <input
          type="number"
          value={row.value}
          disabled={row.deleted}
          onChange={e => onUpdate(row.id, "value", e.target.value)}
          onFocus={() => setFocusedField("value")}
          onBlur={() => setFocusedField(null)}
          style={{
            ...editInputStyle,
            fontFamily: "var(--font-outfit)",
            fontWeight: 600,
            textAlign: "right",
            width: "70px",
            borderBottomColor: focusedField === "value" ? colors.border : "transparent",
          }}
        />
        <input
          type="text"
          value={row.unit}
          disabled={row.deleted}
          onChange={e => onUpdate(row.id, "unit", e.target.value)}
          onFocus={() => setFocusedField("unit")}
          onBlur={() => setFocusedField(null)}
          style={{
            ...editInputStyle,
            fontFamily: "var(--font-dm-sans)",
            fontSize: "12px",
            fontWeight: 300,
            color: colors.inkMuted,
            width: "50px",
            borderBottomColor: focusedField === "unit" ? colors.border : "transparent",
          }}
        />
      </div>

      {/* State toggle */}
      <button
        onClick={() => !row.deleted && onToggleState(row.id)}
        disabled={row.deleted || row.rowState === "unmapped"}
        style={{
          background: "none", border: "none",
          cursor: row.deleted || row.rowState === "unmapped" ? "default" : "pointer",
          padding: 0, textAlign: "right",
        }}
      >
        <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "12px", color: cfg.color }}>
          {cfg.label}
        </span>
      </button>

      {/* Remove / undo */}
      <button
        onClick={() => onDelete(row.id)}
        style={{
          background: "none", border: "none", cursor: "pointer", padding: "2px 0",
          fontFamily: "var(--font-dm-sans)", fontSize: "12px",
          color: row.deleted ? colors.badge.optimal : colors.inkMuted,
          textAlign: "right",
          opacity: hovered || row.deleted ? 1 : 0,
          transition: `opacity var(--duration-micro) var(--ease)`,
        }}
      >
        {row.deleted ? "Undo" : "Remove"}
      </button>
    </div>
  );
}

// ─── Step indicator ───────────────────────────────────────────────────────────
function StepIndicator({ current }: { current: Step }) {
  const steps: { n: Step; label: string }[] = [
    { n: 1, label: "Enter" },
    { n: 2, label: "Review" },
    { n: 3, label: "Save" },
  ];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "40px" }}>
      {steps.map((s, i) => {
        const done = s.n < current;
        const active = s.n === current;
        return (
          <div key={s.n} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div style={{
                width: "20px", height: "20px", borderRadius: "50%", flexShrink: 0,
                backgroundColor: done ? colors.badge.optimal : active ? colors.ink : "transparent",
                border: `1.5px solid ${done ? colors.badge.optimal : active ? colors.ink : colors.border}`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {done
                  ? <span style={{ color: colors.background, fontSize: "10px" }}>✓</span>
                  : <span style={{ fontFamily: "var(--font-outfit)", fontSize: "10px", fontWeight: 600, color: active ? colors.background : colors.inkMuted }}>{s.n}</span>
                }
              </div>
              <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "13px", fontWeight: active ? 400 : 300, color: active ? colors.ink : done ? colors.badge.optimal : colors.inkMuted }}>
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && <div style={{ width: "24px", height: "1px", backgroundColor: colors.border }} />}
          </div>
        );
      })}
    </div>
  );
}

// ─── Field wrapper ────────────────────────────────────────────────────────────
function Field({ label, optional, children }: { label: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <label style={{ fontFamily: "var(--font-outfit)", fontSize: "13px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: colors.inkMuted }}>
        {label}{optional && <span style={{ fontWeight: 300, textTransform: "none", letterSpacing: 0 }}> (optional)</span>}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  fontFamily: "var(--font-dm-sans)", fontSize: "14px", fontWeight: 400,
  color: colors.ink, backgroundColor: colors.surface,
  border: `1px solid ${colors.border}`, borderRadius: "4px",
  padding: "8px 12px", outline: "none", width: "100%", boxSizing: "border-box",
};

// ─── Manual entry row ─────────────────────────────────────────────────────────
interface ManualRow {
  id: string;
  metricKey: string | null;
  metricName: string;
  value: string;
  unit: string;
}

function ManualEntryRow({
  row,
  catalog,
  onUpdate,
  onRemap,
  onAddMetric,
  onRemove,
}: {
  row: ManualRow;
  catalog: Record<string, MetricMeta>;
  onUpdate: (id: string, field: keyof ManualRow, val: string) => void;
  onRemap: (id: string, key: string) => void;
  onAddMetric: (key: string, meta: MetricMeta) => void;
  onRemove: (id: string) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const catalogMeta = row.metricKey ? catalog[row.metricKey] : null;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 100px 80px 32px",
        gap: "12px",
        alignItems: "start",
        padding: "12px 16px",
        backgroundColor: hovered ? colors.surface : "transparent",
        borderBottom: `1px solid ${colors.border}`,
        transition: `background-color var(--duration-micro) var(--ease)`,
      }}
    >
      {/* Metric name + key picker */}
      <div style={{ display: "flex", flexDirection: "column", gap: "4px", position: "relative", minWidth: 0 }}>
        <input
          type="text"
          value={row.metricName}
          onChange={e => onUpdate(row.id, "metricName", e.target.value)}
          placeholder="Marker name"
          style={{ ...editInputStyle, borderBottom: `1px solid ${colors.border}`, paddingBottom: "4px" }}
        />
        <button
          onClick={() => setPickerOpen(v => !v)}
          style={{ background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left", display: "inline-flex", alignItems: "center", gap: "4px" }}
        >
          {row.metricKey ? (
            <>
              {catalogMeta && <span style={{ display: "inline-block", width: "5px", height: "5px", borderRadius: "50%", backgroundColor: CATEGORY_COLORS[catalogMeta.category], flexShrink: 0 }} />}
              <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "11px", fontWeight: 300, color: colors.inkMuted, textDecoration: hovered ? "underline" : "none" }}>{row.metricKey}</span>
            </>
          ) : (
            <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "11px", color: colors.badge.act }}>Select metric →</span>
          )}
        </button>
        {pickerOpen && (
          <MetricKeyPicker
            currentKey={row.metricKey}
            catalog={catalog}
            onSelect={key => { onRemap(row.id, key); setPickerOpen(false); }}
            onAddMetric={onAddMetric}
            onClose={() => setPickerOpen(false)}
          />
        )}
      </div>

      {/* Value */}
      <input
        type="number"
        value={row.value}
        onChange={e => onUpdate(row.id, "value", e.target.value)}
        placeholder="Value"
        style={{ ...editInputStyle, borderBottom: `1px solid ${colors.border}`, paddingBottom: "4px", textAlign: "right" }}
      />

      {/* Unit */}
      <input
        type="text"
        value={row.unit}
        onChange={e => onUpdate(row.id, "unit", e.target.value)}
        placeholder="Unit"
        style={{ ...editInputStyle, borderBottom: `1px solid ${colors.border}`, paddingBottom: "4px" }}
      />

      {/* Remove */}
      <button
        onClick={() => onRemove(row.id)}
        style={{
          background: "none", border: "none", cursor: "pointer", padding: "2px",
          color: colors.inkMuted, fontSize: "16px", lineHeight: 1,
          opacity: hovered ? 1 : 0,
          transition: `opacity var(--duration-micro) var(--ease)`,
          alignSelf: "center",
        }}
      >
        ×
      </button>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function UploadPage() {
  const [step, setStep] = useState<Step>(1);
  const [inputMode, setInputMode] = useState<"manual" | "csv">("manual");
  const [csvText, setCsvText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [manualRows, setManualRows] = useState<ManualRow[]>([
    { id: "m1", metricKey: null, metricName: "", value: "", unit: "" },
  ]);
  const [date, setDate] = useState("");
  const [labName, setLabName] = useState("");
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<Record<string, MetricMeta>>({ ...BASE_CATALOG });

  // Parse pasted CSV text into rows
  // Supported formats:
  //   marker,value,unit
  //   marker,value,unit,lab_low,lab_high
  const parseCsv = () => {
    const lines = csvText.trim().split("\n").filter(l => l.trim());
    const parsed: ParsedRow[] = lines
      .filter(line => !line.toLowerCase().startsWith("marker") && !line.toLowerCase().startsWith("metric"))
      .map((line, i) => {
        const parts = line.split(",").map(p => p.trim());
        const rawName = parts[0] ?? "";
        const value = parseFloat(parts[1] ?? "");
        const unit = parts[2] ?? "";
        const labLow = parts[3] ? parseFloat(parts[3]) : undefined;
        const labHigh = parts[4] ? parseFloat(parts[4]) : undefined;
        // Try to find a matching metric key
        const matchedKey = Object.entries(catalog).find(([, meta]) =>
          meta.name.toLowerCase() === rawName.toLowerCase()
        )?.[0] ?? null;
        return {
          id: `csv-${i}`,
          rawName,
          metricKey: matchedKey,
          metricName: matchedKey ? (catalog[matchedKey]?.name ?? rawName) : rawName,
          value: isNaN(value) ? 0 : value,
          unit,
          labRangeLow: labLow,
          labRangeHigh: labHigh,
          rowState: matchedKey ? "confirmed" as const : "unmapped" as const,
          deleted: false,
        };
      })
      .filter(r => r.rawName);
    setRows(parsed);
    setStep(2);
  };

  const canParseCsv = csvText.trim().split("\n").filter(l => l.trim() && !l.toLowerCase().startsWith("marker")).length > 0;

  // Manual row handlers
  const addManualRow = () =>
    setManualRows(prev => [...prev, { id: `m${Date.now()}`, metricKey: null, metricName: "", value: "", unit: "" }]);

  const removeManualRow = (id: string) =>
    setManualRows(prev => prev.filter(r => r.id !== id));

  const updateManualRow = (id: string, field: keyof ManualRow, val: string) =>
    setManualRows(prev => prev.map(r => r.id === id ? { ...r, [field]: val } : r));

  const remapManualRow = (id: string, key: string) => {
    const meta = catalog[key];
    setManualRows(prev => prev.map(r =>
      r.id === id ? { ...r, metricKey: key, metricName: r.metricName || (meta?.name ?? "") } : r
    ));
  };

  // Convert manual rows → ParsedRow[] for step 2 review
  const commitManualToRows = () => {
    const parsed: ParsedRow[] = manualRows
      .filter(r => r.metricName.trim() || r.metricKey)
      .map((r, i) => ({
        id: `manual-${i}`,
        rawName: r.metricName || (r.metricKey ?? ""),
        metricKey: r.metricKey,
        metricName: r.metricName || (r.metricKey ? catalog[r.metricKey]?.name ?? null : null),
        value: parseFloat(r.value) || 0,
        unit: r.unit,
        rowState: r.metricKey ? "confirmed" as const : "unmapped" as const,
        deleted: false,
      }));
    setRows(parsed);
    setStep(2);
  };

  const validManualRows = manualRows.filter(r => (r.metricName.trim() || r.metricKey) && r.value);
  const canCommitManual = validManualRows.length > 0;

  const handleDelete = (id: string) =>
    setRows(prev => prev.map(r => r.id === id ? { ...r, deleted: !r.deleted } : r));

  const handleUpdate = (id: string, field: "metricName" | "value" | "unit", val: string) =>
    setRows(prev => prev.map(r => {
      if (r.id !== id) return r;
      if (field === "value") return { ...r, value: parseFloat(val) || r.value };
      return { ...r, [field]: val };
    }));

  const handleToggleState = (id: string) =>
    setRows(prev => prev.map(r => {
      if (r.id !== id) return r;
      const next: RowState = r.rowState === "confirmed" ? "review" : "confirmed";
      return { ...r, rowState: next };
    }));

  const handleAddMetric = (key: string, meta: MetricMeta) =>
    setCatalog(prev => ({ ...prev, [key]: meta }));

  // Assign a metricKey — if unmapped, auto-promote to "review"; fill metricName from catalog if empty
  const handleRemap = (id: string, key: string) =>
    setRows(prev => prev.map(r => {
      if (r.id !== id) return r;
      const meta = catalog[key];
      return {
        ...r,
        metricKey: key,
        metricName: r.metricName || (meta?.name ?? null),
        rowState: r.rowState === "unmapped" ? "review" : r.rowState,
      };
    }));

  const activeRows = rows.filter(r => !r.deleted);
  const hasUnmapped = activeRows.some(r => r.rowState === "unmapped");
  const canProceed = activeRows.length > 0 && !hasUnmapped;

  // ── Saved confirmation ──
  if (saved) {
    return (
      <div>
        <p style={{ fontFamily: "var(--font-outfit)", fontWeight: 600, fontSize: "13px", letterSpacing: "0.12em", textTransform: "uppercase", color: colors.inkMuted, marginBottom: "8px" }}>Upload</p>
        <h1 style={{ fontFamily: "var(--font-outfit)", fontWeight: 600, fontSize: "28px", color: colors.ink, letterSpacing: "-0.01em", marginBottom: "40px" }}>New test</h1>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", padding: "64px 24px", textAlign: "center" }}>
          <div style={{ width: "48px", height: "48px", borderRadius: "50%", backgroundColor: colors.badge.optimal, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: colors.background, fontSize: "20px" }}>✓</span>
          </div>
          <p style={{ fontFamily: "var(--font-outfit)", fontWeight: 600, fontSize: "20px", color: colors.ink, margin: 0 }}>Test saved</p>
          <p style={{ fontFamily: "var(--font-dm-sans)", fontWeight: 300, fontSize: "14px", color: colors.inkMuted, margin: 0 }}>
            {activeRows.length} markers from {date} have been added to your record.
          </p>
          <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
            <Button variant="ghost" onClick={() => { window.location.href = "/tests"; }}>View test log</Button>
            <Button variant="primary" onClick={() => { setStep(1); setFile(null); setRows([]); setDate(""); setLabName(""); setNotes(""); setSaved(false); }}>Upload another</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p style={{ fontFamily: "var(--font-outfit)", fontWeight: 600, fontSize: "13px", letterSpacing: "0.12em", textTransform: "uppercase", color: colors.inkMuted, marginBottom: "8px" }}>Upload</p>
      <h1 style={{ fontFamily: "var(--font-outfit)", fontWeight: 600, fontSize: "28px", color: colors.ink, letterSpacing: "-0.01em", marginBottom: "32px" }}>New test</h1>

      <StepIndicator current={step} />

      {/* ── Step 1 ── */}
      {step === 1 && (
        <div style={{ maxWidth: "560px" }}>
          {/* Mode toggle */}
          <div style={{
            display: "inline-flex",
            backgroundColor: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: "6px",
            padding: "3px",
            marginBottom: "24px",
            gap: "2px",
          }}>
            {(["manual", "csv"] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setInputMode(mode)}
                style={{
                  fontFamily: "var(--font-dm-sans)",
                  fontSize: "13px",
                  padding: "6px 14px",
                  borderRadius: "4px",
                  border: "none",
                  cursor: "pointer",
                  backgroundColor: inputMode === mode ? colors.ink : "transparent",
                  color: inputMode === mode ? colors.background : colors.inkMuted,
                  transition: `background-color var(--duration-micro) var(--ease), color var(--duration-micro) var(--ease)`,
                }}
              >
                {mode === "manual" ? "Enter manually" : "Import CSV"}
              </button>
            ))}
          </div>

          {/* CSV import mode */}
          {inputMode === "csv" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontFamily: "var(--font-outfit)", fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: colors.inkMuted }}>
                  Paste CSV data
                </label>
                <textarea
                  value={csvText}
                  onChange={e => setCsvText(e.target.value)}
                  placeholder={"marker,value,unit\nLDL-C,288,mg/dL\nApoB,163,mg/dL\nHDL-C,64.9,mg/dL"}
                  rows={10}
                  style={{
                    ...inputStyle,
                    fontFamily: "var(--font-dm-sans)",
                    fontSize: "13px",
                    resize: "vertical",
                    lineHeight: 1.6,
                    fontVariantNumeric: "tabular-nums",
                  }}
                />
              </div>
              <p style={{ fontFamily: "var(--font-dm-sans)", fontWeight: 300, fontSize: "12px", color: colors.inkMuted, margin: 0 }}>
                Columns: <code>marker, value, unit</code> — optionally add <code>lab_low, lab_high</code>. First row can be a header (will be skipped).
              </p>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  onClick={parseCsv}
                  disabled={!canParseCsv}
                  style={{
                    fontFamily: "var(--font-dm-sans)", fontSize: "13px",
                    color: canParseCsv ? colors.background : colors.inkMuted,
                    backgroundColor: canParseCsv ? colors.ink : colors.surface,
                    border: "none", borderRadius: "4px", padding: "8px 20px",
                    cursor: canParseCsv ? "pointer" : "default",
                  }}
                >
                  Review →
                </button>
              </div>
            </div>
          )}

          {/* Manual entry mode */}
          {inputMode === "manual" && (
            <div>
              {/* Column headers */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 100px 80px 32px", gap: "12px", padding: "6px 16px", borderBottom: `1px solid ${colors.border}` }}>
                {["Marker", "Value", "Unit", ""].map((h, i) => (
                  <span key={i} style={{ fontFamily: "var(--font-outfit)", fontSize: "11px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: colors.inkMuted, textAlign: i === 1 ? "right" : "left" as "right" | "left" }}>
                    {h}
                  </span>
                ))}
              </div>

              {/* Rows */}
              <div style={{ backgroundColor: colors.background, border: `1px solid ${colors.border}`, borderRadius: "6px", overflow: "visible", marginBottom: "12px" }}>
                {manualRows.map(row => (
                  <ManualEntryRow
                    key={row.id}
                    row={row}
                    catalog={catalog}
                    onUpdate={updateManualRow}
                    onRemap={remapManualRow}
                    onAddMetric={handleAddMetric}
                    onRemove={removeManualRow}
                  />
                ))}
              </div>

              {/* Add row + continue */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <button
                  onClick={addManualRow}
                  style={{
                    fontFamily: "var(--font-dm-sans)", fontSize: "13px",
                    color: colors.inkMuted, backgroundColor: "transparent",
                    border: `1px solid ${colors.border}`, borderRadius: "4px",
                    padding: "7px 14px", cursor: "pointer",
                    display: "inline-flex", alignItems: "center", gap: "6px",
                  }}
                >
                  <span style={{ fontSize: "14px", lineHeight: 1 }}>+</span> Add row
                </button>
                <button
                  onClick={commitManualToRows}
                  disabled={!canCommitManual}
                  style={{
                    fontFamily: "var(--font-dm-sans)", fontSize: "13px",
                    color: canCommitManual ? colors.background : colors.inkMuted,
                    backgroundColor: canCommitManual ? colors.ink : colors.surface,
                    border: "none", borderRadius: "4px", padding: "8px 20px",
                    cursor: canCommitManual ? "pointer" : "default",
                  }}
                >
                  Review →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Step 2 ── */}
      {step === 2 && (
        <div>
          {/* File + count */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "14px", color: colors.inkMuted }}>{inputMode === "csv" ? "CSV import" : "Manual entry"}</span>
              <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "12px", color: colors.inkMuted, opacity: 0.6 }}>
                · {activeRows.length} of {rows.length} markers
              </span>
            </div>
            {hasUnmapped && (
              <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "12px", color: colors.badge.act }}>
                Map or remove unmapped markers to continue
              </span>
            )}
          </div>

          {/* Header */}
          <div style={{ display: "grid", gridTemplateColumns: "16px 1fr 150px 120px 60px", gap: "12px", padding: "8px 16px", borderBottom: `1px solid ${colors.border}` }}>
            {["", "Marker", "Value", "Status", ""].map((h, i) => (
              <span key={i} style={{
                fontFamily: "var(--font-outfit)", fontSize: "11px", fontWeight: 600,
                letterSpacing: "0.1em", textTransform: "uppercase", color: colors.inkMuted,
                textAlign: (i >= 2 ? "right" : "left") as "right" | "left",
              }}>
                {h}
              </span>
            ))}
          </div>

          {/* Rows */}
          <div style={{ backgroundColor: colors.background, borderRadius: "6px", border: `1px solid ${colors.border}`, overflow: "visible", marginBottom: "24px" }}>
            {rows.map(row => (
              <ReviewRow
                key={row.id}
                row={row}
                catalog={catalog}
                onDelete={handleDelete}
                onToggleState={handleToggleState}
                onUpdate={handleUpdate}
                onRemap={handleRemap}
                onAddMetric={handleAddMetric}
              />
            ))}
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            <Button variant="ghost" onClick={() => setStep(1)}>← Back</Button>
            <Button variant="primary" onClick={() => setStep(3)} disabled={!canProceed}>Continue →</Button>
          </div>
        </div>
      )}

      {/* ── Step 3 ── */}
      {step === 3 && (
        <div style={{ maxWidth: "480px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "20px", marginBottom: "32px" }}>
            <Field label="Test date">
              <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Lab / clinic" optional>
              <input type="text" value={labName} onChange={e => setLabName(e.target.value)} placeholder="e.g. LabCorp, PathCare" style={inputStyle} />
            </Field>
            <Field label="Notes" optional>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Fasted 12h, taken 8am…" rows={3} style={{ ...inputStyle, resize: "vertical", lineHeight: "1.5" }} />
            </Field>
            <div style={{ backgroundColor: colors.surface, borderRadius: "6px", border: `1px solid ${colors.border}`, padding: "12px 16px", display: "flex", flexDirection: "column", gap: "4px" }}>
              <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "13px", color: colors.ink }}>
                {activeRows.length} markers will be saved
              </span>
              {rows.filter(r => r.deleted).length > 0 && (
                <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "12px", color: colors.inkMuted }}>
                  {rows.filter(r => r.deleted).length} removed
                </span>
              )}
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <Button variant="ghost" onClick={() => setStep(2)}>← Back</Button>
            <Button
              variant="primary"
              disabled={!date || saving}
              onClick={async () => {
                setSaving(true);
                setSaveError(null);
                try {
                  // 1. Insert test
                  const { data: testData, error: testErr } = await supabase
                    .from("tests")
                    .insert({ date, lab_name: labName || null, notes: notes || null })
                    .select("id")
                    .single();
                  if (testErr || !testData) throw new Error(testErr?.message ?? "Failed to create test");

                  // 2. Insert readings
                  const readingsToInsert = activeRows
                    .filter(r => r.metricKey)
                    .map(r => {
                      const meta = catalog[r.metricKey!];
                      const badge = meta?.isScored && meta?.bands
                        ? computeStatusBadge(r.value, meta)
                        : null;
                      return {
                        test_id: testData.id,
                        metric_key: r.metricKey,
                        value: r.value,
                        unit: r.unit,
                        lab_range_low: r.labRangeLow ?? null,
                        lab_range_high: r.labRangeHigh ?? null,
                        attention_state: badge,
                        annotation: null,
                      };
                    });

                  const { error: readingsErr } = await supabase
                    .from("readings")
                    .insert(readingsToInsert);
                  if (readingsErr) throw new Error(readingsErr.message);

                  setSaved(true);
                } catch (err: any) {
                  setSaveError(err.message ?? "Unknown error");
                } finally {
                  setSaving(false);
                }
              }}
            >
              {saving ? "Saving…" : "Save test"}
            </Button>
            {!date && !saving && <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "12px", color: colors.inkMuted }}>Date required</span>}
            {saveError && <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "12px", color: colors.badge.act }}>{saveError}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
