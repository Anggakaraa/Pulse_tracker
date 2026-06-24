import { getHumanProgressionMatrix, formatTestDate } from "@/lib/queries";
import { METRIC_CATALOG } from "@/lib/metrics";
import type { StatusBadge } from "@/lib/tokens";
import PrintShell from "@/components/PrintShell";

const CATEGORY_ORDER = ["metabolic", "cardiovascular", "inflammation", "hormonal", "vitals", "blood", "nutritional"] as const;
const CATEGORY_LABELS: Record<string, string> = {
  metabolic: "Metabolic",
  cardiovascular: "Cardiovascular",
  inflammation: "Inflammation",
  hormonal: "Hormonal",
  vitals: "Vitals & Fitness",
  blood: "Blood & Organ",
  nutritional: "Nutritional & Gut",
};

const BADGE_COLORS: Record<StatusBadge, string> = {
  optimal: "#4A8C62",
  strong:  "#4A8C62",
  stable:  "#2A2520",
  improve: "#B5522A",
  act:     "#A03828",
};

export default async function HumanPrintPage() {
  const { tests, matrix } = await getHumanProgressionMatrix();

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          @page { margin: 16mm 12mm; size: A4 landscape; }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; }
          h2 { page-break-before: auto; }
        }
      `}</style>

      <PrintShell title="Health Record — Progression">
        <div style={{ padding: "24px", backgroundColor: "#fff" }}>
          {/* Header */}
          <div style={{ marginBottom: "24px" }}>
            <p style={{ fontFamily: "var(--font-outfit)", fontSize: "10px", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#8A8178", marginBottom: "4px" }}>
              Health Record
            </p>
            <h1 style={{ fontFamily: "var(--font-outfit)", fontSize: "22px", fontWeight: 600, color: "#2A2520" }}>
              Bloodwork Progression
            </h1>
            <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "11px", color: "#8A8178", marginTop: "4px" }}>
              {tests.length} test{tests.length !== 1 ? "s" : ""} · Generated {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>

          {/* One table per category */}
          {CATEGORY_ORDER.map(cat => {
            const catMatrix = matrix[cat];
            if (!catMatrix) return null;

            // Only metrics that have at least one reading
            const metricKeys = Object.entries(METRIC_CATALOG)
              .filter(([key, meta]) => meta.category === cat && catMatrix[key])
              .map(([key]) => key);

            if (metricKeys.length === 0) return null;

            return (
              <div key={cat} style={{ marginBottom: "32px" }}>
                <h2 style={{ fontFamily: "var(--font-outfit)", fontSize: "13px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#8A8178", margin: "0 0 8px 0" }}>
                  {CATEGORY_LABELS[cat]}
                </h2>
                <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #EAE3D3", fontSize: "11px" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#F4EFE3", borderBottom: "1px solid #EAE3D3" }}>
                      <th style={{ padding: "7px 12px", textAlign: "left", fontFamily: "var(--font-outfit)", fontSize: "10px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#8A8178", borderRight: "1px solid #EAE3D3", minWidth: "160px" }}>
                        Marker
                      </th>
                      {tests.map(test => (
                        <th key={test.id} style={{ padding: "7px 10px", textAlign: "center", fontFamily: "var(--font-outfit)", fontSize: "9px", fontWeight: 600, color: "#2A2520", borderLeft: "1px solid #EAE3D3", whiteSpace: "nowrap" }}>
                          <span style={{ display: "block" }}>{formatTestDate(test.date)}</span>
                          {test.lab_name && <span style={{ display: "block", fontWeight: 400, color: "#8A8178", fontSize: "8px", marginTop: "1px" }}>{test.lab_name}</span>}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {metricKeys.map(key => {
                      const meta = METRIC_CATALOG[key];
                      const row = catMatrix[key] ?? {};
                      return (
                        <tr key={key} style={{ borderBottom: "1px solid #EAE3D3" }}>
                          <td style={{ padding: "6px 12px", fontFamily: "var(--font-dm-sans)", fontSize: "11px", color: "#2A2520", borderRight: "1px solid #EAE3D3" }}>
                            {meta.name}
                            <span style={{ display: "block", fontSize: "9px", color: "#8A8178" }}>{meta.unit}</span>
                          </td>
                          {tests.map(test => {
                            const cell = row[test.id];
                            if (!cell) return (
                              <td key={test.id} style={{ padding: "6px 10px", textAlign: "center", color: "#8A8178", borderLeft: "1px solid #EAE3D3" }}>—</td>
                            );
                            const color = cell.badge ? BADGE_COLORS[cell.badge] : "#2A2520";
                            return (
                              <td key={test.id} style={{ padding: "6px 10px", textAlign: "center", fontFamily: "var(--font-outfit)", fontSize: "11px", fontWeight: 600, color, borderLeft: "1px solid #EAE3D3" }}>
                                {cell.value}
                                {cell.badge && (
                                  <span style={{ display: "block", fontSize: "8px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color, marginTop: "1px" }}>
                                    {cell.badge}
                                  </span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })}

          {/* Legend */}
          <div style={{ marginTop: "8px", display: "flex", gap: "16px", flexWrap: "wrap" }}>
            {(["optimal", "strong", "stable", "improve", "act"] as StatusBadge[]).map(b => (
              <span key={b} style={{ fontFamily: "var(--font-dm-sans)", fontSize: "10px", color: BADGE_COLORS[b] }}>
                ■ {b.charAt(0).toUpperCase() + b.slice(1)}
              </span>
            ))}
            <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "10px", color: "#8A8178" }}>— = not tested</span>
          </div>
        </div>
      </PrintShell>
    </>
  );
}
