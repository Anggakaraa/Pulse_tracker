import { colors } from "@/lib/tokens";

interface Props {
  label: string;
  value: string;
  valueColor?: string;
}

export default function StatBlock({ label, value, valueColor }: Props) {
  return (
    <div
      style={{
        backgroundColor: colors.surface,
        borderRadius: "4px",
        padding: "7px 10px",
        display: "flex",
        flexDirection: "column",
        gap: "3px",
        flex: 1,
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-dm-sans)",
          fontSize: "12px",
          fontWeight: 300,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: colors.inkMuted,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: "var(--font-outfit)",
          fontSize: "14px",
          fontWeight: 600,
          color: valueColor ?? colors.ink,
        }}
      >
        {value}
      </span>
    </div>
  );
}
