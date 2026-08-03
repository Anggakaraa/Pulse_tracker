import { Fragment } from "react";
import Link from "next/link";
import { getDayWithMealsAndMetrics, getEventsForDate, getReadingsForDate } from "@/lib/glucomove-queries";
import { colors, glucomoveEventColors } from "@/lib/tokens";
import {
  mmol, mmolDiff,
  MEAL_TYPE_LABEL, RESPONSE_BAND_COLOR, RESPONSE_BAND_LABEL,
  PRIMARY_CARB_LABEL, CARB_PROMINENCE_LABEL,
  isInSensorErrorPeriod, type SensorErrorPeriod,
} from "@/lib/glucomove-calcs";
import DayRecordEditor from "./DayRecordEditor";
import DayActions from "./DayActions";
import DayGlucoseChart from "../../DayGlucoseChart";
import DayReadingsList from "../../DayReadingsList";
import Button from "@/components/Button";

const EVENT_TYPE_LABEL: Record<string, string> = {
  stress: "Stress", exercise: "Exercise", alcohol: "Alcohol",
  illness: "Illness", sleep: "Sleep", travel: "Travel",
  fasting: "Fasting", medication: "Medication", recovery: "Recovery", other: "Other",
};

export default async function DayDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getDayWithMealsAndMetrics(id);
  if (!data) return <div style={{ padding: "40px 64px", color: colors.inkMuted, fontFamily: "var(--font-dm-sans)", fontSize: "14px" }}>Day record not found.</div>;

  const { day, meals } = data;

  const [events, readings] = await Promise.all([
    getEventsForDate(day.date, day.user_id),
    getReadingsForDate(day.date, day.user_id),
  ]);

  const errorPeriods = (Array.isArray(day.sensor_error_periods) ? day.sensor_error_periods : []) as SensorErrorPeriod[];
  const cleanReadings = readings.filter((r: { timestamp: string }) => !isInSensorErrorPeriod(r.timestamp, errorPeriods));

  const twlPct = cleanReadings.length >= 6
    ? Math.round(cleanReadings.filter((r: { glucose_mmol: number }) => r.glucose_mmol <= 7.8).length / cleanReadings.length * 100)
    : null;

  const avg = (vals: number[]) => vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 10) / 10 : null;

  const dailyAvg = avg(cleanReadings.map((r: { glucose_mmol: number }) => r.glucose_mmol));

  // Overnight = readings between 00:00–06:00 WIB
  const overnightReadings = cleanReadings.filter((r: { timestamp: string }) => {
    const wibHour = (new Date(r.timestamp).getUTCHours() + 7) % 24;
    return wibHour < 6;
  });
  const overnightAvg = avg(overnightReadings.map((r: { glucose_mmol: number }) => r.glucose_mmol));

  type TimelineItem =
    | { kind: "meal"; data: (typeof meals)[number] }
    | { kind: "event"; data: (typeof events)[number] };

  const timeline: TimelineItem[] = [
    ...meals.map(m => ({ kind: "meal" as const, data: m })),
    ...events.map(e => ({ kind: "event" as const, data: e })),
  ].sort((a, b) => {
    const ta = a.kind === "meal"
      ? new Date(a.data.meal.meal_start_time).getTime()
      : new Date(a.data.start_time).getTime();
    const tb = b.kind === "meal"
      ? new Date(b.data.meal.meal_start_time).getTime()
      : new Date(b.data.start_time).getTime();
    return ta - tb;
  });

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
          {day.waking_glucose_mmol != null
            ? <Stat label="Waking glucose" value={mmol(day.waking_glucose_mmol)} />
            : <Stat label="Waking glucose" value="—" muted />
          }
          {overnightAvg !== null && <Stat label="Overnight avg" value={mmol(overnightAvg)} />}
          {dailyAvg !== null && <Stat label="Daily avg" value={mmol(dailyAvg)} />}
          {twlPct !== null && <Stat label="TWL" value={`${twlPct}%`} />}
        </div>
        {(day.bad_sleep || day.alcohol_previous_night || day.potential_sensor_issue) && (
          <div style={{ marginTop: "12px", display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {day.bad_sleep && (
              <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "12px", color: colors.badge.stable }}>Poor sleep</span>
            )}
            {day.alcohol_previous_night && (
              <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "12px", color: colors.badge.stable }}>Alcohol previous night</span>
            )}
            {day.potential_sensor_issue && (
              <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "12px", color: colors.badge.stable }}>⚠ Potential sensor issue</span>
            )}
          </div>
        )}
        {day.notes && (
          <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "13px", color: colors.inkMuted, marginTop: "12px", borderTop: `1px solid ${colors.border}`, paddingTop: "12px" }}>
            {day.notes}
          </p>
        )}
      </div>

      {/* Glucose chart */}
      {readings.length >= 2 && (
        <>
          <p style={{ fontFamily: "var(--font-outfit)", fontSize: "11px", fontWeight: 600, letterSpacing: "0.10em", textTransform: "uppercase", color: colors.inkMuted, marginBottom: "10px" }}>
            Glucose movement
          </p>
          <DayGlucoseChart readings={readings} meals={meals.map(m => m.meal)} events={events} sensorErrorPeriods={errorPeriods} />
        </>
      )}

      {/* Edit day record form */}
      <DayRecordEditor day={day} />

      {/* Derived day summary */}
      {meals.length > 0 && validSpikes.length > 0 && (
        <div style={{ border: `1px solid ${colors.border}`, borderRadius: "6px", marginBottom: "24px", backgroundColor: colors.surface, overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: `1px solid ${colors.border}` }}>
            <p style={{ fontFamily: "var(--font-outfit)", fontSize: "11px", fontWeight: 600, letterSpacing: "0.10em", textTransform: "uppercase", color: colors.inkMuted }}>
              Day summary
            </p>
          </div>

          {/* Headline metrics — divided cells */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)" }}>
            {[
              { label: "Meals", value: String(meals.length) },
              { label: "Avg spike", value: avgSpike !== null ? mmolDiff(Math.round(avgSpike * 10) / 10) : "—" },
              { label: "Highest spike", value: highestSpike !== null ? mmolDiff(highestSpike) : "—" },
            ].map(({ label, value }, i) => (
              <div key={label} style={{ padding: "16px 20px", borderRight: i < 2 ? `1px solid ${colors.border}` : "none" }}>
                <p style={{ fontFamily: "var(--font-outfit)", fontSize: "10px", fontWeight: 600, letterSpacing: "0.10em", textTransform: "uppercase", color: colors.inkMuted, marginBottom: "6px" }}>
                  {label}
                </p>
                <p style={{ fontFamily: "var(--font-outfit)", fontSize: "20px", fontWeight: 600, color: colors.ink, letterSpacing: "-0.01em" }}>
                  {value}
                </p>
              </div>
            ))}
          </div>

          {/* Response breakdown */}
          <div style={{ borderTop: `1px solid ${colors.border}`, padding: "12px 20px", display: "flex", alignItems: "center", gap: "6px" }}>
            <p style={{ fontFamily: "var(--font-outfit)", fontSize: "10px", fontWeight: 600, letterSpacing: "0.10em", textTransform: "uppercase", color: colors.inkMuted, marginRight: "8px" }}>
              Responses
            </p>
            {[
              { label: "Low",      count: lowCount,  color: colors.badge.optimal },
              { label: "Moderate", count: modCount,  color: colors.badge.stable },
              { label: "High",     count: highCount, color: colors.badge.act },
            ].map(({ label, count, color }, i) => (
              <Fragment key={label}>
                {i > 0 && <span style={{ color: colors.border, fontSize: "14px", userSelect: "none" }}>·</span>}
                <span style={{ display: "inline-flex", alignItems: "baseline", gap: "4px" }}>
                  <span style={{ fontFamily: "var(--font-outfit)", fontSize: "14px", fontWeight: 600, color: count > 0 ? color : colors.inkMuted }}>
                    {count}
                  </span>
                  <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "12px", color: colors.inkMuted }}>
                    {label.toLowerCase()}
                  </span>
                </span>
              </Fragment>
            ))}
            {hasAlcohol && (
              <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "12px", color: colors.inkMuted, marginLeft: "auto" }}>
                Alcohol flagged
              </span>
            )}
          </div>
        </div>
      )}

      {/* Activity */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
        <p style={{ fontFamily: "var(--font-outfit)", fontSize: "13px", fontWeight: 600, letterSpacing: "0.10em", textTransform: "uppercase", color: colors.inkMuted }}>
          Activity
        </p>
        <div style={{ display: "flex", gap: "8px" }}>
          <Link href={`/glucomove/events/new?date=${day.date}`} style={{ textDecoration: "none" }}>
            <Button variant="ghost">+ Event</Button>
          </Link>
          <Link href={`/glucomove/meals/new?date=${day.date}`} style={{ textDecoration: "none" }}>
            <Button variant="primary">+ Meal</Button>
          </Link>
        </div>
      </div>

      {timeline.length === 0 ? (
        <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "14px", color: colors.inkMuted }}>No meals or events logged for this day.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {timeline.map(item => {
            if (item.kind === "meal") {
              const { meal, metrics } = item.data;
              return (
                <Link key={`meal-${meal.id}`} href={`/glucomove/meals/${meal.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                  <div style={{ border: `1px solid ${colors.border}`, borderLeft: `3px solid ${colors.category.nutritional}`, borderRadius: "6px", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.background }}>
                    <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                      <span style={{ fontFamily: "var(--font-outfit)", fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: colors.inkMuted, minWidth: "72px" }}>
                        {new Date(meal.meal_start_time).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" })}
                      </span>
                      <div>
                        <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "14px", color: colors.ink }}>{meal.name}</p>
                        <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "12px", color: colors.inkMuted, marginTop: "2px" }}>
                          {MEAL_TYPE_LABEL[meal.meal_type]} · {(Array.isArray(meal.primary_carb_source) ? meal.primary_carb_source : [meal.primary_carb_source]).map((s: string) => PRIMARY_CARB_LABEL[s] ?? s).join(', ')} · {CARB_PROMINENCE_LABEL[meal.carb_prominence]}
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
              );
            }

            const ev = item.data;
            const evColor = glucomoveEventColors[ev.event_type] ?? colors.inkMuted;
            return (
              <Link key={`event-${ev.id}`} href={`/glucomove/events/${ev.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                <div style={{ border: `1px solid ${colors.border}`, borderLeft: `3px solid ${evColor}`, borderRadius: "6px", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.background, cursor: "pointer" }}>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <span style={{ fontFamily: "var(--font-outfit)", fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: colors.inkMuted, minWidth: "72px", marginRight: "16px" }}>
                      {new Date(ev.start_time).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" })}
                      {ev.end_time && <span> – {new Date(ev.end_time).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" })}</span>}
                    </span>
                    <div>
                      <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "14px", color: colors.ink }}>{ev.name}</p>
                      <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "12px", marginTop: "2px" }}>
                        <span style={{ color: evColor, fontWeight: 500 }}>{EVENT_TYPE_LABEL[ev.event_type] ?? ev.event_type}</span>
                        {ev.intensity && <span style={{ color: colors.inkMuted }}> · {ev.intensity}</span>}
                      </p>
                    </div>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke={colors.inkMuted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 3l4 4-4 4" />
                  </svg>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <DayReadingsList readings={readings} meals={meals.map(m => m.meal)} />
    </div>
  );
}

function Stat({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div>
      <p style={{ fontFamily: "var(--font-outfit)", fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: colors.inkMuted, marginBottom: "4px" }}>
        {label}
      </p>
      <p style={{ fontFamily: "var(--font-outfit)", fontSize: "16px", fontWeight: 600, color: muted ? colors.inkMuted : colors.ink }}>
        {value}
      </p>
    </div>
  );
}
