"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { colors } from "@/lib/tokens";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

const SYMPTOM_GROUPS = [
  {
    label: "General",
    items: [
      "Lethargy",
      "Reduced appetite",
      "Refused food",
      "Drinking more",
      "Drinking less",
      "Fever (if measured)",
    ],
  },
  {
    label: "Gastrointestinal",
    items: [
      "Grass eating",
      "Nausea / lip licking",
      "Vomiting",
      "Diarrhea",
      "Soft stool",
      "Mucus in stool",
      "Blood in stool",
      "Constipation",
      "Abdominal discomfort",
    ],
  },
  {
    label: "Musculoskeletal",
    items: [
      "Arthritis flare",
      "Limping",
      "Difficulty standing",
      "Reluctant to jump",
      "Reduced activity",
    ],
  },
  {
    label: "Skin / Coat",
    items: [
      "Increased scratching",
      "Increased nibbling",
      "Increased licking",
      "Hair thinning",
      "Bald patch",
      "Red skin",
      "Hot spot",
      "Ear itch",
    ],
  },
  {
    label: "Respiratory",
    items: ["Sneezing", "Coughing", "Nasal discharge"],
  },
  {
    label: "Urinary",
    items: ["Frequent urination", "Straining", "Blood in urine"],
  },
  {
    label: "Behaviour",
    items: ["Restless", "Hiding", "Vocalizing", "Less social", "Sleeping more"],
  },
];

const SEVERITIES = [
  { value: "mild", label: "Mild" },
  { value: "moderate", label: "Moderate" },
  { value: "severe", label: "Severe" },
];

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

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label style={{
      fontFamily: "var(--font-outfit)",
      fontSize: "13px",
      fontWeight: 600,
      letterSpacing: "0.08em",
      textTransform: "uppercase" as const,
      color: colors.inkMuted,
      display: "block",
      marginBottom: "8px",
    }}>
      {children}
    </label>
  );
}

export default function NewEpisodePage() {
  const router = useRouter();
  const [date, setDate] = useState("");
  const [trigger, setTrigger] = useState("");
  const [selectedSymptoms, setSelectedSymptoms] = useState<Set<string>>(new Set());
  const [symptomsOther, setSymptomsOther] = useState("");
  const [severity, setSeverity] = useState("");
  const [actionTaken, setActionTaken] = useState("");
  const [recovery, setRecovery] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function toggleSymptom(s: string) {
    setSelectedSymptoms(prev => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  }

  async function handleSave() {
    if (!date || !severity) {
      setError("Date and severity are required.");
      return;
    }
    setSaving(true);
    setError("");
    const supabase = createSupabaseBrowserClient();
    const { error: err } = await supabase.from("putih_episodes").insert({
      date,
      suspected_trigger: trigger || null,
      symptoms: Array.from(selectedSymptoms),
      symptoms_other: symptomsOther || null,
      severity,
      action_taken: actionTaken || null,
      recovery: recovery || null,
    });
    setSaving(false);
    if (err) { setError(err.message); return; }
    router.push("/putih/episodes");
  }

  return (
    <div style={{ padding: "40px 64px", maxWidth: "720px" }}>
      {/* Header */}
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
        Log a new episode
      </h1>

      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

        {/* Date */}
        <div>
          <Label>Date</Label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle()} />
        </div>

        {/* Suspected Trigger */}
        <div>
          <Label>Suspected trigger</Label>
          <input
            type="text"
            placeholder="e.g. new food, stress, outdoor exposure..."
            value={trigger}
            onChange={e => setTrigger(e.target.value)}
            style={inputStyle()}
          />
        </div>

        {/* Symptoms */}
        <div>
          <Label>Symptoms</Label>
          <div style={{
            border: `1px solid ${colors.border}`,
            borderRadius: "6px",
            overflow: "hidden",
          }}>
            {SYMPTOM_GROUPS.map((group, gi) => (
              <div key={group.label} style={{
                borderBottom: gi < SYMPTOM_GROUPS.length - 1 ? `1px solid ${colors.border}` : "none",
              }}>
                <div style={{
                  padding: "8px 16px",
                  backgroundColor: colors.surface,
                  fontFamily: "var(--font-outfit)",
                  fontSize: "11px",
                  fontWeight: 600,
                  letterSpacing: "0.10em",
                  textTransform: "uppercase",
                  color: colors.inkMuted,
                }}>
                  {group.label}
                </div>
                <div style={{
                  padding: "12px 16px",
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
                  gap: "8px",
                }}>
                  {group.items.map(item => {
                    const checked = selectedSymptoms.has(item);
                    return (
                      <label key={item} style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        cursor: "pointer",
                        fontFamily: "var(--font-dm-sans)",
                        fontSize: "14px",
                        color: checked ? colors.ink : colors.inkMuted,
                        userSelect: "none",
                      }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleSymptom(item)}
                          style={{ accentColor: colors.ink, width: "14px", height: "14px", flexShrink: 0 }}
                        />
                        {item}
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Other */}
            <div style={{ borderTop: `1px solid ${colors.border}`, padding: "12px 16px" }}>
              <label style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "8px",
                fontFamily: "var(--font-dm-sans)",
                fontSize: "14px",
                color: colors.inkMuted,
              }}>
                <span style={{
                  fontFamily: "var(--font-outfit)",
                  fontSize: "11px",
                  fontWeight: 600,
                  letterSpacing: "0.10em",
                  textTransform: "uppercase",
                  paddingTop: "2px",
                  minWidth: "48px",
                }}>
                  Other
                </span>
                <input
                  type="text"
                  placeholder="Describe any other symptoms..."
                  value={symptomsOther}
                  onChange={e => setSymptomsOther(e.target.value)}
                  style={{ ...inputStyle(), marginTop: "0" }}
                />
              </label>
            </div>
          </div>
        </div>

        {/* Severity */}
        <div>
          <Label>Severity</Label>
          <div style={{ display: "flex", gap: "8px" }}>
            {SEVERITIES.map(s => {
              const active = severity === s.value;
              return (
                <button
                  key={s.value}
                  onClick={() => setSeverity(s.value)}
                  style={{
                    padding: "8px 20px",
                    borderRadius: "4px",
                    border: `1px solid ${active ? colors.ink : colors.border}`,
                    backgroundColor: active ? colors.ink : "transparent",
                    color: active ? colors.background : colors.inkMuted,
                    fontFamily: "var(--font-dm-sans)",
                    fontSize: "14px",
                    cursor: "pointer",
                    transition: "all 150ms cubic-bezier(0.4,0,0.2,1)",
                  }}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Taken */}
        <div>
          <Label>Action taken</Label>
          <textarea
            placeholder="e.g. fasted for 12h, gave probiotics, vet visit..."
            value={actionTaken}
            onChange={e => setActionTaken(e.target.value)}
            rows={3}
            style={{ ...inputStyle(), resize: "vertical" as const }}
          />
        </div>

        {/* Recovery */}
        <div>
          <Label>Recovery</Label>
          <textarea
            placeholder="e.g. resolved in 24h, still monitoring..."
            value={recovery}
            onChange={e => setRecovery(e.target.value)}
            rows={3}
            style={{ ...inputStyle(), resize: "vertical" as const }}
          />
        </div>

        {error && (
          <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "14px", color: colors.badge.act }}>
            {error}
          </p>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: "8px", paddingTop: "8px" }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: "10px 24px",
              backgroundColor: colors.ink,
              color: colors.background,
              border: "none",
              borderRadius: "4px",
              fontFamily: "var(--font-dm-sans)",
              fontSize: "14px",
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? "Saving…" : "Save episode"}
          </button>
          <button
            onClick={() => router.push("/putih/episodes")}
            style={{
              padding: "10px 24px",
              backgroundColor: "transparent",
              color: colors.inkMuted,
              border: `1px solid ${colors.border}`,
              borderRadius: "4px",
              fontFamily: "var(--font-dm-sans)",
              fontSize: "14px",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
