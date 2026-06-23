"use client";
import { colors } from "@/lib/tokens";
import { METRIC_CATALOG } from "@/lib/metrics";
import type { HumanProgressionMatrix } from "@/lib/queries";
import type { StatusBadge } from "@/lib/tokens";

interface Props {
  data: HumanProgressionMatrix;
  formattedDates: Record<string, string>;
}

const CATEGORY_ORDER = ["metabolic", "cardiovascular", "inflammation", "hormonal", "vitals", "blood", "nutritional"];
const CATEGORY_LABELS: Record<string, string> = {
  metabolic: "Metabolic",
  cardiovascular: "Cardiovascular",
  inflammation: "Inflammation",
  hormonal: "Hormonal",
  vitals: "Vitals & Fitness",
  blood: "Blood & Organ",
  nutritional: "Nutritional & Gut",
};

function buildMarkdown(data: HumanProgressionMatrix, formattedDates: Record<string, string>): string {
  const { tests, matrix } = data;
  const lines: string[] = [];

  lines.push("# Health Record — Bloodwork Progression");
  lines.push(`_Generated: ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}_`);
  lines.push(`_${tests.length} test${tests.length !== 1 ? "s" : ""}_`);
  lines.push("");

  for (const cat of CATEGORY_ORDER) {
    const catMatrix = matrix[cat];
    if (!catMatrix) continue;

    const metricKeys = Object.entries(METRIC_CATALOG)
      .filter(([key, meta]) => meta.category === cat && catMatrix[key])
      .map(([key]) => key);

    if (metricKeys.length === 0) continue;

    lines.push(`## ${CATEGORY_LABELS[cat]}`);
    lines.push("");

    const header = ["Marker", "Unit", ...tests.map(t => formattedDates[t.id])];
    lines.push("| " + header.join(" | ") + " |");
    lines.push("| " + header.map(() => "---").join(" | ") + " |");

    for (const key of metricKeys) {
      const meta = METRIC_CATALOG[key];
      const row = catMatrix[key] ?? {};
      const cells = tests.map(test => {
        const cell = row[test.id];
        if (!cell) return "—";
        return cell.badge ? `${cell.value} (${cell.badge})` : String(cell.value);
      });
      lines.push("| " + [meta.name, meta.unit, ...cells].join(" | ") + " |");
    }

    lines.push("");
  }

  lines.push("## Notes");
  lines.push("");
  lines.push("_Add context, observations, or follow-up notes here._");
  lines.push("");

  return lines.join("\n");
}

export default function HumanExportButtons({ data, formattedDates }: Props) {
  function handleDownloadMd() {
    const md = buildMarkdown(data, formattedDates);
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `health-record-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const btnBase: React.CSSProperties = {
    padding: "8px 16px",
    borderRadius: "4px",
    fontFamily: "var(--font-outfit)",
    fontSize: "12px",
    fontWeight: 600,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    cursor: "pointer",
    textDecoration: "none",
    display: "inline-block",
  };

  return (
    <div style={{ display: "flex", gap: "8px" }}>
      <a
        href="/dashboard/print"
        target="_blank"
        rel="noopener noreferrer"
        style={{ ...btnBase, backgroundColor: colors.ink, color: colors.background, border: "none" }}
      >
        Print / PDF
      </a>
      <button
        onClick={handleDownloadMd}
        style={{ ...btnBase, backgroundColor: "transparent", color: colors.ink, border: `1px solid ${colors.border}` }}
      >
        Download .md
      </button>
    </div>
  );
}
