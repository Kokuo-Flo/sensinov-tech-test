import { type TooltipItem } from 'chart.js';

import { LINE_CHART_COLOR_VARIABLES, type LineChartColors } from '#models/line-chart.model';
import { type MeasurementPoint } from '#models/measurement.model';

import {
  buildLineChartData,
  buildLineChartOptions,
  formatChartTimestamp,
  formatChartValue,
  LINE_CHART_MAX_POINTS_WITH_DOTS,
  readLineChartColors,
  toChartXyPoints,
} from './line-chart.utils';

const COLORS: LineChartColors = {
  line: 'rgb(1, 1, 1)',
  area: 'rgb(2, 2, 2)',
  grid: 'rgb(3, 3, 3)',
  text: 'rgb(4, 4, 4)',
  tooltipBackground: 'rgb(5, 5, 5)',
  tooltipText: 'rgb(6, 6, 6)',
};

function makePoints(count: number): MeasurementPoint[] {
  return Array.from({ length: count }, (_: unknown, index: number) => ({
    timestamp: new Date(Date.UTC(2026, 9, 1, 0, index)).toISOString(),
    value: index,
  }));
}

function tooltipItem(x: number, y: number | null): TooltipItem<'line'> {
  return { parsed: { x, y } } as unknown as TooltipItem<'line'>;
}

describe('toChartXyPoints', () => {
  it('should convert ISO timestamps to epoch ms and keep null values', () => {
    const result = toChartXyPoints([
      { timestamp: '2026-10-01T00:00:00.000Z', value: 1.5 },
      { timestamp: '2026-10-01T00:15:00.000Z', value: null },
    ]);

    expect(result).toEqual([
      { x: Date.UTC(2026, 9, 1, 0, 0), y: 1.5 },
      { x: Date.UTC(2026, 9, 1, 0, 15), y: null },
    ]);
  });

  it('should return an empty list for an empty series', () => {
    expect(toChartXyPoints([])).toEqual([]);
  });
});

describe('buildLineChartData', () => {
  it('should draw dots on a series of up to 200 points', () => {
    const data = buildLineChartData(makePoints(LINE_CHART_MAX_POINTS_WITH_DOTS), null);

    expect(data.datasets.map((dataset) => dataset.pointRadius)).toEqual([2]);
  });

  it('should hide dots above 200 points', () => {
    const data = buildLineChartData(makePoints(LINE_CHART_MAX_POINTS_WITH_DOTS + 1), null);

    expect(data.datasets.map((dataset) => dataset.pointRadius)).toEqual([0]);
  });

  it('should convert the points and not span gaps', () => {
    const data = buildLineChartData(makePoints(2), null);

    expect(data.datasets.map((dataset) => dataset.spanGaps)).toEqual([false]);
    expect(data.datasets.map((dataset) => dataset.data)).toEqual([
      [
        { x: Date.UTC(2026, 9, 1, 0, 0), y: 0 },
        { x: Date.UTC(2026, 9, 1, 0, 1), y: 1 },
      ],
    ]);
  });

  it('should omit colors when they are not resolved', () => {
    const [dataset] = buildLineChartData(makePoints(1), null).datasets;

    expect(dataset?.borderColor).toBeUndefined();
    expect(dataset?.backgroundColor).toBeUndefined();
    expect(dataset?.pointBackgroundColor).toBeUndefined();
  });

  it('should apply the line and area colors when resolved', () => {
    const [dataset] = buildLineChartData(makePoints(1), COLORS).datasets;

    expect(dataset?.borderColor).toBe(COLORS.line);
    expect(dataset?.backgroundColor).toBe(COLORS.area);
    expect(dataset?.pointBackgroundColor).toBe(COLORS.line);
  });
});

describe('buildLineChartOptions', () => {
  it('should disable animation and the legend', () => {
    const options = buildLineChartOptions('kWh', null);

    expect(options.animation).toBe(false);
    expect(options.plugins?.legend?.display).toBe(false);
  });

  it('should leave chart colors to Chart.js defaults when not resolved', () => {
    const options = buildLineChartOptions('kWh', null);

    expect(options.plugins?.tooltip?.backgroundColor).toBeUndefined();
    expect(options.scales?.['x']?.grid).toBeUndefined();
    expect(options.scales?.['y']?.ticks?.color).toBeUndefined();
  });

  it('should apply tooltip, text and grid colors when resolved', () => {
    const options = buildLineChartOptions('kWh', COLORS);

    expect(options.plugins?.tooltip?.backgroundColor).toBe(COLORS.tooltipBackground);
    expect(options.plugins?.tooltip?.titleColor).toBe(COLORS.tooltipText);
    expect(options.plugins?.tooltip?.bodyColor).toBe(COLORS.tooltipText);
    expect(options.scales?.['x']?.grid?.color).toBe(COLORS.grid);
    expect(options.scales?.['y']?.grid?.color).toBe(COLORS.grid);
    expect(options.scales?.['x']?.ticks?.color).toBe(COLORS.text);
    expect(options.scales?.['y']?.ticks?.color).toBe(COLORS.text);
  });

  it('should show the unit as the y axis title', () => {
    const options = buildLineChartOptions('°C', COLORS);

    expect(options.scales?.['y']?.title?.text).toBe('°C');
    expect(options.scales?.['y']?.title?.color).toBe(COLORS.text);
  });

  it('should format x ticks as French timestamps', () => {
    const options = buildLineChartOptions('kWh', null);
    const timestamp = new Date(2026, 9, 5, 14, 5).getTime();

    const tick = options.scales?.['x']?.ticks?.callback?.call({} as never, timestamp, 0, []);

    expect(tick).toBe(formatChartTimestamp(timestamp));
  });

  it('should label the tooltip value with the unit', () => {
    const options = buildLineChartOptions('kWh', null);
    const label = options.plugins?.tooltip?.callbacks?.label;

    expect(label?.call({} as never, tooltipItem(0, 1234.5))).toBe(formatChartValue(1234.5, 'kWh'));
  });

  it('should title the tooltip with the hovered timestamp', () => {
    const options = buildLineChartOptions('kWh', null);
    const timestamp = new Date(2026, 9, 5, 14, 5).getTime();

    const title = options.plugins?.tooltip?.callbacks?.title?.call({} as never, [
      tooltipItem(timestamp, 1),
    ]);

    expect(title).toBe(formatChartTimestamp(timestamp));
  });

  it('should give an empty tooltip title when nothing is hovered', () => {
    const options = buildLineChartOptions('kWh', null);

    const title = options.plugins?.tooltip?.callbacks?.title?.call({} as never, []);

    expect(title).toBe('');
  });
});

describe('readLineChartColors', () => {
  it('should resolve every theme variable', () => {
    const resolved = readLineChartColors((variable: string) => `resolved(${variable})`);

    expect(resolved).toEqual({
      line: `resolved(${LINE_CHART_COLOR_VARIABLES.line})`,
      area: `resolved(${LINE_CHART_COLOR_VARIABLES.area})`,
      grid: `resolved(${LINE_CHART_COLOR_VARIABLES.grid})`,
      text: `resolved(${LINE_CHART_COLOR_VARIABLES.text})`,
      tooltipBackground: `resolved(${LINE_CHART_COLOR_VARIABLES.tooltipBackground})`,
      tooltipText: `resolved(${LINE_CHART_COLOR_VARIABLES.tooltipText})`,
    });
  });

  it('should return null when no variable is defined', () => {
    expect(readLineChartColors(() => '')).toBeNull();
  });

  it.each(Object.keys(LINE_CHART_COLOR_VARIABLES))(
    'should return null when only the %s variable is missing',
    (key: string) => {
      const missing = Object.entries(LINE_CHART_COLOR_VARIABLES).find(
        ([name]: [string, string]) => name === key,
      )?.[1];

      const resolved = readLineChartColors((variable: string) =>
        variable === missing ? '' : 'rgb(0, 0, 0)',
      );

      expect(resolved).toBeNull();
    },
  );
});

describe('formatChartTimestamp', () => {
  it('should format as French day/month hour:minute', () => {
    // Local construction keeps the expectation independent of the runner time zone.
    const label = formatChartTimestamp(new Date(2026, 9, 5, 14, 5).getTime());

    expect(label).toMatch(/^05\/10\D+14:05$/);
  });

  it('should zero-pad day, month and hour', () => {
    const label = formatChartTimestamp(new Date(2026, 0, 2, 3, 4).getTime());

    expect(label).toMatch(/^02\/01\D+03:04$/);
  });
});

describe('formatChartValue', () => {
  it('should format with French separators and the unit', () => {
    expect(formatChartValue(1234.5, 'kWh').replace(/\s/g, ' ')).toBe('1 234,5 kWh');
  });

  it('should round to 3 decimals', () => {
    expect(formatChartValue(1.23456, '°C')).toBe('1,235 °C');
  });

  it('should drop the trailing space when the unit is empty', () => {
    expect(formatChartValue(2, '')).toBe('2');
  });

  it('should render a missing value as a dash', () => {
    expect(formatChartValue(null, 'kWh')).toBe('—');
  });
});
