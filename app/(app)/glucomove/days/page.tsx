import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase";
import { getAllDatesWithActivity } from "@/lib/glucomove-queries";
import { colors } from "@/lib/tokens";
export const dynamic = "force-dynamic";

export default async function GlucomoveDaysPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const dates = await getAllDatesWithActivity(user.id);

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

      {dates.length === 0 ? (
        <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "14px", color: colors.inkMuted }}>
          No activity recorded yet.
        </p>
      ) : (
        <div style={{ border: `1px solid ${colors.border}`, borderRadius: "6px", overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "160px 130px 90px 80px 32px", backgroundColor: colors.surface, borderBottom: `1px solid ${colors.border}`, padding: "10px 16px", gap: "12px" }}>
            {["Date", "Avg glucose", "TWL", "% CV", ""].map(h => (
              <span key={h} style={{ fontFamily: "var(--font-outfit)", fontSize: "11px", fontWeight: 600, letterSpacing: "0.10em", textTransform: "uppercase", color: colors.inkMuted }}>
                {h}
              </span>
            ))}
          </div>
          {dates.map(({ date, dayRecord, avgGlucose, twlPct, cv }, i) => {
            const href = dayRecord
              ? `/glucomove/days/${dayRecord.id}`
              : `/glucomove/date/${date}`;

            const avgColor = avgGlucose === null
              ? colors.inkMuted
              : avgGlucose <= 5.8 ? "#4A8C62"
              : avgGlucose <= 7.0 ? "#A8882A"
              : "#A03828";

            return (
              <Link
                key={date}
                href={href}
                style={{
                  textDecoration: "none", color: "inherit",
                  display: "grid", gridTemplateColumns: "160px 130px 90px 80px 32px",
                  gap: "12px",
                  padding: "14px 16px",
                  borderBottom: i < dates.length - 1 ? `1px solid ${colors.border}` : "none",
                  alignItems: "center",
                }}
              >
                <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "13px", color: colors.ink }}>
                  {new Date(date + "T12:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
                  {dayRecord?.potential_sensor_issue && <span style={{ color: colors.badge.stable, marginLeft: "6px" }}>⚠</span>}
                </span>
                <span style={{ fontFamily: "var(--font-outfit)", fontSize: "14px", fontWeight: 600, color: avgColor }}>
                  {avgGlucose !== null ? `${avgGlucose} mmol/L` : <span style={{ fontWeight: 400, fontSize: "13px", color: colors.inkMuted }}>—</span>}
                </span>
                <span style={{ fontFamily: "var(--font-outfit)", fontSize: "14px", fontWeight: 600, color: twlPct !== null ? colors.ink : colors.inkMuted }}>
                  {twlPct !== null ? `${twlPct}%` : <span style={{ fontWeight: 400, fontSize: "13px" }}>—</span>}
                </span>
                <span style={{ fontFamily: "var(--font-outfit)", fontSize: "14px", fontWeight: 600, color: cv === null ? colors.inkMuted : cv < 26 ? "#4A8C62" : cv < 36 ? "#A8882A" : "#A03828" }}>
                  {cv !== null ? `${cv}%` : <span style={{ fontWeight: 400, fontSize: "13px" }}>—</span>}
                </span>
                <span style={{ color: colors.inkMuted, display: "flex", justifyContent: "flex-end" }}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 3l4 4-4 4" />
                  </svg>
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
