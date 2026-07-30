import { createSupabaseServerClient } from "@/lib/supabase";
import { colors } from "@/lib/tokens";
import Link from "next/link";
import DraftsClient from "./DraftsClient";

export const dynamic = "force-dynamic";

export default async function DraftsPage() {
  const supabase = await createSupabaseServerClient();

  const { data: drafts } = await supabase
    .from("glucomove_telegram_drafts")
    .select("*")
    .eq("status", "pending")
    .order("sent_at", { ascending: true });

  // Group by date
  const grouped: Record<string, Record<string, unknown>[]> = {};
  for (const draft of drafts ?? []) {
    if (!grouped[draft.date]) grouped[draft.date] = [];
    grouped[draft.date]!.push(draft);
  }

  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div style={{ padding: "40px 64px", maxWidth: "760px" }}>
      <Link href="/glucomove" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "6px", fontFamily: "var(--font-dm-sans)", fontSize: "13px", color: colors.inkMuted, marginBottom: "20px" }}>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7.5 2L3.5 6l4 4" /></svg>
        Glucomove
      </Link>

      <p style={{ fontFamily: "var(--font-outfit)", fontSize: "13px", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: colors.inkMuted, marginBottom: "4px" }}>
        Glucomove
      </p>
      <h1 style={{ fontFamily: "var(--font-outfit)", fontSize: "28px", fontWeight: 600, color: colors.ink, letterSpacing: "-0.01em", marginBottom: "4px" }}>
        Telegram drafts
      </h1>
      <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "14px", color: colors.inkMuted, marginBottom: "32px" }}>
        {(drafts ?? []).length === 0 ? "No pending drafts." : `${(drafts ?? []).length} pending — review and approve to add to your records.`}
      </p>

      {sortedDates.length === 0 && (
        <div style={{ border: `1px solid ${colors.border}`, borderRadius: "6px", padding: "40px", textAlign: "center" }}>
          <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "14px", color: colors.inkMuted }}>
            Send a meal, glucose reading, or day record via Telegram and it will appear here.
          </p>
        </div>
      )}

      <DraftsClient drafts={drafts ?? []} grouped={grouped} sortedDates={sortedDates} />
    </div>
  );
}
