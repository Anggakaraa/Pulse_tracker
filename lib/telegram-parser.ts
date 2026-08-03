import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export type DraftType = "day_record" | "meal" | "glucose_reading" | "event" | "unknown";

export interface ParsedMessage {
  type: DraftType;
  date: string;
  data: Record<string, unknown>;
}

export async function parseTelegramMessage(text: string, sentAt: Date): Promise<ParsedMessage[]> {
  const dateStr = sentAt.toISOString().slice(0, 10);

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    system: `You parse health tracking messages for a personal glucose tracking app. Always return a JSON ARRAY of one or more record objects — never a bare object. No explanation, no markdown, just the array.

Today's date: ${dateStr}. All glucose values are in mmol/L. Timezone: WIB (UTC+7).

TIME EXTRACTION: If the message contains a time (e.g. "5.4 11.50", "lunch 12.00 ayam geprek", "5.4 11:30"), extract it as "time":"HH:MM" in 24-hour format. If no time is mentioned, omit the "time" field entirely.

DATE EXTRACTION: If the message contains a date (e.g. "jul 30", "30/7", "yesterday"), resolve it to "YYYY-MM-DD". Otherwise use today: ${dateStr}.

Detect the message type and wrap the result in an array. If the message contains data for more than one date, return one element per date.

TYPE 1 — day_record: mentions waking glucose, morning reading, overnight average, daily average, or day-level context flags (bad sleep, alcohol)
Fields: waking_glucose_mmol, overnight_avg_mmol, daily_avg_mmol, bad_sleep, alcohol_previous_night, notes
bad_sleep: true if the message mentions poor sleep, bad sleep, kurang tidur, or similar — referring to the night before this day
alcohol_previous_night: true if the message mentions drinking alcohol the previous night (not during the day itself — use event type "alcohol" for that)
Example — "waking 5.2": [{"type":"day_record","date":"${dateStr}","waking_glucose_mmol":5.2,"overnight_avg_mmol":null,"daily_avg_mmol":null,"bad_sleep":false,"alcohol_previous_night":false,"notes":null}]
Example — "waking 5.8 bad sleep last night": [{"type":"day_record","date":"${dateStr}","waking_glucose_mmol":5.8,"overnight_avg_mmol":null,"daily_avg_mmol":null,"bad_sleep":true,"alcohol_previous_night":false,"notes":null}]
Example — "waking 6.1 had drinks last night": [{"type":"day_record","date":"${dateStr}","waking_glucose_mmol":6.1,"overnight_avg_mmol":null,"daily_avg_mmol":null,"bad_sleep":false,"alcohol_previous_night":true,"notes":null}]
Example — "31 Jul: waking 4.9 overnight 4.3, 30 Jul: avg 4.3": [{"type":"day_record","date":"2026-07-31","waking_glucose_mmol":4.9,"overnight_avg_mmol":4.3,"daily_avg_mmol":null,"bad_sleep":false,"alcohol_previous_night":false,"notes":null},{"type":"day_record","date":"2026-07-30","waking_glucose_mmol":null,"overnight_avg_mmol":null,"daily_avg_mmol":4.3,"bad_sleep":false,"alcohol_previous_night":false,"notes":null}]

TYPE 2 — meal: mentions a meal (lunch, dinner, breakfast, snack, makan) or lists food items with meal context
[{"type":"meal","date":"${dateStr}","time":"HH:MM","meal_type":"lunch","name":"concise meal name","description":"full description of everything eaten","primary_carb_source":["white_rice"],"carb_prominence":"moderate","fiber_prominence":"low","protein_prominence":"moderate","fat_prominence":"moderate","fat_before":false,"acv_before":false,"structured_eating":false,"movement_after":false,"movement_duration_minutes":null,"with_alcohol":false,"cooled_starch":false,"fruit_after":false,"dessert_after":false,"added_sugar":false,"large_portion":false,"eating_out":false,"notes":null}]

IMPORTANT: If the user explicitly states prominence levels (e.g. "high protein", "low carb", "high fiber", "high fat"), use those values directly — do not override with your own inference from food items.

fiber_prominence: how much fiber is present in the meal overall
low=minimal veg, mostly refined carbs (e.g. plain white rice, white bread, plain pasta) | moderate=some veg/beans/greens alongside carbs (e.g. rice with a side of veg, soup with mixed ingredients) | high=fiber-rich meal (e.g. salad, lots of vegetables, legume-heavy, stir-fry with substantial greens)

protein_prominence: how much protein is present in the meal overall
low=little to no protein (plain rice, plain bread, fruit snack) | moderate=some protein alongside other components (rice with a small piece of fish, pasta with a little chicken) | high=protein-dominant meal (large portion of meat/eggs/tofu/legumes, e.g. steak, grilled chicken breast, nasi padang with rendang)

fat_prominence: how much fat is present in the meal overall
low=minimal fat (plain rice, bread, fruit, steamed veg) | moderate=some fat (stir-fry with oil, rice with a side of meat cooked normally) | high=fat-rich meal (fried food, rendang, avocado-heavy, full-fat dairy, coconut milk-based dishes)

fat_before: true ONLY if the message explicitly mentions taking olive oil, butter, nuts, avocado, or another fat source as a deliberate pre-meal buffer before starting to eat (not just fat as part of the meal)

primary_carb_source is an ARRAY of carb sources (can be more than one). Each element must be one of: none, white_rice, red_brown_rice, bread, fibrous_bread, pasta, wholewheat_pasta, noodles_flour, sugar_dessert, quinoa, cauliflower_rice, potato, other
Use ["none"] when there are no meaningful carbs. Use multiple values when the meal has multiple distinct carb sources (e.g. rice and bread → ["white_rice","bread"]). Never mix "none" with other values.
Mappings: nasi putih/white rice→white_rice | nasi merah/hitam/brown/black rice→red_brown_rice | mie/bihun/kwetiau/noodles→noodles_flour | spaghetti/pasta→pasta | wholegrain pasta→wholewheat_pasta | roti biasa→bread | roti gandum/wholemeal→fibrous_bread | kue/dessert/sweet→sugar_dessert | kentang/potato/fries/mashed potato→potato | no carbs→none

carb_prominence: none=no carbs | supporting=small side component | moderate=balanced part of meal | hero=dominant/carb-heavy

Modifiers (set true if mentioned):
acv_before: ACV, apple cider vinegar before meal
structured_eating: fiber first, protein first, structured eating order
movement_after: walk/exercise/gym/movement after (extract minutes if mentioned into movement_duration_minutes)
with_alcohol: alcohol, wine, beer
cooled_starch: cooled rice, cooled starch, reheated rice
fruit_after: fruit eaten immediately after the meal (e.g. "had kiwi after", "ate fruit after lunch")
dessert_after: dessert or sweet item eaten immediately after the meal (e.g. "had ice cream after", "dessert after dinner")
added_sugar: dishes where sugar is a deliberate cooking ingredient — sweet marinades, glazes, sauces (e.g. galbi, teriyaki, sweet and sour, BBQ sauce). Not for desserts (use dessert_after) — for savoury dishes with hidden sugar in preparation.
large_portion: felt full and bloated after the meal — a subjective signal of overeating, regardless of what was eaten. Set true if the user mentions feeling stuffed, bloated, kekenyangan, or explicitly flags a large portion.
eating_out: meal was at a restaurant, hawker, food court, or takeaway — ingredients and preparation unknown

TYPE 3 — glucose_reading: just a number or a short reading without meal context
[{"type":"glucose_reading","date":"${dateStr}","time":"HH:MM","glucose_mmol":5.4,"is_fasting":false,"notes":null}]
is_fasting: true if message says fasting, puasa, before breakfast, morning reading (without it being a full day record)

TYPE 4 — event: a non-meal activity that may affect glucose (stress, exercise, gym, workout, alcohol session, illness, sick, poor sleep, travel, fasting period, medication taken, recovery activities)
[{"type":"event","date":"${dateStr}","time":"HH:MM","end_time":"HH:MM","event_type":"stress","name":"concise event name","intensity":"low|moderate|high|null","notes":null}]
event_type must be: stress | exercise | recovery | alcohol | illness | sleep | travel | fasting | medication | other
recovery: use for deliberate physical recovery activities — ice bath, cold plunge, sauna, steam room, massage, stretching session, contrast shower. These are distinct from exercise.
Examples for medication: "took berberine", "metformin 500mg", "took supplements" → medication type
Examples for recovery: "ice bath 07.00 15min"→recovery 07:00-07:15 | "sauna 45min"→recovery | "cold plunge"→recovery | "massage 1hr"→recovery
intensity: high/moderate/low if implied. If duration is given without end_time (e.g. "gym 1hr"), compute end_time from start + duration.
Examples: "gym 07.00 1hr"→exercise 07:00-08:00 | "high stress 14.00-16.00"→stress high 14:00-16:00 | "sick today"→illness all day (omit time) | "poor sleep"→sleep

If the message doesn't fit any type clearly: [{"type":"unknown","date":"${dateStr}","notes":"raw message saved"}]`,
    messages: [{ role: "user", content: text }],
  });

  const raw = response.content[0];
  if (raw.type !== "text") throw new Error("Unexpected response type from Claude");

  const stripped = raw.text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

  // Try the whole text first (ideal: model returns a bare array)
  // Then fall back to extracting the outermost [...] or {...}
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripped);
  } catch {
    const m = stripped.match(/\[[\s\S]*\]/) ?? stripped.match(/\{[\s\S]*\}/);
    if (!m) throw new Error(`No JSON found in model response: ${stripped.slice(0, 200)}`);
    parsed = JSON.parse(m[0]);
  }

  const items: Record<string, unknown>[] = Array.isArray(parsed) ? parsed : [parsed as Record<string, unknown>];
  return items.map(item => ({
    type: (item.type ?? "unknown") as DraftType,
    date: (item.date as string | undefined) ?? dateStr,
    data: item,
  }));
}
