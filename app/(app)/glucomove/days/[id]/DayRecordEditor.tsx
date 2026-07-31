"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { colors } from "@/lib/tokens";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

function inputStyle() {
  return {
    width: "100%", padding: "8px 12px",
    fontFamily: "var(--font-dm-sans)" as const, fontSize: "14px",
    backgroundColor: colors.background,
    border: `1px solid ${colors.border}`, borderRadius: "4px",
    color: colors.ink, outline: "none", boxSizing: "border-box" as const,
  };
}

export default function DayRecordEditor({ day }: { day: Record<string, unknown> }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [waking, setWaking] = useState(String(day.waking_glucose_mmol ?? ""));
  const [overnightAvg, setOvernightAvg] = useState(String(day.overnight_avg_mmol ?? ""));
  const [dailyAvg, setDailyAvg] = useState(String(day.daily_avg_mmol ?? ""));
  const [tir, setTir] = useState(String(day.time_in_range_pct ?? ""));
  const [notes, setNotes] = useState(String(day.notes ?? ""));
  const [sensorIssue, setSensorIssue] = useState(Boolean(day.potential_sensor_issue));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    setSaving(true); setError("");
    const supabase = createSupabaseBrowserClient();
    const { error: err } = await supabase
      .from("glucomove_day_records")
      .update({
        waking_glucose_mmol: parseFloat(waking),
        overnight_avg_mmol: overnightAvg ? parseFloat(overnightAvg) : null,
        daily_avg_mmol: dailyAvg ? parseFloat(dailyAvg) : null,
        time_in_range_pct: tir ? parseFloat(tir) : null,
        notes: notes || null,
        potential_sensor_issue: sensorIssue,
        updated_at: new Date().toISOString(),
      })
      .eq("id", String(day.id));
    setSaving(false);
    if (err) { setError(err.message); return; }
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <div style={{ marginBottom: "24px" }}>
        <button onClick={() => setOpen(true)} style={{ padding: "7px 14px", backgroundColor: "transparent", color: colors.inkMuted, border: `1px solid ${colors.border}`, borderRadius: "4px", fontFamily: "var(--font-dm-sans)", fontSize: "13px", cursor: "pointer" }}>
          Edit day record
        </button>
      </div>
    );
  }

  return (
    <div style={{ border: `1px solid ${colors.border}`, borderRadius: "6px", padding: "20px 24px", marginBottom: "24px" }}>
      <p style={{ fontFamily: "var(--font-outfit)", fontSize: "11px", fontWeight: 600, letterSpacing: "0.10em", textTransform: "uppercase", color: colors.inkMuted, marginBottom: "16px" }}>
        Edit day record
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
          <div>
            <p style={{ fontFamily: "var(--font-outfit)", fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: colors.inkMuted, marginBottom: "6px" }}>Waking (mmol/L) *</p>
            <input type="number" step="0.1" min="0" value={waking} onChange={e => setWaking(e.target.value)} style={inputStyle()} />
          </div>
          <div>
            <p style={{ fontFamily: "var(--font-outfit)", fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: colors.inkMuted, marginBottom: "6px" }}>Overnight avg (mmol/L)</p>
            <input type="number" step="0.1" min="0" value={overnightAvg} onChange={e => setOvernightAvg(e.target.value)} style={inputStyle()} />
          </div>
          <div>
            <p style={{ fontFamily: "var(--font-outfit)", fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: colors.inkMuted, marginBottom: "6px" }}>Daily avg (mmol/L)</p>
            <input type="number" step="0.1" min="0" value={dailyAvg} onChange={e => setDailyAvg(e.target.value)} style={inputStyle()} />
          </div>
          <div>
            <p style={{ fontFamily: "var(--font-outfit)", fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: colors.inkMuted, marginBottom: "6px" }}>Time in Range (%)</p>
            <input type="number" step="1" min="0" max="100" placeholder="e.g. 87" value={tir} onChange={e => setTir(e.target.value)} style={inputStyle()} />
          </div>
        </div>
        <div>
          <p style={{ fontFamily: "var(--font-outfit)", fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: colors.inkMuted, marginBottom: "6px" }}>Notes</p>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} style={{ ...inputStyle(), resize: "vertical" as const }} />
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontFamily: "var(--font-dm-sans)", fontSize: "13px", color: colors.inkMuted, userSelect: "none" }}>
          <input type="checkbox" checked={sensorIssue} onChange={e => setSensorIssue(e.target.checked)} style={{ accentColor: colors.ink, width: "14px", height: "14px" }} />
          Flag potential sensor issue
        </label>
        {error && <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "13px", color: colors.badge.act }}>{error}</p>}
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={handleSave} disabled={saving} style={{ padding: "8px 20px", backgroundColor: colors.ink, color: colors.background, border: "none", borderRadius: "4px", fontFamily: "var(--font-dm-sans)", fontSize: "13px", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1 }}>
            {saving ? "Saving…" : "Save"}
          </button>
          <button onClick={() => setOpen(false)} style={{ padding: "8px 20px", backgroundColor: "transparent", color: colors.inkMuted, border: `1px solid ${colors.border}`, borderRadius: "4px", fontFamily: "var(--font-dm-sans)", fontSize: "13px", cursor: "pointer" }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
