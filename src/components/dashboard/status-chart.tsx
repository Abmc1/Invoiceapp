"use client";

import { useState } from "react";

export interface StatusDatum {
  label: string;
  count: number;
  color: string;
}

/**
 * Horizontal bar chart of invoice counts by status. Every bar carries a
 * direct text label (status name) and a value at the tip, so identity never
 * relies on color alone — deliberate, since these status colors (shared
 * with the badges used everywhere else in the app) aren't guaranteed
 * distinguishable under every form of color-blindness on their own.
 */
export function StatusChart({ data }: { data: StatusDatum[] }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.count));

  const width = 560;
  const rowHeight = 32;
  const barMaxWidth = 340;
  const labelWidth = 120;
  const height = data.length * rowHeight + 8;

  if (data.every((d) => d.count === 0)) {
    return <p className="text-sm text-muted-foreground py-8 text-center">No invoices yet.</p>;
  }

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" role="img" aria-label="Invoices by status">
      {data.map((d, i) => {
        const barWidth = (d.count / max) * barMaxWidth;
        const y = i * rowHeight + 4;
        const isHovered = hovered === i;

        return (
          <g
            key={d.label}
            onPointerEnter={() => setHovered(i)}
            onPointerLeave={() => setHovered(null)}
            onFocus={() => setHovered(i)}
            onBlur={() => setHovered(null)}
            tabIndex={0}
            role="img"
            aria-label={`${d.label}: ${d.count}`}
          >
            <rect x={0} y={y} width={width} height={rowHeight - 4} fill="transparent" />
            <text x={0} y={y + (rowHeight - 4) / 2 + 4} fontSize={12} fill="var(--foreground)">
              {d.label}
            </text>
            <rect
              x={labelWidth}
              y={y + 4}
              width={Math.max(barWidth, 2)}
              height={rowHeight - 12}
              rx={4}
              fill={d.color}
              opacity={isHovered ? 1 : 0.85}
            />
            <text
              x={labelWidth + Math.max(barWidth, 2) + 8}
              y={y + (rowHeight - 4) / 2 + 4}
              fontSize={12}
              fontWeight={600}
              fill="var(--foreground)"
            >
              {d.count}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
