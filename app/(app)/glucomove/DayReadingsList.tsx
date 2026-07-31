"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { colors } from "@/lib/tokens";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

interface Reading {
  id: string;
  timestamp: string;
  glucose_mmol: number;
  is_baseline: boolean;
  meal_id: string | null;
}

interface Meal {
  id: string;
  name: string;
}

export default function DayReadingsList({
  readings,
  meals,
}: {
  readings: Reading[];
  meals: Meal[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  if (readings.length === 0) return null;

  const mealNameById = Object.fromEntries(meals.map(m => [m.id, m.name]));

  const sorted = [...readings].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  async function deleteReading(id: string) {
    setDeleting(id);
    const supabase = createSupabaseBrowserClient();
    await supabase.from("glucomove_readings").delete().eq("id", id);
    setDeleting(null);
    router.refresh();
  }

  return (
    <div style={{ marginTop: "32px" }}>
      <button
        onClick={() => setOpen(x => !x)}
        style={{
          display: "flex", alignItems: "center", gap: "6px",
          background: "none", border: "none", cursor: "pointer", padding: 0,
          fontFamily: "var(--font-outfit)", fontSize: "11px", fontWeight: 600,
          letterSpacing: "0.10em", textTransform: "uppercase", color: colors.inkMuted,
          marginBottom: open ? "12px" : 0,
        }}
      >
        <svg
          width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor"
          strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: open ? "rotate(90deg)" : "none", transition: "transform 150ms" }}
        >
          <path d="M3 2l4 3-4 3" />
        </svg>
        All readings ({readings.length})
      </button>

      {open && (
        <div style={{ border: `1px solid ${colors.border}`, borderRadius: "6px", overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "100px 110px 1fr 32px", padding: "8px 16px", backgroundColor: colors.surface, borderBottom: `1px solid ${colors.border}` }}>
            {["Time", "Glucose", "Context", ""].map((h, i) => (
              <span key={i} style={{ fontFamily: "var(--font-outfit)", fontSize: "10px", fontWeight: 600, letterSpacing: "0.10em", textTransform: "uppercase", color: colors.inkMuted }}>
                {h}
              </span>
            ))}
          </div>
          {sorted.map((r, i) => (
            <div
              key={r.id}
              style={{
                display: "grid", gridTemplateColumns: "100px 110px 1fr 32px",
                padding: "10px 16px", alignItems: "center",
                borderBottom: i < sorted.length - 1 ? `1px solid ${colors.border}` : "none",
                backgroundColor: colors.background,
              }}
            >
              <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "13px", color: colors.inkMuted }}>
                {new Date(r.timestamp).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" })}
              </span>
              <span style={{ fontFamily: "var(--font-outfit)", fontSize: "14px", fontWeight: 600, color: colors.ink }}>
                {r.glucose_mmol.toFixed(1)}{" "}
                <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "11px", fontWeight: 400, color: colors.inkMuted }}>mmol/L</span>
              </span>
              <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "12px", color: colors.inkMuted }}>
                {r.is_baseline && (
                  <span style={{ color: colors.badge.optimal, fontFamily: "var(--font-outfit)", fontWeight: 600, fontSize: "10px", letterSpacing: "0.08em", textTransform: "uppercase", marginRight: "6px" }}>Baseline</span>
                )}
                {r.meal_id ? mealNameById[r.meal_id] ?? "Meal" : "Free-floating"}
              </span>
              <button
                onClick={() => deleteReading(r.id)}
                disabled={deleting === r.id}
                title="Delete reading"
                style={{ background: "none", border: "none", cursor: deleting === r.id ? "not-allowed" : "pointer", color: colors.inkMuted, padding: "4px", display: "flex", alignItems: "center", justifyContent: "center", opacity: deleting === r.id ? 0.4 : 1 }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="2" y1="2" x2="10" y2="10" /><line x1="10" y1="2" x2="2" y2="10" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
