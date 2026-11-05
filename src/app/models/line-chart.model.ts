import { type ChartData, type ChartOptions } from 'chart.js';

/** One chart point on the linear time axis: epoch ms, `null` value = gap in the line. */
export interface LineChartPoint {
  readonly x: number;
  readonly y: number | null;
}

export type LineChartData = ChartData<'line', LineChartPoint[]>;
export type LineChartOptions = ChartOptions<'line'>;

/** Chart colors resolved at runtime from the Material system variables (`--mat-sys-*`). */
export interface LineChartColors {
  readonly line: string;
  readonly area: string;
  readonly grid: string;
  readonly text: string;
  readonly tooltipBackground: string;
  readonly tooltipText: string;
}

/** Theme variable read for each chart color. */
export const LINE_CHART_COLOR_VARIABLES: Readonly<Record<keyof LineChartColors, string>> = {
  line: '--mat-sys-primary',
  area: '--mat-sys-secondary-container',
  grid: '--mat-sys-outline-variant',
  text: '--mat-sys-on-surface-variant',
  tooltipBackground: '--mat-sys-inverse-surface',
  tooltipText: '--mat-sys-inverse-on-surface',
};

/** A rendered chart, reduced to what the line chart component drives. */
export interface LineChartHandle {
  update(data: LineChartData, options: LineChartOptions): void;
  destroy(): void;
}

/** Draws a line chart on `canvas`; swapped for a fake in tests (a canvas cannot render in jsdom). */
export type LineChartFactory = (
  canvas: HTMLCanvasElement,
  data: LineChartData,
  options: LineChartOptions,
) => LineChartHandle;
