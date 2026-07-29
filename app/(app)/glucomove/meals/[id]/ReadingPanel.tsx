"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { colors } from "@/lib/tokens";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import type { GlucoseReading } from "@/lib/glucomove-calcs";

function inputStyle(width?: string) {
  return {
    width: width ?? "100%", padding: "8px 12px",
    fontFamily: "var(--font-dm-sans)" as const, fontSize: "14px",
    backgroundColor: colors.background,
    border: `1px solid ${colors.border}`, borderRadius: "4px",
    color: colors.ink, outline: "none", boxSizing: "border-box" as const,
  };
}

export default function ReadingPanel({
  mealId,
  readings,
  mealStartTime,
  observationEndedAt,
}: {
  mealId: string;
  readings: GlucoseReading[];
  mealStartTime: string;
  observationEndedAt: string | null;
}) {
  const router = useRouter();

  // New reading state
  const now = new Date();
  const localNow = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}T${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const [timestamp, setTimestamp] = useState(localNow);
  const [glucose, setGlucose] = useState("");
  const [isBaseline, setIsBaseline] = useState(readings.length === 0);
  const [saving, setSaving] = useState(false);
  const [ending, setEnding] = useState(false);
  const [error, setError] = useState("");

  async function addReading() {
    const val = parseFloat(glucose);
    if (isNaN(val) || val <= 0) { setError("Enter a valid glucose value."); return; }
    setSaving(true); setError("");
    const supabase = createSupabaseBrowserClient();

    // If marking as baseline, unmark any existing baseline first
    if (isBaseline) {
      await supabase.from("glucomove_readings").update({ is_baseline: false }).eq("meal_id", mealId).eq("is_baseline", true);
    }

    const { error: err } = await supabase.from("glucomove_readings").insert({
      meal_id: mealId,
      timestamp: new Date(timestamp).toISOString(),
      glucose_mmol: val,
      is_baseline: isBaseline,
    });

    setSaving(false);
    if (err) { setError(err.message); return; }
    setGlucose("");
    // Advance timestamp by 30 min as a convenience default
    const next = new Date(new Date(timestamp).getTime() + 30 * 60000);
    setTimestamp(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}T${String(next.getHours()).padStart(2, "0")}:${String(next.getMinutes()).padStart(2, "0")}`);
    setIsBaseline(false);
    router.refresh();
  }

  async function endObservation() {
    setEnding(true);
    const supabase = createSupabaseBrowserClient();
    await supabase.from("glucomove_meals").update({ observation_ended_at: new Date().toISOString() }).eq("id", mealId);
    setEnding(false);
    router.refresh();
  }

  const sorted = [...readings].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  return (
    <div style={{ border: `1px solid ${colors.border}`, borderRadius: "6px", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "16px 20px", backgroundColor: colors.surface, borderBottom: `1px solid ${colors.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <p style={{ fontFamily: "var(--font-outfit)", fontSize: "11px", fontWeight: 600, letterSpacing: "0.10em", textTransform: "uppercase", color: colors.inkMuted }}>
          Glucose readings
        </p>
        {observationEndedAt ? (
          <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "12px", color: colors.badge.optimal }}>
            Observation ended
          </span>
        ) : (
          <button onClick={endObservation} disabled={ending} style={{ padding: "5px 12px", backgroundColor: "transparent", color: colors.inkMuted, border: `1px solid ${colors.border}`, borderRadius: "4px", fontFamily: "var(--font-dm-sans)", fontSize: "12px", cursor: "pointer" }}>
            {ending ? "Ending…" : "End observation"}
          </button>
        )}
      </div>

      {/* Reading list */}
      {sorted.length === 0 ? (
        <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "13px", color: colors.inkMuted, padding: "16px 20px" }}>
          No readings yet.
        </p>
      ) : (
        <div>
          {/* Column headers */}
          <div style={{ display: "grid", gridTemplateColumns: "140px 120px 1fr", padding: "8px 20px", borderBottom: `1px solid ${colors.border}` }}>
            {["Time", "Glucose", ""].map(h => (
              <span key={h} style={{ fontFamily: "var(--font-outfit)", fontSize: "10px", fontWeight: 600, letterSpacing: "0.10em", textTransform: "uppercase", color: colors.inkMuted }}>
                {h}
              </span>
            ))}
          </div>
          {sorted.map((r, i) => (
            <div key={r.id} style={{ display: "grid", gridTemplateColumns: "140px 120px 1fr", padding: "10px 20px", borderBottom: i < sorted.length - 1 ? `1px solid ${colors.border}` : "none", alignItems: "center" }}>
              <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "13px", color: colors.inkMuted }}>
                {new Date(r.timestamp).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
              </span>
              <span style={{ fontFamily: "var(--font-outfit)", fontSize: "15px", fontWeight: 600, color: colors.ink }}>
                {r.glucose_mmol.toFixed(1)} <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "12px", fontWeight: 400, color: colors.inkMuted }}>mmol/L</span>
              </span>
              {r.is_baseline && (
                <span style={{ fontFamily: "var(--font-outfit)", fontSize: "10px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: colors.badge.optimal }}>
                  Baseline
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add reading form */}
      {!observationEndedAt && (
        <div style={{ padding: "16px 20px", borderTop: `1px solid ${colors.border}`, backgroundColor: colors.background }}>
          <p style={{ fontFamily: "var(--font-outfit)", fontSize: "10px", fontWeight: 600, letterSpacing: "0.10em", textTransform: "uppercase", color: colors.inkMuted, marginBottom: "10px" }}>
            Add reading
          </p>
          <div style={{ display: "flex", gap: "8px", alignItems: "flex-end", flexWrap: "wrap" }}>
            <div>
              <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "12px", color: colors.inkMuted, marginBottom: "4px" }}>Time</p>
              <input type="datetime-local" value={timestamp} onChange={e => setTimestamp(e.target.value)} style={inputStyle("190px")} />
            </div>
            <div>
              <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "12px", color: colors.inkMuted, marginBottom: "4px" }}>Glucose (mmol/L)</p>
              <input
                type="number" step="0.1" min="0" placeholder="e.g. 6.4"
                value={glucose} onChange={e => setGlucose(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addReading()}
                style={inputStyle("140px")}
              />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", paddingBottom: "9px" }}>
              <input type="checkbox" checked={isBaseline} onChange={e => setIsBaseline(e.target.checked)} style={{ accentColor: colors.ink, width: "13px", height: "13px" }} id="baseline-check" />
              <label htmlFor="baseline-check" style={{ fontFamily: "var(--font-dm-sans)", fontSize: "13px", color: colors.inkMuted, cursor: "pointer" }}>Baseline</label>
            </div>
            <button onClick={addReading} disabled={saving} style={{ padding: "8px 20px", backgroundColor: colors.ink, color: colors.background, border: "none", borderRadius: "4px", fontFamily: "var(--font-dm-sans)", fontSize: "13px", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1, marginBottom: "1px" }}>
              {saving ? "…" : "Add"}
            </button>
          </div>
          {error && <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "13px", color: colors.badge.act, marginTop: "8px" }}>{error}</p>}
          <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "12px", color: colors.inkMuted, marginTop: "6px" }}>
            Press Enter to add quickly. Next timestamp auto-advances 30 minutes.
          </p>
        </div>
      )}
    </div>
  );
}
