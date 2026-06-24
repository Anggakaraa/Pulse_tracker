import Link from "next/link";
import { colors } from "@/lib/tokens";
import { getPutihTests, formatPutihDate } from "@/lib/putih-queries";
import PutihTestRow from "@/components/PutihTestRow";

export default async function PutihTestsPage() {
  const tests = await getPutihTests();

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
            Test Log
          </h1>
        </div>
        <Link href="/putih/upload" style={{ textDecoration: "none" }}>
          <div style={{
            padding: "8px 16px",
            backgroundColor: colors.ink,
            color: colors.background,
            borderRadius: "4px",
            fontFamily: "var(--font-outfit)",
            fontSize: "12px",
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            cursor: "pointer",
          }}>
            Add test
          </div>
        </Link>
      </div>

      {tests.length === 0 ? (
        <div style={{
          padding: "48px",
          border: `1px solid ${colors.border}`,
          borderRadius: "6px",
          textAlign: "center",
        }}>
          <p style={{ fontFamily: "var(--font-dm-sans)", fontSize: "14px", color: colors.inkMuted, margin: 0 }}>
            No tests recorded yet.
          </p>
        </div>
      ) : (
        <div style={{ border: `1px solid ${colors.border}`, borderRadius: "6px", overflow: "hidden" }}>
          {tests.map((test, i) => (
            <PutihTestRow
              key={test.id}
              id={test.id}
              date={formatPutihDate(test.date)}
              labName={test.lab_name}
              readingCount={test.reading_count}
              isLast={i === tests.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
