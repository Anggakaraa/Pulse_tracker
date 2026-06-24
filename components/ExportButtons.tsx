"use client";
import { colors } from "@/lib/tokens";

interface Props {
  printHref: string;
  onDownloadMd: () => void;
}

const btnBase: React.CSSProperties = {
  padding: "8px 16px",
  borderRadius: "4px",
  fontFamily: "var(--font-outfit)",
  fontSize: "12px",
  fontWeight: 600,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  cursor: "pointer",
  textDecoration: "none",
  display: "inline-block",
};

export default function ExportButtons({ printHref, onDownloadMd }: Props) {
  return (
    <div style={{ display: "flex", gap: "8px" }}>
      <a
        href={printHref}
        target="_blank"
        rel="noopener noreferrer"
        style={{ ...btnBase, backgroundColor: colors.ink, color: colors.background, border: "none" }}
      >
        Print / PDF
      </a>
      <button
        onClick={onDownloadMd}
        style={{ ...btnBase, backgroundColor: "transparent", color: colors.ink, border: `1px solid ${colors.border}` }}
      >
        Download .md
      </button>
    </div>
  );
}
