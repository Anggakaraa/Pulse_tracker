"use client";

import { useState } from "react";
import MetricRow from "./MetricRow";
import { colors } from "@/lib/tokens";
import type { StatusBadge, CategoryKey } from "@/lib/tokens";
import type { DataPoint } from "./TrendChart";

export interface MetricData {
  key: string;
  name: string;
  category: CategoryKey;
  value: number;
  unit: string;
  badge: StatusBadge | null;  // null for unscored (Tier L) metrics
  labRange?: string;
  labLow?: number;
  labHigh?: number;
  lastTested?: string;
  previousValue?: number;
  annotation?: string;
  history?: DataPoint[];
}

// Unscored (null) metrics sort to the end
const BADGE_ORDER: (StatusBadge | null)[] = ["act", "improve", "stable", "strong", "optimal", null];

interface Props {
  metrics: MetricData[];
}

export default function MetricList({ metrics }: Props) {
  const [openKey, setOpenKey] = useState<string | null>(null);

  const sorted = [...metrics].sort((a, b) => {
    const badgeOrder = BADGE_ORDER.indexOf(a.badge) - BADGE_ORDER.indexOf(b.badge);
    if (badgeOrder !== 0) return badgeOrder;
    return a.name.localeCompare(b.name);
  });

  return (
    <div style={{ border: `1px solid ${colors.border}`, borderRadius: "6px", overflow: "hidden", backgroundColor: colors.surface, display: "flex", flexDirection: "column", gap: "1px" }}>
      {sorted.map(m => (
        <MetricRow
          key={m.key}
          metricKey={m.key}
          metricName={m.name}
          category={m.category}
          value={m.value}
          unit={m.unit}
          badge={m.badge}
          labRange={m.labRange}
          labLow={m.labLow}
          labHigh={m.labHigh}
          lastTested={m.lastTested}
          previousValue={m.previousValue}
          annotation={m.annotation}
          history={m.history}
          expanded={openKey === m.key}
          onToggle={() => setOpenKey(openKey === m.key ? null : m.key)}
        />
      ))}
    </div>
  );
}
