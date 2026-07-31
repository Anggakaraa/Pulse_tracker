"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { colors } from "@/lib/tokens";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

const EVENT_TYPES = [
  { value: "stress",     label: "Stress" },
  { value: "exercise",   label: "Exercise" },
  { value: "alcohol",    label: "Alcohol" },
  { value: "illness",    label: "Illness" },
  { value: "sleep",      label: "Sleep" },
  { value: "travel",     label: "Travel" },
  { value: "fasting",    label: "Fasting" },
  { value: "medication", label: "Medication" },
  { value: "other",      label: "Other" },
];

function inputStyle() {
  return {
    width: "100%", padding: "8px 12px",
    fontFamily: "var(--font-dm-sans)" as const, fontSize: "14px",
    backgroundColor: colors.background,
    border: `1px solid ${colors.border}`, borderRadius: "4px",
    color: colors.ink, outline: "none", boxSizing: "border-box" as const,
  };
}

function toWIBTime(utcTs: string): string {
  const d = new Date(new Date(utcTs).getTime() + 7 * 60 * 60 * 1000);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

interface EventData {
  id: string;
  name: string;
  event_type: string;
  start_time: string;
  end_time: string | null;
  intensity: string | null;
  notes: string | null;
  eventDate: string; // YYYY-MM-DD in WIB, derived by server
}

export default function EventEditor({ event }: { event: EventData }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [name, setName]           = useState(event.name);
  const [eventType, setEventType] = useState(event.event_type);
  const [startTime, setStartTime] = useState(toWIBTime(event.start_time));
  const [endTime, setEndTime]     = useState(event.end_time ? toWIBTime(event.end_time) : "");
  const [intensity, setIntensity] = useState(event.intensity ?? "");
  const [notes, setNotes]         = useState(event.notes ?? "");
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");

  async function handleSave() {
    if (!name.trim()) { setError("Name is required."); return; }
    setSaving(true); setError("");
    const supabase = createSupabaseBrowserClient();
    const startTs = new Date(`${event.eventDate}T${startTime}:00+07:00`).toISOString();
    const endTs   = endTime ? new Date(`${event.eventDate}T${endTime}:00+07:00`).toISOString() : null;
    const { error: err } = await supabase
      .from("glucomove_events")
      .update({
        name: name.trim(),
        event_type: eventType,
        start_time: startTs,
        end_time: endTs,
        intensity: intensity || null,
        notes: notes || null,
      })
      .eq("id", event.id);
    setSaving(false);
    if (err) { setError(err.message); return; }
    setOpen(false);
    router.refresh();
  }

  async function handleDelete() {
    setDeleting(true);
    const supabase = createSupabaseBrowserClient();
    await supabase.from("glucomove_events").delete().eq("id", event.id);
    router.push(`/glucomove/date/${event.eventDate}`);
  }

  if (confirming) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "13px", color: colors.inkMuted }}>Delete this event?</span>
        <button onClick={handleDelete} disabled={deleting} style={{ padding: "5px 12px", backgroundColor: "#A03828", color: "#FBF8F0", border: "none", borderRadius: "4px", fontFamily: "var(--font-dm-sans)", fontSize: "12px", cursor: "pointer", opacity: deleting ? 0.6 : 1 }}>
          {deleting ? "Deleting…" : "Yes, delete"}
        </button>
        <button onClick={() => setConfirming(false)} style={{ padding: "5px 12px", backgroundColor: "transparent", color: colors.inkMuted, border: `1px solid ${colors.border}`, borderRadius: "4px", fontFamily: "var(--font-dm-sans)", fontSize: "12px", cursor: "pointer" }}>
          Cancel
        </button>
      </div>
    );
  }

  if (!open) {
    return (
      <div style={{ display: "flex", gap: "8px" }}>
        <button onClick={() => setOpen(true)} style={{ padding: "5px 12px", backgroundColor: "transparent", color: colors.inkMuted, border: `1px solid ${colors.border}`, borderRadius: "4px", fontFamily: "var(--font-dm-sans)", fontSize: "12px", cursor: "pointer" }}>
          Edit event
        </button>
        <button onClick={() => setConfirming(true)} style={{ padding: "5px 12px", backgroundColor: "transparent", color: colors.inkMuted, border: `1px solid ${colors.border}`, borderRadius: "4px", fontFamily: "var(--font-dm-sans)", fontSize: "12px", cursor: "pointer" }}>
          Delete event
        </button>
      </div>
    );
  }

  return (
    <div style={{ border: `1px solid ${colors.border}`, borderRadius: "6px", padding: "20px 24px", marginBottom: "24px" }}>
      <p style={{ fontFamily: "var(--font-outfit)", fontSize: "11px", fontWeight: 600, letterSpacing: "0.10em", textTransform: "uppercase", color: colors.inkMuted, marginBottom: "16px" }}>
        Edit event
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 160px 100px 100px", gap: "12px" }}>
          <div>
            <p style={{ fontFamily: "var(--font-outfit)", fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: colors.inkMuted, marginBottom: "6px" }}>Name *</p>
            <input type="text" value={name} onChange={e => setName(e.target.value)} style={inputStyle()} />
          </div>
          <div>
            <p style={{ fontFamily: "var(--font-outfit)", fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: colors.inkMuted, marginBottom: "6px" }}>Type</p>
            <select value={eventType} onChange={e => setEventType(e.target.value)} style={{ ...inputStyle(), appearance: "none" as const }}>
              {EVENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <p style={{ fontFamily: "var(--font-outfit)", fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: colors.inkMuted, marginBottom: "6px" }}>Start</p>
            <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} style={inputStyle()} />
          </div>
          <div>
            <p style={{ fontFamily: "var(--font-outfit)", fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: colors.inkMuted, marginBottom: "6px" }}>End</p>
            <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} style={inputStyle()} />
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: "12px" }}>
          <div>
            <p style={{ fontFamily: "var(--font-outfit)", fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: colors.inkMuted, marginBottom: "6px" }}>Intensity</p>
            <select value={intensity} onChange={e => setIntensity(e.target.value)} style={{ ...inputStyle(), appearance: "none" as const }}>
              <option value="">Not specified</option>
              <option value="low">Low</option>
              <option value="moderate">Moderate</option>
              <option value="high">High</option>
            </select>
          </div>
          <div>
            <p style={{ fontFamily: "var(--font-outfit)", fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: colors.inkMuted, marginBottom: "6px" }}>Notes</p>
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)} style={inputStyle()} />
          </div>
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
