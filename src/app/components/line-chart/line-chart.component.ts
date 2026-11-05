import { DOCUMENT } from '@angular/common';
import {
  afterRenderEffect,
  Component,
  DestroyRef,
  type ElementRef,
  inject,
  input,
  type Signal,
  viewChild,
} from '@angular/core';

import {
  type LineChartColors,
  type LineChartHandle,
} from '#models/line-chart.model';
import { type MeasurementPoint } from '#models/measurement.model';
import { ThemeService } from '#services/theme.service';
import {
  buildLineChartData,
  buildLineChartOptions,
  readLineChartColors,
} from '#utils/line-chart.utils';

import { LINE_CHART_FACTORY } from './line-chart.factory';

@Component({
  selector: 'sb-line-chart',
  templateUrl: './line-chart.component.html',
  styleUrl: './line-chart.component.scss',
})
export class LineChartComponent {
  // --- Injections ---
  private readonly _document = inject(DOCUMENT);
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _themeService = inject(ThemeService);
  private readonly _createLineChart = inject(LINE_CHART_FACTORY);

  // --- Inputs ---
  public readonly points = input.required<readonly MeasurementPoint[]>();
  public readonly unit = input.required<string>();

  // --- Other members ---
  private readonly _canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly _colorProbe = viewChild.required<ElementRef<HTMLElement>>('colorProbe');
  /** Created on the first render, then updated in place. */
  private _chart: LineChartHandle | null = null;

  constructor() {
    // A canvas cannot use CSS variables: theme colors are resolved after render, again on every
    // light / dark switch, then the chart is created once and updated on every input or color change.
    afterRenderEffect({
      earlyRead: () => {
        this._themeService.mode();
        return readLineChartColors((variable: string) => this._resolveColor(variable));
      },
      write: (colors: Signal<LineChartColors | null>) => {
        this._updateChart(colors());
      },
    });
    this._destroyRef.onDestroy(() => this._chart?.destroy());
  }

  private _updateChart(colors: LineChartColors | null): void {
    const data = buildLineChartData(this.points(), colors);
    const options = buildLineChartOptions(this.unit(), colors);
    if (this._chart === null) {
      this._chart = this._createLineChart(this._canvas().nativeElement, data, options);
      return;
    }
    this._chart.update(data, options);
  }

  /**
   * Theme variables hold `light-dark()` pairs, only resolved on a real color property: the hidden
   * probe computes them to `rgb()` for the current scheme. `''` when the theme is not loaded (jsdom).
   */
  private _resolveColor(variable: string): string {
    const root = this._document.documentElement;
    if (getComputedStyle(root).getPropertyValue(variable).trim() === '') {
      return '';
    }
    const probe = this._colorProbe().nativeElement;
    probe.style.color = `var(${variable})`;
    return getComputedStyle(probe).color;
  }
}
