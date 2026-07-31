"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { colors } from "@/lib/tokens";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { PRIMARY_CARB_LABEL, CARB_PROMINENCE_LABEL, MEAL_TYPE_LABEL } from "@/lib/glucomove-calcs";

const TYPE_LABEL: Record<string, string> = {
  day_record: "Day record",
  meal: "Meal",
  glucose_reading: "Glucose reading",
  unknown: "Unknown",
};

const TYPE_COLOR: Record<string, string> = {
  day_record: colors.badge.optimal,
  meal: colors.ink,
  glucose_reading: colors.badge.stable,
  unknown: colors.inkMuted,
};

function inputStyle(width?: string) {
  return {
    padding: "7px 10px", fontFamily: "var(--font-dm-sans)" as const, fontSize: "13px",
    backgroundColor: colors.background, border: `1px solid ${colors.border}`,
    borderRadius: "4px", color: colors.ink, outline: "none",
    width: width ?? "100%", boxSizing: "border-box" as const,
  };
}

export default function DraftCard({ draft }: { draft: Record<string, unknown> }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dismissing, setDismissing] = useState(false);
  const [error, setError] = useState("");

  const parsed = draft.parsed_data as Record<string, unknown>;
  const type = draft.type as string;
  const sentAt = new Date(draft.sent_at as string);

  // Resolve timestamp: use parsed time if available, otherwise fall back to sentAt
  function resolveTimestamp(dateStr: string, timeStr?: string | null): string {
    if (timeStr) {
      return new Date(`${dateStr}T${timeStr}:00+07:00`).toISOString();
    }
    return sentAt.toISOString();
  }

  // Editable fields for meals
  const [mealName, setMealName] = useState(String(parsed.name ?? ""));
  const [mealDesc, setMealDesc] = useState(String(parsed.description ?? ""));
  const [mealType, setMealType] = useState(String(parsed.meal_type ?? "other"));
  const [carbSource, setCarbSource] = useState<string[]>(Array.isArray(parsed.primary_carb_source) ? (parsed.primary_carb_source as string[]) : (parsed.primary_carb_source ? [String(parsed.primary_carb_source)] : ["other"]));
  const [carbProminence, setCarbProminence] = useState(String(parsed.carb_prominence ?? "moderate"));
  const [acvBefore, setAcvBefore] = useState(Boolean(parsed.acv_before));
  const [structuredEating, setStructuredEating] = useState(Boolean(parsed.structured_eating));
  const [movementAfter, setMovementAfter] = useState(Boolean(parsed.movement_after));
  const [movementMinutes, setMovementMinutes] = useState(String(parsed.movement_duration_minutes ?? ""));
  const [withAlcohol, setWithAlcohol] = useState(Boolean(parsed.with_alcohol));
  const [cooledStarch, setCooledStarch] = useState(Boolean(parsed.cooled_starch));

  // Editable fields for day record
  const [waking, setWaking] = useState(String(parsed.waking_glucose_mmol ?? ""));
  const [overnight, setOvernight] = useState(String(parsed.overnight_avg_mmol ?? ""));
  const [daily, setDaily] = useState(String(parsed.daily_avg_mmol ?? ""));

  // Editable glucose reading
  const [glucoseMmol, setGlucoseMmol] = useState(String(parsed.glucose_mmol ?? ""));
  const [readingTime, setReadingTime] = useState(String(parsed.time ?? ""));
  const [mealTime, setMealTime] = useState(String(parsed.time ?? ""));

  async function dismiss() {
    setDismissing(true);
    const supabase = createSupabaseBrowserClient();
    await supabase.from("glucomove_telegram_drafts").update({ status: "dismissed" }).eq("id", draft.id);
    router.refresh();
  }

  async function approveDayRecord() {
    setSaving(true); setError("");
    const supabase = createSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Not authenticated."); setSaving(false); return; }

    const { error: err } = await supabase.from("glucomove_day_records").insert({
      user_id: user.id,
      date: draft.date,
      waking_glucose_mmol: parseFloat(waking),
      overnight_avg_mmol: overnight ? parseFloat(overnight) : null,
      daily_avg_mmol: daily ? parseFloat(daily) : null,
    });

    if (err) { setError(err.message); setSaving(false); return; }
    await supabase.from("glucomove_telegram_drafts").update({ status: "approved" }).eq("id", draft.id);
    router.refresh();
  }

  async function approveMeal() {
    setSaving(true); setError("");
    const supabase = createSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Not authenticated."); setSaving(false); return; }

    const ts = resolveTimestamp(draft.date as string, mealTime || null);

    const { error: err } = await supabase.from("glucomove_meals").insert({
      day_record_id: null,
      user_id: user.id,
      meal_start_time: ts,
      meal_type: mealType,
      name: mealName,
      description: mealDesc || mealName,
      primary_carb_source: carbSource.length > 0 ? carbSource : ["none"],
      carb_prominence: carbProminence,
      acv_before: acvBefore,
      structured_eating: structuredEating,
      movement_after: movementAfter,
      movement_duration_minutes: movementAfter && movementMinutes ? parseInt(movementMinutes) : null,
      with_alcohol: withAlcohol,
      cooled_starch: cooledStarch,
    });

    if (err) { setError(err.message); setSaving(false); return; }
    await supabase.from("glucomove_telegram_drafts").update({ status: "approved" }).eq("id", draft.id);
    router.refresh();
  }

  async function approveGlucoseReading() {
    setSaving(true); setError("");
    const supabase = createSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Not authenticated."); setSaving(false); return; }

    const ts = resolveTimestamp(draft.date as string, readingTime || null);

    const { error: err } = await supabase.from("glucomove_readings").insert({
      user_id: user.id,
      meal_id: null,
      timestamp: ts,
      glucose_mmol: parseFloat(glucoseMmol),
      is_baseline: false,
    });

    if (err) { setError(err.message); setSaving(false); return; }
    await supabase.from("glucomove_telegram_drafts").update({ status: "approved" }).eq("id", draft.id);
    router.refresh();
  }

  return (
    <div style={{ border: `1px solid ${colors.border}`, borderRadius: "6px", overflow: "hidden", backgroundColor: colors.background }}>
      {/* Header */}
      <div style={{ padding: "12px 16px", backgroundColor: colors.surface, borderBottom: `1px solid ${colors.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontFamily: "var(--font-outfit)", fontSize: "10px", fontWeight: 600, letterSpacing: "0.10em", textTransform: "uppercase", color: TYPE_COLOR[type] ?? colors.inkMuted }}>
            {TYPE_LABEL[type] ?? type}
          </span>
          <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "12px", color: colors.inkMuted }}>
            {sentAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
        <div style={{ display: "flex", gap: "6px" }}>
          {type !== "unknown" && (
            <button onClick={() => setEditing(!editing)} style={{ padding: "4px 10px", backgroundColor: "transparent", color: colors.inkMuted, border: `1px solid ${colors.border}`, borderRadius: "4px", fontFamily: "var(--font-dm-sans)", fontSize: "11px", cursor: "pointer" }}>
              {editing ? "Cancel" : "Edit"}
            </button>
          )}
          <button onClick={dismiss} disabled={dismissing} style={{ padding: "4px 10px", backgroundColor: "transparent", color: colors.inkMuted, border: `1px solid ${colors.border}`, borderRadius: "4px", fontFamily: "var(--font-dm-sans)", fontSize: "11px", cursor: "pointer" }}>
            Dismiss
          </button>
        </div>
      </div>

      {/* Raw message */}
      <div style={{ padding: "10px 16px", borderBottom: `1px solid ${colors.border}`, backgroundColor: "#FAF8F2" }}>
        <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "12px", color: colors.inkMuted, fontStyle: "italic" }}>
          "{draft.raw_message as string}"
        </p>
      </div>

      {/* Parsed fields */}
      <div style={{ padding: "14px 16px" }}>

        {/* DAY RECORD */}
        {type === "day_record" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
              <Field label="Waking">
                {editing ? <input type="number" step="0.1" value={waking} onChange={e => setWaking(e.target.value)} style={inputStyle()} /> : <Val>{waking ? `${waking} mmol/L` : "—"}</Val>}
              </Field>
              <Field label="Overnight avg">
                {editing ? <input type="number" step="0.1" value={overnight} onChange={e => setOvernight(e.target.value)} style={inputStyle()} /> : <Val>{overnight ? `${overnight} mmol/L` : "—"}</Val>}
              </Field>
              <Field label="Daily avg">
                {editing ? <input type="number" step="0.1" value={daily} onChange={e => setDaily(e.target.value)} style={inputStyle()} /> : <Val>{daily ? `${daily} mmol/L` : "—"}</Val>}
              </Field>
            </div>
            {error && <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "12px", color: colors.badge.act }}>{error}</p>}
            <button onClick={approveDayRecord} disabled={saving} style={approveBtn(saving)}>
              {saving ? "Saving…" : "Approve — create day record"}
            </button>
          </div>
        )}

        {/* MEAL */}
        {type === "meal" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {editing ? (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <Field label="Name"><input type="text" value={mealName} onChange={e => setMealName(e.target.value)} style={inputStyle()} /></Field>
                  <Field label="Type">
                    <select value={mealType} onChange={e => setMealType(e.target.value)} style={{ ...inputStyle(), appearance: "none" as const }}>
                      {Object.entries(MEAL_TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </Field>
                </div>
                <Field label="Description"><textarea value={mealDesc} onChange={e => setMealDesc(e.target.value)} rows={2} style={{ ...inputStyle(), resize: "vertical" as const }} /></Field>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <Field label="Primary carb (select all that apply)">
                    <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "6px", marginTop: "4px" }}>
                      {Object.entries(PRIMARY_CARB_LABEL).map(([v, l]) => {
                        const active = carbSource.includes(v);
                        return (
                          <button key={v} type="button" onClick={() => setCarbSource(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v])} style={{ padding: "4px 10px", borderRadius: "4px", border: `1px solid ${active ? colors.ink : colors.border}`, backgroundColor: active ? colors.ink : "transparent", color: active ? colors.background : colors.inkMuted, fontFamily: "var(--font-dm-sans)", fontSize: "11px", cursor: "pointer" }}>
                            {l}
                          </button>
                        );
                      })}
                    </div>
                  </Field>
                  <Field label="Carb prominence">
                    <select value={carbProminence} onChange={e => setCarbProminence(e.target.value)} style={{ ...inputStyle(), appearance: "none" as const }}>
                      <option value="none">None</option>
                      <option value="supporting">Supporting</option>
                      <option value="moderate">Moderate</option>
                      <option value="hero">Hero</option>
                    </select>
                  </Field>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
                  {[
                    { label: "ACV before", val: acvBefore, set: setAcvBefore },
                    { label: "Structured eating", val: structuredEating, set: setStructuredEating },
                    { label: "Movement after", val: movementAfter, set: setMovementAfter },
                    { label: "Alcohol", val: withAlcohol, set: setWithAlcohol },
                    { label: "Cooled starch", val: cooledStarch, set: setCooledStarch },
                  ].map(({ label, val, set }) => (
                    <label key={label} style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontFamily: "var(--font-dm-sans)", fontSize: "12px", color: colors.inkMuted }}>
                      <input type="checkbox" checked={val} onChange={e => set(e.target.checked)} style={{ accentColor: colors.ink }} />
                      {label}
                    </label>
                  ))}
                  {movementAfter && (
                    <input type="number" placeholder="min" value={movementMinutes} onChange={e => setMovementMinutes(e.target.value)} style={inputStyle("60px")} />
                  )}
                </div>
              </>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                <Field label="Name"><Val>{mealName || "—"}</Val></Field>
                <Field label="Type"><Val>{MEAL_TYPE_LABEL[mealType] ?? mealType}</Val></Field>
                <Field label="Primary carb"><Val>{carbSource.map(s => PRIMARY_CARB_LABEL[s] ?? s).join(', ') || "—"}</Val></Field>
                <Field label="Carb prominence"><Val>{CARB_PROMINENCE_LABEL[carbProminence] ?? carbProminence}</Val></Field>
                {(acvBefore || structuredEating || movementAfter || withAlcohol || cooledStarch) && (
                  <div style={{ gridColumn: "1 / -1" }}>
                    <Field label="Modifiers">
                      <Val>{[
                        acvBefore && "ACV",
                        structuredEating && "Structured",
                        movementAfter && `Movement${movementMinutes ? ` ${movementMinutes}min` : ""}`,
                        withAlcohol && "Alcohol",
                        cooledStarch && "Cooled starch",
                      ].filter(Boolean).join(", ")}</Val>
                    </Field>
                  </div>
                )}
              </div>
            )}
            <Field label="Meal time (HH:MM, 24h)">
              <input type="text" placeholder={sentAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} value={mealTime} onChange={e => setMealTime(e.target.value)} style={inputStyle("100px")} />
            </Field>
            {error && <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "12px", color: colors.badge.act }}>{error}</p>}
            <button onClick={approveMeal} disabled={saving} style={approveBtn(saving)}>
              {saving ? "Saving…" : "Approve — create meal"}
            </button>
          </div>
        )}

        {/* GLUCOSE READING */}
        {type === "glucose_reading" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              {editing
                ? <input type="number" step="0.1" value={glucoseMmol} onChange={e => setGlucoseMmol(e.target.value)} style={inputStyle("120px")} />
                : <span style={{ fontFamily: "var(--font-outfit)", fontSize: "22px", fontWeight: 600, color: colors.ink }}>{glucoseMmol} <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "13px", fontWeight: 400, color: colors.inkMuted }}>mmol/L</span></span>
              }
              {!!parsed.is_fasting && <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "12px", color: colors.inkMuted }}>Fasting</span>}
            </div>
            <Field label="Reading time (HH:MM, 24h)">
              <input type="text" placeholder={sentAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} value={readingTime} onChange={e => setReadingTime(e.target.value)} style={inputStyle("100px")} />
            </Field>
            <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "11px", color: colors.inkMuted }}>
              Leave blank to use message time. The system auto-associates this reading with meals by time.
            </p>
            {error && <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "12px", color: colors.badge.act }}>{error}</p>}
            <button onClick={approveGlucoseReading} disabled={saving} style={approveBtn(saving)}>
              {saving ? "Saving…" : "Approve — save reading"}
            </button>
          </div>
        )}

        {/* UNKNOWN */}
        {type === "unknown" && (
          <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "13px", color: colors.inkMuted }}>
            Couldn't parse this message. Dismiss it or enter manually.
          </p>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p style={{ fontFamily: "var(--font-outfit)", fontSize: "10px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: colors.inkMuted, marginBottom: "4px" }}>{label}</p>
      {children}
    </div>
  );
}

function Val({ children }: { children: React.ReactNode }) {
  return <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "13px", color: colors.ink }}>{children}</p>;
}

function approveBtn(disabled: boolean) {
  return {
    padding: "8px 16px", backgroundColor: disabled ? colors.inkMuted : colors.ink,
    color: colors.background, border: "none", borderRadius: "4px",
    fontFamily: "var(--font-dm-sans)" as const, fontSize: "13px",
    cursor: disabled ? "not-allowed" as const : "pointer" as const,
    alignSelf: "flex-start" as const,
  };
}
