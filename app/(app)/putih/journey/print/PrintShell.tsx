"use client";

export default function PrintShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="no-print" style={{
        padding: "16px 24px",
        borderBottom: "1px solid #EAE3D3",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "#FBF8F0",
      }}>
        <span style={{ fontFamily: "var(--font-outfit)", fontSize: "13px", color: "#8A8178" }}>
          Putih — Health Journey
        </span>
        <button
          onClick={() => window.print()}
          style={{
            padding: "8px 20px",
            backgroundColor: "#2A2520",
            color: "#FBF8F0",
            border: "none",
            borderRadius: "4px",
            fontFamily: "var(--font-outfit)",
            fontSize: "12px",
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            cursor: "pointer",
          }}
        >
          Print / Save PDF
        </button>
      </div>
      {children}
    </>
  );
}
