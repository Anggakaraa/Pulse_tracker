"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { colors } from "@/lib/tokens";
import { PUTIH_METRICS } from "@/lib/putih-metrics";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

interface ReadingRow {
  metric_key: string;
  value: string;
  unit: string;
  lab_range_low: string;
  lab_range_high: string;
}

const EMPTY_READING = (): ReadingRow => ({
  metric_key: "",
  value: "",
  unit: "",
  lab_range_low: "",
  lab_range_high: "",
});

type Step = "enter" | "review" | "done";

function inputStyle(hasError?: boolean) {
  return {
    width: "100%",
    padding: "8px 12px",
    fontFamily: "var(--font-dm-sans)" as const,
    fontSize: "14px",
    backgroundColor: colors.background,
    border: `1px solid ${hasError ? "#A03828" : colors.border}`,
    borderRadius: "4px",
    color: colors.ink,
    outline: "none",
    boxSizing: "border-box" as const,
  };
}

export default function PutihUploadPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("enter");
  const [date, setDate] = useState("");
  const [labName, setLabName] = useState("");
  const [notes, setNotes] = useState("");
  const [readings, setReadings] = useState<ReadingRow[]>([EMPTY_READING()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function updateReading(idx: number, field: keyof ReadingRow, value: string) {
    setReadings(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      // Auto-fill unit from catalog
      if (field === "metric_key") {
        const meta = PUTIH_METRICS.find(m => m.key === value);
        if (meta) {
          next[idx].unit = meta.unit;
          next[idx].lab_range_low = meta.rangeLow !== null ? String(meta.rangeLow) : "";
          next[idx].lab_range_high = meta.rangeHigh !== null ? String(meta.rangeHigh) : "";
        }
      }
      return next;
    });
  }

  function addRow() {
    setReadings(prev => [...prev, EMPTY_READING()]);
  }

  function removeRow(idx: number) {
    setReadings(prev => prev.filter((_, i) => i !== idx));
  }

  const validReadings = readings.filter(r => r.metric_key && r.value);

  async function handleSave() {
    const supabase = createSupabaseBrowserClient();
    setSaving(true);
    setError("");
    try {
      const { data: test, error: testErr } = await supabase
        .from("tests")
        .insert({ date, lab_name: labName || null, notes: notes || null, subject: "putih" })
        .select("id")
        .single();

      if (testErr || !test) throw testErr ?? new Error("Failed to create test");

      const rows = validReadings.map(r => ({
        test_id: test.id,
        metric_key: r.metric_key,
        value: parseFloat(r.value),
        unit: r.unit,
        lab_range_low: r.lab_range_low ? parseFloat(r.lab_range_low) : null,
        lab_range_high: r.lab_range_high ? parseFloat(r.lab_range_high) : null,
      }));

      const { error: readErr } = await supabase.from("readings").insert(rows);
      if (readErr) throw readErr;

      setStep("done");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  const labelStyle = {
    fontFamily: "var(--font-outfit)" as const,
    fontSize: "11px",
    fontWeight: 600,
    letterSpacing: "0.1em" as const,
    textTransform: "uppercase" as const,
    color: colors.inkMuted,
    display: "block" as const,
    marginBottom: "6px",
  };

  if (step === "done") {
    return (
      <div style={{ maxWidth: "560px" }}>
        <h1 style={{ fontFamily: "var(--font-outfit)", fontSize: "28px", fontWeight: 600, color: colors.ink, margin: "0 0 16px 0" }}>
          Saved
        </h1>
        <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "14px", color: colors.inkMuted, margin: "0 0 32px 0" }}>
          {validReadings.length} marker{validReadings.length !== 1 ? "s" : ""} recorded for Putih.
        </p>
        <div style={{ display: "flex", gap: "12px" }}>
          <button
            onClick={() => router.push("/putih/tests")}
            style={{ padding: "8px 16px", backgroundColor: colors.ink, color: colors.background, border: "none", borderRadius: "4px", fontFamily: "var(--font-outfit)", fontSize: "12px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer" }}
          >
            View test log
          </button>
          <button
            onClick={() => { setStep("enter"); setDate(""); setLabName(""); setNotes(""); setReadings([EMPTY_READING()]); }}
            style={{ padding: "8px 16px", backgroundColor: "transparent", color: colors.ink, border: `1px solid ${colors.border}`, borderRadius: "4px", fontFamily: "var(--font-outfit)", fontSize: "12px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer" }}
          >
            Add another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "720px" }}>
      <div style={{ marginBottom: "32px" }}>
        <p style={{ fontFamily: "var(--font-outfit)", fontSize: "11px", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: colors.inkMuted, margin: "0 0 8px 0" }}>
          Putih · {step === "enter" ? "Step 1 of 2 — Enter" : "Step 2 of 2 — Review"}
        </p>
        <h1 style={{ fontFamily: "var(--font-outfit)", fontSize: "28px", fontWeight: 600, color: colors.ink, margin: 0, letterSpacing: "-0.01em" }}>
          {step === "enter" ? "Add Test" : "Review & Save"}
        </h1>
      </div>

      {step === "enter" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Test info */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div>
              <label style={labelStyle}>Date *</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle(!date)} />
            </div>
            <div>
              <label style={labelStyle}>Lab / Clinic</label>
              <input type="text" value={labName} onChange={e => setLabName(e.target.value)} placeholder="e.g. Sunset Vet Kuta" style={inputStyle()} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Diagnosis, treatments, observations..." rows={3}
              style={{ ...inputStyle(), resize: "vertical" as const, lineHeight: "1.5" }} />
          </div>

          {/* Readings */}
          <div>
            <label style={labelStyle}>Markers</label>
            <div style={{ border: `1px solid ${colors.border}`, borderRadius: "6px", overflow: "hidden" }}>
              {/* Column headers */}
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 32px", gap: "8px", padding: "10px 12px", backgroundColor: colors.surface, borderBottom: `1px solid ${colors.border}` }}>
                {["Marker", "Value", "Range Low", "Range High", ""].map((h, i) => (
                  <span key={i} style={{ fontFamily: "var(--font-outfit)", fontSize: "10px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: colors.inkMuted }}>
                    {h}
                  </span>
                ))}
              </div>

              {readings.map((r, idx) => (
                <div key={idx} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 32px", gap: "8px", padding: "8px 12px", borderBottom: `1px solid ${colors.border}` }}>
                  <select value={r.metric_key} onChange={e => updateReading(idx, "metric_key", e.target.value)} style={inputStyle()}>
                    <option value="">Select marker…</option>
                    <optgroup label="Chemistry">
                      {PUTIH_METRICS.filter(m => m.section === "chemistry").map(m => (
                        <option key={m.key} value={m.key}>{m.name}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Hematology">
                      {PUTIH_METRICS.filter(m => m.section === "hematology").map(m => (
                        <option key={m.key} value={m.key}>{m.name}</option>
                      ))}
                    </optgroup>
                  </select>
                  <input type="number" step="any" placeholder="Value" value={r.value} onChange={e => updateReading(idx, "value", e.target.value)} style={inputStyle()} />
                  <input type="number" step="any" placeholder="Low" value={r.lab_range_low} onChange={e => updateReading(idx, "lab_range_low", e.target.value)} style={inputStyle()} />
                  <input type="number" step="any" placeholder="High" value={r.lab_range_high} onChange={e => updateReading(idx, "lab_range_high", e.target.value)} style={inputStyle()} />
                  <button onClick={() => removeRow(idx)} disabled={readings.length === 1}
                    style={{ background: "none", border: "none", cursor: readings.length === 1 ? "not-allowed" : "pointer", color: colors.inkMuted, fontSize: "16px", padding: 0 }}>
                    ×
                  </button>
                </div>
              ))}

              <div style={{ padding: "10px 12px" }}>
                <button onClick={addRow} style={{ background: "none", border: "none", fontFamily: "var(--font-dm-sans)", fontSize: "13px", color: colors.inkMuted, cursor: "pointer", padding: 0 }}>
                  + Add row
                </button>
              </div>
            </div>
          </div>

          <div>
            <button
              onClick={() => setStep("review")}
              disabled={!date || validReadings.length === 0}
              style={{ padding: "10px 24px", backgroundColor: colors.ink, color: colors.background, border: "none", borderRadius: "4px", fontFamily: "var(--font-outfit)", fontSize: "12px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", cursor: !date || validReadings.length === 0 ? "not-allowed" : "pointer", opacity: !date || validReadings.length === 0 ? 0.4 : 1 }}
            >
              Review →
            </button>
          </div>
        </div>
      )}

      {step === "review" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div style={{ border: `1px solid ${colors.border}`, borderRadius: "6px", overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: `1px solid ${colors.border}`, backgroundColor: colors.surface }}>
              <p style={{ fontFamily: "var(--font-outfit)", fontSize: "15px", fontWeight: 600, color: colors.ink, margin: "0 0 4px 0" }}>{date}</p>
              {labName && <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "13px", color: colors.inkMuted, margin: 0 }}>{labName}</p>}
            </div>
            {validReadings.map((r, i) => {
              const meta = PUTIH_METRICS.find(m => m.key === r.metric_key);
              return (
                <div key={i} style={{ display: "flex", padding: "12px 20px", borderBottom: i < validReadings.length - 1 ? `1px solid ${colors.border}` : "none", gap: "16px" }}>
                  <span style={{ flex: 1, fontFamily: "var(--font-dm-sans)", fontSize: "14px", color: colors.ink }}>{meta?.name ?? r.metric_key}</span>
                  <span style={{ fontFamily: "var(--font-outfit)", fontSize: "14px", fontWeight: 600, color: colors.ink }}>{r.value}</span>
                  <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "12px", color: colors.inkMuted, minWidth: "60px" }}>{r.unit}</span>
                  <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "12px", color: colors.inkMuted, minWidth: "100px", textAlign: "right" }}>
                    {r.lab_range_low || r.lab_range_high ? `${r.lab_range_low || ""}–${r.lab_range_high || ""}` : "—"}
                  </span>
                </div>
              );
            })}
          </div>

          {error && <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "14px", color: "#A03828", margin: 0 }}>{error}</p>}

          <div style={{ display: "flex", gap: "12px" }}>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{ padding: "10px 24px", backgroundColor: colors.ink, color: colors.background, border: "none", borderRadius: "4px", fontFamily: "var(--font-outfit)", fontSize: "12px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.5 : 1 }}
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              onClick={() => setStep("enter")}
              style={{ padding: "10px 24px", backgroundColor: "transparent", color: colors.ink, border: `1px solid ${colors.border}`, borderRadius: "4px", fontFamily: "var(--font-outfit)", fontSize: "12px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer" }}
            >
              ← Back
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
