import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export type DraftType = "day_record" | "meal" | "glucose_reading" | "unknown";

export interface ParsedMessage {
  type: DraftType;
  date: string;
  data: Record<string, unknown>;
}

export async function parseTelegramMessage(text: string, sentAt: Date): Promise<ParsedMessage> {
  const dateStr = sentAt.toISOString().slice(0, 10);

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 600,
    system: `You parse health tracking messages for a personal glucose tracking app. Return ONLY valid JSON, no explanation.

Today's date: ${dateStr}. All glucose values are in mmol/L.

Detect the message type and return the appropriate JSON structure:

TYPE 1 — day_record: mentions waking glucose, morning reading, overnight average, or daily average
{"type":"day_record","date":"${dateStr}","waking_glucose_mmol":5.2,"overnight_avg_mmol":null,"daily_avg_mmol":null,"notes":null}

TYPE 2 — meal: mentions a meal (lunch, dinner, breakfast, snack) or lists food items with meal context
{"type":"meal","date":"${dateStr}","meal_type":"lunch","name":"concise meal name","description":"full description of everything eaten","primary_carb_source":"white_rice","carb_prominence":"moderate","acv_before":false,"structured_eating":false,"movement_after":false,"movement_duration_minutes":null,"with_alcohol":false,"cooled_starch":false,"notes":null}

primary_carb_source must be one of: none, white_rice, red_brown_rice, bread, fibrous_bread, pasta, wholewheat_pasta, noodles_flour, sugar_dessert, quinoa, cauliflower_rice, other
Mappings: nasi putih/white rice→white_rice | nasi merah/hitam/brown/black rice→red_brown_rice | mie/bihun/kwetiau/noodles→noodles_flour | spaghetti/pasta→pasta | wholegrain pasta→wholewheat_pasta | roti biasa→bread | roti gandum/wholemeal→fibrous_bread | kue/dessert/sweet→sugar_dessert | no carbs→none

carb_prominence: none=no carbs | supporting=small side component | moderate=balanced part of meal | hero=dominant/carb-heavy

Modifiers (set true if mentioned):
acv_before: ACV, apple cider vinegar before meal
structured_eating: fiber first, protein first, structured eating order
movement_after: walk/exercise/gym/movement after (extract minutes if mentioned into movement_duration_minutes)
with_alcohol: alcohol, wine, beer
cooled_starch: cooled rice, cooled starch, reheated rice

TYPE 3 — glucose_reading: just a number or a reading without meal context
{"type":"glucose_reading","date":"${dateStr}","glucose_mmol":5.4,"is_fasting":false,"notes":null}
is_fasting: true if message says fasting, puasa, before breakfast, morning reading (without it being a full day record)

If the message doesn't fit any type clearly: {"type":"unknown","date":"${dateStr}","notes":"raw message saved"}`,
    messages: [{ role: "user", content: text }],
  });

  const raw = response.content[0];
  if (raw.type !== "text") throw new Error("Unexpected response type from Claude");

  const jsonText = raw.text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const parsed = JSON.parse(jsonText);
  return {
    type: parsed.type ?? "unknown",
    date: parsed.date ?? dateStr,
    data: parsed,
  };
}
