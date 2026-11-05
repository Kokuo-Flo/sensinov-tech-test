import { InjectionToken } from '@angular/core';
import {
  Chart,
  Filler,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js';

import {
  type LineChartData,
  type LineChartFactory,
  type LineChartHandle,
  type LineChartOptions,
  type LineChartPoint,
} from '#models/line-chart.model';

/**
 * Builds the Chart.js line chart. Only the pieces the line chart uses are registered, so the rest
 * of Chart.js is tree-shaken. Provide a fake factory in component tests: jsdom has no canvas.
 */
export const LINE_CHART_FACTORY = new InjectionToken<LineChartFactory>('LINE_CHART_FACTORY', {
  providedIn: 'root',
  factory: () => createChartJsLineChart,
});

function createChartJsLineChart(
  canvas: HTMLCanvasElement,
  data: LineChartData,
  options: LineChartOptions,
): LineChartHandle {
  // Idempotent: registering an already registered component is a no-op.
  Chart.register(LineController, LineElement, PointElement, LinearScale, Tooltip, Filler);
  const chart = new Chart<'line', LineChartPoint[]>(canvas, { type: 'line', data, options });
  return {
    update: (nextData: LineChartData, nextOptions: LineChartOptions) => {
      chart.data = nextData;
      chart.options = nextOptions;
      chart.update('none');
    },
    destroy: () => chart.destroy(),
  };
}
