import Link from "next/link";
import { getEventWithReadings } from "@/lib/glucomove-queries";
import { colors, glucomoveEventColors } from "@/lib/tokens";
import EventEditor from "./EventEditor";
import EventObservationPanel from "./EventObservationPanel";

const EVENT_TYPE_LABEL: Record<string, string> = {
  stress: "Stress", exercise: "Exercise", alcohol: "Alcohol",
  illness: "Illness", sleep: "Sleep", travel: "Travel",
  fasting: "Fasting", medication: "Medication", recovery: "Recovery", other: "Other",
};

function toWIBDate(utcTs: string): string {
  const d = new Date(new Date(utcTs).getTime() + 7 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

function fmtTime(utcTs: string): string {
  return new Date(utcTs).toLocaleTimeString("en-GB", {
    hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta",
  });
}

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getEventWithReadings(id);
  if (!result) {
    return <div style={{ padding: "40px 64px", color: colors.inkMuted, fontFamily: "var(--font-dm-sans)", fontSize: "14px" }}>Event not found.</div>;
  }

  const { event, readings } = result;
  const eventDate = toWIBDate(event.start_time);
  const evColor = glucomoveEventColors[event.event_type] ?? colors.inkMuted;

  return (
    <div style={{ padding: "40px 64px", maxWidth: "640px" }}>
      {/* Nav */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
        <Link href={`/glucomove/date/${eventDate}`} style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "6px", fontFamily: "var(--font-dm-sans)", fontSize: "13px", color: colors.inkMuted }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7.5 2L3.5 6l4 4" /></svg>
          Back
        </Link>
        <EventEditor event={{ ...event, eventDate }} />
      </div>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
        <span style={{ fontFamily: "var(--font-outfit)", fontSize: "13px", fontWeight: 600, letterSpacing: "0.10em", textTransform: "uppercase", color: evColor }}>
          {EVENT_TYPE_LABEL[event.event_type] ?? event.event_type}
        </span>
        <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "13px", color: colors.inkMuted }}>
          {fmtTime(event.start_time)}
          {event.end_time && ` – ${fmtTime(event.end_time)}`}
        </span>
      </div>
      <h1 style={{ fontFamily: "var(--font-outfit)", fontSize: "28px", fontWeight: 600, color: colors.ink, letterSpacing: "-0.01em", marginBottom: "32px" }}>
        {event.name}
      </h1>

      {/* Details card */}
      <div style={{ border: `1px solid ${colors.border}`, borderLeft: `3px solid ${evColor}`, borderRadius: "6px", padding: "20px 24px", marginBottom: "24px" }}>
        <div style={{ display: "flex", gap: "40px", flexWrap: "wrap" }}>
          <Field label="Type" value={EVENT_TYPE_LABEL[event.event_type] ?? event.event_type} />
          <Field label="Start" value={fmtTime(event.start_time)} />
          {event.end_time && <Field label="End" value={fmtTime(event.end_time)} />}
          {event.intensity && <Field label="Intensity" value={event.intensity.charAt(0).toUpperCase() + event.intensity.slice(1)} />}
        </div>
        {event.notes && (
          <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "13px", color: colors.inkMuted, marginTop: "16px", paddingTop: "16px", borderTop: `1px solid ${colors.border}`, lineHeight: 1.6 }}>
            {event.notes}
          </p>
        )}
      </div>

      {/* Glucose curve */}
      <EventObservationPanel
        readings={readings}
        startTime={event.start_time}
        endTime={event.end_time ?? null}
        eventColor={evColor}
      />
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p style={{ fontFamily: "var(--font-outfit)", fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: colors.inkMuted, marginBottom: "4px" }}>{label}</p>
      <p style={{ fontFamily: "var(--font-outfit)", fontSize: "16px", fontWeight: 600, color: colors.ink }}>{value}</p>
    </div>
  );
}
