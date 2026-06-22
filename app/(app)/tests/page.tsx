import Link from "next/link";
import TestLogEntry from "@/components/TestLogEntry";
import { colors } from "@/lib/tokens";
import { getAllTests } from "@/lib/queries";

export default async function TestLogPage() {
  const tests = await getAllTests();

  // Tests older than 2 years get the muted "isOld" treatment
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - 2);

  return (
    <div>
      <p style={{
        fontFamily: "var(--font-outfit)",
        fontWeight: 600,
        fontSize: "13px",
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: colors.inkMuted,
        marginBottom: "8px",
      }}>
        History
      </p>
      <div style={{
        display: "flex",
        alignItems: "baseline",
        justifyContent: "space-between",
        marginBottom: "32px",
      }}>
        <h1 style={{
          fontFamily: "var(--font-outfit)",
          fontWeight: 600,
          fontSize: "28px",
          color: colors.ink,
          letterSpacing: "-0.01em",
          margin: 0,
        }}>
          Test log
        </h1>
        <span style={{
          fontFamily: "var(--font-dm-sans)",
          fontWeight: 300,
          fontSize: "14px",
          color: colors.inkMuted,
        }}>
          {tests.length} {tests.length === 1 ? "visit" : "visits"}
        </span>
      </div>

      {tests.length === 0 ? (
        <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "14px", color: colors.inkMuted }}>
          No tests yet. <Link href="/upload" style={{ color: colors.ink }}>Add your first test →</Link>
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {tests.map(test => {
            const isOld = new Date(test.date) < cutoff;

            // Status summary text
            let statusSummary: string;
            if (test.actCount > 0 && test.improveCount > 0) {
              statusSummary = `${test.actCount} act · ${test.improveCount} improve`;
            } else if (test.actCount > 0) {
              statusSummary = `${test.actCount} act now`;
            } else if (test.improveCount > 0) {
              statusSummary = `${test.improveCount} to improve`;
            } else {
              statusSummary = "All clear";
            }

            return (
              <Link
                key={test.id}
                href={`/tests/${test.id}`}
                style={{ textDecoration: "none" }}
              >
                <TestLogEntry
                  date={test.dateFormatted}
                  labName={test.labName}
                  markerCount={test.readingCount}
                  categories={test.categories}
                  statusSummary={statusSummary}
                  statusState={test.worstBadge ?? "stable"}
                  isOld={isOld}
                />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
