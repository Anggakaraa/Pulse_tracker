"use client";
import { colors } from "@/lib/tokens";

interface Props {
  title: string;
  children: React.ReactNode;
}

export default function PrintShell({ title, children }: Props) {
  return (
    <>
      <div className="no-print" style={{
        padding: "16px 24px",
        borderBottom: `1px solid ${colors.border}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: colors.background,
      }}>
        <span style={{ fontFamily: "var(--font-outfit)", fontSize: "13px", color: colors.inkMuted }}>
          {title}
        </span>
        <button
          onClick={() => window.print()}
          style={{
            padding: "8px 20px",
            backgroundColor: colors.ink,
            color: colors.background,
            border: "none",
            borderRadius: "4px",
            fontFamily: "var(--font-outfit)",
            fontSize: "12px",
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            cursor: "pointer",
          }}
        >
          Print / Save PDF
        </button>
      </div>
      {children}
    </>
  );
}
