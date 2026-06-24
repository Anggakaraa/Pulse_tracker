"use client";

import { useState, useRef } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { colors } from "@/lib/tokens";

interface Props {
  experimentId: string;
  initialNotes: string | null;
}

export default function ExperimentNotes({ experimentId, initialNotes }: Props) {
  const [value, setValue] = useState(initialNotes ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    setStatus("idle");
  };

  const handleBlur = async () => {
    if (value === (initialNotes ?? "")) return; // no change
    const supabase = createSupabaseBrowserClient();
    setStatus("saving");
    await supabase
      .from("experiments")
      .update({ notes: value || null })
      .eq("id", experimentId);
    setStatus("saved");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setStatus("idle"), 2000);
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
        <p style={{
          fontFamily: "var(--font-outfit)",
          fontWeight: 600,
          fontSize: "11px",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: colors.inkMuted,
          margin: 0,
        }}>
          Protocol notes
        </p>
        {status === "saving" && (
          <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "12px", fontWeight: 300, color: colors.inkMuted }}>
            Saving…
          </span>
        )}
        {status === "saved" && (
          <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "12px", fontWeight: 300, color: colors.badge.optimal }}>
            Saved ✓
          </span>
        )}
      </div>
      <textarea
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder="Record what you changed and when — supplements added, foods removed, protocol adjustments, observations…"
        rows={6}
        style={{
          width: "100%",
          boxSizing: "border-box",
          fontFamily: "var(--font-dm-sans)",
          fontSize: "14px",
          fontWeight: 300,
          lineHeight: 1.7,
          color: colors.ink,
          backgroundColor: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: "6px",
          padding: "16px 20px",
          resize: "vertical",
          outline: "none",
          transition: `border-color var(--duration-micro) var(--ease)`,
        }}
        onFocus={e => { e.currentTarget.style.borderColor = colors.inkMuted; }}
        onBlurCapture={e => { e.currentTarget.style.borderColor = colors.border; }}
      />
      <p style={{
        fontFamily: "var(--font-dm-sans)",
        fontSize: "12px",
        fontWeight: 300,
        color: colors.inkMuted,
        margin: "6px 0 0",
        opacity: 0.7,
      }}>
        Auto-saves when you click away.
      </p>
    </div>
  );
}
