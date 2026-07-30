"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { colors } from "@/lib/tokens";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function MealActions({ mealId, dayRecordId }: { mealId: string; dayRecordId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    const supabase = createSupabaseBrowserClient();
    await supabase.from("glucomove_meals").delete().eq("id", mealId);
    router.push(`/glucomove/days/${dayRecordId}`);
  }

  if (confirming) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "13px", color: colors.inkMuted }}>Delete this meal?</span>
        <button
          onClick={handleDelete}
          disabled={deleting}
          style={{ padding: "5px 12px", backgroundColor: "#A03828", color: "#FBF8F0", border: "none", borderRadius: "4px", fontFamily: "var(--font-dm-sans)", fontSize: "12px", cursor: "pointer", opacity: deleting ? 0.6 : 1 }}
        >
          {deleting ? "Deleting…" : "Yes, delete"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          style={{ padding: "5px 12px", backgroundColor: "transparent", color: colors.inkMuted, border: `1px solid ${colors.border}`, borderRadius: "4px", fontFamily: "var(--font-dm-sans)", fontSize: "12px", cursor: "pointer" }}
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      style={{ padding: "5px 12px", backgroundColor: "transparent", color: colors.inkMuted, border: `1px solid ${colors.border}`, borderRadius: "4px", fontFamily: "var(--font-dm-sans)", fontSize: "12px", cursor: "pointer" }}
    >
      Delete meal
    </button>
  );
}
