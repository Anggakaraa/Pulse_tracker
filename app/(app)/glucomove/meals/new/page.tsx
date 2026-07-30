"use client";

export const dynamic = "force-dynamic";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { colors } from "@/lib/tokens";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { PRIMARY_CARB_LABEL, MEAL_TYPE_LABEL } from "@/lib/glucomove-calcs";

const CARB_SOURCES = Object.entries(PRIMARY_CARB_LABEL);
const MEAL_TYPES = Object.entries(MEAL_TYPE_LABEL);
const CARB_PROMINENCES = [
  { value: "none", label: "None", desc: "No meaningful carbohydrate source" },
  { value: "supporting", label: "Supporting", desc: "Small side component" },
  { value: "moderate", label: "Moderate", desc: "Substantial but balanced part of the meal" },
  { value: "hero", label: "Hero", desc: "Dominant component or identity of the dish" },
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

function selectStyle() {
  return { ...inputStyle(), appearance: "none" as const, cursor: "pointer" };
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label style={{ fontFamily: "var(--font-outfit)", fontSize: "13px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: colors.inkMuted, display: "block", marginBottom: "8px" }}>
      {children}{required && <span style={{ color: colors.badge.act, marginLeft: "4px" }}>*</span>}
    </label>
  );
}

function SectionHead({ children }: { children: string }) {
  return (
    <p style={{ fontFamily: "var(--font-outfit)", fontSize: "11px", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: colors.inkMuted, borderBottom: `1px solid ${colors.border}`, paddingBottom: "8px", marginBottom: "16px", marginTop: "8px" }}>
      {children}
    </p>
  );
}

function Toggle({ label, desc, checked, onChange }: { label: string; desc?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer", userSelect: "none" }}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} style={{ accentColor: colors.ink, width: "14px", height: "14px", marginTop: "3px", flexShrink: 0 }} />
      <div>
        <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "14px", color: checked ? colors.ink : colors.inkMuted }}>{label}</p>
        {desc && <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "12px", color: colors.inkMuted, marginTop: "2px" }}>{desc}</p>}
      </div>
    </label>
  );
}

function NewMealPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dayId = searchParams.get("day") ?? "";

  const now = new Date();
  const localTime = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}T${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  const [startTime, setStartTime] = useState(localTime);
  const [mealType, setMealType] = useState("lunch");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [primaryCarb, setPrimaryCarb] = useState("none");
  const [carbProminence, setCarbProminence] = useState("none");
  const [baselineGlucose, setBaselineGlucose] = useState("");

  // Modifiers
  const [acvBefore, setAcvBefore] = useState(false);
  const [structuredEating, setStructuredEating] = useState(false);
  const [movementAfter, setMovementAfter] = useState(false);
  const [movementMinutes, setMovementMinutes] = useState("");
  const [withAlcohol, setWithAlcohol] = useState(false);
  const [cooledStarch, setCooledStarch] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    if (!dayId) { setError("Day record ID missing."); return; }
    if (!name.trim()) { setError("Meal name is required."); return; }
    if (!description.trim()) { setError("Meal description is required."); return; }

    setSaving(true); setError("");
    const supabase = createSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Not authenticated."); setSaving(false); return; }

    const { data: meal, error: mealErr } = await supabase
      .from("glucomove_meals")
      .insert({
        day_record_id: dayId,
        user_id: user.id,
        meal_start_time: new Date(startTime).toISOString(),
        meal_type: mealType,
        name: name.trim(),
        description: description.trim(),
        primary_carb_source: primaryCarb,
        carb_prominence: carbProminence,
        acv_before: acvBefore,
        structured_eating: structuredEating,
        movement_after: movementAfter,
        movement_duration_minutes: movementAfter && movementMinutes ? parseInt(movementMinutes) : null,
        with_alcohol: withAlcohol,
        cooled_starch: cooledStarch,
      })
      .select("id")
      .single();

    if (mealErr || !meal) { setError(mealErr?.message ?? "Failed to save meal."); setSaving(false); return; }

    // Save baseline reading if provided
    if (baselineGlucose) {
      const val = parseFloat(baselineGlucose);
      if (!isNaN(val) && val > 0) {
        await supabase.from("glucomove_readings").insert({
          meal_id: meal.id,
          timestamp: new Date(startTime).toISOString(),
          glucose_mmol: val,
          is_baseline: true,
        });
      }
    }

    setSaving(false);
    router.push(`/glucomove/meals/${meal.id}`);
  }

  return (
    <div style={{ padding: "40px 64px", maxWidth: "640px" }}>
      <p style={{ fontFamily: "var(--font-outfit)", fontSize: "13px", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: colors.inkMuted, marginBottom: "4px" }}>
        Glucomove
      </p>
      <h1 style={{ fontFamily: "var(--font-outfit)", fontSize: "28px", fontWeight: 600, color: colors.ink, letterSpacing: "-0.01em", marginBottom: "32px" }}>
        Log a meal
      </h1>

      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <SectionHead>Meal details</SectionHead>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div>
            <FieldLabel required>Meal start time</FieldLabel>
            <input type="datetime-local" value={startTime} onChange={e => setStartTime(e.target.value)} style={inputStyle()} />
          </div>
          <div>
            <FieldLabel required>Meal type</FieldLabel>
            <select value={mealType} onChange={e => setMealType(e.target.value)} style={selectStyle()}>
              {MEAL_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        </div>

        <div>
          <FieldLabel required>Meal name</FieldLabel>
          <input type="text" placeholder="e.g. Wholewheat pasta with beef and beans" value={name} onChange={e => setName(e.target.value)} style={inputStyle()} />
        </div>

        <div>
          <FieldLabel required>Meal description</FieldLabel>
          <textarea placeholder="Describe what you ate…" value={description} onChange={e => setDescription(e.target.value)} rows={3} style={{ ...inputStyle(), resize: "vertical" as const }} />
        </div>

        <SectionHead>Carb profile</SectionHead>

        <div>
          <FieldLabel required>Primary carbohydrate source</FieldLabel>
          <select value={primaryCarb} onChange={e => setPrimaryCarb(e.target.value)} style={selectStyle()}>
            {CARB_SOURCES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>

        <div>
          <FieldLabel required>Carb prominence</FieldLabel>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {CARB_PROMINENCES.map(p => {
              const active = carbProminence === p.value;
              return (
                <button key={p.value} onClick={() => setCarbProminence(p.value)} style={{ padding: "8px 16px", borderRadius: "4px", border: `1px solid ${active ? colors.ink : colors.border}`, backgroundColor: active ? colors.ink : "transparent", color: active ? colors.background : colors.inkMuted, fontFamily: "var(--font-dm-sans)", fontSize: "13px", cursor: "pointer", transition: "all 150ms cubic-bezier(0.4,0,0.2,1)" }}>
                  {p.label}
                </button>
              );
            })}
          </div>
          {carbProminence && (
            <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "12px", color: colors.inkMuted, marginTop: "6px" }}>
              {CARB_PROMINENCES.find(p => p.value === carbProminence)?.desc}
            </p>
          )}
        </div>

        <SectionHead>Modifiers</SectionHead>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <Toggle label="ACV before meal" desc="Apple cider vinegar consumed before eating" checked={acvBefore} onChange={setAcvBefore} />
          <Toggle label="Structured eating" desc="Ate in order: fiber → protein/fat → carbohydrate" checked={structuredEating} onChange={setStructuredEating} />
          <Toggle label="Movement after" desc="Deliberate movement or exercise shortly after eating" checked={movementAfter} onChange={setMovementAfter} />
          {movementAfter && (
            <div style={{ paddingLeft: "24px" }}>
              <FieldLabel>Duration (minutes)</FieldLabel>
              <input type="number" min="1" placeholder="e.g. 15" value={movementMinutes} onChange={e => setMovementMinutes(e.target.value)} style={{ ...inputStyle(), width: "120px" }} />
            </div>
          )}
          <Toggle label="Alcohol" desc="Alcohol consumed as part of this meal or observation" checked={withAlcohol} onChange={setWithAlcohol} />
          <Toggle label="Cooled starch" desc="Main starch was cooled before consumption (including cooled and reheated)" checked={cooledStarch} onChange={setCooledStarch} />
        </div>

        <SectionHead>Baseline reading</SectionHead>

        <div>
          <FieldLabel>Glucose before meal (mmol/L)</FieldLabel>
          <input type="number" step="0.1" min="0" placeholder="e.g. 5.2" value={baselineGlucose} onChange={e => setBaselineGlucose(e.target.value)} style={{ ...inputStyle(), width: "180px" }} />
          <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "12px", color: colors.inkMuted, marginTop: "4px" }}>
            Optional here — you can also add it as the first reading on the meal page.
          </p>
        </div>

        {error && <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "14px", color: colors.badge.act }}>{error}</p>}

        <div style={{ display: "flex", gap: "8px", paddingTop: "8px" }}>
          <button onClick={handleSave} disabled={saving} style={{ padding: "10px 24px", backgroundColor: colors.ink, color: colors.background, border: "none", borderRadius: "4px", fontFamily: "var(--font-dm-sans)", fontSize: "14px", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1 }}>
            {saving ? "Saving…" : "Save and start observation"}
          </button>
          <button onClick={() => router.back()} style={{ padding: "10px 24px", backgroundColor: "transparent", color: colors.inkMuted, border: `1px solid ${colors.border}`, borderRadius: "4px", fontFamily: "var(--font-dm-sans)", fontSize: "14px", cursor: "pointer" }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default function NewMealPage() {
  return <Suspense><NewMealPageInner /></Suspense>;
}
