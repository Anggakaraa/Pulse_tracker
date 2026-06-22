"use client";

import { colors } from "@/lib/tokens";

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      style={{
        fontFamily: "var(--font-outfit)",
        fontWeight: 600,
        fontSize: "13px",
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: colors.inkMuted,
        background: "none",
        border: `1px solid ${colors.border}`,
        borderRadius: "4px",
        padding: "6px 14px",
        cursor: "pointer",
        transition: `box-shadow var(--duration-micro) var(--ease), border-color var(--duration-micro) var(--ease)`,
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLButtonElement).style.boxShadow = "0px 2px 8px rgba(42,37,32,0.07)";
        (e.currentTarget as HTMLButtonElement).style.borderColor = "transparent";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
        (e.currentTarget as HTMLButtonElement).style.borderColor = colors.border;
      }}
    >
      Print
    </button>
  );
}
