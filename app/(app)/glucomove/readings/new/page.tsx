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

function NewReadingPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const now = new Date();
  const defaultDate = searchParams.get("date") ?? now.toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
  const defaultTime = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });

  const [date, setDate]           = useState(defaultDate);
  const [time, setTime]           = useState(defaultTime);
  const [glucose, setGlucose]     = useState("");
  const [isFasting, setIsFasting] = useState(false);
  const [notes, setNotes]         = useState("");
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");

  async function handleSave() {
    if (!glucose)  { setError("Glucose value is required."); return; }
    const val = parseFloat(glucose);
    if (isNaN(val) || val <= 0) { setError("Enter a valid glucose value."); return; }

    setSaving(true); setError("");
    const supabase = createSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Not authenticated."); setSaving(false); return; }

    const ts = new Date(`${date}T${time}:00+07:00`).toISOString();

    const { error: err } = await supabase.from("glucomove_readings").insert({
      user_id: user.id,
      meal_id: null,
      timestamp: ts,
      glucose_mmol: val,
      is_baseline: isFasting,
      notes: notes || null,
    });

    setSaving(false);
    if (err) { setError(err.message); return; }
    router.push(`/glucomove/date/${date}`);
  }

  return (
    <div style={{ padding: "40px 64px", maxWidth: "480px" }}>
      <p style={{ fontFamily: "var(--font-outfit)", fontSize: "13px", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: colors.inkMuted, marginBottom: "4px" }}>
        Glucomove
      </p>
      <h1 style={{ fontFamily: "var(--font-outfit)", fontSize: "28px", fontWeight: 600, color: colors.ink, letterSpacing: "-0.01em", marginBottom: "32px" }}>
        Log reading
      </h1>

      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 120px", gap: "12px" }}>
          <div>
            <Label required>Date</Label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle()} />
          </div>
          <div>
            <Label required>Time (WIB)</Label>
            <input type="time" value={time} onChange={e => setTime(e.target.value)} style={inputStyle()} />
          </div>
        </div>

        <div>
          <Label required>Glucose (mmol/L)</Label>
          <input
            type="number" step="0.1" min="0" placeholder="e.g. 5.4"
            value={glucose} onChange={e => setGlucose(e.target.value)}
            style={{ ...inputStyle(), width: "160px" }}
          />
        </div>

        <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer", userSelect: "none" as const }}>
          <input type="checkbox" checked={isFasting} onChange={e => setIsFasting(e.target.checked)} style={{ accentColor: colors.ink, width: "14px", height: "14px", marginTop: "3px", flexShrink: 0 }} />
          <div>
            <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "14px", color: isFasting ? colors.ink : colors.inkMuted }}>Mark as baseline / fasting</p>
            <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "12px", color: colors.inkMuted, marginTop: "2px" }}>Use for a reading taken before a meal or after a fasting period</p>
          </div>
        </label>

        <div>
          <Label>Notes</Label>
          <input type="text" placeholder="Optional context…" value={notes} onChange={e => setNotes(e.target.value)} style={inputStyle()} />
        </div>

        {error && <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "14px", color: colors.badge.act }}>{error}</p>}

        <div style={{ display: "flex", gap: "8px", paddingTop: "8px" }}>
          <button onClick={handleSave} disabled={saving} style={{ padding: "10px 24px", backgroundColor: colors.ink, color: colors.background, border: "none", borderRadius: "4px", fontFamily: "var(--font-dm-sans)", fontSize: "14px", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1 }}>
            {saving ? "Saving…" : "Save reading"}
          </button>
          <button onClick={() => router.back()} style={{ padding: "10px 24px", backgroundColor: "transparent", color: colors.inkMuted, border: `1px solid ${colors.border}`, borderRadius: "4px", fontFamily: "var(--font-dm-sans)", fontSize: "14px", cursor: "pointer" }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default function NewReadingPage() {
  return <Suspense><NewReadingPageInner /></Suspense>;
}
