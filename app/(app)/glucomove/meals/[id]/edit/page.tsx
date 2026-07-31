import Link from "next/link";
import { getMealWithReadings } from "@/lib/glucomove-queries";
import { colors } from "@/lib/tokens";
import MealEditForm from "./MealEditForm";

export default async function MealEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getMealWithReadings(id);
  if (!data) return (
    <div style={{ padding: "40px 64px", color: colors.inkMuted, fontFamily: "var(--font-dm-sans)", fontSize: "14px" }}>
      Meal not found.
    </div>
  );

  const { meal } = data;
  const mealDate = new Date(new Date(meal.meal_start_time).getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const backHref = meal.day_record_id
    ? `/glucomove/days/${meal.day_record_id}`
    : `/glucomove/date/${mealDate}`;

  return (
    <div style={{ padding: "40px 64px", maxWidth: "640px" }}>
      <Link href={`/glucomove/meals/${id}`} style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "6px", fontFamily: "var(--font-dm-sans)", fontSize: "13px", color: colors.inkMuted, marginBottom: "20px" }}>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7.5 2L3.5 6l4 4" /></svg>
        {meal.name}
      </Link>

      <p style={{ fontFamily: "var(--font-outfit)", fontSize: "13px", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: colors.inkMuted, marginBottom: "4px" }}>
        Glucomove
      </p>
      <h1 style={{ fontFamily: "var(--font-outfit)", fontSize: "28px", fontWeight: 600, color: colors.ink, letterSpacing: "-0.01em", marginBottom: "32px" }}>
        Edit meal
      </h1>

      <MealEditForm meal={meal} />
    </div>
  );
}
