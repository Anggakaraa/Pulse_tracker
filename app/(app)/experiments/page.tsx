import Link from "next/link";
import ExperimentCard from "@/components/ExperimentCard";
import { colors } from "@/lib/tokens";
import { getAllExperiments } from "@/lib/queries";

export default async function ExperimentsPage() {
  const experiments = await getAllExperiments();
  const active = experiments.filter(e => e.status === "active");
  const past = experiments.filter(e => e.status === "completed");

  return (
    <div>
      {/* Header */}
      <p style={{
        fontFamily: "var(--font-outfit)",
        fontWeight: 600,
        fontSize: "13px",
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: colors.inkMuted,
        marginBottom: "8px",
      }}>
        Tracking
      </p>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "40px" }}>
        <h1 style={{
          fontFamily: "var(--font-outfit)",
          fontWeight: 600,
          fontSize: "28px",
          color: colors.ink,
          letterSpacing: "-0.01em",
          margin: 0,
        }}>
          Experiments
        </h1>
        <Link
          href="/experiments/new"
          style={{
            fontFamily: "var(--font-dm-sans)",
            fontSize: "13px",
            textDecoration: "none",
            backgroundColor: colors.ink,
            color: colors.background,
            borderRadius: "4px",
            padding: "7px 14px",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <span style={{ fontSize: "14px", lineHeight: 1 }}>+</span> New experiment
        </Link>
      </div>

      {experiments.length === 0 ? (
        <div style={{
          backgroundColor: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: "6px",
          padding: "40px 24px",
          textAlign: "center",
        }}>
          <p style={{
            fontFamily: "var(--font-dm-sans)",
            fontSize: "14px",
            fontWeight: 300,
            color: colors.inkMuted,
            margin: "0 0 8px 0",
          }}>
            No experiments yet
          </p>
          <p style={{
            fontFamily: "var(--font-dm-sans)",
            fontSize: "13px",
            fontWeight: 300,
            color: colors.inkMuted,
            opacity: 0.6,
            margin: 0,
          }}>
            Track the effect of a protocol change on specific markers over time.
          </p>
        </div>
      ) : (
        <>
          {/* Active */}
          {active.length > 0 && (
            <section style={{ marginBottom: "40px" }}>
              <p style={{
                fontFamily: "var(--font-outfit)",
                fontWeight: 600,
                fontSize: "11px",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: colors.badge.optimal,
                marginBottom: "12px",
              }}>
                Active
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {active.map(exp => (
                  <ExperimentCard
                    key={exp.id}
                    exp={{
                      id: exp.id,
                      name: exp.name,
                      hypothesis: exp.hypothesis ?? "",
                      startDate: exp.startDateFormatted,
                      endDate: exp.endDateFormatted ?? undefined,
                      status: exp.status,
                      categories: exp.categories,
                      metricCount: exp.metricKeys.length,
                    }}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Past */}
          {past.length > 0 && (
            <section>
              <p style={{
                fontFamily: "var(--font-outfit)",
                fontWeight: 600,
                fontSize: "11px",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: colors.inkMuted,
                marginBottom: "12px",
              }}>
                Past
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {past.map(exp => (
                  <ExperimentCard
                    key={exp.id}
                    exp={{
                      id: exp.id,
                      name: exp.name,
                      hypothesis: exp.hypothesis ?? "",
                      startDate: exp.startDateFormatted,
                      endDate: exp.endDateFormatted ?? undefined,
                      status: exp.status,
                      categories: exp.categories,
                      metricCount: exp.metricKeys.length,
                    }}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
