import Link from "next/link";
import { getAllDayRecords, getDayWithMealsAndMetrics } from "@/lib/glucomove-queries";
import { colors } from "@/lib/tokens";
import { mmol, RESPONSE_BAND_COLOR } from "@/lib/glucomove-calcs";

export default async function GlucomoveDaysPage() {
  const records = await getAllDayRecords();

  return (
    <div style={{ padding: "40px 64px", maxWidth: "800px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "32px" }}>
        <div>
          <p style={{ fontFamily: "var(--font-outfit)", fontSize: "13px", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: colors.inkMuted, marginBottom: "4px" }}>
            Glucomove
          </p>
          <h1 style={{ fontFamily: "var(--font-outfit)", fontSize: "28px", fontWeight: 600, color: colors.ink, letterSpacing: "-0.01em" }}>
            All days
          </h1>
        </div>
        <Link href="/glucomove/days/new" style={{ textDecoration: "none" }}>
          <button style={{ padding: "8px 16px", backgroundColor: colors.ink, color: colors.background, border: "none", borderRadius: "4px", fontFamily: "var(--font-dm-sans)", fontSize: "14px", cursor: "pointer" }}>
            + New day record
          </button>
        </Link>
      </div>

      {records.length === 0 ? (
        <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "14px", color: colors.inkMuted }}>
          No day records yet.
        </p>
      ) : (
        <div style={{ border: `1px solid ${colors.border}`, borderRadius: "6px", overflow: "hidden" }}>
          {/* Header */}
          <div style={{ display: "grid", gridTemplateColumns: "120px 120px 1fr 80px", backgroundColor: colors.surface, borderBottom: `1px solid ${colors.border}`, padding: "10px 16px" }}>
            {["Date", "Waking", "Meals", ""].map(h => (
              <span key={h} style={{ fontFamily: "var(--font-outfit)", fontSize: "11px", fontWeight: 600, letterSpacing: "0.10em", textTransform: "uppercase", color: colors.inkMuted }}>
                {h}
              </span>
            ))}
          </div>
          {records.map((rec, i) => (
            <Link key={rec.id} href={`/glucomove/days/${rec.id}`} style={{ textDecoration: "none", color: "inherit", display: "grid", gridTemplateColumns: "120px 120px 1fr 80px", padding: "14px 16px", borderBottom: i < records.length - 1 ? `1px solid ${colors.border}` : "none", alignItems: "center" }}>
              <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "13px", color: colors.ink }}>
                {new Date(rec.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
              </span>
              <span style={{ fontFamily: "var(--font-outfit)", fontSize: "14px", fontWeight: 600, color: colors.ink }}>
                {mmol(rec.waking_glucose_mmol)}
              </span>
              <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "13px", color: colors.inkMuted }}>
                {rec.potential_sensor_issue && <span style={{ color: colors.badge.stable, marginRight: "8px" }}>⚠ Sensor flag</span>}
              </span>
              <span style={{ color: colors.inkMuted, display: "flex", justifyContent: "flex-end" }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 3l4 4-4 4" />
                </svg>
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
