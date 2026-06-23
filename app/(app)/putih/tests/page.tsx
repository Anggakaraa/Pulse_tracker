import Link from "next/link";
import { colors } from "@/lib/tokens";
import { getPutihTests, formatPutihDate } from "@/lib/putih-queries";

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
            <Link key={test.id} href={`/putih/tests/${test.id}`} style={{ textDecoration: "none" }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                padding: "16px 20px",
                borderBottom: i < tests.length - 1 ? `1px solid ${colors.border}` : "none",
                cursor: "pointer",
                backgroundColor: "transparent",
                transition: `background-color 150ms`,
              }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = colors.surface)}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                <div style={{ flex: 1 }}>
                  <p style={{
                    fontFamily: "var(--font-outfit)",
                    fontSize: "15px",
                    fontWeight: 400,
                    color: colors.ink,
                    margin: "0 0 2px 0",
                  }}>
                    {formatPutihDate(test.date)}
                  </p>
                  {test.lab_name && (
                    <p style={{
                      fontFamily: "var(--font-dm-sans)",
                      fontSize: "13px",
                      color: colors.inkMuted,
                      margin: 0,
                    }}>
                      {test.lab_name}
                    </p>
                  )}
                </div>
                <span style={{
                  fontFamily: "var(--font-dm-sans)",
                  fontSize: "13px",
                  color: colors.inkMuted,
                }}>
                  {test.reading_count} marker{test.reading_count !== 1 ? "s" : ""}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
