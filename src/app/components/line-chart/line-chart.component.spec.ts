import { signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';

import {
  type LineChartData,
  type LineChartFactory,
  type LineChartHandle,
  type LineChartOptions,
} from '#models/line-chart.model';
import { type MeasurementPoint } from '#models/measurement.model';
import { ThemeService } from '#services/theme.service';
import { makePoint } from '#testing/fixtures';
import { provideServiceMock } from '#testing/service-mock';
import { type ThemeMode } from '#models/theme.model';

import { LINE_CHART_FACTORY } from './line-chart.factory';
import { LineChartComponent } from './line-chart.component';

describe('LineChartComponent', () => {
  const mode = signal<ThemeMode>('light');

  function fakeComputedStyle(): CSSStyleDeclaration {
    const style = document.createElement('span').style;
    style.getPropertyValue = () => 'defined';
    Object.defineProperty(style, 'color', {
      value: mode() === 'dark' ? 'rgb(255, 255, 255)' : 'rgb(0, 0, 0)',
    });
    return style;
  }

  const handle = {
    update: vi.fn<LineChartHandle['update']>(),
    destroy: vi.fn<LineChartHandle['destroy']>(),
  };
  const factory = vi.fn<LineChartFactory>(() => handle);
  let fixture: ComponentFixture<LineChartComponent>;

  const POINTS: MeasurementPoint[] = [
    makePoint('2026-10-30T00:00:00.000Z', 1),
    makePoint('2026-10-30T00:15:00.000Z', 2),
  ];

  function lastData(): LineChartData | undefined {
    return handle.update.mock.calls.at(-1)?.[0];
  }

  function lastOptions(): LineChartOptions | undefined {
    return handle.update.mock.calls.at(-1)?.[1];
  }

  beforeEach(async () => {
    mode.set('light');
    // jsdom does not resolve theme variables: fake them, with a color that depends on the mode.
    vi.stubGlobal('getComputedStyle', fakeComputedStyle);
    handle.update.mockClear();
    handle.destroy.mockClear();
    factory.mockClear();
    TestBed.configureTestingModule({
      providers: [
        { provide: LINE_CHART_FACTORY, useValue: factory },
        provideServiceMock(ThemeService, { mode: mode.asReadonly() }),
      ],
    });
    fixture = TestBed.createComponent(LineChartComponent);
    fixture.componentRef.setInput('points', POINTS);
    fixture.componentRef.setInput('unit', 'kWh');
    await fixture.whenStable();
  });

  afterEach(() => vi.unstubAllGlobals());

  it('should create the chart once on the canvas with the points and unit', () => {
    const canvas = (fixture.nativeElement as HTMLElement).querySelector(
      '[data-testid="line-chart-canvas"]',
    );
    const call = factory.mock.calls.at(-1);

    expect(factory).toHaveBeenCalledTimes(1);
    expect(call?.[0]).toBe(canvas);
    expect(call?.[1].datasets.map((dataset) => dataset.data.length)).toEqual([2]);
    expect(call?.[2].scales?.['y']?.title?.text).toBe('kWh');
    expect(handle.update).not.toHaveBeenCalled();
  });

  it('should update the chart in place when the points change', async () => {
    fixture.componentRef.setInput('points', [...POINTS, makePoint('2026-10-30T00:30:00.000Z', 3)]);
    await fixture.whenStable();

    expect(factory).toHaveBeenCalledTimes(1);
    expect(lastData()?.datasets.map((dataset) => dataset.data.length)).toEqual([3]);
  });

  it('should update the chart in place when the unit changes', async () => {
    fixture.componentRef.setInput('unit', '°C');
    await fixture.whenStable();

    expect(factory).toHaveBeenCalledTimes(1);
    expect(lastOptions()?.scales?.['y']?.title?.text).toBe('°C');
  });

  it('should update the chart when the theme mode changes', async () => {
    mode.set('dark');
    await fixture.whenStable();

    expect(factory).toHaveBeenCalledTimes(1);
    expect(handle.update).toHaveBeenCalledTimes(1);
    expect(lastData()?.datasets.map((dataset) => dataset.borderColor)).toEqual([
      'rgb(255, 255, 255)',
    ]);
  });

  it('should draw with the colors resolved from the theme', () => {
    expect(factory.mock.calls.at(-1)?.[1].datasets.map((dataset) => dataset.borderColor)).toEqual([
      'rgb(0, 0, 0)',
    ]);
  });

  it('should destroy the chart with the component', () => {
    fixture.destroy();

    expect(handle.destroy).toHaveBeenCalledTimes(1);
  });
});
