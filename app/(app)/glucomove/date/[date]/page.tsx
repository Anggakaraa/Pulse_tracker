import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase";
import {
  getMealsByDate, getMealWithReadings, getReadingsForDate,
  getEventsForDate, getDayRecord,
} from "@/lib/glucomove-queries";
import { colors, glucomoveEventColors } from "@/lib/tokens";
import {
  mmol, mmolDiff,
  MEAL_TYPE_LABEL, RESPONSE_BAND_COLOR, RESPONSE_BAND_LABEL,
  isInSensorErrorPeriod, type SensorErrorPeriod,
} from "@/lib/glucomove-calcs";
import DayGlucoseChart from "../../DayGlucoseChart";
import DayReadingsList from "../../DayReadingsList";
import Button from "@/components/Button";

export const dynamic = "force-dynamic";

const EVENT_TYPE_LABEL: Record<string, string> = {
  stress: "Stress", exercise: "Exercise", alcohol: "Alcohol",
  illness: "Illness", sleep: "Sleep", travel: "Travel",
  fasting: "Fasting", medication: "Medication", recovery: "Recovery", other: "Other",
};

export default async function DateViewPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Check if a day record exists for this date
  const { data: dayRecordRow } = await supabase
    .from("glucomove_day_records")
    .select("id")
    .eq("user_id", user.id)
    .eq("date", date)
    .maybeSingle();

  // If there's a day record, redirect to the day record page
  // (we show this page only for meal-only dates, but it works for both)
  const dayRecord = dayRecordRow ? await getDayRecord(dayRecordRow.id) : null;

  const [meals, readings, events] = await Promise.all([
    getMealsByDate(date, user.id),
    getReadingsForDate(date, user.id),
    getEventsForDate(date, user.id),
  ]);

  const mealsWithMetrics = await Promise.all(
    meals.map(meal => getMealWithReadings(meal.id))
  );

  // Compute overnight avg (midnight–6am WIB) and daily avg from readings, excluding sensor error periods
  const errorPeriods = (Array.isArray((dayRecord as Record<string, unknown>)?.sensor_error_periods)
    ? (dayRecord as Record<string, unknown>).sensor_error_periods
    : []) as SensorErrorPeriod[];
  const cleanReadings = readings.filter(r => !isInSensorErrorPeriod(r.timestamp, errorPeriods));

  function toWIBHour(ts: string): number {
    return new Date(new Date(ts).getTime() + 7 * 3600000).getUTCHours();
  }
  const overnightReadings = cleanReadings.filter(r => toWIBHour(r.timestamp) < 6);
  const overnightAvg = overnightReadings.length > 0
    ? overnightReadings.reduce((s, r) => s + r.glucose_mmol, 0) / overnightReadings.length
    : null;
  const dailyAvg = cleanReadings.length > 0
    ? cleanReadings.reduce((s, r) => s + r.glucose_mmol, 0) / cleanReadings.length
    : null;

  type TimelineItem =
    | { kind: "meal"; data: NonNullable<(typeof mealsWithMetrics)[number]> }
    | { kind: "event"; data: (typeof events)[number] };

  const timeline: TimelineItem[] = [
    ...mealsWithMetrics.filter(Boolean).map(m => ({ kind: "meal" as const, data: m! })),
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

  const dateFormatted = new Date(date + "T12:00:00").toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div style={{ padding: "40px 64px", maxWidth: "800px" }}>
      {/* Back */}
      <Link href="/glucomove/days" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "6px", fontFamily: "var(--font-dm-sans)", fontSize: "13px", color: colors.inkMuted, marginBottom: "20px" }}>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7.5 2L3.5 6l4 4" /></svg>
        All days
      </Link>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "32px" }}>
        <div>
          <p style={{ fontFamily: "var(--font-outfit)", fontSize: "13px", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: colors.inkMuted, marginBottom: "4px" }}>
            Glucomove
          </p>
          <h1 style={{ fontFamily: "var(--font-outfit)", fontSize: "28px", fontWeight: 600, color: colors.ink, letterSpacing: "-0.01em" }}>
            {dateFormatted}
          </h1>
        </div>
        {dayRecord && (
          <Link href={`/glucomove/days/${dayRecord.id}`} style={{ textDecoration: "none" }}>
            <Button variant="ghost">Day record →</Button>
          </Link>
        )}
      </div>

      {/* Day stats strip */}
      {(dayRecord || overnightAvg != null || dailyAvg != null) ? (
        <div style={{ border: `1px solid ${colors.border}`, borderRadius: "6px", padding: "20px 24px", marginBottom: "24px", display: "flex", gap: "40px" }}>
          {dayRecord?.waking_glucose_mmol != null
            ? <Stat label="Waking glucose" value={mmol(dayRecord.waking_glucose_mmol)} />
            : <Stat label="Waking glucose" value="—" muted />
          }
          {overnightAvg != null
            ? <Stat label="Overnight avg" value={mmol(overnightAvg)} />
            : <Stat label="Overnight avg" value="—" muted />
          }
          {dailyAvg != null
            ? <Stat label="Daily avg" value={mmol(dailyAvg)} />
            : <Stat label="Daily avg" value="—" muted />
          }
        </div>
      ) : null}

      {/* Glucose chart */}
      {readings.length >= 2 && (
        <>
          <p style={{ fontFamily: "var(--font-outfit)", fontSize: "11px", fontWeight: 600, letterSpacing: "0.10em", textTransform: "uppercase", color: colors.inkMuted, marginBottom: "10px" }}>
            Glucose movement
          </p>
          <DayGlucoseChart readings={readings} meals={meals} events={events} sensorErrorPeriods={errorPeriods} />
        </>
      )}

      {/* Activity */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
        <p style={{ fontFamily: "var(--font-outfit)", fontSize: "13px", fontWeight: 600, letterSpacing: "0.10em", textTransform: "uppercase", color: colors.inkMuted }}>
          Activity
        </p>
        <div style={{ display: "flex", gap: "8px" }}>
          <Link href={`/glucomove/readings/new?date=${date}`} style={{ textDecoration: "none" }}>
            <Button variant="ghost">+ Reading</Button>
          </Link>
          <Link href={`/glucomove/events/new?date=${date}`} style={{ textDecoration: "none" }}>
            <Button variant="ghost">+ Event</Button>
          </Link>
          <Link href={`/glucomove/meals/new?date=${date}`} style={{ textDecoration: "none" }}>
            <Button variant="primary">+ Meal</Button>
          </Link>
        </div>
      </div>

      {timeline.length === 0 ? (
        <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "14px", color: colors.inkMuted }}>
          No meals or events recorded for this day.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {timeline.map(item => {
            if (item.kind === "meal") {
              const { meal, metrics } = item.data;
              return (
                <Link key={`meal-${meal.id}`} href={`/glucomove/meals/${meal.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                  <div style={{ border: `1px solid ${colors.border}`, borderLeft: `3px solid ${colors.category.nutritional}`, borderRadius: "6px", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", backgroundColor: colors.background }}>
                    <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                      <span style={{ fontFamily: "var(--font-outfit)", fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: colors.inkMuted, minWidth: "72px" }}>
                        {new Date(meal.meal_start_time).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" })}
                      </span>
                      <div>
                        <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "14px", color: colors.ink }}>{meal.name}</p>
                        <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "12px", color: colors.inkMuted, marginTop: "2px" }}>{MEAL_TYPE_LABEL[meal.meal_type]}</p>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "24px", alignItems: "center" }}>
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
                          {metrics.baselineGlucoseMmol ? "Observing…" : "No readings"}
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
                      {ev.end_time && (
                        <span> – {new Date(ev.end_time).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" })}</span>
                      )}
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

      <DayReadingsList readings={readings} meals={meals} />
    </div>
  );
}

function Stat({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div>
      <p style={{ fontFamily: "var(--font-outfit)", fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: colors.inkMuted, marginBottom: "4px" }}>{label}</p>
      <p style={{ fontFamily: "var(--font-outfit)", fontSize: "20px", fontWeight: 600, color: muted ? colors.inkMuted : colors.ink, letterSpacing: "-0.01em" }}>{value}</p>
    </div>
  );
}
