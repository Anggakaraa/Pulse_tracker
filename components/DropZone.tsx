"use client";

import { useState } from "react";
import { colors } from "@/lib/tokens";

interface Props {
  onFile?: (file: File) => void;
}

export default function DropZone({ onFile }: Props) {
  const [dragging, setDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => setDragging(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && onFile) onFile(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onFile) onFile(file);
  };

  return (
    <label
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        border: `1.5px dashed ${dragging ? colors.ink : colors.border}`,
        borderRadius: "6px",
        backgroundColor: dragging ? colors.surface : "transparent",
        padding: "40px 24px",
        cursor: "pointer",
        transition: `border-color var(--duration-micro) var(--ease), background-color var(--duration-micro) var(--ease)`,
      }}
    >
      {/* Upload icon */}
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={colors.inkMuted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
      </svg>

      <span style={{
        fontFamily: "var(--font-dm-sans)",
        fontSize: "12px",
        fontWeight: 400,
        color: colors.inkMuted,
        textAlign: "center",
      }}>
        Drop a PDF or image here, or click to browse
      </span>

      <input type="file" accept=".pdf,image/*" onChange={handleChange} style={{ display: "none" }} />
    </label>
  );
}
