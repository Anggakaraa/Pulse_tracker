import { colors } from "@/lib/tokens";
import MetricList from "@/components/MetricList";
import { getVitalsData, getFitnessData } from "@/lib/queries";

export default async function VitalsPage() {
  const [vitals, fitness] = await Promise.all([getVitalsData(), getFitnessData()]);
  const totalMarkers = vitals.length + fitness.length;

  return (
    <div>
      {/* Header — tinted with vitals category color at 15% opacity */}
      <div style={{
        backgroundColor: "rgba(58, 122, 140, 0.15)",
        borderBottom: "1px solid #EAE3D3",
        marginBottom: "40px",
        marginLeft: "-64px",
        marginRight: "-64px",
        marginTop: "-64px",
        padding: "64px 64px 32px",
      }}>
        <p style={{
          fontFamily: "var(--font-outfit)",
          fontSize: "11px",
          fontWeight: 600,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: colors.inkMuted,
          marginBottom: "8px",
          marginTop: 0,
        }}>
          Vitals & Fitness
        </p>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <h1 style={{
            fontFamily: "var(--font-outfit)",
            fontSize: "28px",
            fontWeight: 600,
            color: colors.ink,
            letterSpacing: "-0.01em",
            margin: 0,
          }}>
            Vitals & Fitness
          </h1>
          <span style={{
            fontFamily: "var(--font-dm-sans)",
            fontSize: "13px",
            fontWeight: 300,
            color: colors.inkMuted,
          }}>
            {totalMarkers} {totalMarkers === 1 ? "marker" : "markers"}
          </span>
        </div>
      </div>

      {totalMarkers === 0 ? (
        <p style={{
          fontFamily: "var(--font-dm-sans)",
          fontSize: "14px",
          fontWeight: 300,
          fontStyle: "italic",
          color: colors.inkMuted,
        }}>
          No data yet.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "40px" }}>

          {/* Vitals section */}
          {vitals.length > 0 && (
            <div>
              <p style={{
                fontFamily: "var(--font-outfit)",
                fontSize: "11px",
                fontWeight: 600,
                letterSpacing: "0.10em",
                textTransform: "uppercase",
                color: colors.inkMuted,
                margin: "0 0 12px 0",
              }}>
                Vitals
              </p>
              <MetricList metrics={vitals} />
            </div>
          )}

          {/* Fitness section */}
          {fitness.length > 0 && (
            <div>
              <p style={{
                fontFamily: "var(--font-outfit)",
                fontSize: "11px",
                fontWeight: 600,
                letterSpacing: "0.10em",
                textTransform: "uppercase",
                color: colors.inkMuted,
                margin: "0 0 12px 0",
              }}>
                Fitness
              </p>
              <MetricList metrics={fitness} />
            </div>
          )}

        </div>
      )}
    </div>
  );
}
