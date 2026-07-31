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

  // Send immediate ack so Telegram doesn't retry while we process
  void sendMessage(chatId, "⏳ Processing…");

  const supabase = createSupabaseServiceClient();

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
