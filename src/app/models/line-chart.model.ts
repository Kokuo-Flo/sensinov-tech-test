/**
 * Contract of the time-series line chart (`LineChartComponent`) with Chart.js: data shape, theme colors and
 * the factory hiding the library so the component stays testable in jsdom.
 */

import { type ChartData, type ChartOptions } from 'chart.js';

/** Material system variable (`--mat-sys-*`) each chart color is read from at runtime. */
export const LINE_CHART_COLOR_VARIABLES: Readonly<Record<keyof LineChartColors, string>> = {
  line: '--mat-sys-primary',
  area: '--mat-sys-secondary-container',
  grid: '--mat-sys-outline-variant',
  text: '--mat-sys-on-surface-variant',
  tooltipBackground: '--mat-sys-inverse-surface',
  tooltipText: '--mat-sys-inverse-on-surface',
};

/** Chart.js data of a line chart made of {@link LineChartPoint}s. */
export type LineChartData = ChartData<'line', LineChartPoint[]>;

export type LineChartOptions = ChartOptions<'line'>;

/** Draws a line chart on `canvas`; swapped for a fake in tests (a canvas cannot render in jsdom). */
export type LineChartFactory = (
  canvas: HTMLCanvasElement,
  data: LineChartData,
  options: LineChartOptions,
) => LineChartHandle;

/** One point on the linear time axis. */
export interface LineChartPoint {
  /** Instant, epoch milliseconds. */
  readonly x: number;
  /** Measured value in the series unit; `null` = gap in the line. */
  readonly y: number | null;
}

/** Chart colors resolved at runtime from the Material theme (any CSS color string). */
export interface LineChartColors {
  readonly line: string;
  /** Fill under the line. */
  readonly area: string;
  readonly grid: string;
  /** Axis labels. */
  readonly text: string;
  readonly tooltipBackground: string;
  readonly tooltipText: string;
}

/** A rendered chart, reduced to what the line chart component drives. */
export interface LineChartHandle {
  update(data: LineChartData, options: LineChartOptions): void;
  destroy(): void;
}
