import { colors } from "@/lib/tokens";
import { PUTIH_METRICS, PUTIH_METRIC_MAP } from "@/lib/putih-metrics";
import { getPutihLatestReadings, getPutihReadingsHistory, getPutihProgressionMatrix, formatPutihDate } from "@/lib/putih-queries";
import PutihMetricRow from "@/components/PutihMetricRow";
import PutihExportButtons from "@/components/PutihExportButtons";

function SectionHeader({ title }: { title: string }) {
  return (
    <div style={{
      padding: "12px 20px",
      backgroundColor: colors.surface,
      borderBottom: `1px solid ${colors.border}`,
    }}>
      <p style={{
        fontFamily: "var(--font-outfit)",
        fontSize: "11px",
        fontWeight: 600,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: colors.inkMuted,
        margin: 0,
      }}>
        {title}
      </p>
    </div>
  );
}

export default async function PutihJourneyPage() {
  const latestReadings = await getPutihLatestReadings();
  const progressionData = await getPutihProgressionMatrix();
  const formattedDates = Object.fromEntries(progressionData.tests.map(t => [t.id, formatPutihDate(t.date)]));
  const latestMap = Object.fromEntries(latestReadings.map(r => [r.metric_key, r]));

  // Fetch history for all metrics that have data
  const histories = await Promise.all(
    latestReadings.map(r => getPutihReadingsHistory(r.metric_key).then(h => [r.metric_key, h] as const))
  );
  const historyMap = Object.fromEntries(histories);

  const chemistryMetrics = PUTIH_METRICS.filter(m => m.section === "chemistry");
  const hematologyMetrics = PUTIH_METRICS.filter(m => m.section === "hematology");

  const hasAnyData = latestReadings.length > 0;

  return (
    <div>
      <div style={{ marginBottom: "32px", display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div>
          <p style={{
            fontFamily: "var(--font-outfit)",
            fontSize: "11px",
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: colors.inkMuted,
            margin: "0 0 8px 0",
          }}>
            Putih
          </p>
          <h1 style={{
            fontFamily: "var(--font-outfit)",
            fontSize: "28px",
            fontWeight: 600,
            color: colors.ink,
            margin: 0,
            letterSpacing: "-0.01em",
          }}>
            Health Journey
          </h1>
        </div>
        <PutihExportButtons data={progressionData} formattedDates={formattedDates} />
      </div>

      {!hasAnyData ? (
        <div style={{
          padding: "48px",
          border: `1px solid ${colors.border}`,
          borderRadius: "6px",
          textAlign: "center",
        }}>
          <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "14px", color: colors.inkMuted, margin: 0 }}>
            No bloodwork recorded yet. Add Putih&apos;s first test to see results here.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Chemistry */}
          <div style={{ border: `1px solid ${colors.border}`, borderRadius: "6px", overflow: "hidden" }}>
            <SectionHeader title="Chemistry" />
            {chemistryMetrics.map(metric => {
              const reading = latestMap[metric.key];
              if (!reading) return null;
              return (
                <PutihMetricRow
                  key={metric.key}
                  metricKey={metric.key}
                  name={metric.name}
                  value={reading.value}
                  unit={metric.unit}
                  rangeLow={reading.lab_range_low ?? metric.rangeLow}
                  rangeHigh={reading.lab_range_high ?? metric.rangeHigh}
                  history={historyMap[metric.key] ?? []}
                />
              );
            })}
          </div>

          {/* Hematology */}
          <div style={{ border: `1px solid ${colors.border}`, borderRadius: "6px", overflow: "hidden" }}>
            <SectionHeader title="Hematology" />
            {hematologyMetrics.map(metric => {
              const reading = latestMap[metric.key];
              if (!reading) return null;
              return (
                <PutihMetricRow
                  key={metric.key}
                  metricKey={metric.key}
                  name={metric.name}
                  value={reading.value}
                  unit={metric.unit}
                  rangeLow={reading.lab_range_low ?? metric.rangeLow}
                  rangeHigh={reading.lab_range_high ?? metric.rangeHigh}
                  history={historyMap[metric.key] ?? []}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
