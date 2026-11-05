import { type TooltipItem } from 'chart.js';

import {
  LINE_CHART_COLOR_VARIABLES,
  type LineChartColors,
  type LineChartData,
  type LineChartOptions,
  type LineChartPoint,
} from '#models/line-chart.model';
import { type MeasurementPoint } from '#models/measurement.model';

/** Above this many points, dots would hide the line: only the line is drawn. */
export const LINE_CHART_MAX_POINTS_WITH_DOTS = 200;

const TIMESTAMP_TICK_FORMAT = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

const VALUE_FORMAT = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 3 });

/** Measurement points as chart points: ISO timestamp → epoch ms; a `null` value stays a gap. */
export function toChartXyPoints(points: readonly MeasurementPoint[]): LineChartPoint[] {
  return points.map((point: MeasurementPoint) => ({
    x: Date.parse(point.timestamp),
    y: point.value,
  }));
}

/** Line data on a linear time axis. Dots are only drawn on short series. */
export function buildLineChartData(
  points: readonly MeasurementPoint[],
  colors: LineChartColors | null,
): LineChartData {
  const pointRadius = points.length > LINE_CHART_MAX_POINTS_WITH_DOTS ? 0 : 2;
  return {
    datasets: [
      {
        data: toChartXyPoints(points),
        borderWidth: 1.5,
        pointRadius,
        pointHoverRadius: 4,
        spanGaps: false,
        fill: 'start',
        ...(colors === null
          ? {}
          : {
              borderColor: colors.line,
              backgroundColor: colors.area,
              pointBackgroundColor: colors.line,
            }),
      },
    ],
  };
}

/** Chart options: no animation, French time ticks, tooltip with the vendor unit. */
export function buildLineChartOptions(
  unit: string,
  colors: LineChartColors | null,
): LineChartOptions {
  const textColor = colors === null ? {} : { color: colors.text };
  const gridColor = colors === null ? {} : { grid: { color: colors.grid } };
  return {
    animation: false,
    maintainAspectRatio: false,
    interaction: { mode: 'nearest', axis: 'x', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        displayColors: false,
        ...(colors === null
          ? {}
          : {
              backgroundColor: colors.tooltipBackground,
              titleColor: colors.tooltipText,
              bodyColor: colors.tooltipText,
            }),
        callbacks: {
          title: (items: TooltipItem<'line'>[]) => formatTooltipTitle(items),
          label: (item: TooltipItem<'line'>) => formatChartValue(item.parsed.y, unit),
        },
      },
    },
    scales: {
      x: {
        type: 'linear',
        border: { display: false },
        ...gridColor,
        ticks: {
          ...textColor,
          maxTicksLimit: 8,
          callback: (value: string | number) => formatChartTimestamp(Number(value)),
        },
      },
      y: {
        border: { display: false },
        ...gridColor,
        ticks: { ...textColor },
        title: { display: true, text: unit, ...textColor },
      },
    },
  };
}

/**
 * Chart colors from the theme variables. `resolveColor` turns a variable name into a canvas-ready
 * color, `''` when it is not defined. `null` when the theme is not loaded (jsdom): Chart.js defaults.
 */
export function readLineChartColors(
  resolveColor: (variable: string) => string,
): LineChartColors | null {
  const colors: LineChartColors = {
    line: resolveColor(LINE_CHART_COLOR_VARIABLES.line),
    area: resolveColor(LINE_CHART_COLOR_VARIABLES.area),
    grid: resolveColor(LINE_CHART_COLOR_VARIABLES.grid),
    text: resolveColor(LINE_CHART_COLOR_VARIABLES.text),
    tooltipBackground: resolveColor(LINE_CHART_COLOR_VARIABLES.tooltipBackground),
    tooltipText: resolveColor(LINE_CHART_COLOR_VARIABLES.tooltipText),
  };
  return Object.values(colors).every((color: string) => color !== '') ? colors : null;
}

/** French short date-time label (`05/10 14:00`) for an epoch-ms axis value. */
export function formatChartTimestamp(timestampMs: number): string {
  return TIMESTAMP_TICK_FORMAT.format(timestampMs);
}

/** French number with up to 3 decimals and the vendor unit (`1 234,5 kWh`); a missing value is `—`. */
export function formatChartValue(value: number | null, unit: string): string {
  if (value === null) {
    return '—';
  }
  return `${VALUE_FORMAT.format(value)} ${unit}`.trimEnd();
}

function formatTooltipTitle(items: readonly TooltipItem<'line'>[]): string {
  const timestampMs = items[0]?.parsed.x ?? null;
  return timestampMs === null ? '' : formatChartTimestamp(timestampMs);
}
