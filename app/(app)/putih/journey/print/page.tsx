import { getPutihProgressionMatrix, formatPutihDate } from "@/lib/putih-queries";
import { PUTIH_METRICS, getPutihRangeStatus } from "@/lib/putih-metrics";
import PrintShell from "./PrintShell";

export default async function PutihPrintPage() {
  const { tests, matrix } = await getPutihProgressionMatrix();

  const chemistryMetrics = PUTIH_METRICS.filter(m => m.section === "chemistry" && matrix[m.key]);
  const hematologyMetrics = PUTIH_METRICS.filter(m => m.section === "hematology" && matrix[m.key]);

  const renderSection = (title: string, metrics: typeof PUTIH_METRICS) => (
    <>
      <tr>
        <td colSpan={tests.length + 1} style={{
          backgroundColor: "#F4EFE3",
          padding: "6px 12px",
          fontFamily: "var(--font-outfit)",
          fontSize: "10px",
          fontWeight: 600,
          letterSpacing: "0.1em",
          textTransform: "uppercase" as const,
          color: "#8A8178",
          borderBottom: "1px solid #EAE3D3",
        }}>
          {title}
        </td>
      </tr>
      {metrics.map(metric => {
        const row = matrix[metric.key] ?? {};
        return (
          <tr key={metric.key} style={{ borderBottom: "1px solid #EAE3D3" }}>
            <td style={{
              padding: "7px 12px",
              fontFamily: "var(--font-dm-sans)",
              fontSize: "11px",
              color: "#2A2520",
              borderRight: "1px solid #EAE3D3",
              minWidth: "140px",
            }}>
              {metric.name}
              <span style={{ display: "block", fontSize: "9px", color: "#8A8178", marginTop: "1px" }}>
                {metric.rangeLow !== null && metric.rangeHigh !== null
                  ? `${metric.rangeLow}–${metric.rangeHigh} ${metric.unit}`
                  : metric.unit}
              </span>
            </td>
            {tests.map(test => {
              const cell = row[test.id];
              if (!cell) return (
                <td key={test.id} style={{ padding: "7px 10px", textAlign: "center", color: "#8A8178", fontSize: "11px", borderLeft: "1px solid #EAE3D3" }}>—</td>
              );
              const status = getPutihRangeStatus(cell.value, cell.lab_range_low, cell.lab_range_high);
              return (
                <td key={test.id} style={{
                  padding: "7px 10px",
                  textAlign: "center" as const,
                  fontFamily: "var(--font-outfit)",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: status === "normal" ? "#2A2520" : "#A03828",
                  borderLeft: "1px solid #EAE3D3",
                }}>
                  {cell.value}
                  {status !== "normal" && (
                    <span style={{ fontSize: "8px", marginLeft: "2px", verticalAlign: "super" as const }}>
                      {status === "high" ? "↑" : "↓"}
                    </span>
                  )}
                </td>
              );
            })}
          </tr>
        );
      })}
    </>
  );

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          @page { margin: 16mm 12mm; size: A4 landscape; }
        }
      `}</style>

      <PrintShell>
        <div style={{ padding: "24px", backgroundColor: "#fff" }}>
          {/* Header */}
          <div style={{ marginBottom: "20px" }}>
            <p style={{ fontFamily: "var(--font-outfit)", fontSize: "10px", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#8A8178", marginBottom: "4px" }}>
              Putih · Health Journey
            </p>
            <h1 style={{ fontFamily: "var(--font-outfit)", fontSize: "22px", fontWeight: 600, color: "#2A2520" }}>
              Bloodwork Progression
            </h1>
            <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "11px", color: "#8A8178", marginTop: "4px" }}>
              {tests.length} test{tests.length !== 1 ? "s" : ""} · Generated {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>

          {/* Table */}
          <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #EAE3D3", fontSize: "12px" }}>
            <thead>
              <tr style={{ backgroundColor: "#F4EFE3", borderBottom: "1px solid #EAE3D3" }}>
                <th style={{ padding: "8px 12px", textAlign: "left", fontFamily: "var(--font-outfit)", fontSize: "10px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8A8178", borderRight: "1px solid #EAE3D3", minWidth: "140px" }}>
                  Marker
                </th>
                {tests.map(test => (
                  <th key={test.id} style={{ padding: "8px 10px", textAlign: "center", fontFamily: "var(--font-outfit)", fontSize: "10px", fontWeight: 600, color: "#2A2520", borderLeft: "1px solid #EAE3D3", whiteSpace: "nowrap" }}>
                    <span style={{ display: "block" }}>{formatPutihDate(test.date)}</span>
                    {test.lab_name && <span style={{ display: "block", fontWeight: 400, color: "#8A8178", fontSize: "9px", marginTop: "1px" }}>{test.lab_name}</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {renderSection("Chemistry", chemistryMetrics)}
              {renderSection("Hematology", hematologyMetrics)}
            </tbody>
          </table>

          {/* Legend */}
          <div style={{ marginTop: "12px", display: "flex", gap: "20px" }}>
            <span style={{ fontFamily: "var(--font-dm-sans)", fontSize: "10px", color: "#8A8178" }}>
              <span style={{ color: "#A03828", fontWeight: 600 }}>Red ↑↓</span> = outside reference range &nbsp;·&nbsp; — = not tested
            </span>
          </div>
        </div>
      </PrintShell>
    </>
  );
}
