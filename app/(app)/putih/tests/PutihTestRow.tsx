"use client";
import Link from "next/link";
import { colors } from "@/lib/tokens";

interface Props {
  id: string;
  date: string;
  labName: string | null;
  readingCount: number;
  isLast: boolean;
}

export default function PutihTestRow({ id, date, labName, readingCount, isLast }: Props) {
  return (
    <Link href={`/putih/tests/${id}`} style={{ textDecoration: "none" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "16px 20px",
          borderBottom: isLast ? "none" : `1px solid ${colors.border}`,
          cursor: "pointer",
          backgroundColor: "transparent",
          transition: "background-color 150ms",
        }}
        onMouseEnter={e => (e.currentTarget.style.backgroundColor = colors.surface)}
        onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
      >
        <div style={{ flex: 1 }}>
          <p style={{ fontFamily: "var(--font-outfit)", fontSize: "15px", fontWeight: 400, color: colors.ink, margin: "0 0 2px 0" }}>
            {date}
          </p>
          {labName && (
            <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "13px", color: colors.inkMuted, margin: 0 }}>
              {labName}
            </p>
          )}
        </div>
        <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "13px", color: colors.inkMuted }}>
          {readingCount} marker{readingCount !== 1 ? "s" : ""}
        </span>
      </div>
    </Link>
  );
}
