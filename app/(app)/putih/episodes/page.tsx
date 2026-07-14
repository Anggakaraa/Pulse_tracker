import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase";
import { colors } from "@/lib/tokens";

const SEVERITY_LABEL: Record<string, string> = {
  mild: "Mild",
  moderate: "Moderate",
  severe: "Severe",
};

const SEVERITY_COLOR: Record<string, string> = {
  mild: colors.badge.optimal,
  moderate: colors.badge.stable,
  severe: colors.badge.act,
};

export default async function PutihEpisodesPage() {
  const supabase = await createSupabaseServerClient();
  const { data: episodes } = await supabase
    .from("putih_episodes")
    .select("*")
    .order("date", { ascending: false });

  return (
    <div style={{ padding: "40px 64px", maxWidth: "960px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "32px" }}>
        <div>
          <p style={{
            fontFamily: "var(--font-outfit)",
            fontSize: "13px",
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: colors.inkMuted,
            marginBottom: "4px",
          }}>
            Putih
          </p>
          <h1 style={{
            fontFamily: "var(--font-outfit)",
            fontSize: "28px",
            fontWeight: 600,
            color: colors.ink,
            letterSpacing: "-0.01em",
          }}>
            Episodes
          </h1>
        </div>
        <Link href="/putih/episodes/new" style={{ textDecoration: "none" }}>
          <button style={{
            padding: "8px 16px",
            backgroundColor: colors.ink,
            color: colors.background,
            border: "none",
            borderRadius: "4px",
            fontFamily: "var(--font-dm-sans)",
            fontSize: "14px",
            cursor: "pointer",
          }}>
            + Log episode
          </button>
        </Link>
      </div>

      {/* Table */}
      {!episodes || episodes.length === 0 ? (
        <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "14px", color: colors.inkMuted }}>
          No episodes logged yet.
        </p>
      ) : (
        <div style={{
          border: `1px solid ${colors.border}`,
          borderRadius: "6px",
          overflow: "hidden",
        }}>
          {/* Table header */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "100px 1fr 1fr 90px 1fr 1fr",
            gap: "0",
            backgroundColor: colors.surface,
            borderBottom: `1px solid ${colors.border}`,
            padding: "10px 16px",
          }}>
            {["Date", "Trigger", "Symptoms", "Severity", "Action Taken", "Recovery"].map(h => (
              <span key={h} style={{
                fontFamily: "var(--font-outfit)",
                fontSize: "11px",
                fontWeight: 600,
                letterSpacing: "0.10em",
                textTransform: "uppercase",
                color: colors.inkMuted,
              }}>
                {h}
              </span>
            ))}
          </div>

          {/* Rows */}
          {episodes.map((ep, i) => {
            const symptoms: string[] = Array.isArray(ep.symptoms) ? ep.symptoms : [];
            const allSymptoms = ep.symptoms_other
              ? [...symptoms, `Other: ${ep.symptoms_other}`]
              : symptoms;

            return (
              <div
                key={ep.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "100px 1fr 1fr 90px 1fr 1fr",
                  gap: "0",
                  padding: "14px 16px",
                  borderBottom: i < episodes.length - 1 ? `1px solid ${colors.border}` : "none",
                  alignItems: "start",
                }}
              >
                <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "13px", color: colors.inkMuted }}>
                  {new Date(ep.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </span>
                <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "13px", color: colors.ink, paddingRight: "12px" }}>
                  {ep.suspected_trigger || "—"}
                </span>
                <div style={{ paddingRight: "12px" }}>
                  {allSymptoms.length === 0 ? (
                    <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "13px", color: colors.inkMuted }}>—</span>
                  ) : (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                      {allSymptoms.map((s, si) => (
                        <span key={si} style={{
                          fontFamily: "var(--font-dm-sans)",
                          fontSize: "11px",
                          color: colors.ink,
                          backgroundColor: colors.surface,
                          border: `1px solid ${colors.border}`,
                          borderRadius: "4px",
                          padding: "2px 6px",
                        }}>
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <span style={{
                  fontFamily: "var(--font-outfit)",
                  fontSize: "11px",
                  fontWeight: 600,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: SEVERITY_COLOR[ep.severity] || colors.ink,
                }}>
                  {SEVERITY_LABEL[ep.severity] || ep.severity}
                </span>
                <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "13px", color: colors.ink, paddingRight: "12px" }}>
                  {ep.action_taken || "—"}
                </span>
                <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "13px", color: colors.ink }}>
                  {ep.recovery || "—"}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
