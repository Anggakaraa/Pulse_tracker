"use client";
import { colors } from "@/lib/tokens";
import { PUTIH_METRICS, getPutihRangeStatus } from "@/lib/putih-metrics";
import type { PutihProgressionMatrix } from "@/lib/putih-queries";

interface Props {
  data: PutihProgressionMatrix;
  formattedDates: Record<string, string>;
}

function buildMarkdown(data: PutihProgressionMatrix, formattedDates: Record<string, string>): string {
  const { tests, matrix } = data;
  const lines: string[] = [];

  lines.push("# Putih — Health Journey");
  lines.push(`_Generated: ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}_`);
  lines.push(`_${tests.length} test${tests.length !== 1 ? "s" : ""}_`);
  lines.push("");

  const sections: { title: string; section: "chemistry" | "hematology" }[] = [
    { title: "Chemistry", section: "chemistry" },
    { title: "Hematology", section: "hematology" },
  ];

  for (const { title, section } of sections) {
    const metrics = PUTIH_METRICS.filter(m => m.section === section && matrix[m.key]);
    if (metrics.length === 0) continue;

    lines.push(`## ${title}`);
    lines.push("");

    // Table header
    const header = ["Marker", "Unit", "Ref Range", ...tests.map(t => formattedDates[t.id])];
    lines.push("| " + header.join(" | ") + " |");
    lines.push("| " + header.map(() => "---").join(" | ") + " |");

    for (const metric of metrics) {
      const row = matrix[metric.key] ?? {};
      const refRange = metric.rangeLow !== null && metric.rangeHigh !== null
        ? `${metric.rangeLow}–${metric.rangeHigh}`
        : metric.rangeLow !== null ? `>${metric.rangeLow}`
        : metric.rangeHigh !== null ? `<${metric.rangeHigh}`
        : "—";

      const cells = tests.map(test => {
        const cell = row[test.id];
        if (!cell) return "—";
        const status = getPutihRangeStatus(cell.value, cell.lab_range_low, cell.lab_range_high);
        const flag = status === "high" ? " ↑" : status === "low" ? " ↓" : "";
        return `${cell.value}${flag}`;
      });

      lines.push("| " + [metric.name, metric.unit, refRange, ...cells].join(" | ") + " |");
    }

    lines.push("");
  }

  // Notes section
  lines.push("## Notes");
  lines.push("");
  lines.push("_Add context, vet observations, or treatment notes here._");
  lines.push("");

  return lines.join("\n");
}

export default function PutihExportButtons({ data, formattedDates }: Props) {
  function handleDownloadMd() {
    const md = buildMarkdown(data, formattedDates);
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `putih-health-journey-${new Date().toISOString().slice(0, 10)}.md`;
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
        href="/putih/journey/print"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          ...btnBase,
          backgroundColor: colors.ink,
          color: colors.background,
          border: "none",
        }}
      >
        Print / PDF
      </a>
      <button
        onClick={handleDownloadMd}
        style={{
          ...btnBase,
          backgroundColor: "transparent",
          color: colors.ink,
          border: `1px solid ${colors.border}`,
        }}
      >
        Download .md
      </button>
    </div>
  );
}
