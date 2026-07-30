"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label style={{ fontFamily: "var(--font-outfit)", fontSize: "13px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: colors.inkMuted, display: "block", marginBottom: "8px" }}>
      {children}{required && <span style={{ color: colors.badge.act, marginLeft: "4px" }}>*</span>}
    </label>
  );
}

function NewDayRecordPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultDate = searchParams.get("date") ?? new Date().toISOString().slice(0, 10);

  const [date, setDate] = useState(defaultDate);
  const [waking, setWaking] = useState("");
  const [overnightAvg, setOvernightAvg] = useState("");
  const [dailyAvg, setDailyAvg] = useState("");
  const [notes, setNotes] = useState("");
  const [sensorIssue, setSensorIssue] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    if (!date || !waking) { setError("Date and waking glucose are required."); return; }
    const wakingNum = parseFloat(waking);
    if (isNaN(wakingNum) || wakingNum <= 0) { setError("Enter a valid waking glucose value."); return; }

    setSaving(true); setError("");
    const supabase = createSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Not authenticated."); setSaving(false); return; }

    const { data, error: err } = await supabase
      .from("glucomove_day_records")
      .insert({
        user_id: user.id,
        date,
        waking_glucose_mmol: wakingNum,
        overnight_avg_mmol: overnightAvg ? parseFloat(overnightAvg) : null,
        daily_avg_mmol: dailyAvg ? parseFloat(dailyAvg) : null,
        notes: notes || null,
        potential_sensor_issue: sensorIssue,
      })
      .select("id")
      .single();

    setSaving(false);
    if (err) { setError(err.message); return; }
    router.push(`/glucomove/days/${data.id}`);
  }

  return (
    <div style={{ padding: "40px 64px", maxWidth: "560px" }}>
      <p style={{ fontFamily: "var(--font-outfit)", fontSize: "13px", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: colors.inkMuted, marginBottom: "4px" }}>
        Glucomove
      </p>
      <h1 style={{ fontFamily: "var(--font-outfit)", fontSize: "28px", fontWeight: 600, color: colors.ink, letterSpacing: "-0.01em", marginBottom: "32px" }}>
        Start day record
      </h1>

      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <div>
          <Label required>Date</Label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle()} />
        </div>

        <div>
          <Label required>Glucose upon waking (mmol/L)</Label>
          <input type="number" step="0.1" min="0" placeholder="e.g. 5.2" value={waking} onChange={e => setWaking(e.target.value)} style={inputStyle()} />
          <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "12px", color: colors.inkMuted, marginTop: "4px" }}>
            First stable reading after waking, before food or caloric drinks.
          </p>
        </div>

        <div>
          <Label>Overnight average (mmol/L)</Label>
          <input type="number" step="0.1" min="0" placeholder="e.g. 5.0" value={overnightAvg} onChange={e => setOvernightAvg(e.target.value)} style={inputStyle()} />
          <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "12px", color: colors.inkMuted, marginTop: "4px" }}>
            Average glucose during sleep — copy from your CGM app if available.
          </p>
        </div>

        <div>
          <Label>24-hour average (mmol/L)</Label>
          <input type="number" step="0.1" min="0" placeholder="e.g. 5.8" value={dailyAvg} onChange={e => setDailyAvg(e.target.value)} style={inputStyle()} />
          <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "12px", color: colors.inkMuted, marginTop: "4px" }}>
            Usually added the following day once your CGM app reports it.
          </p>
        </div>

        <div>
          <Label>Notes</Label>
          <textarea placeholder="Poor sleep, illness, sensor issues, travel, unusual stress, late eating…" value={notes} onChange={e => setNotes(e.target.value)} rows={3} style={{ ...inputStyle(), resize: "vertical" as const }} />
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontFamily: "var(--font-dm-sans)", fontSize: "14px", color: colors.inkMuted, userSelect: "none" }}>
          <input type="checkbox" checked={sensorIssue} onChange={e => setSensorIssue(e.target.checked)} style={{ accentColor: colors.ink, width: "14px", height: "14px" }} />
          Flag potential sensor issue
        </label>

        {error && <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "14px", color: colors.badge.act }}>{error}</p>}

        <div style={{ display: "flex", gap: "8px", paddingTop: "8px" }}>
          <button onClick={handleSave} disabled={saving} style={{ padding: "10px 24px", backgroundColor: colors.ink, color: colors.background, border: "none", borderRadius: "4px", fontFamily: "var(--font-dm-sans)", fontSize: "14px", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1 }}>
            {saving ? "Saving…" : "Save day record"}
          </button>
          <button onClick={() => router.push("/glucomove")} style={{ padding: "10px 24px", backgroundColor: "transparent", color: colors.inkMuted, border: `1px solid ${colors.border}`, borderRadius: "4px", fontFamily: "var(--font-dm-sans)", fontSize: "14px", cursor: "pointer" }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default function NewDayRecordPage() {
  return <Suspense><NewDayRecordPageInner /></Suspense>;
}
