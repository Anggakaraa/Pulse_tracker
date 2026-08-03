import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase";
import {
  getTodayDayRecord, getMealsByDate, getMealWithReadings,
  getDateWIB, getReadingsForDate, getEventsForDate,
} from "@/lib/glucomove-queries";
import { colors, glucomoveEventColors } from "@/lib/tokens";
import {
  mmol, mmolDiff,
  MEAL_TYPE_LABEL, RESPONSE_BAND_COLOR, RESPONSE_BAND_LABEL,
} from "@/lib/glucomove-calcs";
import DayGlucoseChart from "./DayGlucoseChart";
import DayReadingsList from "./DayReadingsList";
import Button from "@/components/Button";

async function getCurrentUserId() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

const EVENT_TYPE_LABEL: Record<string, string> = {
  stress: "Stress", exercise: "Exercise", alcohol: "Alcohol",
  illness: "Illness", sleep: "Sleep", travel: "Travel",
  fasting: "Fasting", medication: "Medication", recovery: "Recovery", other: "Other",
};

export default async function GlucomovePage() {
  const userId = await getCurrentUserId();
  if (!userId) return null;

  const today = getDateWIB();
  const [todayRecord, todayMeals, todayReadings, todayEvents] = await Promise.all([
    getTodayDayRecord(userId),
    getMealsByDate(today, userId),
    getReadingsForDate(today, userId),
    getEventsForDate(today, userId),
  ]);

  const mealsWithMetrics = await Promise.all(
    todayMeals.map(meal => getMealWithReadings(meal.id))
  );

  // Merge meals + events into a single timeline sorted by start time
  type TimelineItem =
    | { kind: "meal"; data: NonNullable<(typeof mealsWithMetrics)[number]> }
    | { kind: "event"; data: (typeof todayEvents)[number] };

  const timeline: TimelineItem[] = [
    ...mealsWithMetrics.filter(Boolean).map(m => ({ kind: "meal" as const, data: m! })),
    ...todayEvents.map(e => ({ kind: "event" as const, data: e })),
  ].sort((a, b) => {
    const ta = a.kind === "meal"
      ? new Date(a.data.meal.meal_start_time).getTime()
      : new Date(a.data.start_time).getTime();
    const tb = b.kind === "meal"
      ? new Date(b.data.meal.meal_start_time).getTime()
      : new Date(b.data.start_time).getTime();
    return ta - tb;
  });

  const todayFormatted = new Date(today + "T12:00:00").toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div style={{ padding: "40px 64px", maxWidth: "800px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "32px" }}>
        <div>
          <p style={{ fontFamily: "var(--font-outfit)", fontSize: "13px", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: colors.inkMuted, marginBottom: "4px" }}>
            Glucomove
          </p>
          <h1 style={{ fontFamily: "var(--font-outfit)", fontSize: "28px", fontWeight: 600, color: colors.ink, letterSpacing: "-0.01em" }}>
            Today
          </h1>
          <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "13px", color: colors.inkMuted, marginTop: "4px" }}>
            {todayFormatted}
          </p>
        </div>
        <Link href="/glucomove/days" style={{ textDecoration: "none" }}>
          <Button variant="ghost">All days</Button>
        </Link>
      </div>

      {/* Day record strip */}
      {todayRecord ? (
        <div style={{ border: `1px solid ${colors.border}`, borderRadius: "6px", padding: "20px 24px", marginBottom: "24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: "40px" }}>
            {todayRecord.waking_glucose_mmol != null && (
              <Stat label="Waking glucose" value={mmol(todayRecord.waking_glucose_mmol)} />
            )}
            {todayRecord.overnight_avg_mmol && <Stat label="Overnight avg" value={mmol(todayRecord.overnight_avg_mmol)} />}
            {todayRecord.daily_avg_mmol && <Stat label="Daily avg" value={mmol(todayRecord.daily_avg_mmol)} />}
          </div>
          <Link href={`/glucomove/days/${todayRecord.id}`} style={{ textDecoration: "none" }}>
            <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "13px", color: colors.inkMuted }}>
              Edit day →
            </span>
          </Link>
        </div>
      ) : (
        <div style={{ border: `1px solid ${colors.border}`, borderRadius: "6px", padding: "14px 20px", marginBottom: "24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "13px", color: colors.inkMuted }}>
            No waking / daily glucose logged yet.
          </p>
          <Link href={`/glucomove/days/new?date=${today}`} style={{ textDecoration: "none" }}>
            <Button variant="ghost">Log day record</Button>
          </Link>
        </div>
      )}

      {/* Glucose movement chart */}
      {todayReadings.length >= 2 && (
        <>
          <p style={{ fontFamily: "var(--font-outfit)", fontSize: "11px", fontWeight: 600, letterSpacing: "0.10em", textTransform: "uppercase", color: colors.inkMuted, marginBottom: "10px" }}>
            Glucose movement
          </p>
          <DayGlucoseChart readings={todayReadings} meals={todayMeals} events={todayEvents} />
        </>
      )}

      {/* Activity header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
        <p style={{ fontFamily: "var(--font-outfit)", fontSize: "13px", fontWeight: 600, letterSpacing: "0.10em", textTransform: "uppercase", color: colors.inkMuted }}>
          Today's activity
        </p>
        <div style={{ display: "flex", gap: "8px" }}>
          <Link href={`/glucomove/readings/new?date=${today}`} style={{ textDecoration: "none" }}>
            <Button variant="ghost">+ Reading</Button>
          </Link>
          <Link href={`/glucomove/events/new?date=${today}`} style={{ textDecoration: "none" }}>
            <Button variant="ghost">+ Event</Button>
          </Link>
          <Link href={`/glucomove/meals/new?date=${today}`} style={{ textDecoration: "none" }}>
            <Button variant="primary">+ Meal</Button>
          </Link>
        </div>
      </div>

      {timeline.length === 0 ? (
        <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "14px", color: colors.inkMuted }}>
          No meals or events logged yet.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {timeline.map(item => {
            if (item.kind === "meal") {
              const { meal, metrics } = item.data;
              return (
                <Link key={`meal-${meal.id}`} href={`/glucomove/meals/${meal.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                  <div style={{ border: `1px solid ${colors.border}`, borderRadius: "6px", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", backgroundColor: colors.background }}>
                    <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                      <span style={{ fontFamily: "var(--font-outfit)", fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: colors.inkMuted, minWidth: "72px" }}>
                        {new Date(meal.meal_start_time).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" })}
                      </span>
                      <div>
                        <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "14px", color: colors.ink }}>
                          {meal.name}
                        </p>
                        <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "12px", color: colors.inkMuted, marginTop: "2px" }}>
                          {MEAL_TYPE_LABEL[meal.meal_type]}
                        </p>
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

            // Event row
            const ev = item.data;
            const evColor = glucomoveEventColors[ev.event_type] ?? colors.inkMuted;
            return (
              <Link key={`event-${ev.id}`} href={`/glucomove/events/${ev.id}`} style={{ textDecoration: "none", color: "inherit" }}>
              <div style={{ border: `1px solid ${colors.border}`, borderLeft: `3px solid ${evColor}`, borderRadius: "6px", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.background, cursor: "pointer" }}>
                <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                  <span style={{ fontFamily: "var(--font-outfit)", fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: colors.inkMuted, minWidth: "72px" }}>
                    {new Date(ev.start_time).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" })}
                    {ev.end_time && (
                      <span> – {new Date(ev.end_time).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" })}</span>
                    )}
                  </span>
                  <div>
                    <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "14px", color: colors.ink }}>
                      {ev.name}
                    </p>
                    <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "12px", marginTop: "2px" }}>
                      <span style={{ color: evColor, fontWeight: 500 }}>
                        {EVENT_TYPE_LABEL[ev.event_type] ?? ev.event_type}
                      </span>
                      {ev.intensity && (
                        <span style={{ color: colors.inkMuted }}> · {ev.intensity}</span>
                      )}
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
      <DayReadingsList readings={todayReadings} meals={todayMeals} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p style={{ fontFamily: "var(--font-outfit)", fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: colors.inkMuted, marginBottom: "4px" }}>
        {label}
      </p>
      <p style={{ fontFamily: "var(--font-outfit)", fontSize: "20px", fontWeight: 600, color: colors.ink, letterSpacing: "-0.01em" }}>
        {value}
      </p>
    </div>
  );
}
