"use client";

export const dynamic = "force-dynamic";

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

const EVENT_TYPES = [
  { value: "stress",     label: "Stress" },
  { value: "exercise",   label: "Exercise" },
  { value: "recovery",   label: "Recovery" },
  { value: "alcohol",    label: "Alcohol" },
  { value: "illness",    label: "Illness" },
  { value: "sleep",      label: "Sleep" },
  { value: "travel",     label: "Travel" },
  { value: "fasting",    label: "Fasting" },
  { value: "medication", label: "Medication" },
  { value: "other",      label: "Other" },
];

function NewEventPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultDate = searchParams.get("date") ?? new Date().toISOString().slice(0, 10);

  const [name, setName]           = useState("");
  const [eventType, setEventType] = useState("stress");
  const [date, setDate]           = useState(defaultDate);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime]     = useState("");
  const [intensity, setIntensity] = useState("");
  const [notes, setNotes]         = useState("");
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");

  async function handleSave() {
    if (!name.trim())      { setError("Event name is required."); return; }
    if (!date)             { setError("Date is required."); return; }
    if (!startTime)        { setError("Start time is required."); return; }

    setSaving(true); setError("");
    const supabase = createSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Not authenticated."); setSaving(false); return; }

    const startTs = new Date(`${date}T${startTime}:00+07:00`).toISOString();
    const endTs   = endTime ? new Date(`${date}T${endTime}:00+07:00`).toISOString() : null;

    const { error: err } = await supabase.from("glucomove_events").insert({
      user_id:    user.id,
      name:       name.trim(),
      event_type: eventType,
      start_time: startTs,
      end_time:   endTs,
      intensity:  intensity || null,
      notes:      notes || null,
    });

    setSaving(false);
    if (err) { setError(err.message); return; }
    router.push(`/glucomove/date/${date}`);
  }

  return (
    <div style={{ padding: "40px 64px", maxWidth: "560px" }}>
      <p style={{ fontFamily: "var(--font-outfit)", fontSize: "13px", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: colors.inkMuted, marginBottom: "4px" }}>
        Glucomove
      </p>
      <h1 style={{ fontFamily: "var(--font-outfit)", fontSize: "28px", fontWeight: 600, color: colors.ink, letterSpacing: "-0.01em", marginBottom: "32px" }}>
        Log event
      </h1>

      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <div>
          <Label required>Event name</Label>
          <input type="text" placeholder="e.g. High stress work meeting" value={name} onChange={e => setName(e.target.value)} style={inputStyle()} />
        </div>

        <div>
          <Label required>Event type</Label>
          <select value={eventType} onChange={e => setEventType(e.target.value)} style={{ ...inputStyle(), appearance: "none" as const }}>
            {EVENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 120px 120px", gap: "12px" }}>
          <div>
            <Label required>Date</Label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle()} />
          </div>
          <div>
            <Label required>Start time</Label>
            <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} style={inputStyle()} />
          </div>
          <div>
            <Label>End time</Label>
            <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} style={inputStyle()} />
          </div>
        </div>

        <div>
          <Label>Intensity</Label>
          <select value={intensity} onChange={e => setIntensity(e.target.value)} style={{ ...inputStyle(), appearance: "none" as const }}>
            <option value="">Not specified</option>
            <option value="low">Low</option>
            <option value="moderate">Moderate</option>
            <option value="high">High</option>
          </select>
        </div>

        <div>
          <Label>Notes</Label>
          <textarea placeholder="Any additional context…" value={notes} onChange={e => setNotes(e.target.value)} rows={3} style={{ ...inputStyle(), resize: "vertical" as const }} />
        </div>

        {error && <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "14px", color: colors.badge.act }}>{error}</p>}

        <div style={{ display: "flex", gap: "8px", paddingTop: "8px" }}>
          <button onClick={handleSave} disabled={saving} style={{ padding: "10px 24px", backgroundColor: colors.ink, color: colors.background, border: "none", borderRadius: "4px", fontFamily: "var(--font-dm-sans)", fontSize: "14px", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1 }}>
            {saving ? "Saving…" : "Save event"}
          </button>
          <button onClick={() => router.back()} style={{ padding: "10px 24px", backgroundColor: "transparent", color: colors.inkMuted, border: `1px solid ${colors.border}`, borderRadius: "4px", fontFamily: "var(--font-dm-sans)", fontSize: "14px", cursor: "pointer" }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default function NewEventPage() {
  return <Suspense><NewEventPageInner /></Suspense>;
}
