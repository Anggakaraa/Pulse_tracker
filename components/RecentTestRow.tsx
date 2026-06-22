"use client";

import Link from "next/link";
import { colors } from "@/lib/tokens";
import { useState } from "react";

interface Props {
  id: string;
  date: string;
  labName: string;
  markerCount: number;
  hasBorder: boolean;
}

export default function RecentTestRow({ id, date, labName, markerCount, hasBorder }: Props) {
  const [hovered, setHovered] = useState(false);

  return (
    <Link href={`/tests/${id}`} style={{ textDecoration: "none" }}>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "8px 0",
          borderBottom: hasBorder ? `1px solid ${colors.border}` : "none",
          opacity: hovered ? 0.7 : 1,
          transition: `opacity var(--duration-micro) var(--ease)`,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          <span style={{ fontFamily: "var(--font-outfit)", fontSize: "13px", fontWeight: 600, color: colors.ink }}>
            {date}
          </span>
          <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "12px", color: colors.inkMuted }}>
            {labName} · {markerCount} markers
          </span>
        </div>
        <span style={{ fontSize: "10px", color: colors.inkMuted }}>›</span>
      </div>
    </Link>
  );
}
