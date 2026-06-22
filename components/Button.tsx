"use client";

import { colors } from "@/lib/tokens";

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost";
  children: React.ReactNode;
}

export default function Button({ variant = "primary", children, style, ...props }: Props) {
  const base: React.CSSProperties = {
    fontFamily: "var(--font-dm-sans)",
    fontSize: "12px",
    fontWeight: 400,
    padding: "6px 14px",
    borderRadius: "4px",
    cursor: "pointer",
    transition: `opacity var(--duration-micro) var(--ease), background-color var(--duration-micro) var(--ease)`,
    border: "none",
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
  };

  const variants: Record<string, React.CSSProperties> = {
    primary: {
      backgroundColor: colors.ink,
      color: colors.background,
      border: "none",
    },
    ghost: {
      backgroundColor: "transparent",
      color: colors.inkMuted,
      border: `1px solid ${colors.border}`,
    },
  };

  return (
    <button style={{ ...base, ...variants[variant], ...style }} {...props}>
      {children}
    </button>
  );
}
