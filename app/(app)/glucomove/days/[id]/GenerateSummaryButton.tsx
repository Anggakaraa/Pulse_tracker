"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { colors } from "@/lib/tokens";

export default function GenerateSummaryButton({ dayRecordId }: { dayRecordId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleGenerate() {
    setLoading(true);
    setError("");
    const res = await fetch("/api/glucomove/generate-day-summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dayRecordId }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to generate summary.");
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <button
        onClick={handleGenerate}
        disabled={loading}
        style={{
          padding: "7px 14px",
          backgroundColor: "transparent",
          color: loading ? colors.inkMuted : colors.inkMuted,
          border: `1px solid ${colors.border}`,
          borderRadius: "4px",
          fontFamily: "var(--font-dm-sans)",
          fontSize: "13px",
          cursor: loading ? "not-allowed" : "pointer",
          opacity: loading ? 0.6 : 1,
        }}
      >
        {loading ? "Generating…" : "Generate day summary"}
      </button>
      {error && (
        <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "12px", color: colors.badge.act, marginTop: "6px" }}>
          {error}
        </p>
      )}
    </div>
  );
}
