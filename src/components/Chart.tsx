'use client';

import { useId, useState } from 'react';
import { cx } from '@/components/ui';

export interface SeriesPoint {
  date: string;
  value: number;
}

export interface Series {
  label: string;
  /** A CSS colour, usually a token like `var(--brand)`. */
  colour: string;
  points: SeriesPoint[];
}

/**
 * Inline SVG charts.
 *
 * A charting library would add a substantial dependency and bundle for two chart
 * shapes over at most a year of daily points. These draw from the same data the
 * API returns, inherit the theme through CSS variables, and stay legible in both
 * light and dark without a second set of colours.
 *
 * Deliberately not interactive beyond a hover readout: this is a reporting
 * surface, not an exploration tool.
 */

const PAD = { top: 12, right: 8, bottom: 22, left: 40 };

function niceCeiling(value: number): number {
  if (value <= 0) return 1;

  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalised = value / magnitude;
  const step = normalised <= 1 ? 1 : normalised <= 2 ? 2 : normalised <= 5 ? 5 : 10;

  return step * magnitude;
}

function shortDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);

  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

export function LineChart({
  series,
  height = 200,
  valueFormat = (value: number) => String(value),
  emptyLabel = 'No activity in this period',
}: {
  series: Series[];
  height?: number;
  valueFormat?: (value: number) => string;
  emptyLabel?: string;
}) {
  const gradientId = useId();
  const [hover, setHover] = useState<number | null>(null);

  const length = series[0]?.points.length ?? 0;
  const max = niceCeiling(
    Math.max(...series.flatMap((line) => line.points.map((point) => point.value)), 0),
  );
  const total = series.reduce(
    (sum, line) => sum + line.points.reduce((inner, point) => inner + point.value, 0),
    0,
  );

  if (length === 0 || total === 0) {
    return (
      <div
        style={{ height }}
        className="grid place-items-center rounded-lg bg-surface-sunken text-xs text-content-faint"
      >
        {emptyLabel}
      </div>
    );
  }

  // A fixed viewBox scaled by CSS: the chart is responsive without measuring
  // the container, and one point of geometry code covers every width.
  const width = 640;
  const plotWidth = width - PAD.left - PAD.right;
  const plotHeight = height - PAD.top - PAD.bottom;

  const x = (index: number) =>
    PAD.left + (length === 1 ? plotWidth / 2 : (index / (length - 1)) * plotWidth);
  const y = (value: number) => PAD.top + plotHeight - (value / max) * plotHeight;

  // At most six labels, so they never collide however long the range is.
  const labelEvery = Math.max(1, Math.ceil(length / 6));

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        style={{ height }}
        role="img"
        aria-label={`${series.map((line) => line.label).join(' and ')} over ${length} days`}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          {series.map((line, index) => (
            <linearGradient
              key={line.label}
              id={`${gradientId}-${index}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0%" stopColor={line.colour} stopOpacity="0.18" />
              <stop offset="100%" stopColor={line.colour} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>

        {/* Gridlines and the value axis */}
        {[0, 0.5, 1].map((fraction) => {
          const value = max * (1 - fraction);

          return (
            <g key={fraction}>
              <line
                x1={PAD.left}
                x2={width - PAD.right}
                y1={PAD.top + fraction * plotHeight}
                y2={PAD.top + fraction * plotHeight}
                stroke="var(--border-subtle)"
                strokeWidth="1"
              />
              <text
                x={PAD.left - 6}
                y={PAD.top + fraction * plotHeight + 3.5}
                textAnchor="end"
                className="fill-[var(--content-faint)] text-[9px]"
              >
                {valueFormat(value)}
              </text>
            </g>
          );
        })}

        {series.map((line, index) => {
          const path = line.points
            .map((point, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(point.value)}`)
            .join(' ');

          const area =
            `${path} L ${x(line.points.length - 1)} ${PAD.top + plotHeight} ` +
            `L ${x(0)} ${PAD.top + plotHeight} Z`;

          return (
            <g key={line.label}>
              <path d={area} fill={`url(#${gradientId}-${index})`} />
              <path
                d={path}
                fill="none"
                stroke={line.colour}
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {hover !== null && (
                <circle
                  cx={x(hover)}
                  cy={y(line.points[hover]?.value ?? 0)}
                  r="3.5"
                  fill={line.colour}
                  stroke="var(--surface)"
                  strokeWidth="1.5"
                />
              )}
            </g>
          );
        })}

        {/* Date axis */}
        {series[0]?.points.map((point, index) =>
          index % labelEvery === 0 || index === length - 1 ? (
            <text
              key={point.date}
              x={x(index)}
              y={height - 6}
              textAnchor={index === 0 ? 'start' : index === length - 1 ? 'end' : 'middle'}
              className="fill-[var(--content-faint)] text-[9px]"
            >
              {shortDate(point.date)}
            </text>
          ) : null,
        )}

        {hover !== null && (
          <line
            x1={x(hover)}
            x2={x(hover)}
            y1={PAD.top}
            y2={PAD.top + plotHeight}
            stroke="var(--border-strong)"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
        )}

        {/* One invisible band per point, so hovering anywhere in a column works
            rather than requiring the cursor to find a 2px line. */}
        {series[0]?.points.map((point, index) => (
          <rect
            key={point.date}
            x={x(index) - plotWidth / (length * 2)}
            y={PAD.top}
            width={plotWidth / length + 1}
            height={plotHeight}
            fill="transparent"
            onMouseEnter={() => setHover(index)}
          />
        ))}
      </svg>

      <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
        {series.map((line) => (
          <span key={line.label} className="flex items-center gap-1.5 text-content-muted">
            <span
              aria-hidden
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: line.colour }}
            />
            {line.label}
            {hover !== null && (
              <span className="font-medium tabular text-content">
                {valueFormat(line.points[hover]?.value ?? 0)}
              </span>
            )}
          </span>
        ))}
        {hover !== null && series[0]?.points[hover] && (
          <span className="text-content-faint">{shortDate(series[0].points[hover].date)}</span>
        )}
      </div>
    </div>
  );
}

/** Horizontal bars for a small set of named values — statuses, payment methods. */
export function BarList({
  rows,
  valueFormat = (value: number) => String(value),
}: {
  rows: Array<{ label: string; value: number; colour?: string }>;
  valueFormat?: (value: number) => string;
}) {
  const max = Math.max(...rows.map((row) => row.value), 1);
  const total = rows.reduce((sum, row) => sum + row.value, 0);

  if (total === 0) {
    return <p className="py-4 text-xs text-content-faint">Nothing in this period.</p>;
  }

  return (
    <ul className="space-y-2">
      {rows.map((row) => (
        <li key={row.label}>
          <div className="flex items-baseline justify-between text-xs">
            <span className="text-content-muted">{row.label}</span>
            <span className="tabular font-medium">{valueFormat(row.value)}</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-sunken">
            <div
              className={cx('h-full rounded-full transition-all')}
              style={{
                width: `${(row.value / max) * 100}%`,
                backgroundColor: row.colour ?? 'var(--brand)',
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
