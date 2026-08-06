import { NextRequest, NextResponse } from "next/server";
import { parseTelegramMessage } from "@/lib/telegram-parser";
import { createSupabaseServiceClient } from "@/lib/supabase-service";

// Debug endpoint — remove after confirming webhook works
export async function GET() {
  return NextResponse.json({
    env: {
      TELEGRAM_BOT_TOKEN: !!process.env.TELEGRAM_BOT_TOKEN,
      TELEGRAM_USER_ID: process.env.TELEGRAM_USER_ID ?? "NOT SET",
      ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    },
  });
}

async function sendMessage(chatId: number, text: string) {
  await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  console.log("Webhook received:", JSON.stringify(body).slice(0, 200));

  const msg = body?.message;

  // Ignore non-text messages
  if (!msg?.text) return NextResponse.json({ ok: true });

  const incomingId = String(msg.from?.id);
  const authorizedId = process.env.TELEGRAM_USER_ID;
  console.log("User ID check:", incomingId, "vs", authorizedId, "match:", incomingId === authorizedId);

  // Only accept messages from the authorized user
  if (incomingId !== authorizedId) {
    return NextResponse.json({ ok: true });
  }

  const chatId: number = msg.chat.id;
  const text: string = msg.text;
  const sentAt = new Date(msg.date * 1000);

  const supabase = createSupabaseServiceClient();
  const userId = process.env.GLUCOMOVE_USER_ID!;

  // Wake-up shortcut — detect before calling the parser
  if (/\b(wake\s*up|woke\s*up|good\s*morning|bangun|pagi)\b/i.test(text)) {
    // If the message mentions an explicit time (e.g. "waking up 6:30am", "bangun 06.30"),
    // use that as the lookup anchor instead of the message sent time.
    const timeMatch = text.match(/\b(\d{1,2})[.:](\d{2})\s*(am|pm)?\b/i);
    let lookupAnchor = sentAt;
    if (timeMatch) {
      let hours = parseInt(timeMatch[1], 10);
      const minutes = parseInt(timeMatch[2], 10);
      const meridiem = timeMatch[3]?.toLowerCase();
      if (meridiem === "pm" && hours < 12) hours += 12;
      if (meridiem === "am" && hours === 12) hours = 0;
      // Build the timestamp in WIB (UTC+7) for today's date
      const wibDate = sentAt.toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
      const wibIso = `${wibDate}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00+07:00`;
      lookupAnchor = new Date(wibIso);
    }

    // Search ±90 min from anchor — CGM sync may lag, so cast a wide net then pick the closest
    const windowMs = 90 * 60 * 1000;
    const from = new Date(lookupAnchor.getTime() - windowMs).toISOString();
    const to   = new Date(lookupAnchor.getTime() + windowMs).toISOString();

    const { data: nearby } = await supabase
      .from("glucomove_readings")
      .select("timestamp, glucose_mmol")
      .eq("user_id", userId)
      .gte("timestamp", from)
      .lte("timestamp", to)
      .order("timestamp", { ascending: true });

    if (!nearby || nearby.length === 0) {
      await sendMessage(chatId, "👋 Good morning! No CGM reading found within 90 min of that time — check your sensor.");
      return NextResponse.json({ ok: true });
    }

    // Pick the reading closest to the lookup anchor
    const closest = nearby.reduce((best, r) =>
      Math.abs(new Date(r.timestamp).getTime() - lookupAnchor.getTime()) <
      Math.abs(new Date(best.timestamp).getTime() - lookupAnchor.getTime()) ? r : best
    );

    const date = sentAt.toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
    await supabase.from("glucomove_day_records").upsert(
      { user_id: userId, date, waking_glucose_mmol: closest.glucose_mmol },
      { onConflict: "user_id,date", ignoreDuplicates: false }
    );

    const readingTime = new Date(closest.timestamp).toLocaleTimeString("en-GB", {
      timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit",
    });
    await sendMessage(chatId, `👋 Good morning! Waking glucose: ${closest.glucose_mmol.toFixed(1)} mmol/L (CGM @ ${readingTime} WIB)`);
    return NextResponse.json({ ok: true });
  }

  // Send immediate ack so Telegram doesn't retry while we process
  void sendMessage(chatId, "⏳ Processing…");

  try {
    console.log("Parsing message:", text);
    const results = await parseTelegramMessage(text, sentAt);
    console.log("Parsed:", results.map(r => r.type).join(", "));

    await supabase.from("glucomove_telegram_drafts").insert(
      results.map(parsed => ({
        type: parsed.type,
        raw_message: text,
        parsed_data: parsed.data,
        date: parsed.date,
        telegram_message_id: msg.message_id,
        sent_at: sentAt.toISOString(),
      }))
    );

    function draftReplyLine(parsed: { type: string; date: string; data: Record<string, unknown> }): string {
      const d = parsed.data;
      if (parsed.type === "day_record") {
        const parts: string[] = [`📅 ${parsed.date}`];
        if (d.waking_glucose_mmol != null) parts.push(`Waking: ${d.waking_glucose_mmol} mmol/L`);
        if (d.time_in_range_pct != null) parts.push(`TIR: ${d.time_in_range_pct}%`);
        if (d.overnight_avg_mmol != null) parts.push(`Overnight: ${d.overnight_avg_mmol} mmol/L`);
        if (d.daily_avg_mmol != null) parts.push(`Daily avg: ${d.daily_avg_mmol} mmol/L`);
        return `✅ Day record — ${parts.join(" · ")}`;
      }
      if (parsed.type === "meal") return `✅ ${String(d.meal_type ?? "Meal")} — ${String(d.name ?? text.slice(0, 50))}`;
      if (parsed.type === "glucose_reading") return `✅ Reading: ${d.glucose_mmol} mmol/L`;
      if (parsed.type === "event") return `✅ Event: ${String(d.name ?? d.event_type ?? "event")}`;
      return `⚠️ Saved as draft — couldn't fully parse. Review in app.`;
    }

    const replyLines = results.map(draftReplyLine);
    await sendMessage(chatId, replyLines.join("\n"));

  } catch (err) {
    console.error("Telegram webhook error:", err);

    // Save raw message even on parse failure
    await supabase.from("glucomove_telegram_drafts").insert({
      type: "unknown",
      raw_message: text,
      parsed_data: { raw: text },
      date: sentAt.toISOString().slice(0, 10),
      telegram_message_id: msg.message_id,
      sent_at: sentAt.toISOString(),
    });

    const errDetail = err instanceof Error ? err.message : String(err);
    await sendMessage(chatId, `⚠️ Saved as draft — parse failed.\n${errDetail.slice(0, 200)}`);
  }

  return NextResponse.json({ ok: true });
}
