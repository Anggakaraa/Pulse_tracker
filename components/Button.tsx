import { colors } from "@/lib/tokens";

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost";
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
}

export default function Button({ variant = "primary", size = "md", children, style, ...props }: Props) {
  const sizes: Record<string, React.CSSProperties> = {
    sm: { padding: "4px 10px", fontSize: "11px" },
    md: { padding: "6px 14px", fontSize: "12px" },
    lg: { padding: "8px 16px", fontSize: "13px" },
  };

  const base: React.CSSProperties = {
    fontFamily: "var(--font-dm-sans)",
    fontWeight: 400,
    borderRadius: "4px",
    cursor: "pointer",
    transition: `opacity var(--duration-micro) var(--ease), background-color var(--duration-micro) var(--ease)`,
    border: "none",
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    ...sizes[size],
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
