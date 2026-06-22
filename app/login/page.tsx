"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { colors } from "@/lib/tokens";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      router.push("/dashboard");
    } else {
      setError("Incorrect password");
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      backgroundColor: colors.background,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}>
      <div style={{
        width: "100%",
        maxWidth: "360px",
        padding: "40px",
        backgroundColor: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: "6px",
      }}>
        <p style={{
          fontFamily: "var(--font-outfit)",
          fontSize: "13px",
          fontWeight: 600,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: colors.inkMuted,
          margin: "0 0 8px 0",
        }}>
          Pulse
        </p>
        <h1 style={{
          fontFamily: "var(--font-outfit)",
          fontSize: "28px",
          fontWeight: 600,
          color: colors.ink,
          margin: "0 0 32px 0",
          letterSpacing: "-0.01em",
        }}>
          Welcome back
        </h1>

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoFocus
            style={{
              width: "100%",
              padding: "10px 14px",
              fontSize: "16px",
              fontFamily: "var(--font-dm-sans)",
              backgroundColor: colors.background,
              border: `1px solid ${error ? "#A03828" : colors.border}`,
              borderRadius: "4px",
              color: colors.ink,
              outline: "none",
              boxSizing: "border-box",
              marginBottom: error ? "8px" : "16px",
            }}
          />
          {error && (
            <p style={{
              fontFamily: "var(--font-dm-sans)",
              fontSize: "14px",
              color: "#A03828",
              margin: "0 0 16px 0",
            }}>
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading || !password}
            style={{
              width: "100%",
              padding: "10px",
              fontFamily: "var(--font-outfit)",
              fontSize: "13px",
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              backgroundColor: colors.ink,
              color: colors.background,
              border: "none",
              borderRadius: "4px",
              cursor: loading || !password ? "not-allowed" : "pointer",
              opacity: loading || !password ? 0.5 : 1,
              transition: "opacity 150ms",
            }}
          >
            {loading ? "..." : "Enter"}
          </button>
        </form>
      </div>
    </div>
  );
}
