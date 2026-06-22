export const colors = {
  background: "#FBF8F0",
  surface: "#F4EFE3",
  border: "#EAE3D3",
  ink: "#2A2520",
  inkMuted: "#8A8178",

  category: {
    metabolic: "#5C8A6A",
    cardiovascular: "#2E547A",
    inflammation: "#B5522A",
    hormonal: "#6E3D8C",
    nutritional: "#A8882A",
    blood: "#7A3A4A",
    vitals: "#3A7A8C",
  },

  // 5-badge status system
  badge: {
    optimal: "#4A8C62",   // green   — longevity/prevention target
    strong:  "#7AAF8A",   // mid-green — already very good
    stable:  "#A8882A",   // amber   — acceptable, monitor only
    improve: "#B5522A",   // orange  — worth improving
    act:     "#A03828",   // red     — clinically important
  },
} as const;

export const spacing = {
  1: "4px",
  2: "8px",
  3: "12px",
  4: "16px",
  5: "24px",
  6: "40px",
  7: "64px",
} as const;

export const radius = {
  card: "6px",
  pill: "4px",
} as const;

export const shadow = {
  raised: "0px 2px 8px rgba(42, 37, 32, 0.07)",
  floating: "0px 8px 32px rgba(42, 37, 32, 0.10)",
} as const;

export const duration = {
  micro: "150ms",
  transition: "250ms",
  enter: "200ms",
} as const;

export const ease = "cubic-bezier(0.4, 0, 0.2, 1)";

export type CategoryKey = keyof typeof colors.category;
export type StatusBadge = keyof typeof colors.badge;
