import Link from "next/link";
import { notFound } from "next/navigation";
import ExperimentTable from "@/components/ExperimentTable";
import CategoryPill from "@/components/CategoryPill";
import ExperimentCharts from "./ExperimentCharts";
import ExperimentNotes from "@/components/ExperimentNotes";
import { colors } from "@/lib/tokens";
import { getExperimentDetail } from "@/lib/queries";

export default async function ExperimentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const exp = await getExperimentDetail(id);

  if (!exp) notFound();

  const hasData = exp.dates.length > 0 && exp.metrics.some(m => m.readings.some(r => r !== null));

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
        <Link href="/experiments" style={{
          fontFamily: "var(--font-dm-sans)",
          fontWeight: 300,
          fontSize: "14px",
          color: colors.inkMuted,
          textDecoration: "none",
        }}>
          ← Experiments
        </Link>
        <Link href={`/experiments/${exp.id}/edit`} style={{
          fontFamily: "var(--font-dm-sans)",
          fontSize: "13px",
          color: colors.inkMuted,
          textDecoration: "none",
          border: `1px solid ${colors.border}`,
          borderRadius: "4px",
          padding: "5px 12px",
        }}>
          Edit
        </Link>
      </div>

      {/* Header */}
      <div style={{ marginBottom: "32px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
          <span style={{
            fontFamily: "var(--font-dm-sans)",
            fontWeight: 300,
            fontSize: "11px",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: exp.status === "active" ? colors.badge.optimal : colors.inkMuted,
          }}>
            {exp.status === "active" ? "● Active" : "Completed"}
          </span>
          <span style={{
            fontFamily: "var(--font-dm-sans)",
            fontWeight: 300,
            fontSize: "11px",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: colors.inkMuted,
          }}>
            {exp.startDateFormatted}{exp.endDateFormatted ? ` – ${exp.endDateFormatted}` : " – ongoing"}
          </span>
        </div>

        <h1 style={{
          fontFamily: "var(--font-outfit)",
          fontWeight: 600,
          fontSize: "28px",
          color: colors.ink,
          letterSpacing: "-0.01em",
          margin: "0 0 10px",
        }}>
          {exp.name}
        </h1>

        {exp.hypothesis && (
          <p style={{
            fontFamily: "var(--font-dm-sans)",
            fontWeight: 400,
            fontSize: "14px",
            color: colors.inkMuted,
            margin: "0 0 16px",
            lineHeight: 1.6,
            maxWidth: "640px",
          }}>
            {exp.hypothesis}
          </p>
        )}

        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {exp.categories.map(cat => <CategoryPill key={cat} category={cat} />)}
        </div>
      </div>

      <div style={{ borderTop: `1px solid ${colors.border}`, marginBottom: "32px" }} />

      {/* Progression table */}
      <div style={{ marginBottom: "40px" }}>
        <p style={{
          fontFamily: "var(--font-outfit)",
          fontWeight: 600,
          fontSize: "11px",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: colors.inkMuted,
          marginBottom: "16px",
        }}>
          Progression
        </p>
        {hasData ? (
          <ExperimentTable
            experimentId={exp.id}
            dates={exp.dates}
            testIds={exp.testIds}
            columnLabels={exp.columnLabels}
            excludedTestIds={exp.excludedTestIds}
            metrics={exp.metrics}
          />
        ) : (
          <p style={{
            fontFamily: "var(--font-dm-sans)",
            fontSize: "14px",
            fontWeight: 300,
            fontStyle: "italic",
            color: colors.inkMuted,
          }}>
            No test data found within this experiment&apos;s date range yet.
          </p>
        )}
      </div>

      <div style={{ borderTop: `1px solid ${colors.border}`, marginBottom: "32px" }} />

      {/* Notes */}
      <div style={{ marginBottom: "40px" }}>
        <ExperimentNotes experimentId={exp.id} initialNotes={exp.notes} />
      </div>

      <div style={{ borderTop: `1px solid ${colors.border}`, marginBottom: "32px" }} />

      {/* Trend charts */}
      {hasData && <ExperimentCharts exp={exp} />}
    </div>
  );
}
