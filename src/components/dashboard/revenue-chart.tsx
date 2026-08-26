"use client";

import { useState } from "react";
import { formatMoney } from "@/lib/money";

export interface RevenueMonth {
  month: string; // "YYYY-MM"
  revenue: string;
}

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function monthLabel(ym: string): string {
  const [, m] = ym.split("-");
  return MONTH_LABELS[Number(m) - 1] ?? ym;
}

/**
 * Monthly revenue, last N months. Single series (brand crimson) — per
 * dataviz guidance a lone series needs no legend, the card title says what's
 * plotted. Each bar is its own hover/focus target with a tooltip; the
 * month abbreviation is a permanent axis label, not a value label, so it's
 * shown for every bar without violating "label selectively."
 */
export function RevenueChart({ data }: { data: RevenueMonth[] }) {
  const [hovered, setHovered] = useState<number | null>(null);

  const values = data.map((d) => Number(d.revenue));
  const max = Math.max(1, ...values);
  // Round the axis ceiling up to a clean step so the top gridline reads as a round number.
  const magnitude = 10 ** Math.floor(Math.log10(max || 1));
  const axisMax = Math.ceil((max || 1) / magnitude) * magnitude || 1;

  const width = 560;
  const height = 200;
  const paddingLeft = 8;
  const paddingBottom = 24;
  const paddingTop = 12;
  const chartHeight = height - paddingBottom - paddingTop;
  const bandWidth = (width - paddingLeft) / Math.max(data.length, 1);
  const barWidth = Math.min(24, bandWidth * 0.5);

  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground py-8 text-center">No revenue in this period yet.</p>;
  }

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" role="img" aria-label="Monthly revenue trend">
        {/* gridlines: baseline + one mid line, hairline, recessive */}
        <line x1={paddingLeft} y1={paddingTop} x2={width} y2={paddingTop} stroke="var(--border)" strokeWidth={1} />
        <line
          x1={paddingLeft}
          y1={paddingTop + chartHeight}
          x2={width}
          y2={paddingTop + chartHeight}
          stroke="var(--border)"
          strokeWidth={1}
        />
        {data.map((d, i) => {
          const value = Number(d.revenue);
          const barHeight = axisMax > 0 ? (value / axisMax) * chartHeight : 0;
          const bandX = paddingLeft + i * bandWidth;
          const barX = bandX + (bandWidth - barWidth) / 2;
          const barY = paddingTop + chartHeight - barHeight;
          const isHovered = hovered === i;

          return (
            <g key={d.month}>
              {/* transparent hit target covers the full band, bigger than the bar itself */}
              <rect
                x={bandX}
                y={paddingTop}
                width={bandWidth}
                height={chartHeight}
                fill="transparent"
                onPointerEnter={() => setHovered(i)}
                onPointerLeave={() => setHovered(null)}
                onFocus={() => setHovered(i)}
                onBlur={() => setHovered(null)}
                tabIndex={0}
                role="img"
                aria-label={`${monthLabel(d.month)}: ${formatMoney(d.revenue)}`}
              />
              <rect
                x={barX}
                y={barY}
                width={barWidth}
                height={Math.max(barHeight, 1)}
                rx={4}
                fill="var(--brand)"
                opacity={isHovered ? 1 : 0.85}
                pointerEvents="none"
              />
              <text
                x={bandX + bandWidth / 2}
                y={height - 6}
                textAnchor="middle"
                fontSize={10}
                fill="var(--muted-foreground)"
                pointerEvents="none"
              >
                {monthLabel(d.month)}
              </text>
            </g>
          );
        })}
      </svg>

      {hovered !== null && data[hovered] ? (
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs shadow-md"
          style={{
            left: `${((paddingLeft + hovered * bandWidth + bandWidth / 2) / width) * 100}%`,
            top: `${((paddingTop + chartHeight - (Number(data[hovered].revenue) / axisMax) * chartHeight) / height) * 100}%`,
          }}
        >
          <div className="font-semibold text-foreground">{formatMoney(data[hovered].revenue)}</div>
          <div className="text-muted-foreground">{monthLabel(data[hovered].month)}</div>
        </div>
      ) : null}
    </div>
  );
}
