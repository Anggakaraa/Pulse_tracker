import Link from "next/link";
import CategoryCard from "@/components/CategoryCard";
import Button from "@/components/Button";
import CategoryPill from "@/components/CategoryPill";
import RecentTestRow from "@/components/RecentTestRow";
import { colors } from "@/lib/tokens";
import type { StatusBadge } from "@/lib/tokens";
import {
  getAllTests,
  getDashboardCardData,
  getAttentionItems,
  getLongevityData,
  getActiveExperiments,
  getHumanProgressionMatrix,
  formatTestDate,
} from "@/lib/queries";
import HumanExportButtons from "@/components/HumanExportButtons";

function Eyebrow({ children }: { children: string }) {
  return (
    <p style={{
      fontFamily: "var(--font-outfit)",
      fontSize: "10px",
      fontWeight: 600,
      letterSpacing: "0.12em",
      textTransform: "uppercase",
      color: colors.inkMuted,
      margin: "0 0 12px 0",
    }}>
      {children}
    </p>
  );
}

function pctChange(baseline: number, latest: number) {
  const pct = Math.round(Math.abs(((latest - baseline) / baseline) * 100));
  const up = latest > baseline;
  return { pct, up };
}

export default async function Dashboard() {
  const [cards, attentionItems, longevityItems, activeExperiments, allTests, progressionData] = await Promise.all([
    getDashboardCardData(),
    getAttentionItems(),
    getLongevityData(),
    getActiveExperiments(),
    getAllTests(),
    getHumanProgressionMatrix(),
  ]);
  const formattedDates = Object.fromEntries(progressionData.tests.map(t => [t.id, formatTestDate(t.date)]));

  const recentTests = allTests.slice(0, 3);
  const latestTest = allTests[0];

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "40px" }}>
        <div>
          <p style={{
            fontFamily: "var(--font-outfit)",
            fontSize: "11px",
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: colors.inkMuted,
            marginBottom: "8px",
          }}>
            {latestTest ? `Last updated ${latestTest.dateFormatted}` : "No tests yet"}
          </p>
          <h1 style={{
            fontFamily: "var(--font-outfit)",
            fontSize: "28px",
            fontWeight: 600,
            color: colors.ink,
            letterSpacing: "-0.01em",
            margin: 0,
          }}>
            Your system at a glance
          </h1>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <HumanExportButtons data={progressionData} formattedDates={formattedDates} />
          <Link href="/upload">
            <Button variant="primary">+ New test</Button>
          </Link>
        </div>
      </div>

      {/* Unified grid — 3 columns */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: "12px",
        marginBottom: "40px",
        alignItems: "stretch",
      }}>
        {/* Row 1 — category cards */}
        {cards.map(card => (
          <Link key={card.category} href={`/metrics/${card.category}`} style={{ textDecoration: "none" }}>
            <CategoryCard
              category={card.category}
              metricName={card.metricName}
              value={card.value}
              unit={card.unit}
              badge={card.badge}
              secondaryMetrics={card.secondaryMetrics}
            />
          </Link>
        ))}

      </div>{/* end unified grid */}

      {/* Row 2 — longevity snapshot (2col) + needs attention (1col) */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "2fr 1fr",
        gap: "12px",
        marginBottom: "40px",
        alignItems: "start",
      }}>

        {/* Longevity snapshot */}
        <div style={{
          backgroundColor: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: "6px",
          padding: "24px",
        }}>
          <Eyebrow>Longevity markers</Eyebrow>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {longevityItems.map((m, i) => (
              <Link
                key={m.key}
                href={`/metrics/${m.category}`}
                style={{ textDecoration: "none" }}
              >
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 0",
                  borderBottom: i < longevityItems.length - 1 ? `1px solid ${colors.border}` : "none",
                }}>
                  {/* Rank + name */}
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1 }}>
                    <span style={{
                      fontFamily: "var(--font-outfit)",
                      fontSize: "11px",
                      fontWeight: 600,
                      color: colors.inkMuted,
                      width: "16px",
                      textAlign: "right",
                      flexShrink: 0,
                    }}>
                      {i + 1}
                    </span>
                    <span style={{
                      width: "6px", height: "6px", borderRadius: "50%",
                      backgroundColor: colors.category[m.category],
                      flexShrink: 0, display: "inline-block",
                    }} />
                    <span style={{
                      fontFamily: "var(--font-dm-sans)",
                      fontSize: "14px",
                      fontWeight: 400,
                      color: colors.ink,
                    }}>
                      {m.name}
                    </span>
                  </div>

                  {/* Value + badge */}
                  <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                    {m.value !== null ? (
                      <span style={{
                        fontFamily: "var(--font-outfit)",
                        fontSize: "13px",
                        fontWeight: 600,
                        color: colors.ink,
                        letterSpacing: "-0.01em",
                      }}>
                        {m.value}
                        <span style={{
                          fontFamily: "var(--font-dm-sans)",
                          fontSize: "12px",
                          fontWeight: 300,
                          color: colors.inkMuted,
                          marginLeft: "3px",
                        }}>
                          {m.unit}
                        </span>
                      </span>
                    ) : (
                      <span style={{
                        fontFamily: "var(--font-dm-sans)",
                        fontSize: "12px",
                        fontWeight: 300,
                        color: colors.inkMuted,
                        fontStyle: "italic",
                      }}>
                        no data
                      </span>
                    )}
                    <div style={{ minWidth: "72px" }}>
                      {m.badge ? (
                        <span style={{
                          fontFamily: "var(--font-outfit)",
                          fontWeight: 600,
                          fontSize: "10px",
                          letterSpacing: "0.1em",
                          textTransform: "uppercase" as const,
                          color: colors.badge[m.badge],
                          borderLeft: `3px solid ${colors.badge[m.badge]}`,
                          paddingLeft: "8px",
                          paddingTop: "3px",
                          paddingBottom: "3px",
                          borderRadius: "0 4px 4px 0",
                          display: "inline-block",
                        }}>
                          {m.badge === "optimal" ? "Optimal"
                            : m.badge === "strong" ? "Strong"
                            : m.badge === "stable" ? "Stable"
                            : m.badge === "improve" ? "Improve"
                            : "Act"}
                        </span>
                      ) : (
                        <span style={{
                          fontFamily: "var(--font-dm-sans)",
                          fontSize: "12px",
                          color: colors.inkMuted,
                          paddingLeft: "11px",
                        }}>—</span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Needs attention */}
        <div style={{
          backgroundColor: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: "6px",
          padding: "24px",
        }}>
          <Eyebrow>Needs attention</Eyebrow>
          {attentionItems.length === 0 ? (
            <p style={{
              fontFamily: "var(--font-dm-sans)",
              fontSize: "14px",
              fontWeight: 300,
              fontStyle: "italic",
              color: colors.inkMuted,
              margin: 0,
            }}>
              All clear
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {attentionItems.map((m, i) => (
                <Link
                  key={m.metricKey}
                  href={`/metrics/${m.category}`}
                  style={{ textDecoration: "none" }}
                >
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 0",
                    borderBottom: i < attentionItems.length - 1 ? `1px solid ${colors.border}` : "none",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{
                        width: "6px", height: "6px", borderRadius: "50%",
                        backgroundColor: colors.category[m.category],
                        flexShrink: 0, display: "inline-block",
                      }} />
                      <span style={{
                        fontFamily: "var(--font-dm-sans)",
                        fontSize: "14px",
                        fontWeight: 400,
                        color: colors.ink,
                      }}>
                        {m.name}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{
                        fontFamily: "var(--font-outfit)",
                        fontSize: "13px",
                        fontWeight: 600,
                        color: colors.ink,
                        letterSpacing: "-0.01em",
                      }}>
                        {m.value}
                        <span style={{
                          fontFamily: "var(--font-dm-sans)",
                          fontSize: "12px",
                          fontWeight: 300,
                          color: colors.inkMuted,
                          marginLeft: "3px",
                        }}>
                          {m.unit}
                        </span>
                      </span>
                      <span style={{
                        fontFamily: "var(--font-outfit)",
                        fontWeight: 600,
                        fontSize: "10px",
                        letterSpacing: "0.1em",
                        textTransform: "uppercase" as const,
                        color: colors.badge[m.badge],
                        borderLeft: `3px solid ${colors.badge[m.badge]}`,
                        paddingLeft: "8px",
                        paddingTop: "3px",
                        paddingBottom: "3px",
                        borderRadius: "0 4px 4px 0",
                        minWidth: "60px",
                        display: "inline-block",
                      }}>
                        {m.badge === "act" ? "Act" : "Improve"}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Row 3 — active experiments (2col) + recent tests (1col) */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "2fr 1fr",
        gap: "12px",
        marginBottom: "40px",
        alignItems: "start",
      }}>

        {/* Active experiments */}
        <Link href="/experiments" style={{ textDecoration: "none" }}>
          <div style={{
            backgroundColor: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: "6px",
            padding: "24px",
            minHeight: "120px",
          }}>
            <Eyebrow>Active experiments</Eyebrow>
            {activeExperiments.length === 0 ? (
              <div style={{
                display: "flex",
                flexDirection: "column",
                gap: "6px",
                marginTop: "8px",
              }}>
                <p style={{
                  fontFamily: "var(--font-dm-sans)",
                  fontSize: "14px",
                  fontWeight: 300,
                  color: colors.inkMuted,
                  margin: 0,
                }}>
                  No active experiments
                </p>
                <span style={{
                  fontFamily: "var(--font-dm-sans)",
                  fontSize: "13px",
                  fontWeight: 300,
                  color: colors.inkMuted,
                  opacity: 0.6,
                }}>
                  Start one to track the effect of a change →
                </span>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "4px" }}>
                {activeExperiments.map(exp => (
                  <div key={exp.id} style={{
                    paddingBottom: "16px",
                    borderBottom: `1px solid ${colors.border}`,
                  }}>
                    <p style={{
                      fontFamily: "var(--font-outfit)",
                      fontSize: "15px",
                      fontWeight: 600,
                      color: colors.ink,
                      margin: "0 0 4px 0",
                      letterSpacing: "-0.01em",
                    }}>
                      {exp.name}
                    </p>
                    {exp.hypothesis && (
                      <p style={{
                        fontFamily: "var(--font-dm-sans)",
                        fontSize: "13px",
                        fontWeight: 300,
                        color: colors.inkMuted,
                        margin: "0 0 8px 0",
                        lineHeight: 1.5,
                      }}>
                        {exp.hypothesis}
                      </p>
                    )}
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                      <span style={{
                        fontFamily: "var(--font-dm-sans)",
                        fontSize: "12px",
                        fontWeight: 300,
                        color: colors.inkMuted,
                      }}>
                        Since {exp.startDateFormatted}
                      </span>
                      {exp.metricStats.length > 0 && (
                        <>
                          <span style={{ color: colors.border }}>·</span>
                          {exp.metricStats.map(stat => (
                            <span key={stat.key} style={{
                              fontFamily: "var(--font-dm-sans)",
                              fontSize: "12px",
                              fontWeight: 400,
                              color: stat.improved ? colors.badge.optimal : colors.badge.improve,
                            }}>
                              {stat.name} {stat.improved ? "▼" : "▲"} {Math.abs(stat.pctChange).toFixed(0)}%
                            </span>
                          ))}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Link>

        {/* Recent tests */}
        <div style={{
          backgroundColor: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: "6px",
          padding: "24px",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}>
          <Eyebrow>Recent tests</Eyebrow>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {recentTests.map((test, i) => (
              <RecentTestRow
                key={test.id}
                id={test.id}
                date={test.dateFormatted}
                labName={test.labName}
                markerCount={test.readingCount}
                hasBorder={i < recentTests.length - 1}
              />
            ))}
          </div>
          <div style={{ marginTop: "12px" }}>
            <Link href="/tests" style={{
              fontFamily: "var(--font-dm-sans)",
              fontSize: "11px",
              fontWeight: 400,
              color: colors.inkMuted,
              textDecoration: "none",
            }}>
              View all →
            </Link>
          </div>
        </div>

      </div>

    </div>
  );
}
