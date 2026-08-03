"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { colors } from "@/lib/tokens";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { PRIMARY_CARB_LABEL, MEAL_TYPE_LABEL } from "@/lib/glucomove-calcs";
import Button from "@/components/Button";

type Draft = Record<string, unknown>;

interface DraftEdits {
  waking: string; overnight: string; daily: string;
  badSleep: boolean; alcoholPrevNight: boolean;
  mealName: string; mealDesc: string; mealType: string;
  carbSource: string[]; carbProminence: string;
  acvBefore: boolean; structuredEating: boolean;
  movementAfter: boolean; movementMinutes: string;
  withAlcohol: boolean; cooledStarch: boolean;
  fruitAfter: boolean; dessertAfter: boolean; addedSugar: boolean; largePortion: boolean; eatingOut: boolean;
  mealTime: string; fiberProminence: string; proteinProminence: string; fatProminence: string; fatBefore: boolean;
  glucoseMmol: string; readingTime: string;
  eventName: string; eventType: string; eventTime: string; eventEndTime: string; eventIntensity: string;
}

function initEdits(draft: Draft): DraftEdits {
  const p = draft.parsed_data as Record<string, unknown>;
  return {
    waking: String(p.waking_glucose_mmol ?? ""),
    overnight: String(p.overnight_avg_mmol ?? ""),
    daily: String(p.daily_avg_mmol ?? ""),
    badSleep: Boolean(p.bad_sleep),
    alcoholPrevNight: Boolean(p.alcohol_previous_night),
    mealName: String(p.name ?? ""),
    mealDesc: String(p.description ?? ""),
    mealType: String(p.meal_type ?? "other"),
    carbSource: Array.isArray(p.primary_carb_source) ? (p.primary_carb_source as string[]) : (p.primary_carb_source ? [String(p.primary_carb_source)] : ["other"]),
    carbProminence: String(p.carb_prominence ?? "moderate"),
    acvBefore: Boolean(p.acv_before),
    structuredEating: Boolean(p.structured_eating),
    movementAfter: Boolean(p.movement_after),
    movementMinutes: String(p.movement_duration_minutes ?? ""),
    withAlcohol: Boolean(p.with_alcohol),
    cooledStarch: Boolean(p.cooled_starch),
    fruitAfter: Boolean(p.fruit_after),
    dessertAfter: Boolean(p.dessert_after),
    addedSugar: Boolean(p.added_sugar),
    largePortion: Boolean(p.large_portion),
    eatingOut: Boolean(p.eating_out),
    mealTime: String(p.time ?? ""),
    fiberProminence: String(p.fiber_prominence ?? "low"),
    proteinProminence: String(p.protein_prominence ?? "moderate"),
    fatProminence: String(p.fat_prominence ?? "moderate"),
    fatBefore: Boolean(p.fat_before),
    glucoseMmol: String(p.glucose_mmol ?? ""),
    readingTime: String(p.time ?? ""),
    eventName: String(p.name ?? ""),
    eventType: String(p.event_type ?? "other"),
    eventTime: String(p.time ?? ""),
    eventEndTime: String(p.end_time ?? ""),
    eventIntensity: String(p.intensity ?? ""),
  };
}

function resolveTs(dateStr: string, timeStr: string, sentAt: Date): string {
  if (/^\d{1,2}:\d{2}$/.test(timeStr)) {
    return new Date(`${dateStr}T${timeStr}:00+07:00`).toISOString();
  }
  return sentAt.toISOString();
}

async function approveOne(
  supabase: ReturnType<typeof createSupabaseBrowserClient>,
  userId: string,
  draft: Draft,
  e: DraftEdits
): Promise<string | null> {
  const type = draft.type as string;
  const date = draft.date as string;
  const sentAt = new Date(draft.sent_at as string);

  if (type === "day_record") {
    let wakingGlucose = e.waking ? parseFloat(e.waking) : null;

    if (wakingGlucose === null) {
      // Auto-lookup: find the closest reading to the specified wake-up time (or sentAt)
      const p = draft.parsed_data as Record<string, unknown>;
      const timeStr = typeof p.time === "string" && /^\d{1,2}:\d{2}$/.test(p.time) ? p.time : null;
      const targetMs = timeStr
        ? new Date(`${date}T${timeStr}:00+07:00`).getTime()
        : sentAt.getTime();

      const { data: dayReadings } = await supabase
        .from("glucomove_readings")
        .select("timestamp, glucose_mmol")
        .eq("user_id", userId)
        .gte("timestamp", `${date}T00:00:00+07:00`)
        .lte("timestamp", `${date}T23:59:59+07:00`);

      if (dayReadings && dayReadings.length > 0) {
        const closest = dayReadings.reduce((best, r) =>
          Math.abs(new Date(r.timestamp).getTime() - targetMs) <
          Math.abs(new Date(best.timestamp).getTime() - targetMs) ? r : best
        );
        wakingGlucose = closest.glucose_mmol;
      }
    }

    const { error } = await supabase.from("glucomove_day_records").upsert({
      user_id: userId, date,
      waking_glucose_mmol: wakingGlucose,
      overnight_avg_mmol: e.overnight ? parseFloat(e.overnight) : null,
      daily_avg_mmol: e.daily ? parseFloat(e.daily) : null,
      bad_sleep: e.badSleep,
      alcohol_previous_night: e.alcoholPrevNight,
    }, { onConflict: "user_id,date" });
    return error?.message ?? null;
  }

  if (type === "meal") {
    const ts = resolveTs(date, e.mealTime, sentAt);
    const { error } = await supabase.from("glucomove_meals").insert({
      day_record_id: null, user_id: userId,
      meal_start_time: ts, meal_type: e.mealType,
      name: e.mealName, description: e.mealDesc || e.mealName,
      primary_carb_source: e.carbSource.length > 0 ? e.carbSource : ["none"], carb_prominence: e.carbProminence,
      fiber_prominence: e.fiberProminence || "low",
      protein_prominence: e.proteinProminence || "moderate",
      fat_prominence: e.fatProminence || "moderate",
      fat_before: e.fatBefore,
      acv_before: e.acvBefore, structured_eating: e.structuredEating,
      movement_after: e.movementAfter,
      movement_duration_minutes: e.movementAfter && e.movementMinutes ? parseInt(e.movementMinutes) : null,
      with_alcohol: e.withAlcohol, cooled_starch: e.cooledStarch,
      fruit_after: e.fruitAfter, dessert_after: e.dessertAfter,
      added_sugar: e.addedSugar, large_portion: e.largePortion, eating_out: e.eatingOut,
    });
    return error?.message ?? null;
  }

  if (type === "glucose_reading") {
    const ts = resolveTs(date, e.readingTime, sentAt);
    const { error } = await supabase.from("glucomove_readings").insert({
      user_id: userId, meal_id: null, timestamp: ts,
      glucose_mmol: parseFloat(e.glucoseMmol || "0"), is_baseline: false,
    });
    return error?.message ?? null;
  }

  if (type === "event") {
    const startTs = resolveTs(date, e.eventTime, sentAt);
    const endTs   = e.eventEndTime ? new Date(`${date}T${e.eventEndTime}:00+07:00`).toISOString() : null;
    const { error } = await supabase.from("glucomove_events").insert({
      user_id: userId,
      name: e.eventName || "Event",
      event_type: e.eventType || "other",
      start_time: startTs,
      end_time: endTs,
      intensity: e.eventIntensity || null,
    });
    return error?.message ?? null;
  }

  return "Unknown type — dismiss or enter manually.";
}

const TYPE_LABEL: Record<string, string> = {
  day_record: "Day record", meal: "Meal",
  glucose_reading: "Glucose reading", event: "Event", unknown: "Unknown",
};
const TYPE_COLOR: Record<string, string> = {
  day_record: colors.badge.optimal, meal: colors.ink,
  glucose_reading: colors.badge.stable, event: colors.category.inflammation, unknown: colors.inkMuted,
};

function compactSummary(draft: Draft): string {
  const p = draft.parsed_data as Record<string, unknown>;
  const type = draft.type as string;
  if (type === "day_record") {
    if (p.waking_glucose_mmol) return `Waking: ${p.waking_glucose_mmol} mmol/L`;
    const timeStr = typeof p.time === "string" ? p.time : null;
    return timeStr ? `Waking: auto-lookup near ${timeStr}` : "Waking: auto-lookup (now)";
  }
  if (type === "meal") return `${String(p.name ?? "—")} — ${MEAL_TYPE_LABEL[String(p.meal_type ?? "")] ?? "Meal"}`;
  if (type === "glucose_reading") return `${p.glucose_mmol} mmol/L`;
  if (type === "event") return `${String(p.name ?? "—")} (${String(p.event_type ?? "other")})`;
  return `"${String(draft.raw_message ?? "").slice(0, 60)}"`;
}

function draftDisplayTime(draft: Draft): string {
  const p = draft.parsed_data as Record<string, unknown>;
  if (p.time && typeof p.time === "string") return p.time;
  return new Date(draft.sent_at as string).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function inputSt(width?: string) {
  return {
    padding: "7px 10px", fontFamily: "var(--font-dm-sans)" as const, fontSize: "13px",
    backgroundColor: colors.background, border: `1px solid ${colors.border}`,
    borderRadius: "4px", color: colors.ink, outline: "none",
    width: width ?? "100%", boxSizing: "border-box" as const,
  };
}

function FL({ children }: { children: string }) {
  return (
    <p style={{ fontFamily: "var(--font-outfit)", fontSize: "10px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: colors.inkMuted, marginBottom: "4px" }}>
      {children}
    </p>
  );
}

// Individual draft row — compact with optional expand-to-edit
function DraftRow({ draft, isSelected, onToggle, edits, onEdit, onDismiss, rowError }: {
  draft: Draft;
  isSelected: boolean;
  onToggle: () => void;
  edits: DraftEdits;
  onEdit: <K extends keyof DraftEdits>(key: K, val: DraftEdits[K]) => void;
  onDismiss: () => void;
  rowError?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const type = draft.type as string;
  const canSelect = type !== "unknown";
  const sentAt = new Date(draft.sent_at as string);

  return (
    <div>
      <div style={{ border: `1px solid ${rowError ? colors.badge.act : colors.border}`, borderRadius: "6px", overflow: "hidden", backgroundColor: colors.background }}>
        {/* Compact row */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px 16px" }}>
          <input
            type="checkbox"
            checked={isSelected}
            disabled={!canSelect}
            onChange={onToggle}
            style={{ width: "15px", height: "15px", accentColor: colors.ink, flexShrink: 0, cursor: canSelect ? "pointer" : "default" }}
          />

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }}>
              <span style={{ fontFamily: "var(--font-outfit)", fontSize: "10px", fontWeight: 600, letterSpacing: "0.10em", textTransform: "uppercase" as const, color: TYPE_COLOR[type] ?? colors.inkMuted }}>
                {TYPE_LABEL[type] ?? type}
              </span>
              <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "12px", color: colors.inkMuted }}>
                {draftDisplayTime(draft)}
              </span>
            </div>
            <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "13px", color: colors.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
              {compactSummary(draft)}
            </p>
          </div>

          <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
            {canSelect && (
              <Button size="sm" variant="ghost" onClick={() => setExpanded(x => !x)}>
                {expanded ? "Close" : "Edit"}
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={onDismiss}>Dismiss</Button>
          </div>
        </div>

        {/* Expanded edit area */}
        {expanded && (
          <div style={{ borderTop: `1px solid ${colors.border}`, padding: "14px 16px", backgroundColor: colors.surface, display: "flex", flexDirection: "column", gap: "10px" }}>
            <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "12px", color: colors.inkMuted, fontStyle: "italic" }}>
              "{draft.raw_message as string}"
            </p>

            {type === "day_record" && (
              <div style={{ display: "flex", flexDirection: "column" as const, gap: "10px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
                  <div><FL>Waking (mmol/L)</FL><input type="number" step="0.1" value={edits.waking} onChange={e => onEdit("waking", e.target.value)} style={inputSt()} /></div>
                  <div><FL>Overnight avg</FL><input type="number" step="0.1" value={edits.overnight} onChange={e => onEdit("overnight", e.target.value)} style={inputSt()} /></div>
                  <div><FL>Daily avg</FL><input type="number" step="0.1" value={edits.daily} onChange={e => onEdit("daily", e.target.value)} style={inputSt()} /></div>
                </div>
                <div style={{ display: "flex", gap: "16px" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontFamily: "var(--font-dm-sans)", fontSize: "12px", color: colors.inkMuted }}>
                    <input type="checkbox" checked={edits.badSleep} onChange={e => onEdit("badSleep", e.target.checked)} style={{ accentColor: colors.ink }} />
                    Bad sleep previous night
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontFamily: "var(--font-dm-sans)", fontSize: "12px", color: colors.inkMuted }}>
                    <input type="checkbox" checked={edits.alcoholPrevNight} onChange={e => onEdit("alcoholPrevNight", e.target.checked)} style={{ accentColor: colors.ink }} />
                    Alcohol previous night
                  </label>
                </div>
              </div>
            )}

            {type === "meal" && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 100px", gap: "10px" }}>
                  <div><FL>Name</FL><input type="text" value={edits.mealName} onChange={e => onEdit("mealName", e.target.value)} style={inputSt()} /></div>
                  <div>
                    <FL>Type</FL>
                    <select value={edits.mealType} onChange={e => onEdit("mealType", e.target.value)} style={{ ...inputSt(), appearance: "none" as const }}>
                      {Object.entries(MEAL_TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                  <div><FL>Time (HH:MM)</FL><input type="text" value={edits.mealTime} onChange={e => onEdit("mealTime", e.target.value)} style={inputSt()} /></div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <FL>Primary carb (select all that apply)</FL>
                    <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "6px", marginTop: "4px" }}>
                      {Object.entries(PRIMARY_CARB_LABEL).map(([v, l]) => {
                        const active = edits.carbSource.includes(v);
                        return (
                          <Button key={v} size="sm" variant={active ? "primary" : "ghost"} type="button" onClick={() => onEdit("carbSource", active ? edits.carbSource.filter(x => x !== v) : [...edits.carbSource, v])}>
                            {l}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <FL>Fiber content</FL>
                    <select value={edits.fiberProminence} onChange={e => onEdit("fiberProminence", e.target.value)} style={{ ...inputSt(), appearance: "none" as const }}>
                      <option value="low">Low</option>
                      <option value="moderate">Moderate</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                  <div>
                    <FL>Protein content</FL>
                    <select value={edits.proteinProminence} onChange={e => onEdit("proteinProminence", e.target.value)} style={{ ...inputSt(), appearance: "none" as const }}>
                      <option value="low">Low</option>
                      <option value="moderate">Moderate</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                  <div>
                    <FL>Fat content</FL>
                    <select value={edits.fatProminence} onChange={e => onEdit("fatProminence", e.target.value)} style={{ ...inputSt(), appearance: "none" as const }}>
                      <option value="low">Low</option>
                      <option value="moderate">Moderate</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontFamily: "var(--font-dm-sans)", fontSize: "12px", color: colors.inkMuted }}>
                    <input type="checkbox" checked={edits.fatBefore} onChange={e => onEdit("fatBefore", e.target.checked)} style={{ accentColor: colors.ink }} />
                    Fat buffer before
                  </label>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "10px" }}>
                  {([
                    ["acvBefore", "ACV before"],
                    ["structuredEating", "Structured eating"],
                    ["movementAfter", "Movement after"],
                    ["withAlcohol", "Alcohol"],
                    ["cooledStarch", "Cooled starch"],
                    ["fruitAfter", "Fruit after"],
                    ["dessertAfter", "Dessert after"],
                    ["addedSugar", "Added sugar"],
                    ["largePortion", "Large portion"],
                    ["eatingOut", "Eating out"],
                  ] as [keyof DraftEdits, string][]).map(([key, label]) => (
                    <label key={key as string} style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontFamily: "var(--font-dm-sans)", fontSize: "12px", color: colors.inkMuted }}>
                      <input type="checkbox" checked={Boolean(edits[key])} onChange={e => onEdit(key, e.target.checked as DraftEdits[typeof key])} style={{ accentColor: colors.ink }} />
                      {label}
                    </label>
                  ))}
                </div>
              </>
            )}

            {type === "glucose_reading" && (
              <div style={{ display: "flex", gap: "12px" }}>
                <div><FL>Glucose (mmol/L)</FL><input type="number" step="0.1" value={edits.glucoseMmol} onChange={e => onEdit("glucoseMmol", e.target.value)} style={inputSt("120px")} /></div>
                <div><FL>Time (HH:MM)</FL><input type="text" placeholder={sentAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} value={edits.readingTime} onChange={e => onEdit("readingTime", e.target.value)} style={inputSt("100px")} /></div>
              </div>
            )}

            {type === "event" && (
              <div style={{ display: "flex", flexDirection: "column" as const, gap: "10px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 120px 120px 100px", gap: "10px" }}>
                  <div><FL>Name</FL><input type="text" value={edits.eventName} onChange={e => onEdit("eventName", e.target.value)} style={inputSt()} /></div>
                  <div>
                    <FL>Type</FL>
                    <select value={edits.eventType} onChange={e => onEdit("eventType", e.target.value)} style={{ ...inputSt(), appearance: "none" as const }}>
                      {["stress","exercise","recovery","alcohol","illness","sleep","travel","fasting","medication","other"].map(t => (
                        <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                  <div><FL>Start (HH:MM)</FL><input type="text" value={edits.eventTime} onChange={e => onEdit("eventTime", e.target.value)} style={inputSt()} /></div>
                  <div><FL>End (HH:MM)</FL><input type="text" value={edits.eventEndTime} onChange={e => onEdit("eventEndTime", e.target.value)} style={inputSt()} /></div>
                </div>
                <div>
                  <FL>Intensity</FL>
                  <select value={edits.eventIntensity} onChange={e => onEdit("eventIntensity", e.target.value)} style={{ ...inputSt("160px"), appearance: "none" as const }}>
                    <option value="">Not specified</option>
                    <option value="low">Low</option>
                    <option value="moderate">Moderate</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
            )}

            {type === "unknown" && (
              <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "13px", color: colors.inkMuted }}>
                Couldn't parse — dismiss or enter manually.
              </p>
            )}
          </div>
        )}
      </div>

      {rowError && (
        <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "12px", color: colors.badge.act, marginTop: "4px", paddingLeft: "4px" }}>
          {rowError}
        </p>
      )}
    </div>
  );
}

// Main component
export default function DraftsClient({ drafts, grouped, sortedDates }: {
  drafts: Draft[];
  grouped: Record<string, Draft[]>;
  sortedDates: string[];
}) {
  const router = useRouter();

  const approveableIds = drafts.filter(d => d.type !== "unknown").map(d => d.id as string);

  const [selected, setSelected] = useState<Set<string>>(new Set(approveableIds));
  const [edits, setEdits] = useState<Record<string, DraftEdits>>(() =>
    Object.fromEntries(drafts.map(d => [d.id as string, initEdits(d)]))
  );
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});

  const allSelected = approveableIds.length > 0 && approveableIds.every(id => selected.has(id));
  const selectedCount = approveableIds.filter(id => selected.has(id)).length;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(approveableIds));
  }

  function toggleOne(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function updateEdit<K extends keyof DraftEdits>(id: string, key: K, val: DraftEdits[K]) {
    setEdits(prev => ({ ...prev, [id]: { ...prev[id], [key]: val } }));
  }

  async function dismiss(id: string) {
    const supabase = createSupabaseBrowserClient();
    await supabase.from("glucomove_telegram_drafts").update({ status: "dismissed" }).eq("id", id);
    router.refresh();
  }

  async function runApprove(ids: string[]) {
    if (ids.length === 0) return;
    setSaving(true);
    setRowErrors({});
    setStatusMsg(`Approving ${ids.length}…`);

    const supabase = createSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setStatusMsg("Not authenticated."); setSaving(false); return; }

    const errs: Record<string, string> = {};

    for (const id of ids) {
      const draft = drafts.find(d => d.id === id);
      if (!draft) continue;
      const err = await approveOne(supabase, user.id, draft, edits[id]);
      if (err) {
        errs[id] = err;
      } else {
        await supabase.from("glucomove_telegram_drafts").update({ status: "approved" }).eq("id", id);
      }
    }

    setSaving(false);

    if (Object.keys(errs).length > 0) {
      setRowErrors(errs);
      const okCount = ids.length - Object.keys(errs).length;
      setStatusMsg(okCount > 0 ? `${okCount} approved, ${Object.keys(errs).length} failed` : `${Object.keys(errs).length} failed`);
    } else {
      setStatusMsg("");
      router.refresh();
    }
  }

  return (
    <div>
      {/* Bulk action bar */}
      {approveableIds.length > 0 && (
        <div style={{
          display: "flex", alignItems: "center", gap: "12px",
          padding: "12px 16px", border: `1px solid ${colors.border}`,
          borderRadius: "6px", backgroundColor: colors.surface, marginBottom: "24px",
        }}>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontFamily: "var(--font-dm-sans)", fontSize: "13px", color: colors.inkMuted, userSelect: "none" as const }}>
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              style={{ width: "15px", height: "15px", accentColor: colors.ink }}
            />
            Select all
          </label>

          <div style={{ flex: 1 }} />

          {statusMsg && (
            <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "12px", color: colors.inkMuted }}>
              {statusMsg}
            </span>
          )}

          <Button
            variant="ghost"
            onClick={() => runApprove(approveableIds.filter(id => selected.has(id)))}
            disabled={saving || selectedCount === 0}
            style={selectedCount > 0 ? { color: colors.ink, border: `1px solid ${colors.ink}` } : {}}
          >
            {saving ? "Saving…" : `Approve selected${selectedCount > 0 ? ` (${selectedCount})` : ""}`}
          </Button>

          <Button
            variant="primary"
            onClick={() => runApprove(approveableIds)}
            disabled={saving}
          >
            Approve all
          </Button>
        </div>
      )}

      {/* Date groups */}
      {sortedDates.map(date => (
        <div key={date} style={{ marginBottom: "32px" }}>
          <p style={{ fontFamily: "var(--font-outfit)", fontSize: "11px", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: colors.inkMuted, marginBottom: "12px" }}>
            {new Date(date + "T12:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {grouped[date]!.map(draft => {
              const id = draft.id as string;
              return (
                <DraftRow
                  key={id}
                  draft={draft}
                  isSelected={selected.has(id)}
                  onToggle={() => toggleOne(id)}
                  edits={edits[id]}
                  onEdit={(key, val) => updateEdit(id, key, val)}
                  onDismiss={() => dismiss(id)}
                  rowError={rowErrors[id]}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
