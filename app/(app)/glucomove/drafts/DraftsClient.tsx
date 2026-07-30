"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { colors } from "@/lib/tokens";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { PRIMARY_CARB_LABEL, MEAL_TYPE_LABEL } from "@/lib/glucomove-calcs";

type Draft = Record<string, unknown>;

interface DraftEdits {
  waking: string; overnight: string; daily: string;
  mealName: string; mealDesc: string; mealType: string;
  carbSource: string; carbProminence: string;
  acvBefore: boolean; structuredEating: boolean;
  movementAfter: boolean; movementMinutes: string;
  withAlcohol: boolean; cooledStarch: boolean;
  mealTime: string;
  glucoseMmol: string; readingTime: string;
}

function initEdits(draft: Draft): DraftEdits {
  const p = draft.parsed_data as Record<string, unknown>;
  return {
    waking: String(p.waking_glucose_mmol ?? ""),
    overnight: String(p.overnight_avg_mmol ?? ""),
    daily: String(p.daily_avg_mmol ?? ""),
    mealName: String(p.name ?? ""),
    mealDesc: String(p.description ?? ""),
    mealType: String(p.meal_type ?? "other"),
    carbSource: String(p.primary_carb_source ?? "other"),
    carbProminence: String(p.carb_prominence ?? "moderate"),
    acvBefore: Boolean(p.acv_before),
    structuredEating: Boolean(p.structured_eating),
    movementAfter: Boolean(p.movement_after),
    movementMinutes: String(p.movement_duration_minutes ?? ""),
    withAlcohol: Boolean(p.with_alcohol),
    cooledStarch: Boolean(p.cooled_starch),
    mealTime: String(p.time ?? ""),
    glucoseMmol: String(p.glucose_mmol ?? ""),
    readingTime: String(p.time ?? ""),
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
    const { error } = await supabase.from("glucomove_day_records").upsert({
      user_id: userId, date,
      waking_glucose_mmol: e.waking ? parseFloat(e.waking) : null,
      overnight_avg_mmol: e.overnight ? parseFloat(e.overnight) : null,
      daily_avg_mmol: e.daily ? parseFloat(e.daily) : null,
    }, { onConflict: "user_id,date" });
    return error?.message ?? null;
  }

  if (type === "meal") {
    const ts = resolveTs(date, e.mealTime, sentAt);
    const { error } = await supabase.from("glucomove_meals").insert({
      day_record_id: null, user_id: userId,
      meal_start_time: ts, meal_type: e.mealType,
      name: e.mealName, description: e.mealDesc || e.mealName,
      primary_carb_source: e.carbSource, carb_prominence: e.carbProminence,
      acv_before: e.acvBefore, structured_eating: e.structuredEating,
      movement_after: e.movementAfter,
      movement_duration_minutes: e.movementAfter && e.movementMinutes ? parseInt(e.movementMinutes) : null,
      with_alcohol: e.withAlcohol, cooled_starch: e.cooledStarch,
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

  return "Unknown type — dismiss or enter manually.";
}

const TYPE_LABEL: Record<string, string> = {
  day_record: "Day record", meal: "Meal",
  glucose_reading: "Glucose reading", unknown: "Unknown",
};
const TYPE_COLOR: Record<string, string> = {
  day_record: colors.badge.optimal, meal: colors.ink,
  glucose_reading: colors.badge.stable, unknown: colors.inkMuted,
};

function compactSummary(draft: Draft): string {
  const p = draft.parsed_data as Record<string, unknown>;
  const type = draft.type as string;
  if (type === "day_record") return p.waking_glucose_mmol ? `Waking: ${p.waking_glucose_mmol} mmol/L` : "No waking glucose";
  if (type === "meal") return `${String(p.name ?? "—")} — ${MEAL_TYPE_LABEL[String(p.meal_type ?? "")] ?? "Meal"}`;
  if (type === "glucose_reading") return `${p.glucose_mmol} mmol/L`;
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
              <button onClick={() => setExpanded(x => !x)} style={{ padding: "4px 10px", backgroundColor: "transparent", color: colors.inkMuted, border: `1px solid ${colors.border}`, borderRadius: "4px", fontFamily: "var(--font-dm-sans)", fontSize: "11px", cursor: "pointer" }}>
                {expanded ? "Close" : "Edit"}
              </button>
            )}
            <button onClick={onDismiss} style={{ padding: "4px 10px", backgroundColor: "transparent", color: colors.inkMuted, border: `1px solid ${colors.border}`, borderRadius: "4px", fontFamily: "var(--font-dm-sans)", fontSize: "11px", cursor: "pointer" }}>
              Dismiss
            </button>
          </div>
        </div>

        {/* Expanded edit area */}
        {expanded && (
          <div style={{ borderTop: `1px solid ${colors.border}`, padding: "14px 16px", backgroundColor: colors.surface, display: "flex", flexDirection: "column", gap: "10px" }}>
            <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "12px", color: colors.inkMuted, fontStyle: "italic" }}>
              "{draft.raw_message as string}"
            </p>

            {type === "day_record" && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
                <div><FL>Waking (mmol/L)</FL><input type="number" step="0.1" value={edits.waking} onChange={e => onEdit("waking", e.target.value)} style={inputSt()} /></div>
                <div><FL>Overnight avg</FL><input type="number" step="0.1" value={edits.overnight} onChange={e => onEdit("overnight", e.target.value)} style={inputSt()} /></div>
                <div><FL>Daily avg</FL><input type="number" step="0.1" value={edits.daily} onChange={e => onEdit("daily", e.target.value)} style={inputSt()} /></div>
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
                <div>
                  <FL>Primary carb</FL>
                  <select value={edits.carbSource} onChange={e => onEdit("carbSource", e.target.value)} style={{ ...inputSt(), appearance: "none" as const }}>
                    {Object.entries(PRIMARY_CARB_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "10px" }}>
                  {([
                    ["acvBefore", "ACV before"],
                    ["structuredEating", "Structured eating"],
                    ["movementAfter", "Movement after"],
                    ["withAlcohol", "Alcohol"],
                    ["cooledStarch", "Cooled starch"],
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

          <button
            onClick={() => runApprove(approveableIds.filter(id => selected.has(id)))}
            disabled={saving || selectedCount === 0}
            style={{
              padding: "7px 14px", backgroundColor: "transparent",
              color: selectedCount === 0 ? colors.inkMuted : colors.ink,
              border: `1px solid ${selectedCount === 0 ? colors.border : colors.ink}`,
              borderRadius: "4px", fontFamily: "var(--font-dm-sans)", fontSize: "13px",
              cursor: selectedCount === 0 || saving ? "not-allowed" : "pointer",
            }}
          >
            {saving ? "Saving…" : `Approve selected${selectedCount > 0 ? ` (${selectedCount})` : ""}`}
          </button>

          <button
            onClick={() => runApprove(approveableIds)}
            disabled={saving}
            style={{
              padding: "7px 14px", backgroundColor: saving ? colors.inkMuted : colors.ink,
              color: colors.background, border: "none", borderRadius: "4px",
              fontFamily: "var(--font-dm-sans)", fontSize: "13px",
              cursor: saving ? "not-allowed" : "pointer",
            }}
          >
            Approve all
          </button>
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
