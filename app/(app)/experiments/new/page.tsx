"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { colors } from "@/lib/tokens";
import type { CategoryKey } from "@/lib/tokens";
import { METRIC_CATALOG, CATEGORY_ORDER } from "@/lib/metrics";
import type { MetricMeta } from "@/lib/metrics";
import { supabase } from "@/lib/supabase";

const CATEGORY_COLORS = Object.fromEntries(
  Object.entries(colors.category).map(([k, v]) => [k, v])
) as Record<CategoryKey, string>;

// ─── Metric tag ───────────────────────────────────────────────────────────────
function MetricTag({ metricKey, onRemove }: { metricKey: string; onRemove: () => void }) {
  const meta = METRIC_CATALOG[metricKey];
  if (!meta) return null;
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: "6px",
      backgroundColor: colors.surface, border: `1px solid ${colors.border}`,
      borderRadius: "4px", padding: "4px 10px",
    }}>
      <span style={{
        display: "inline-block", width: "6px", height: "6px",
        borderRadius: "50%", backgroundColor: CATEGORY_COLORS[meta.category], flexShrink: 0,
      }} />
      <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "13px", color: colors.ink }}>{meta.name}</span>
      <button
        onClick={onRemove}
        style={{ background: "none", border: "none", cursor: "pointer", padding: "0 0 0 2px", color: colors.inkMuted, fontSize: "14px", lineHeight: 1, display: "flex", alignItems: "center" }}
      >×</button>
    </div>
  );
}

// ─── Metric selector dropdown ─────────────────────────────────────────────────
function MetricSelector({ selected, onToggle, onClose }: {
  selected: string[];
  onToggle: (key: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
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

  const q = query.toLowerCase();
  const filtered = Object.entries(METRIC_CATALOG).filter(([key, meta]) =>
    key.includes(q) || meta.name.toLowerCase().includes(q) || meta.category.includes(q)
  );
  const grouped = CATEGORY_ORDER
    .map(cat => [cat, filtered.filter(([, m]) => m.category === cat)] as [CategoryKey, [string, MetricMeta][]])
    .filter(([, items]) => items.length > 0);

  return (
    <div ref={containerRef} style={{
      position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 100,
      width: "340px", backgroundColor: colors.background,
      border: `1px solid ${colors.border}`, borderRadius: "6px",
      boxShadow: "0px 8px 32px rgba(42,37,32,0.10)", overflow: "hidden",
    }}>
      <div style={{ padding: "8px 12px", borderBottom: `1px solid ${colors.border}` }}>
        <input
          ref={inputRef} type="text" value={query}
          onChange={e => setQuery(e.target.value)} placeholder="Search metrics…"
          style={{ width: "100%", fontFamily: "var(--font-dm-sans)", fontSize: "13px", color: colors.ink, background: "transparent", border: "none", outline: "none" }}
        />
      </div>
      <div style={{ maxHeight: "280px", overflowY: "auto" }}>
        {grouped.length === 0 && (
          <div style={{ padding: "14px 12px", fontFamily: "var(--font-dm-sans)", fontSize: "13px", color: colors.inkMuted }}>No match</div>
        )}
        {grouped.map(([cat, items]) => (
          <div key={cat}>
            <div style={{ padding: "6px 12px 4px", display: "flex", alignItems: "center", gap: "6px", position: "sticky", top: 0, backgroundColor: colors.surface }}>
              <span style={{ display: "inline-block", width: "6px", height: "6px", borderRadius: "50%", backgroundColor: CATEGORY_COLORS[cat], flexShrink: 0 }} />
              <span style={{ fontFamily: "var(--font-outfit)", fontSize: "10px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: CATEGORY_COLORS[cat] }}>{cat}</span>
            </div>
            {items.map(([key, meta]) => {
              const isSelected = selected.includes(key);
              return (
                <button key={key} onClick={() => onToggle(key)} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  width: "100%", padding: "7px 12px 7px 24px",
                  background: isSelected ? `${CATEGORY_COLORS[meta.category]}14` : "none",
                  border: "none", cursor: "pointer", textAlign: "left", gap: "8px",
                }}
                  onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLButtonElement).style.backgroundColor = colors.surface; }}
                  onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent"; }}
                >
                  <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "13px", color: colors.ink }}>{meta.name}</span>
                  {isSelected && <span style={{ fontSize: "12px", color: CATEGORY_COLORS[meta.category], flexShrink: 0 }}>✓</span>}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Field wrapper ────────────────────────────────────────────────────────────
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
        <label style={{ fontFamily: "var(--font-outfit)", fontSize: "13px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: colors.inkMuted }}>
          {label}
        </label>
        {hint && <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "12px", fontWeight: 300, color: colors.inkMuted }}>{hint}</span>}
      </div>
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

// ─── Main page ────────────────────────────────────────────────────────────────
export default function NewExperimentPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [hypothesis, setHypothesis] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);
  const [targets, setTargets] = useState<Record<string, { low: string; high: string }>>({});
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Real tests in the selected window
  const [allTests, setAllTests] = useState<{ id: string; date: string; lab_name: string | null }[]>([]);
  useEffect(() => {
    supabase.from("tests").select("id, date, lab_name").order("date", { ascending: false })
      .then(({ data }) => setAllTests(data ?? []));
  }, []);

  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const fmtDate = (iso: string) => {
    const [y, m, d] = iso.split("-");
    return `${parseInt(d)} ${months[parseInt(m) - 1]} ${y}`;
  };

  const testsInWindow = allTests.filter(t => {
    if (!startDate) return false;
    if (t.date < startDate) return false;
    if (endDate && t.date > endDate) return false;
    return true;
  });

  const MAX_METRICS = 8;
  const toggleMetric = (key: string) => {
    setSelectedMetrics(prev => {
      if (prev.includes(key)) {
        setTargets(t => { const n = { ...t }; delete n[key]; return n; });
        return prev.filter(k => k !== key);
      }
      if (prev.length >= MAX_METRICS) return prev;
      setTargets(t => ({ ...t, [key]: { low: "", high: "" } }));
      return [...prev, key];
    });
  };

  const setTarget = (key: string, field: "low" | "high", val: string) => {
    setTargets(t => ({ ...t, [key]: { ...t[key], [field]: val } }));
  };

  const canSave = name.trim().length > 0 && startDate.length > 0 && selectedMetrics.length > 0 && !saving;

  const handleCreate = async () => {
    if (!canSave) return;
    setSaving(true);
    setError(null);

    // Insert experiment
    const { data: exp, error: expErr } = await supabase
      .from("experiments")
      .insert({
        name: name.trim(),
        hypothesis: hypothesis.trim() || null,
        start_date: startDate,
        end_date: endDate || null,
        status: "active",
      })
      .select("id")
      .single();

    if (expErr || !exp) {
      setError("Failed to save experiment. Please try again.");
      setSaving(false);
      return;
    }

    // Insert experiment_metrics with targets
    if (selectedMetrics.length > 0) {
      const { error: metricsErr } = await supabase
        .from("experiment_metrics")
        .insert(selectedMetrics.map(key => ({
          experiment_id: exp.id,
          metric_key: key,
          target_low: targets[key]?.low ? parseFloat(targets[key].low) : null,
          target_high: targets[key]?.high ? parseFloat(targets[key].high) : null,
        })));

      if (metricsErr) {
        setError("Experiment created but failed to save metrics.");
        setSaving(false);
        return;
      }
    }

    router.push(`/experiments/${exp.id}`);
  };

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ marginBottom: "24px" }}>
        <Link href="/experiments" style={{ fontFamily: "var(--font-dm-sans)", fontWeight: 300, fontSize: "14px", color: colors.inkMuted, textDecoration: "none" }}>
          ← Experiments
        </Link>
      </div>

      <p style={{ fontFamily: "var(--font-outfit)", fontWeight: 600, fontSize: "13px", letterSpacing: "0.12em", textTransform: "uppercase", color: colors.inkMuted, marginBottom: "8px" }}>
        New experiment
      </p>
      <h1 style={{ fontFamily: "var(--font-outfit)", fontWeight: 600, fontSize: "28px", color: colors.ink, letterSpacing: "-0.01em", marginBottom: "40px" }}>
        Define experiment
      </h1>

      <div style={{ maxWidth: "600px", display: "flex", flexDirection: "column", gap: "28px" }}>

        <Field label="Name">
          <input type="text" value={name} onChange={e => setName(e.target.value)}
            placeholder="e.g. Seed oil elimination" style={inputStyle} />
        </Field>

        <Field label="Hypothesis" hint="(optional)">
          <textarea value={hypothesis} onChange={e => setHypothesis(e.target.value)}
            placeholder="What do you expect to happen, and why?" rows={3}
            style={{ ...inputStyle, resize: "vertical", lineHeight: "1.6" }} />
        </Field>

        <Field label="Observation window">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "12px", fontWeight: 300, color: colors.inkMuted }}>Start date</span>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "12px", fontWeight: 300, color: colors.inkMuted }}>
                End date <span style={{ opacity: 0.6 }}>(leave blank if ongoing)</span>
              </span>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={inputStyle} />
            </div>
          </div>
        </Field>

        {/* Test window preview — real data */}
        {startDate && (
          <div style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: "6px", padding: "14px 16px" }}>
            <p style={{ fontFamily: "var(--font-outfit)", fontSize: "11px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: colors.inkMuted, margin: "0 0 10px" }}>
              Tests in this window
            </p>
            {testsInWindow.length === 0 ? (
              <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "13px", color: colors.inkMuted, margin: 0 }}>
                No tests recorded in this window yet — you can still create the experiment.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {testsInWindow.map(t => (
                  <div key={t.id} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ display: "inline-block", width: "5px", height: "5px", borderRadius: "50%", backgroundColor: colors.badge.optimal, flexShrink: 0 }} />
                    <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "13px", fontWeight: 400, color: colors.ink }}>{fmtDate(t.date)}</span>
                    <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "12px", fontWeight: 300, color: colors.inkMuted }}>{t.lab_name ?? ""}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <Field label="Metrics to track" hint={`up to ${MAX_METRICS}`}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: selectedMetrics.length > 0 ? "8px" : 0 }}>
            {selectedMetrics.map(key => (
              <MetricTag key={key} metricKey={key} onRemove={() => toggleMetric(key)} />
            ))}
          </div>
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setSelectorOpen(v => !v)}
              disabled={selectedMetrics.length >= MAX_METRICS}
              style={{
                fontFamily: "var(--font-dm-sans)", fontSize: "13px",
                color: selectedMetrics.length >= MAX_METRICS ? colors.inkMuted : colors.ink,
                backgroundColor: colors.surface, border: `1px solid ${colors.border}`,
                borderRadius: "4px", padding: "7px 14px",
                cursor: selectedMetrics.length >= MAX_METRICS ? "default" : "pointer",
                display: "inline-flex", alignItems: "center", gap: "6px",
              }}
            >
              <span style={{ fontSize: "14px", lineHeight: 1 }}>+</span>
              {selectedMetrics.length >= MAX_METRICS ? `Max ${MAX_METRICS} reached` : "Add metric"}
            </button>
            {selectorOpen && (
              <MetricSelector selected={selectedMetrics} onToggle={key => { toggleMetric(key); }} onClose={() => setSelectorOpen(false)} />
            )}
          </div>
          {selectedMetrics.length === 0 && (
            <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "12px", color: colors.inkMuted, margin: "6px 0 0" }}>
              Select at least 1 metric to track across this experiment.
            </p>
          )}
        </Field>

        {/* Target inputs per metric */}
        {selectedMetrics.length > 0 && (
          <Field label="Targets" hint="(optional — shown in progression table)">
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {selectedMetrics.map(key => {
                const meta = METRIC_CATALOG[key];
                return (
                  <div key={key} style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 100px 100px",
                    alignItems: "center",
                    gap: "12px",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{
                        display: "inline-block", width: "6px", height: "6px",
                        borderRadius: "50%", backgroundColor: CATEGORY_COLORS[meta?.category as CategoryKey] ?? colors.inkMuted, flexShrink: 0,
                      }} />
                      <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "13px", color: colors.ink }}>
                        {meta?.name ?? key}
                      </span>
                      {meta?.unit && (
                        <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "12px", fontWeight: 300, color: colors.inkMuted }}>
                          {meta.unit}
                        </span>
                      )}
                    </div>
                    <input
                      type="number"
                      value={targets[key]?.low ?? ""}
                      onChange={e => setTarget(key, "low", e.target.value)}
                      placeholder="Min"
                      style={{ ...inputStyle, padding: "6px 10px" }}
                    />
                    <input
                      type="number"
                      value={targets[key]?.high ?? ""}
                      onChange={e => setTarget(key, "high", e.target.value)}
                      placeholder="Max"
                      style={{ ...inputStyle, padding: "6px 10px" }}
                    />
                  </div>
                );
              })}
              <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "12px", fontWeight: 300, color: colors.inkMuted, margin: "4px 0 0" }}>
                Leave blank to skip. Set only Min for ≥ target, only Max for ≤ target, both for a range.
              </p>
            </div>
          </Field>
        )}

        {/* Error */}
        {error && (
          <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "13px", color: colors.badge.act, margin: 0 }}>
            {error}
          </p>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: "8px", alignItems: "center", paddingTop: "8px" }}>
          <Link href="/experiments" style={{
            fontFamily: "var(--font-dm-sans)", fontSize: "13px", color: colors.inkMuted,
            textDecoration: "none", border: `1px solid ${colors.border}`, borderRadius: "4px",
            padding: "7px 14px", display: "inline-block",
          }}>
            Cancel
          </Link>
          <button
            onClick={handleCreate}
            disabled={!canSave}
            style={{
              fontFamily: "var(--font-dm-sans)", fontSize: "13px",
              color: canSave ? colors.background : colors.inkMuted,
              backgroundColor: canSave ? colors.ink : colors.surface,
              border: "none", borderRadius: "4px", padding: "8px 20px",
              cursor: canSave ? "pointer" : "default",
              transition: `background-color var(--duration-micro) var(--ease)`,
            }}
          >
            {saving ? "Saving…" : "Create experiment"}
          </button>
          {!canSave && !saving && (
            <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "12px", color: colors.inkMuted }}>
              {!name.trim() ? "Name required" : !startDate ? "Start date required" : "Select at least 1 metric"}
            </span>
          )}
        </div>

      </div>
    </div>
  );
}
