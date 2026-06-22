"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { colors } from "@/lib/tokens";
import type { CategoryKey } from "@/lib/tokens";
import { METRIC_CATALOG, CATEGORY_ORDER, computeStatusBadge } from "@/lib/metrics";
import type { MetricMeta } from "@/lib/metrics";
import { supabase } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MarkerRow {
  id: string;
  metricKey: string | null;
  metricName: string;
  value: string;
  unit: string;
}

const CATEGORY_COLORS = Object.fromEntries(
  Object.entries(colors.category).map(([k, v]) => [k, v])
) as Record<CategoryKey, string>;

// ─── Metric key picker (inline, simplified) ───────────────────────────────────

function MetricPicker({
  currentKey,
  catalog,
  onSelect,
  onClose,
}: {
  currentKey: string | null;
  catalog: Record<string, MetricMeta>;
  onSelect: (key: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");

  const q = query.toLowerCase();
  const filtered = Object.entries(catalog).filter(([key, meta]) =>
    key.includes(q) || meta.name.toLowerCase().includes(q)
  );
  const grouped = CATEGORY_ORDER
    .map(cat => [cat, filtered.filter(([, m]) => m.category === cat)] as [CategoryKey, [string, MetricMeta][]])
    .filter(([, items]) => items.length > 0);

  return (
    <div
      style={{
        position: "absolute",
        top: "100%",
        left: 0,
        zIndex: 100,
        width: "320px",
        backgroundColor: colors.background,
        border: `1px solid ${colors.border}`,
        borderRadius: "6px",
        boxShadow: "0px 8px 32px rgba(42,37,32,0.10)",
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "8px 12px", borderBottom: `1px solid ${colors.border}` }}>
        <input
          autoFocus
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search markers…"
          style={{ width: "100%", fontFamily: "var(--font-dm-sans)", fontSize: "13px", color: colors.ink, background: "transparent", border: "none", outline: "none" }}
        />
      </div>
      <div style={{ maxHeight: "240px", overflowY: "auto" }}>
        {grouped.length === 0 && (
          <div style={{ padding: "14px 12px", fontFamily: "var(--font-dm-sans)", fontSize: "13px", color: colors.inkMuted }}>
            No match found
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
                onClick={() => { onSelect(key); onClose(); }}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  width: "100%", padding: "7px 12px 7px 24px",
                  background: key === currentKey ? colors.surface : "none",
                  border: "none", cursor: "pointer", textAlign: "left", gap: "8px",
                }}
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
    </div>
  );
}

// ─── Row ──────────────────────────────────────────────────────────────────────

function MarkerInputRow({
  row,
  catalog,
  onChange,
  onRemap,
  onRemove,
  showRemove,
}: {
  row: MarkerRow;
  catalog: Record<string, MetricMeta>;
  onChange: (id: string, field: keyof MarkerRow, val: string) => void;
  onRemap: (id: string, key: string) => void;
  onRemove: (id: string) => void;
  showRemove: boolean;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const meta = row.metricKey ? catalog[row.metricKey] : null;

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "1fr 100px 80px 28px",
      gap: "10px",
      alignItems: "start",
      padding: "12px 0",
      borderBottom: `1px solid ${colors.border}`,
      position: "relative",
    }}>
      {/* Metric name + key picker */}
      <div style={{ display: "flex", flexDirection: "column", gap: "3px", position: "relative", minWidth: 0 }}>
        <input
          type="text"
          value={row.metricName}
          onChange={e => onChange(row.id, "metricName", e.target.value)}
          placeholder="Marker name"
          style={{
            fontFamily: "var(--font-dm-sans)", fontSize: "14px", color: colors.ink,
            background: "transparent", border: "none", borderBottom: `1px solid ${colors.border}`,
            outline: "none", padding: "2px 0", width: "100%",
          }}
        />
        <button
          onClick={() => setPickerOpen(v => !v)}
          style={{ background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left", display: "inline-flex", alignItems: "center", gap: "4px" }}
        >
          {row.metricKey ? (
            <>
              {meta && <span style={{ display: "inline-block", width: "5px", height: "5px", borderRadius: "50%", backgroundColor: CATEGORY_COLORS[meta.category], flexShrink: 0 }} />}
              <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "11px", fontWeight: 300, color: colors.inkMuted }}>{row.metricKey}</span>
            </>
          ) : (
            <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "11px", color: colors.badge.act }}>Select metric →</span>
          )}
        </button>
        {pickerOpen && (
          <MetricPicker
            currentKey={row.metricKey}
            catalog={catalog}
            onSelect={key => {
              const m = catalog[key];
              onChange(row.id, "metricName", row.metricName || (m?.name ?? ""));
              onRemap(row.id, key);
              // Auto-fill unit from catalog if blank
              if (!row.unit && m?.unit) onChange(row.id, "unit", m.unit);
            }}
            onClose={() => setPickerOpen(false)}
          />
        )}
      </div>

      {/* Value */}
      <input
        type="number"
        value={row.value}
        onChange={e => onChange(row.id, "value", e.target.value)}
        placeholder="Value"
        style={{
          fontFamily: "var(--font-outfit)", fontSize: "14px", fontWeight: 600, color: colors.ink,
          background: "transparent", border: "none", borderBottom: `1px solid ${colors.border}`,
          outline: "none", padding: "2px 0", textAlign: "right", width: "100%",
        }}
      />

      {/* Unit */}
      <input
        type="text"
        value={row.unit}
        onChange={e => onChange(row.id, "unit", e.target.value)}
        placeholder="Unit"
        style={{
          fontFamily: "var(--font-dm-sans)", fontSize: "13px", color: colors.inkMuted,
          background: "transparent", border: "none", borderBottom: `1px solid ${colors.border}`,
          outline: "none", padding: "2px 0", width: "100%",
        }}
      />

      {/* Remove */}
      {showRemove && (
        <button
          onClick={() => onRemove(row.id)}
          style={{ background: "none", border: "none", cursor: "pointer", color: colors.inkMuted, fontSize: "16px", lineHeight: 1, padding: "2px", alignSelf: "center" }}
        >
          ×
        </button>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AddMarkerPanel({ testId }: { testId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<MarkerRow[]>([
    { id: "r1", metricKey: null, metricName: "", value: "", unit: "" },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const catalog = { ...METRIC_CATALOG };

  const updateRow = (id: string, field: keyof MarkerRow, val: string) =>
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: val } : r));

  const remapRow = (id: string, key: string) =>
    setRows(prev => prev.map(r => r.id === id ? { ...r, metricKey: key } : r));

  const removeRow = (id: string) =>
    setRows(prev => prev.filter(r => r.id !== id));

  const addRow = () =>
    setRows(prev => [...prev, { id: `r${Date.now()}`, metricKey: null, metricName: "", value: "", unit: "" }]);

  const validRows = rows.filter(r => r.metricKey && r.value);
  const canSave = validRows.length > 0 && !saving;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const readingsToInsert = validRows.map(r => {
        const meta = catalog[r.metricKey!];
        const badge = meta?.isScored && meta?.bands
          ? computeStatusBadge(parseFloat(r.value), meta)
          : null;
        return {
          test_id: testId,
          metric_key: r.metricKey,
          value: parseFloat(r.value),
          unit: r.unit,
          attention_state: badge,
        };
      });

      const { error: err } = await supabase.from("readings").insert(readingsToInsert);
      if (err) throw new Error(err.message);

      // Reset and close
      setRows([{ id: "r1", metricKey: null, metricName: "", value: "", unit: "" }]);
      setOpen(false);
      router.refresh();
    } catch (e: any) {
      setError(e.message ?? "Unknown error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ marginTop: "40px" }}>
      {/* Section heading — same style as category headings */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{
            display: "inline-block", width: "8px", height: "8px",
            borderRadius: "50%", backgroundColor: colors.border, flexShrink: 0,
          }} />
          <h2 style={{
            fontFamily: "var(--font-outfit)", fontWeight: 600, fontSize: "13px",
            letterSpacing: "0.12em", textTransform: "uppercase", color: colors.inkMuted, margin: 0,
          }}>
            Add markers
          </h2>
        </div>
        {open && (
          <button
            onClick={() => setOpen(false)}
            style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-dm-sans)", fontSize: "13px", color: colors.inkMuted }}
          >
            Cancel
          </button>
        )}
      </div>

      {!open ? (
        <div
          onClick={() => setOpen(true)}
          style={{
            backgroundColor: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: "6px",
            padding: "14px 20px",
            cursor: "pointer",
            display: "flex", alignItems: "center", gap: "8px",
            color: colors.inkMuted,
          }}
          onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.backgroundColor = colors.background}
          onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.backgroundColor = colors.surface}
        >
          <span style={{ fontSize: "16px", lineHeight: 1 }}>+</span>
          <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "14px", fontWeight: 300 }}>Add a marker to this test…</span>
        </div>
      ) : (
      <div style={{
        backgroundColor: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: "6px",
        overflow: "visible",
      }}>

        {/* Column headers */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 100px 80px 28px", gap: "10px", padding: "10px 20px", borderBottom: `1px solid ${colors.border}`, borderRadius: "6px 6px 0 0" }}>
          {["Marker", "Value", "Unit", ""].map((h, i) => (
            <span key={i} style={{
              fontFamily: "var(--font-outfit)", fontSize: "10px", fontWeight: 600,
              letterSpacing: "0.1em", textTransform: "uppercase", color: colors.inkMuted,
              textAlign: i === 1 ? "right" : "left",
            }}>
              {h}
            </span>
          ))}
        </div>

        {/* Rows */}
        <div style={{ padding: "0 20px" }}>
          {rows.map(row => (
            <MarkerInputRow
              key={row.id}
              row={row}
              catalog={catalog}
              onChange={updateRow}
              onRemap={remapRow}
              onRemove={removeRow}
              showRemove={rows.length > 1}
            />
          ))}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderTop: `1px solid ${colors.border}`, borderRadius: "0 0 6px 6px" }}>
          <button
            onClick={addRow}
            style={{
              fontFamily: "var(--font-dm-sans)", fontSize: "13px", color: colors.inkMuted,
              background: "transparent", border: `1px solid ${colors.border}`,
              borderRadius: "4px", padding: "6px 12px", cursor: "pointer",
              display: "inline-flex", alignItems: "center", gap: "6px",
            }}
          >
            <span style={{ fontSize: "14px", lineHeight: 1 }}>+</span> Add row
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {error && <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "12px", color: colors.badge.act }}>{error}</span>}
            <button
              onClick={handleSave}
              disabled={!canSave}
              style={{
                fontFamily: "var(--font-dm-sans)", fontSize: "13px",
                color: canSave ? colors.background : colors.inkMuted,
                backgroundColor: canSave ? colors.ink : colors.surface,
                border: "none", borderRadius: "4px", padding: "7px 20px",
                cursor: canSave ? "pointer" : "default",
              }}
            >
              {saving ? "Saving…" : `Save ${validRows.length > 0 ? validRows.length : ""} marker${validRows.length !== 1 ? "s" : ""}`}
            </button>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
