"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { colors } from "@/lib/tokens";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

const SYMPTOM_GROUPS = [
  { label: "General", items: ["Lethargy", "Reduced appetite", "Refused food", "Drinking more", "Drinking less", "Fever (if measured)"] },
  { label: "Gastrointestinal", items: ["Grass eating", "Nausea / lip licking", "Vomiting", "Diarrhea", "Soft stool", "Mucus in stool", "Blood in stool", "Constipation", "Abdominal discomfort"] },
  { label: "Musculoskeletal", items: ["Arthritis flare", "Limping", "Difficulty standing", "Reluctant to jump", "Reduced activity"] },
  { label: "Skin / Coat", items: ["Increased scratching", "Increased nibbling", "Increased licking", "Hair thinning", "Heavy shedding", "Bald patch", "Red skin", "Hot spot", "Ear itch"] },
  { label: "Respiratory", items: ["Sneezing", "Coughing", "Nasal discharge"] },
  { label: "Urinary", items: ["Frequent urination", "Straining", "Blood in urine"] },
  { label: "Behaviour", items: ["Restless", "Hiding", "Vocalizing", "Less social", "Sleeping more"] },
];

const SEVERITIES = [
  { value: "mild", label: "Mild" },
  { value: "moderate", label: "Moderate" },
  { value: "severe", label: "Severe" },
];

const SEVERITY_COLOR: Record<string, string> = {
  mild: colors.badge.optimal,
  moderate: colors.badge.stable,
  severe: colors.badge.act,
};

function inputStyle() {
  return {
    width: "100%",
    padding: "8px 12px",
    fontFamily: "var(--font-dm-sans)" as const,
    fontSize: "14px",
    backgroundColor: colors.background,
    border: `1px solid ${colors.border}`,
    borderRadius: "4px",
    color: colors.ink,
    outline: "none",
    boxSizing: "border-box" as const,
  };
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontFamily: "var(--font-outfit)",
      fontSize: "11px",
      fontWeight: 600,
      letterSpacing: "0.10em",
      textTransform: "uppercase" as const,
      color: colors.inkMuted,
      marginBottom: "6px",
    }}>
      {children}
    </p>
  );
}

function ReadValue({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "14px", color: colors.ink, lineHeight: 1.6 }}>
      {children}
    </p>
  );
}

export default function EpisodeDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // data fields
  const [date, setDate] = useState("");
  const [trigger, setTrigger] = useState("");
  const [selectedSymptoms, setSelectedSymptoms] = useState<Set<string>>(new Set());
  const [symptomsOther, setSymptomsOther] = useState("");
  const [symptomsDescription, setSymptomsDescription] = useState("");
  const [severity, setSeverity] = useState("");
  const [actionTaken, setActionTaken] = useState("");
  const [recovery, setRecovery] = useState("");

  useEffect(() => {
    async function load() {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase.from("putih_episodes").select("*").eq("id", id).single();
      if (error || !data) { setError("Episode not found."); setLoading(false); return; }
      setDate(data.date);
      setTrigger(data.suspected_trigger || "");
      setSelectedSymptoms(new Set(Array.isArray(data.symptoms) ? data.symptoms : []));
      setSymptomsOther(data.symptoms_other || "");
      setSymptomsDescription(data.symptoms_description || "");
      setSeverity(data.severity);
      setActionTaken(data.action_taken || "");
      setRecovery(data.recovery || "");
      setLoading(false);
    }
    load();
  }, [id]);

  function toggleSymptom(s: string) {
    setSelectedSymptoms(prev => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s); else next.add(s);
      return next;
    });
  }

  async function handleSave() {
    if (!date || !severity) { setError("Date and severity are required."); return; }
    setSaving(true);
    setError("");
    const supabase = createSupabaseBrowserClient();
    const { error: err } = await supabase.from("putih_episodes").update({
      date,
      suspected_trigger: trigger || null,
      symptoms: Array.from(selectedSymptoms),
      symptoms_other: symptomsOther || null,
      symptoms_description: symptomsDescription || null,
      severity,
      action_taken: actionTaken || null,
      recovery: recovery || null,
    }).eq("id", id);
    setSaving(false);
    if (err) { setError(err.message); return; }
    setEditing(false);
  }

  const allSymptoms = symptomsOther
    ? [...Array.from(selectedSymptoms), `Other: ${symptomsOther}`]
    : Array.from(selectedSymptoms);

  if (loading) return (
    <div style={{ padding: "40px 64px", fontFamily: "var(--font-dm-sans)", fontSize: "14px", color: colors.inkMuted }}>
      Loading…
    </div>
  );

  if (error && !date) return (
    <div style={{ padding: "40px 64px", fontFamily: "var(--font-dm-sans)", fontSize: "14px", color: colors.badge.act }}>
      {error}
    </div>
  );

  return (
    <div style={{ padding: "40px 64px", maxWidth: "720px" }}>
      {/* Back + actions */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "32px" }}>
        <Link href="/putih/episodes" style={{
          textDecoration: "none",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          fontFamily: "var(--font-dm-sans)",
          fontSize: "13px",
          color: colors.inkMuted,
        }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7.5 2L3.5 6l4 4" />
          </svg>
          All episodes
        </Link>

        <div style={{ display: "flex", gap: "8px" }}>
          {editing ? (
            <>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  padding: "7px 16px",
                  backgroundColor: colors.ink,
                  color: colors.background,
                  border: "none",
                  borderRadius: "4px",
                  fontFamily: "var(--font-dm-sans)",
                  fontSize: "13px",
                  cursor: saving ? "not-allowed" : "pointer",
                  opacity: saving ? 0.6 : 1,
                }}
              >
                {saving ? "Saving…" : "Save changes"}
              </button>
              <button
                onClick={() => { setEditing(false); setError(""); }}
                style={{
                  padding: "7px 16px",
                  backgroundColor: "transparent",
                  color: colors.inkMuted,
                  border: `1px solid ${colors.border}`,
                  borderRadius: "4px",
                  fontFamily: "var(--font-dm-sans)",
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={() => setEditing(true)}
              style={{
                padding: "7px 16px",
                backgroundColor: "transparent",
                color: colors.ink,
                border: `1px solid ${colors.border}`,
                borderRadius: "4px",
                fontFamily: "var(--font-dm-sans)",
                fontSize: "13px",
                cursor: "pointer",
              }}
            >
              Edit
            </button>
          )}
        </div>
      </div>

      {/* Title */}
      <p style={{
        fontFamily: "var(--font-outfit)",
        fontSize: "13px",
        fontWeight: 600,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: colors.inkMuted,
        marginBottom: "4px",
      }}>
        Putih · Episodes
      </p>
      <h1 style={{
        fontFamily: "var(--font-outfit)",
        fontSize: "28px",
        fontWeight: 600,
        color: colors.ink,
        letterSpacing: "-0.01em",
        marginBottom: "32px",
      }}>
        {new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
      </h1>

      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

        {/* Date */}
        <div>
          <FieldLabel>Date</FieldLabel>
          {editing
            ? <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle()} />
            : <ReadValue>{new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</ReadValue>
          }
        </div>

        {/* Trigger */}
        <div>
          <FieldLabel>Suspected trigger</FieldLabel>
          {editing
            ? <input type="text" value={trigger} onChange={e => setTrigger(e.target.value)} placeholder="e.g. new food, stress, outdoor exposure..." style={inputStyle()} />
            : <ReadValue>{trigger || "—"}</ReadValue>
          }
        </div>

        {/* Symptoms */}
        <div>
          <FieldLabel>Symptoms</FieldLabel>
          {editing ? (
            <div style={{ border: `1px solid ${colors.border}`, borderRadius: "6px", overflow: "hidden" }}>
              {SYMPTOM_GROUPS.map((group, gi) => (
                <div key={group.label} style={{ borderBottom: gi < SYMPTOM_GROUPS.length - 1 ? `1px solid ${colors.border}` : "none" }}>
                  <div style={{ padding: "8px 16px", backgroundColor: colors.surface, fontFamily: "var(--font-outfit)", fontSize: "11px", fontWeight: 600, letterSpacing: "0.10em", textTransform: "uppercase", color: colors.inkMuted }}>
                    {group.label}
                  </div>
                  <div style={{ padding: "12px 16px", display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px" }}>
                    {group.items.map(item => {
                      const checked = selectedSymptoms.has(item);
                      return (
                        <label key={item} style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontFamily: "var(--font-dm-sans)", fontSize: "14px", color: checked ? colors.ink : colors.inkMuted, userSelect: "none" }}>
                          <input type="checkbox" checked={checked} onChange={() => toggleSymptom(item)} style={{ accentColor: colors.ink, width: "14px", height: "14px", flexShrink: 0 }} />
                          {item}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
              <div style={{ borderTop: `1px solid ${colors.border}`, padding: "12px 16px" }}>
                <label style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                  <span style={{ fontFamily: "var(--font-outfit)", fontSize: "11px", fontWeight: 600, letterSpacing: "0.10em", textTransform: "uppercase", color: colors.inkMuted, paddingTop: "10px", minWidth: "48px" }}>
                    Other
                  </span>
                  <input type="text" value={symptomsOther} onChange={e => setSymptomsOther(e.target.value)} placeholder="Describe any other symptoms..." style={inputStyle()} />
                </label>
              </div>
            </div>
          ) : (
            allSymptoms.length === 0 ? <ReadValue>—</ReadValue> : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {allSymptoms.map((s, i) => (
                  <span key={i} style={{ fontFamily: "var(--font-dm-sans)", fontSize: "13px", color: colors.ink, backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: "4px", padding: "3px 8px" }}>
                    {s}
                  </span>
                ))}
              </div>
            )
          )}
        </div>

        {/* Symptoms description */}
        <div>
          <FieldLabel>Symptoms description</FieldLabel>
          {editing
            ? <textarea value={symptomsDescription} onChange={e => setSymptomsDescription(e.target.value)} placeholder="Describe what you observed in more detail..." rows={3} style={{ ...inputStyle(), resize: "vertical" as const }} />
            : <ReadValue>{symptomsDescription || "—"}</ReadValue>
          }
        </div>

        {/* Severity */}
        <div>
          <FieldLabel>Severity</FieldLabel>
          {editing ? (
            <div style={{ display: "flex", gap: "8px" }}>
              {SEVERITIES.map(s => {
                const active = severity === s.value;
                return (
                  <button key={s.value} onClick={() => setSeverity(s.value)} style={{ padding: "8px 20px", borderRadius: "4px", border: `1px solid ${active ? colors.ink : colors.border}`, backgroundColor: active ? colors.ink : "transparent", color: active ? colors.background : colors.inkMuted, fontFamily: "var(--font-dm-sans)", fontSize: "14px", cursor: "pointer", transition: "all 150ms cubic-bezier(0.4,0,0.2,1)" }}>
                    {s.label}
                  </button>
                );
              })}
            </div>
          ) : (
            <span style={{ fontFamily: "var(--font-outfit)", fontSize: "13px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: SEVERITY_COLOR[severity] || colors.ink }}>
              {SEVERITIES.find(s => s.value === severity)?.label || severity}
            </span>
          )}
        </div>

        {/* Action taken */}
        <div>
          <FieldLabel>Action taken</FieldLabel>
          {editing
            ? <textarea value={actionTaken} onChange={e => setActionTaken(e.target.value)} placeholder="e.g. fasted for 12h, gave probiotics, vet visit..." rows={3} style={{ ...inputStyle(), resize: "vertical" as const }} />
            : <ReadValue>{actionTaken || "—"}</ReadValue>
          }
        </div>

        {/* Recovery */}
        <div>
          <FieldLabel>Recovery</FieldLabel>
          {editing
            ? <textarea value={recovery} onChange={e => setRecovery(e.target.value)} placeholder="e.g. resolved in 24h, still monitoring..." rows={3} style={{ ...inputStyle(), resize: "vertical" as const }} />
            : <ReadValue>{recovery || "—"}</ReadValue>
          }
        </div>

        {error && (
          <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "14px", color: colors.badge.act }}>
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
