"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { colors } from "@/lib/tokens";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { PRIMARY_CARB_LABEL, MEAL_TYPE_LABEL } from "@/lib/glucomove-calcs";

const FIBER_PROMINENCES = [
  { value: "low",      label: "Low",      desc: "Minimal veg or fiber — mostly refined carbs" },
  { value: "moderate", label: "Moderate", desc: "Some veg, beans, or fiber alongside carbs" },
  { value: "high",     label: "High",     desc: "Fiber-rich — lots of vegetables, salad, legumes" },
];

const PROTEIN_PROMINENCES = [
  { value: "low",      label: "Low",      desc: "Little to no protein — plain rice, bread, fruit" },
  { value: "moderate", label: "Moderate", desc: "Some protein alongside other components" },
  { value: "high",     label: "High",     desc: "Protein-dominant — large portion of meat, eggs, tofu, or legumes" },
];

const FAT_PROMINENCES = [
  { value: "low",      label: "Low",      desc: "Minimal fat — plain rice, steamed veg, plain bread" },
  { value: "moderate", label: "Moderate", desc: "Some fat — stir-fry with oil, normally cooked meat" },
  { value: "high",     label: "High",     desc: "Fat-rich — fried food, rendang, coconut milk, full-fat dairy, avocado" },
];

const CARB_SOURCES = Object.entries(PRIMARY_CARB_LABEL);
const MEAL_TYPES = Object.entries(MEAL_TYPE_LABEL);
const CARB_PROMINENCES = [
  { value: "none",      label: "None",      desc: "No meaningful carbohydrate source" },
  { value: "supporting",label: "Supporting",desc: "Small side component" },
  { value: "moderate",  label: "Moderate",  desc: "Substantial but balanced part of the meal" },
  { value: "hero",      label: "Hero",      desc: "Dominant component or identity of the dish" },
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
    <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer", userSelect: "none" as const }}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} style={{ accentColor: colors.ink, width: "14px", height: "14px", marginTop: "3px", flexShrink: 0 }} />
      <div>
        <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "14px", color: checked ? colors.ink : colors.inkMuted }}>{label}</p>
        {desc && <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "12px", color: colors.inkMuted, marginTop: "2px" }}>{desc}</p>}
      </div>
    </label>
  );
}

// Convert UTC timestamp to WIB datetime-local string (for input[type=datetime-local])
function toWIBLocal(utcTs: string): string {
  const d = new Date(new Date(utcTs).getTime() + 7 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 16);
}

interface MealData {
  id: string;
  meal_start_time: string;
  meal_type: string;
  name: string;
  description: string;
  primary_carb_source: string[];
  carb_prominence: string;
  acv_before: boolean;
  structured_eating: boolean;
  movement_after: boolean;
  movement_duration_minutes: number | null;
  with_alcohol: boolean;
  cooled_starch: boolean;
  fruit_after: boolean;
  dessert_after: boolean;
  added_sugar: boolean;
  large_portion: boolean;
  eating_out: boolean;
  fiber_prominence: string | null;
  protein_prominence: string | null;
  fat_prominence: string | null;
  fat_before: boolean;
  notes: string | null;
  potential_sensor_issue: boolean;
}

export default function MealEditForm({ meal }: { meal: MealData }) {
  const router = useRouter();

  const [startTime, setStartTime]           = useState(toWIBLocal(meal.meal_start_time));
  const [mealType, setMealType]             = useState(meal.meal_type);
  const [name, setName]                     = useState(meal.name);
  const [description, setDescription]       = useState(meal.description);
  const [primaryCarb, setPrimaryCarb]       = useState<string[]>(Array.isArray(meal.primary_carb_source) ? meal.primary_carb_source : meal.primary_carb_source ? [meal.primary_carb_source as unknown as string] : []);
  const [carbProminence, setCarbProminence] = useState(meal.carb_prominence);
  const [acvBefore, setAcvBefore]           = useState(meal.acv_before);
  const [structuredEating, setStructuredEating] = useState(meal.structured_eating);
  const [movementAfter, setMovementAfter]   = useState(meal.movement_after);
  const [movementMinutes, setMovementMinutes] = useState(meal.movement_duration_minutes?.toString() ?? "");
  const [withAlcohol, setWithAlcohol]         = useState(meal.with_alcohol);
  const [cooledStarch, setCooledStarch]       = useState(meal.cooled_starch);
  const [fruitAfter, setFruitAfter]           = useState(meal.fruit_after);
  const [dessertAfter, setDessertAfter]       = useState(meal.dessert_after);
  const [addedSugar, setAddedSugar]           = useState(meal.added_sugar);
  const [largePortion, setLargePortion]       = useState(meal.large_portion);
  const [eatingOut, setEatingOut]             = useState(meal.eating_out);
  const [fiberProminence, setFiberProminence] = useState(meal.fiber_prominence ?? "low");
  const [proteinProminence, setProteinProminence] = useState(meal.protein_prominence ?? "moderate");
  const [fatProminence, setFatProminence]         = useState(meal.fat_prominence ?? "moderate");
  const [fatBefore, setFatBefore]                 = useState(meal.fat_before);
  const [notes, setNotes]                   = useState(meal.notes ?? "");
  const [sensorIssue, setSensorIssue]       = useState(meal.potential_sensor_issue);
  const [saving, setSaving]                 = useState(false);
  const [error, setError]                   = useState("");

  async function handleSave() {
    if (!name.trim())        { setError("Meal name is required."); return; }
    if (!description.trim()) { setError("Meal description is required."); return; }

    setSaving(true); setError("");
    const supabase = createSupabaseBrowserClient();

    const { error: err } = await supabase
      .from("glucomove_meals")
      .update({
        meal_start_time: new Date(startTime + ":00+07:00").toISOString(),
        meal_type: mealType,
        name: name.trim(),
        description: description.trim(),
        primary_carb_source: primaryCarb.length > 0 ? primaryCarb : ["none"],
        carb_prominence: carbProminence,
        acv_before: acvBefore,
        structured_eating: structuredEating,
        movement_after: movementAfter,
        movement_duration_minutes: movementAfter && movementMinutes ? parseInt(movementMinutes) : null,
        with_alcohol: withAlcohol,
        cooled_starch: cooledStarch,
        fruit_after: fruitAfter,
        dessert_after: dessertAfter,
        added_sugar: addedSugar,
        large_portion: largePortion,
        eating_out: eatingOut,
        fiber_prominence: fiberProminence,
        protein_prominence: proteinProminence,
        fat_prominence: fatProminence,
        fat_before: fatBefore,
        notes: notes || null,
        potential_sensor_issue: sensorIssue,
      })
      .eq("id", meal.id);

    setSaving(false);
    if (err) { setError(err.message); return; }
    router.push(`/glucomove/meals/${meal.id}`);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <SectionHead>Meal details</SectionHead>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        <div>
          <FieldLabel required>Meal start time</FieldLabel>
          <input type="datetime-local" value={startTime} onChange={e => setStartTime(e.target.value)} style={inputStyle()} />
          <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "12px", color: colors.inkMuted, marginTop: "4px" }}>
            Enter time in WIB (your local time).
          </p>
        </div>
        <div>
          <FieldLabel required>Meal type</FieldLabel>
          <select value={mealType} onChange={e => setMealType(e.target.value)} style={{ ...inputStyle(), appearance: "none" as const, cursor: "pointer" }}>
            {MEAL_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
      </div>

      <div>
        <FieldLabel required>Meal name</FieldLabel>
        <input type="text" value={name} onChange={e => setName(e.target.value)} style={inputStyle()} />
      </div>

      <div>
        <FieldLabel required>Meal description</FieldLabel>
        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} style={{ ...inputStyle(), resize: "vertical" as const }} />
      </div>

      <SectionHead>Carb profile</SectionHead>

      <div>
        <FieldLabel required>Primary carbohydrate source</FieldLabel>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" as const }}>
          {CARB_SOURCES.map(([v, l]) => {
            const active = primaryCarb.includes(v);
            return (
              <button key={v} type="button" onClick={() => setPrimaryCarb(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v])} style={{ padding: "7px 14px", borderRadius: "4px", border: `1px solid ${active ? colors.ink : colors.border}`, backgroundColor: active ? colors.ink : "transparent", color: active ? colors.background : colors.inkMuted, fontFamily: "var(--font-dm-sans)", fontSize: "13px", cursor: "pointer" }}>
                {l}
              </button>
            );
          })}
        </div>
        <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "12px", color: colors.inkMuted, marginTop: "6px" }}>
          Select all that apply — tap again to deselect.
        </p>
      </div>

      <div>
        <FieldLabel required>Carb prominence</FieldLabel>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" as const }}>
          {CARB_PROMINENCES.map(p => {
            const active = carbProminence === p.value;
            return (
              <button key={p.value} onClick={() => setCarbProminence(p.value)} style={{ padding: "8px 16px", borderRadius: "4px", border: `1px solid ${active ? colors.ink : colors.border}`, backgroundColor: active ? colors.ink : "transparent", color: active ? colors.background : colors.inkMuted, fontFamily: "var(--font-dm-sans)", fontSize: "13px", cursor: "pointer" }}>
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

      <div>
        <FieldLabel required>Fiber content</FieldLabel>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" as const }}>
          {FIBER_PROMINENCES.map(p => {
            const active = fiberProminence === p.value;
            return (
              <button key={p.value} onClick={() => setFiberProminence(p.value)} style={{ padding: "8px 16px", borderRadius: "4px", border: `1px solid ${active ? colors.ink : colors.border}`, backgroundColor: active ? colors.ink : "transparent", color: active ? colors.background : colors.inkMuted, fontFamily: "var(--font-dm-sans)", fontSize: "13px", cursor: "pointer" }}>
                {p.label}
              </button>
            );
          })}
        </div>
        {fiberProminence && (
          <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "12px", color: colors.inkMuted, marginTop: "6px" }}>
            {FIBER_PROMINENCES.find(p => p.value === fiberProminence)?.desc}
          </p>
        )}
      </div>

      <div>
        <FieldLabel required>Protein content</FieldLabel>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" as const }}>
          {PROTEIN_PROMINENCES.map(p => {
            const active = proteinProminence === p.value;
            return (
              <button key={p.value} onClick={() => setProteinProminence(p.value)} style={{ padding: "8px 16px", borderRadius: "4px", border: `1px solid ${active ? colors.ink : colors.border}`, backgroundColor: active ? colors.ink : "transparent", color: active ? colors.background : colors.inkMuted, fontFamily: "var(--font-dm-sans)", fontSize: "13px", cursor: "pointer" }}>
                {p.label}
              </button>
            );
          })}
        </div>
        {proteinProminence && (
          <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "12px", color: colors.inkMuted, marginTop: "6px" }}>
            {PROTEIN_PROMINENCES.find(p => p.value === proteinProminence)?.desc}
          </p>
        )}
      </div>

      <div>
        <FieldLabel required>Fat content</FieldLabel>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" as const }}>
          {FAT_PROMINENCES.map(p => {
            const active = fatProminence === p.value;
            return (
              <button key={p.value} onClick={() => setFatProminence(p.value)} style={{ padding: "8px 16px", borderRadius: "4px", border: `1px solid ${active ? colors.ink : colors.border}`, backgroundColor: active ? colors.ink : "transparent", color: active ? colors.background : colors.inkMuted, fontFamily: "var(--font-dm-sans)", fontSize: "13px", cursor: "pointer" }}>
                {p.label}
              </button>
            );
          })}
        </div>
        {fatProminence && (
          <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "12px", color: colors.inkMuted, marginTop: "6px" }}>
            {FAT_PROMINENCES.find(p => p.value === fatProminence)?.desc}
          </p>
        )}
      </div>

      <SectionHead>Modifiers</SectionHead>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <Toggle label="Fat buffer before" desc="Deliberate fat taken before eating to blunt glucose spike (olive oil, nuts, avocado, butter)" checked={fatBefore} onChange={setFatBefore} />
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
        <Toggle label="Fruit after" desc="Fruit eaten immediately after this meal" checked={fruitAfter} onChange={setFruitAfter} />
        <Toggle label="Dessert after" desc="Dessert or sweet item eaten immediately after this meal" checked={dessertAfter} onChange={setDessertAfter} />
        <Toggle label="Added sugar" desc="Dishes with sugar as a cooking ingredient — sweet marinades, glazes, sauces (not dessert)" checked={addedSugar} onChange={setAddedSugar} />
        <Toggle label="Large portion" desc="Felt unusually full, heavy, or bloated after finishing the meal" checked={largePortion} onChange={setLargePortion} />
        <Toggle label="Eating out" desc="Restaurant, hawker, takeaway — preparation and ingredients unknown" checked={eatingOut} onChange={setEatingOut} />
      </div>

      <SectionHead>Hypothesis</SectionHead>

      <div>
        <textarea placeholder="What do you expect from this meal? Any context that might explain the response…" value={notes} onChange={e => setNotes(e.target.value)} rows={3} style={{ ...inputStyle(), resize: "vertical" as const }} />
      </div>

      <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontFamily: "var(--font-dm-sans)", fontSize: "14px", color: colors.inkMuted, userSelect: "none" as const }}>
        <input type="checkbox" checked={sensorIssue} onChange={e => setSensorIssue(e.target.checked)} style={{ accentColor: colors.ink, width: "14px", height: "14px" }} />
        Flag potential sensor issue
      </label>

      {error && <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "14px", color: colors.badge.act }}>{error}</p>}

      <div style={{ display: "flex", gap: "8px", paddingTop: "8px" }}>
        <button onClick={handleSave} disabled={saving} style={{ padding: "10px 24px", backgroundColor: colors.ink, color: colors.background, border: "none", borderRadius: "4px", fontFamily: "var(--font-dm-sans)", fontSize: "14px", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1 }}>
          {saving ? "Saving…" : "Save changes"}
        </button>
        <button onClick={() => router.push(`/glucomove/meals/${meal.id}`)} style={{ padding: "10px 24px", backgroundColor: "transparent", color: colors.inkMuted, border: `1px solid ${colors.border}`, borderRadius: "4px", fontFamily: "var(--font-dm-sans)", fontSize: "14px", cursor: "pointer" }}>
          Cancel
        </button>
      </div>
    </div>
  );
}
