"use client";

import { useState } from "react";
import { colors } from "@/lib/tokens";

interface Props {
  value?: string;
  onSave?: (text: string) => void;
}

export default function Annotation({ value, onSave }: Props) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value ?? "");

  const handleBlur = () => {
    setEditing(false);
    if (onSave) onSave(text);
  };

  if (editing) {
    return (
      <textarea
        autoFocus
        value={text}
        onChange={e => setText(e.target.value)}
        onBlur={handleBlur}
        placeholder="Add a note for context…"
        style={{
          width: "100%",
          fontFamily: "var(--font-dm-sans)",
          fontSize: "16px",
          fontWeight: 400,
          color: colors.ink,
          lineHeight: 1.65,
          backgroundColor: colors.background,
          border: `1px solid ${colors.border}`,
          borderRadius: "4px",
          padding: "8px 10px",
          resize: "vertical",
          minHeight: "72px",
          outline: "none",
          boxSizing: "border-box",
        }}
      />
    );
  }

  return (
    <p
      onClick={() => setEditing(true)}
      title="Click to edit"
      style={{
        fontFamily: "var(--font-dm-sans)",
        fontSize: text ? "16px" : "14px",
        fontWeight: text ? 400 : 300,
        fontStyle: text ? "normal" : "italic",
        color: text ? "#6A6460" : colors.inkMuted,
        lineHeight: 1.65,
        margin: 0,
        cursor: "text",
      }}
    >
      {text || "No annotations yet — add a note for context."}
    </p>
  );
}
