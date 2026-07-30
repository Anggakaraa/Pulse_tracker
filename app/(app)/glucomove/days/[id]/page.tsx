import Link from "next/link";
import { getDayWithMealsAndMetrics } from "@/lib/glucomove-queries";
import { colors } from "@/lib/tokens";
import {
  mmol, mmolDiff,
  MEAL_TYPE_LABEL, RESPONSE_BAND_COLOR, RESPONSE_BAND_LABEL,
  PRIMARY_CARB_LABEL, CARB_PROMINENCE_LABEL,
} from "@/lib/glucomove-calcs";
import DayRecordEditor from "./DayRecordEditor";
import DayActions from "./DayActions";

export default async function DayDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getDayWithMealsAndMetrics(id);
  if (!data) return <div style={{ padding: "40px 64px", color: colors.inkMuted, fontFamily: "var(--font-dm-sans)", fontSize: "14px" }}>Day record not found.</div>;

  const { day, meals } = data;

  // Derived day metrics
  const validSpikes = meals.map(m => m.metrics.spikeMmol).filter((v): v is number => v !== null);
  const avgSpike = validSpikes.length ? validSpikes.reduce((a, b) => a + b, 0) / validSpikes.length : null;
  const highestSpike = validSpikes.length ? Math.max(...validSpikes) : null;
  const lowCount = meals.filter(m => m.metrics.responseBand === "low").length;
  const modCount = meals.filter(m => m.metrics.responseBand === "moderate").length;
  const highCount = meals.filter(m => m.metrics.responseBand === "high").length;
  const hasAlcohol = meals.some(m => m.meal.with_alcohol);

  return (
    <div style={{ padding: "40px 64px", maxWidth: "800px" }}>
      <div style={{ marginBottom: "32px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
          <Link href="/glucomove" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "6px", fontFamily: "var(--font-dm-sans)", fontSize: "13px", color: colors.inkMuted }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7.5 2L3.5 6l4 4" /></svg>
            Glucomove
          </Link>
          <DayActions dayId={day.id} />
        </div>
        <p style={{ fontFamily: "var(--font-outfit)", fontSize: "13px", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: colors.inkMuted, marginBottom: "4px" }}>
          Day Record
        </p>
        <h1 style={{ fontFamily: "var(--font-outfit)", fontSize: "28px", fontWeight: 600, color: colors.ink, letterSpacing: "-0.01em" }}>
          {new Date(day.date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </h1>
      </div>

      {/* Glucose metrics */}
      <div style={{ border: `1px solid ${colors.border}`, borderRadius: "6px", padding: "20px 24px", marginBottom: "24px" }}>
        <div style={{ display: "flex", gap: "40px", flexWrap: "wrap" }}>
          <Stat label="Waking glucose" value={mmol(day.waking_glucose_mmol)} />
          {day.overnight_avg_mmol && <Stat label="Overnight avg" value={mmol(day.overnight_avg_mmol)} />}
          {day.daily_avg_mmol && <Stat label="Daily avg" value={mmol(day.daily_avg_mmol)} />}
        </div>
        {day.potential_sensor_issue && (
          <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "12px", color: colors.badge.stable, marginTop: "12px" }}>
            ⚠ Potential sensor issue flagged — excluded from analysis by default.
          </p>
        )}
        {day.notes && (
          <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "13px", color: colors.inkMuted, marginTop: "12px", borderTop: `1px solid ${colors.border}`, paddingTop: "12px" }}>
            {day.notes}
          </p>
        )}
      </div>

      {/* Edit day record form */}
      <DayRecordEditor day={day} />

      {/* Derived day summary */}
      {meals.length > 0 && validSpikes.length > 0 && (
        <div style={{ border: `1px solid ${colors.border}`, borderRadius: "6px", padding: "20px 24px", marginBottom: "24px", backgroundColor: colors.surface }}>
          <p style={{ fontFamily: "var(--font-outfit)", fontSize: "11px", fontWeight: 600, letterSpacing: "0.10em", textTransform: "uppercase", color: colors.inkMuted, marginBottom: "16px" }}>
            Day summary
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
            <Stat label="Meals recorded" value={String(meals.length)} />
            <Stat label="Avg spike" value={avgSpike !== null ? mmolDiff(Math.round(avgSpike * 10) / 10) : "—"} />
            <Stat label="Highest spike" value={highestSpike !== null ? mmolDiff(highestSpike) : "—"} />
            <Stat label="Low movement" value={String(lowCount)} />
            <Stat label="Moderate movement" value={String(modCount)} />
            <Stat label="High movement" value={String(highCount)} />
          </div>
          {hasAlcohol && <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "12px", color: colors.inkMuted, marginTop: "12px" }}>Alcohol present in one or more meals.</p>}
        </div>
      )}

      {/* Meals list */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
        <p style={{ fontFamily: "var(--font-outfit)", fontSize: "13px", fontWeight: 600, letterSpacing: "0.10em", textTransform: "uppercase", color: colors.inkMuted }}>
          Meals
        </p>
        <Link href={`/glucomove/meals/new?date=${day.date}`} style={{ textDecoration: "none" }}>
          <button style={{ padding: "6px 14px", backgroundColor: colors.ink, color: colors.background, border: "none", borderRadius: "4px", fontFamily: "var(--font-dm-sans)", fontSize: "13px", cursor: "pointer" }}>
            + Add meal
          </button>
        </Link>
      </div>

      {meals.length === 0 ? (
        <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "14px", color: colors.inkMuted }}>No meals logged for this day.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {meals.map(({ meal, metrics }) => (
            <Link key={meal.id} href={`/glucomove/meals/${meal.id}`} style={{ textDecoration: "none", color: "inherit" }}>
              <div style={{ border: `1px solid ${colors.border}`, borderRadius: "6px", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.background }}>
                <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                  <span style={{ fontFamily: "var(--font-outfit)", fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: colors.inkMuted, minWidth: "72px" }}>
                    {new Date(meal.meal_start_time).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <div>
                    <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "14px", color: colors.ink }}>{meal.name}</p>
                    <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "12px", color: colors.inkMuted, marginTop: "2px" }}>
                      {MEAL_TYPE_LABEL[meal.meal_type]} · {PRIMARY_CARB_LABEL[meal.primary_carb_source]} · {CARB_PROMINENCE_LABEL[meal.carb_prominence]}
                    </p>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  {metrics.spikeMmol !== null ? (
                    <div style={{ textAlign: "right" }}>
                      <p style={{ fontFamily: "var(--font-outfit)", fontSize: "16px", fontWeight: 600, color: metrics.responseBand ? RESPONSE_BAND_COLOR[metrics.responseBand] : colors.ink }}>
                        {mmolDiff(metrics.spikeMmol)}
                      </p>
                      <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "11px", color: colors.inkMuted, marginTop: "2px" }}>
                        {metrics.responseBand ? RESPONSE_BAND_LABEL[metrics.responseBand] : ""}
                      </p>
                    </div>
                  ) : (
                    <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "12px", color: colors.inkMuted }}>
                      {metrics.baselineGlucoseMmol !== null ? "No peak yet" : "No readings"}
                    </p>
                  )}
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke={colors.inkMuted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 3l4 4-4 4" />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p style={{ fontFamily: "var(--font-outfit)", fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: colors.inkMuted, marginBottom: "4px" }}>
        {label}
      </p>
      <p style={{ fontFamily: "var(--font-outfit)", fontSize: "16px", fontWeight: 600, color: colors.ink }}>
        {value}
      </p>
    </div>
  );
}
