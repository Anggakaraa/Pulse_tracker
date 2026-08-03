"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { colors } from "@/lib/tokens";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import Button from "@/components/Button";

export default function MealActions({
  mealId,
  dayRecordId,
  mealDate,
}: {
  mealId: string;
  dayRecordId: string | null;
  mealDate: string; // YYYY-MM-DD in WIB
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const backHref = dayRecordId
    ? `/glucomove/days/${dayRecordId}`
    : `/glucomove/date/${mealDate}`;

  async function handleDelete() {
    setDeleting(true);
    const supabase = createSupabaseBrowserClient();
    await supabase.from("glucomove_meals").delete().eq("id", mealId);
    router.push(backHref);
  }

  if (confirming) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "13px", color: colors.inkMuted }}>Delete this meal?</span>
        <Button
          onClick={handleDelete}
          disabled={deleting}
          style={{ backgroundColor: colors.badge.act }}
        >
          {deleting ? "Deleting…" : "Yes, delete"}
        </Button>
        <Button variant="ghost" onClick={() => setConfirming(false)}>
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: "8px" }}>
      <Link href={`/glucomove/meals/${mealId}/edit`} style={{ textDecoration: "none" }}>
        <Button variant="ghost">Edit meal</Button>
      </Link>
      <Button variant="ghost" onClick={() => setConfirming(true)}>
        Delete meal
      </Button>
    </div>
  );
}
