import Link from "next/link";
import { getMealWithReadings } from "@/lib/glucomove-queries";
import { colors } from "@/lib/tokens";
import {
  mmol, mmolDiff,
  MEAL_TYPE_LABEL, PRIMARY_CARB_LABEL, CARB_PROMINENCE_LABEL,
  FIBER_PROMINENCE_LABEL, PROTEIN_PROMINENCE_LABEL, FAT_PROMINENCE_LABEL,
  RESPONSE_BAND_LABEL, RESPONSE_BAND_COLOR, RESPONSE_SHAPE_LABEL,
} from "@/lib/glucomove-calcs";
import MealObservationPanel from "./MealObservationPanel";
import MealActions from "./MealActions";

export default async function MealDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getMealWithReadings(id);
  if (!data) return <div style={{ padding: "40px 64px", color: colors.inkMuted, fontFamily: "var(--font-dm-sans)", fontSize: "14px" }}>Meal not found.</div>;

  const { meal, readings, metrics } = data;

  const activeModifiers = [
    meal.fat_before && "Fat buffer before",
    meal.acv_before && "ACV before",
    meal.structured_eating && "Structured eating",
    meal.movement_after && (meal.movement_duration_minutes ? `Movement after (${meal.movement_duration_minutes} min)` : "Movement after"),
    meal.with_alcohol && "Alcohol",
    meal.cooled_starch && "Cooled starch",
    meal.fruit_after && "Fruit after",
    meal.dessert_after && "Dessert after",
  ].filter(Boolean) as string[];

  return (
    <div style={{ padding: "40px 64px", maxWidth: "760px" }}>
      {/* Nav */}
      {(() => {
        const mealDate = new Date(new Date(meal.meal_start_time).getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
        const backHref = meal.day_record_id
          ? `/glucomove/days/${meal.day_record_id}`
          : `/glucomove/date/${mealDate}`;
        const backLabel = meal.day_record_id ? "Day record" : "Back";
        return (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
            <Link href={backHref} style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "6px", fontFamily: "var(--font-dm-sans)", fontSize: "13px", color: colors.inkMuted }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7.5 2L3.5 6l4 4" /></svg>
              {backLabel}
            </Link>
            <MealActions mealId={meal.id} dayRecordId={meal.day_record_id} mealDate={mealDate} />
          </div>
        );
      })()}

      {/* Header */}
      <p style={{ fontFamily: "var(--font-outfit)", fontSize: "13px", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: colors.inkMuted, marginBottom: "4px" }}>
        {MEAL_TYPE_LABEL[meal.meal_type]} · {new Date(meal.meal_start_time).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
      </p>
      <h1 style={{ fontFamily: "var(--font-outfit)", fontSize: "28px", fontWeight: 600, color: colors.ink, letterSpacing: "-0.01em", marginBottom: "8px" }}>
        {meal.name}
      </h1>
      <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "14px", color: colors.inkMuted, marginBottom: "32px", lineHeight: 1.6 }}>
        {meal.description}
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
        {/* Carb profile */}
        <div style={{ border: `1px solid ${colors.border}`, borderRadius: "6px", padding: "16px 20px" }}>
          <p style={{ fontFamily: "var(--font-outfit)", fontSize: "11px", fontWeight: 600, letterSpacing: "0.10em", textTransform: "uppercase", color: colors.inkMuted, marginBottom: "12px" }}>Carb profile</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <Row label="Primary source" value={PRIMARY_CARB_LABEL[meal.primary_carb_source]} />
            <Row label="Carb prominence" value={CARB_PROMINENCE_LABEL[meal.carb_prominence]} />
            <Row label="Fiber content" value={meal.fiber_prominence ? FIBER_PROMINENCE_LABEL[meal.fiber_prominence] : "—"} />
            <Row label="Protein content" value={meal.protein_prominence ? PROTEIN_PROMINENCE_LABEL[meal.protein_prominence] : "—"} />
            <Row label="Fat content" value={meal.fat_prominence ? FAT_PROMINENCE_LABEL[meal.fat_prominence] : "—"} />
          </div>
        </div>

        {/* Modifiers */}
        <div style={{ border: `1px solid ${colors.border}`, borderRadius: "6px", padding: "16px 20px" }}>
          <p style={{ fontFamily: "var(--font-outfit)", fontSize: "11px", fontWeight: 600, letterSpacing: "0.10em", textTransform: "uppercase", color: colors.inkMuted, marginBottom: "12px" }}>Modifiers</p>
          {activeModifiers.length === 0 ? (
            <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "13px", color: colors.inkMuted }}>None</p>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {activeModifiers.map(m => (
                <span key={m} style={{ fontFamily: "var(--font-dm-sans)", fontSize: "12px", color: colors.ink, backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: "4px", padding: "3px 8px" }}>
                  {m}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Glucose response metrics */}
      <div style={{ border: `1px solid ${colors.border}`, borderRadius: "6px", padding: "20px 24px", marginBottom: "24px" }}>
        <p style={{ fontFamily: "var(--font-outfit)", fontSize: "11px", fontWeight: 600, letterSpacing: "0.10em", textTransform: "uppercase", color: colors.inkMuted, marginBottom: "16px" }}>
          Glucose response
        </p>

        {metrics.baselineGlucoseMmol === null ? (
          <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "14px", color: colors.inkMuted }}>
            Baseline required to calculate glucose movement.
          </p>
        ) : (
          <>
            {/* Response band headline */}
            {metrics.responseBand && (
              <div style={{ marginBottom: "20px" }}>
                <span style={{ fontFamily: "var(--font-outfit)", fontSize: "24px", fontWeight: 600, color: RESPONSE_BAND_COLOR[metrics.responseBand] }}>
                  {mmolDiff(metrics.spikeMmol)}
                </span>
                <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "13px", color: RESPONSE_BAND_COLOR[metrics.responseBand], marginLeft: "8px" }}>
                  {RESPONSE_BAND_LABEL[metrics.responseBand]}
                </span>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
              <Row label="Baseline" value={mmol(metrics.baselineGlucoseMmol)} />
              <Row label="Peak" value={mmol(metrics.peakGlucoseMmol)} />
              <Row label="Movement" value={mmolDiff(metrics.spikeMmol)} />
              <Row label="Time to peak" value={metrics.timeToPeakMinutes !== null ? `${metrics.timeToPeakMinutes} min` : "—"} />
              <Row label="Recovery time" value={
                metrics.returnToBaselineMinutes !== null
                  ? `${metrics.returnToBaselineMinutes} min`
                  : "Not yet"
              } />
              <Row label="Post-peak low" value={mmol(metrics.postPeakLowMmol)} />
            </div>
          </>
        )}
      </div>

      {/* Glucose curve + observation window */}
      <MealObservationPanel readings={readings} mealStartTime={meal.meal_start_time} />

      {/* Notes */}
      {meal.notes && (
        <div style={{ border: `1px solid ${colors.border}`, borderRadius: "6px", padding: "16px 20px", marginTop: "16px" }}>
          <p style={{ fontFamily: "var(--font-outfit)", fontSize: "11px", fontWeight: 600, letterSpacing: "0.10em", textTransform: "uppercase", color: colors.inkMuted, marginBottom: "8px" }}>Notes</p>
          <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "14px", color: colors.ink, lineHeight: 1.6 }}>{meal.notes}</p>
        </div>
      )}

      {meal.potential_sensor_issue && (
        <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "12px", color: colors.badge.stable, marginTop: "12px" }}>
          ⚠ Potential sensor issue flagged for this meal.
        </p>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p style={{ fontFamily: "var(--font-outfit)", fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: colors.inkMuted, marginBottom: "3px" }}>
        {label}
      </p>
      <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "14px", color: colors.ink }}>
        {value}
      </p>
    </div>
  );
}
