import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createSupabaseServerClient } from "@/lib/supabase";
import { getDayWithMealsAndMetrics, getEventsForDate, getReadingsForDate } from "@/lib/glucomove-queries";
import { isInSensorErrorPeriod, type SensorErrorPeriod } from "@/lib/glucomove-calcs";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function fmtWIB(ts: string) {
  return new Date(ts).toLocaleTimeString("en-GB", {
    hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta",
  });
}

function avg(vals: number[]) {
  return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 10) / 10 : null;
}

export async function POST(req: NextRequest) {
  try {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { dayRecordId } = await req.json();
  if (!dayRecordId) return NextResponse.json({ error: "dayRecordId required" }, { status: 400 });

  const data = await getDayWithMealsAndMetrics(dayRecordId);
  if (!data) return NextResponse.json({ error: "Day record not found" }, { status: 404 });

  const { day, meals } = data;
  const [events, readings] = await Promise.all([
    getEventsForDate(day.date, day.user_id),
    getReadingsForDate(day.date, day.user_id),
  ]);

  // Exclude sensor error periods
  const errorPeriods = (Array.isArray(day.sensor_error_periods) ? day.sensor_error_periods : []) as SensorErrorPeriod[];
  const cleanReadings = readings.filter((r: { timestamp: string }) => !isInSensorErrorPeriod(r.timestamp, errorPeriods));

  const dailyAvg = avg(cleanReadings.map((r: { glucose_mmol: number }) => r.glucose_mmol));

  const glucoseValues = cleanReadings.map((r: { glucose_mmol: number }) => r.glucose_mmol);
  const sd = glucoseValues.length >= 6 && dailyAvg !== null
    ? Math.round(Math.sqrt(glucoseValues.reduce((s, v) => s + Math.pow(v - dailyAvg, 2), 0) / glucoseValues.length) * 10) / 10
    : null;
  const cv = sd !== null && dailyAvg ? Math.round((sd / dailyAvg) * 100) : null;

  const overnightReadings = cleanReadings.filter((r: { timestamp: string }) => {
    const wibHour = (new Date(r.timestamp).getUTCHours() + 7) % 24;
    return wibHour < 6;
  });
  const overnightAvg = avg(overnightReadings.map((r: { glucose_mmol: number }) => r.glucose_mmol));

  // Build context for Claude
  const contextLines: string[] = [
    `Date: ${day.date}`,
    `Waking glucose: ${day.waking_glucose_mmol != null ? `${day.waking_glucose_mmol} mmol/L` : "not recorded"}`,
    `Overnight avg (midnight–6am): ${overnightAvg != null ? `${overnightAvg} mmol/L` : "insufficient data"}`,
    `Daily avg: ${dailyAvg != null ? `${dailyAvg} mmol/L` : "insufficient data"}`,
    sd !== null ? `SD: ${sd} mmol/L` : "",
    cv !== null ? `CV: ${cv}% (stable target <36%)` : "",
    `Context flags: bad sleep: ${day.bad_sleep ? "yes" : "no"}, alcohol previous night: ${day.alcohol_previous_night ? "yes" : "no"}, higher than usual coffee intake: ${day.high_coffee ? "yes" : "no"}`,
    day.notes ? `Day notes: ${day.notes}` : "",
  ].filter(Boolean);

  if (errorPeriods.length > 0) {
    contextLines.push("\nSensor error periods (data excluded from averages, times in WIB):");
    for (const ep of errorPeriods) {
      contextLines.push(`  ${ep.start} – ${ep.end}`);
    }
    contextLines.push("  Note: meal metrics overlapping these periods may be unreliable.");
  }

  if (events.length > 0) {
    contextLines.push("\nEvents:");
    for (const ev of events) {
      const end = ev.end_time ? ` – ${fmtWIB(ev.end_time)}` : "";
      contextLines.push(`  ${fmtWIB(ev.start_time)}${end}: ${ev.name || ev.event_type} (${ev.event_type}${ev.intensity ? `, ${ev.intensity}` : ""})`);
    }
  }

  if (meals.length > 0) {
    contextLines.push("\nMeals (with glucose response):");
    for (const { meal, metrics } of meals) {
      const spike = metrics.spikeMmol != null ? `peak +${metrics.spikeMmol.toFixed(1)} mmol/L` : "response pending";
      const baseline = metrics.baselineGlucoseMmol != null ? `baseline ${metrics.baselineGlucoseMmol.toFixed(1)}` : "";
      const iauc = metrics.iAUC != null ? `iAUC-120: ${Math.round(metrics.iAUC)}` : "";
      const carbInfo = `carb prominence: ${meal.carb_prominence}`;
      const modifiers = [
        meal.eating_out && "eating out",
        meal.large_portion && "large portion",
        meal.with_alcohol && "with alcohol",
        meal.cooled_starch && "cooled starch",
        meal.fat_before && "fat buffer before",
        meal.structured_eating && "structured eating",
      ].filter(Boolean).join(", ");
      const parts = [baseline, spike, iauc, carbInfo, modifiers].filter(Boolean).join(", ");
      contextLines.push(`  ${fmtWIB(meal.meal_start_time)}: ${meal.name} (${meal.meal_type}) — ${parts || "no readings"}`);
    }
  }

  if (cleanReadings.length === 0) {
    contextLines.push("\nNo valid glucose readings for this day.");
  }

  const prompt = contextLines.join("\n");

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 400,
    system: `You are a glucose pattern analyst reviewing one calendar day of CGM, meal, and contextual-event data.

Your purpose is to describe day-level relationships that individual meal metrics cannot capture, especially inter-meal recovery, temporal proximity, carry-forward patterns, and the overall shape of the day.

Focus on the following:

1. Inter-meal carry-forward
Assess whether glucose appeared to return to its earlier day-level range between meals, or whether a later meal began from a visibly elevated level.

A later meal's baseline can be used as one indicator that elevation from an earlier meal may have persisted, but only when the interval contains no logged food intake or major contextual event. Do not assume that an elevated later baseline was caused by the previous meal.

2. Day arc
Classify the day's overall glucose arc as one of:

- Recovering: elevations were followed by clear returns toward the earlier day-level range.
- Stable: glucose remained within a relatively consistent range across the day, without meaningful upward or downward drift.
- Building: inter-meal glucose or later-meal baselines became progressively higher across the day.

Use these labels descriptively. "Building" does not establish cumulative meal causation.

3. Event-meal proximity
Identify contextual events occurring within approximately 2 hours before or after a meal, including exercise, prolonged inactivity, stress, illness, alcohol, sauna, cold exposure, or recovery activity.

Describe only the temporal relationship and whether the observed curve was compatible with a plausible effect. Never claim that the event caused the response.

4. Attribution ambiguity
When afternoon or evening elevation could plausibly reflect continued digestion from one meal, a broader day-level shift, reduced activity, or the combined context of multiple earlier meals, preserve the ambiguity and name the main plausible interpretations.

5. Overnight and waking relationship
Note whether overnight glucose was stable, elevated, or variable, and whether waking glucose differed meaningfully from the overnight level. Distinguish first-awake glucose from later fasting readings when both are available.

6. Data limitations
Mention material limitations when relevant, including: incomplete CGM coverage; insufficient observation after a meal; overlapping meals or snacks; questionable sensor readings; thermal exposure or compression; missing contextual events; unusually long gaps between readings.

Rules:
- Describe relationships and day shape, rather than restating all meal metrics.
- Refer to a number only when it is necessary to support a relational observation.
- Do not label foods or responses as good, bad, healthy, unhealthy, safe, or unsafe.
- Do not provide dietary, exercise, or medical advice.
- Use uncertain language such as "suggested," "may have reflected," "was consistent with," or "could not be separated from."
- Write in past tense.
- Use plain prose in 3–5 sentences.
- Do not use bullets or headings in the generated summary.
- Use mmol/L for all glucose values.
- Stay strictly within this calendar day. Do not compare with other days or the user's historical patterns.`,
    messages: [{ role: "user", content: prompt }],
  });

  const narrative = (response.content[0] as { text: string }).text.trim();

  // Save back to day record
  await supabase
    .from("glucomove_day_records")
    .update({ narrative, updated_at: new Date().toISOString() })
    .eq("id", dayRecordId);

  return NextResponse.json({ narrative });
  } catch (err) {
    console.error("generate-day-summary error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
