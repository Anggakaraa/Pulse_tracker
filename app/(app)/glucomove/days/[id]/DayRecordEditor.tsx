"use client";

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { colors } from "@/lib/tokens";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import type { SensorErrorPeriod } from "@/lib/glucomove-calcs";

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
  const [notes, setNotes] = useState(String(day.notes ?? ""));
  const [sensorIssue, setSensorIssue] = useState(Boolean(day.potential_sensor_issue));
  const [badSleep, setBadSleep] = useState(Boolean(day.bad_sleep));
  const [alcoholPrevNight, setAlcoholPrevNight] = useState(Boolean(day.alcohol_previous_night));
  const [highCoffee, setHighCoffee] = useState(Boolean(day.high_coffee));
  const [errorPeriods, setErrorPeriods] = useState<SensorErrorPeriod[]>(
    Array.isArray(day.sensor_error_periods) ? (day.sensor_error_periods as SensorErrorPeriod[]) : []
  );
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function addErrorPeriod() {
    if (!newStart || !newEnd) return;
    setErrorPeriods(prev => [...prev, { start: newStart, end: newEnd }]);
    setNewStart(""); setNewEnd("");
  }

  function removeErrorPeriod(i: number) {
    setErrorPeriods(prev => prev.filter((_, idx) => idx !== i));
  }

  async function handleSave() {
    setSaving(true); setError("");
    const supabase = createSupabaseBrowserClient();
    const { error: err } = await supabase
      .from("glucomove_day_records")
      .update({
        waking_glucose_mmol: waking ? parseFloat(waking) : null,
        notes: notes || null,
        potential_sensor_issue: sensorIssue,
        bad_sleep: badSleep,
        alcohol_previous_night: alcoholPrevNight,
        high_coffee: highCoffee,
        sensor_error_periods: errorPeriods,
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
      <div>
        <button onClick={() => setOpen(true)} style={{ padding: "7px 14px", backgroundColor: "transparent", color: colors.inkMuted, border: `1px solid ${colors.border}`, borderRadius: "4px", fontFamily: "var(--font-dm-sans)", fontSize: "13px", cursor: "pointer" }}>
          Edit day record
        </button>
      </div>
    );
  }

  return (
    <div style={{ border: `1px solid ${colors.border}`, borderRadius: "6px", padding: "20px 24px" }}>
      <p style={{ fontFamily: "var(--font-outfit)", fontSize: "11px", fontWeight: 600, letterSpacing: "0.10em", textTransform: "uppercase", color: colors.inkMuted, marginBottom: "16px" }}>
        Edit day record
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ maxWidth: "200px" }}>
          <p style={{ fontFamily: "var(--font-outfit)", fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: colors.inkMuted, marginBottom: "6px" }}>Waking (mmol/L)</p>
          <input type="number" step="0.1" min="0" value={waking} onChange={e => setWaking(e.target.value)} style={inputStyle()} />
        </div>
        <div>
          <p style={{ fontFamily: "var(--font-outfit)", fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: colors.inkMuted, marginBottom: "6px" }}>Notes</p>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} style={{ ...inputStyle(), resize: "vertical" as const }} />
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontFamily: "var(--font-dm-sans)", fontSize: "13px", color: colors.inkMuted, userSelect: "none" }}>
          <input type="checkbox" checked={badSleep} onChange={e => setBadSleep(e.target.checked)} style={{ accentColor: colors.ink, width: "14px", height: "14px" }} />
          Bad sleep previous night
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontFamily: "var(--font-dm-sans)", fontSize: "13px", color: colors.inkMuted, userSelect: "none" }}>
          <input type="checkbox" checked={alcoholPrevNight} onChange={e => setAlcoholPrevNight(e.target.checked)} style={{ accentColor: colors.ink, width: "14px", height: "14px" }} />
          Alcohol previous night
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontFamily: "var(--font-dm-sans)", fontSize: "13px", color: colors.inkMuted, userSelect: "none" }}>
          <input type="checkbox" checked={highCoffee} onChange={e => setHighCoffee(e.target.checked)} style={{ accentColor: colors.ink, width: "14px", height: "14px" }} />
          Higher than usual coffee intake
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontFamily: "var(--font-dm-sans)", fontSize: "13px", color: colors.inkMuted, userSelect: "none" }}>
          <input type="checkbox" checked={sensorIssue} onChange={e => setSensorIssue(e.target.checked)} style={{ accentColor: colors.ink, width: "14px", height: "14px" }} />
          Flag potential sensor issue
        </label>

        {/* Sensor error periods */}
        <div>
          <p style={{ fontFamily: "var(--font-outfit)", fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: colors.inkMuted, marginBottom: "8px" }}>
            Sensor error periods
          </p>
          {errorPeriods.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginBottom: "8px" }}>
              {errorPeriods.map((p, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "13px", color: colors.ink }}>
                    {p.start} – {p.end === "00:00" ? "midnight" : p.end}
                  </span>
                  <button
                    onClick={() => removeErrorPeriod(i)}
                    style={{ padding: "0 4px", background: "none", border: "none", color: colors.inkMuted, cursor: "pointer", fontFamily: "var(--font-dm-sans)", fontSize: "14px", lineHeight: 1 }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <input type="time" value={newStart} onChange={e => setNewStart(e.target.value)} style={{ ...inputStyle(), width: "110px" }} />
            <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "13px", color: colors.inkMuted }}>–</span>
            <input type="time" value={newEnd} onChange={e => setNewEnd(e.target.value)} style={{ ...inputStyle(), width: "110px" }} />
            <button
              onClick={addErrorPeriod}
              disabled={!newStart || !newEnd}
              style={{ padding: "8px 12px", backgroundColor: "transparent", color: colors.inkMuted, border: `1px solid ${colors.border}`, borderRadius: "4px", fontFamily: "var(--font-dm-sans)", fontSize: "12px", cursor: (!newStart || !newEnd) ? "default" : "pointer", opacity: (!newStart || !newEnd) ? 0.5 : 1 }}
            >
              Add
            </button>
          </div>
          <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "11px", color: colors.inkMuted, marginTop: "4px" }}>
            Readings within these windows will be excluded from daily averages and shown dimmed on the chart.
          </p>
        </div>

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
