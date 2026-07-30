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
  const msg = body?.message;

  // Ignore non-text messages
  if (!msg?.text) return NextResponse.json({ ok: true });

  // Only accept messages from the authorized user
  if (String(msg.from?.id) !== process.env.TELEGRAM_USER_ID) {
    return NextResponse.json({ ok: true });
  }

  const chatId: number = msg.chat.id;
  const text: string = msg.text;
  const sentAt = new Date(msg.date * 1000); // Telegram sends Unix timestamp

  const supabase = createSupabaseServiceClient();

  try {
    const parsed = await parseTelegramMessage(text, sentAt);

    await supabase.from("glucomove_telegram_drafts").insert({
      type: parsed.type,
      raw_message: text,
      parsed_data: parsed.data,
      date: parsed.date,
      telegram_message_id: msg.message_id,
      sent_at: sentAt.toISOString(),
    });

    const replies: Record<string, string> = {
      day_record: `✅ Day record saved as draft\nWaking: ${parsed.data.waking_glucose_mmol ?? "?"} mmol/L`,
      meal: `✅ ${String(parsed.data.meal_type ?? "Meal")} saved as draft\n${String(parsed.data.name ?? text.slice(0, 50))}`,
      glucose_reading: `✅ Reading saved as draft: ${parsed.data.glucose_mmol} mmol/L`,
      unknown: `⚠️ Saved as draft — couldn't fully parse. Review in app.`,
    };

    await sendMessage(chatId, replies[parsed.type] ?? "✅ Saved as draft");

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

    await sendMessage(chatId, "⚠️ Saved as draft — couldn't parse. Review in app.");
  }

  return NextResponse.json({ ok: true });
}
