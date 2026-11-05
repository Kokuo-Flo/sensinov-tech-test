import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { LOCALE_ID, signal, type WritableSignal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { MatButtonToggle, MatButtonToggleChange } from '@angular/material/button-toggle';
import { MatSelect, MatSelectChange } from '@angular/material/select';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';

import { LINE_CHART_FACTORY } from '#components/line-chart/line-chart.factory';
import { type DataProblem } from '#models/data-problem.model';
import { type Equipment, type MetricDefinition, type MetricKey } from '#models/equipment.model';
import { type LineChartHandle } from '#models/line-chart.model';
import { type MeasurementPoint } from '#models/measurement.model';
import { type MeasurementPeriod } from '#models/measurement-period.model';
import { makeEquipment, makePoint } from '#testing/fixtures';
import { provideServiceMock } from '#testing/service-mock';

import { EquipmentDetailComponent } from './equipment-detail.component';
import { EquipmentDetailService } from './equipment-detail.service';

registerLocaleData(localeFr);

const TWO_METRICS: MetricDefinition[] = [
  { key: 'active-energy', unit: 'kWh' },
  { key: 'hvac-status', unit: 'on/off' },
];

describe('EquipmentDetailComponent', () => {
  let fixture: ComponentFixture<EquipmentDetailComponent>;
  let service: EquipmentDetailService;
  let equipment: WritableSignal<Equipment | null>;
  let isLoading: WritableSignal<boolean>;
  let problem: WritableSignal<DataProblem | null>;
  let buildingLabel: WritableSignal<string>;
  let metrics: WritableSignal<readonly MetricDefinition[]>;
  let hasSeveralMetrics: WritableSignal<boolean>;
  let selectedMetric: WritableSignal<MetricKey | null>;
  let selectedPeriod: WritableSignal<MeasurementPeriod>;
  let points: WritableSignal<readonly MeasurementPoint[]>;
  let unit: WritableSignal<string>;
  let isSeriesEmpty: WritableSignal<boolean>;
  let latestPoints: WritableSignal<MeasurementPoint[]>;
  let isSeriesLoading: WritableSignal<boolean>;
  let seriesProblem: WritableSignal<DataProblem | null>;
  const chartHandle: LineChartHandle = { update: vi.fn(), destroy: vi.fn() };

  function all(selector: string): HTMLElement[] {
    return Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>(selector),
    );
  }

  function one(selector: string): HTMLElement | null {
    return (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(selector);
  }

  function text(selector: string): string | undefined {
    return one(selector)?.textContent?.trim();
  }

  async function render(): Promise<void> {
    fixture = TestBed.createComponent(EquipmentDetailComponent);
    fixture.componentRef.setInput('equipmentId', 'eq-1');
    service = fixture.debugElement.injector.get(EquipmentDetailService);
    await fixture.whenStable();
  }

  /** Renders a loaded equipment whose series has values. */
  async function renderLoaded(): Promise<void> {
    equipment.set(makeEquipment({ name: 'CPT-CVC-01', metrics: TWO_METRICS }));
    metrics.set(TWO_METRICS);
    hasSeveralMetrics.set(true);
    selectedMetric.set('active-energy');
    points.set([makePoint('2026-10-30T10:00:00.000Z', 1)]);
    isSeriesEmpty.set(false);
    unit.set('kWh');
    await render();
  }

  beforeEach(() => {
    equipment = signal<Equipment | null>(null);
    isLoading = signal(false);
    problem = signal<DataProblem | null>(null);
    buildingLabel = signal('Varsovie');
    metrics = signal<readonly MetricDefinition[]>([]);
    hasSeveralMetrics = signal(false);
    selectedMetric = signal<MetricKey | null>(null);
    selectedPeriod = signal<MeasurementPeriod>('7-days');
    points = signal<readonly MeasurementPoint[]>([]);
    unit = signal('');
    isSeriesEmpty = signal(true);
    latestPoints = signal<MeasurementPoint[]>([]);
    isSeriesLoading = signal(false);
    seriesProblem = signal<DataProblem | null>(null);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: LOCALE_ID, useValue: 'fr-FR' },
        { provide: LINE_CHART_FACTORY, useValue: () => chartHandle },
      ],
    });
    TestBed.overrideComponent(EquipmentDetailComponent, {
      set: {
        providers: [
          provideServiceMock(EquipmentDetailService, {
            LATEST_POINTS_COUNT: 48,
            equipment,
            isLoading,
            problem,
            buildingLabel,
            metrics,
            hasSeveralMetrics,
            selectedMetric,
            selectedPeriod,
            points,
            unit,
            isSeriesEmpty,
            latestPoints,
            isSeriesLoading,
            seriesProblem,
          }),
        ],
      },
    });
  });

  describe('page states', () => {
    it('should hand its route input to the service', async () => {
      await render();

      const [equipmentId] = vi.mocked(service.connect).mock.calls[0] ?? [];
      expect(equipmentId?.()).toBe('eq-1');
    });

    it('should show the loading state only', async () => {
      isLoading.set(true);

      await render();

      expect(one('[data-testid="equipment-detail-loading"]')).not.toBeNull();
      expect(one('[data-testid="equipment-name"]')).toBeNull();
    });

    it('should show « Équipement introuvable. » on a not-found problem', async () => {
      problem.set({ type: 'not-found', title: 'x' });

      await render();

      expect(text('[data-testid="equipment-detail-error"]')).toBe('Équipement introuvable.');
      expect(one('[data-testid="equipment-name"]')).toBeNull();
    });

    it('should render the equipment summary with French labels', async () => {
      await renderLoaded();

      expect(text('[data-testid="equipment-name"]')).toBe('CPT-CVC-01');
      expect(text('[data-testid="equipment-type"]')).toBe("Compteur d'énergie");
      expect(text('[data-testid="equipment-scope"]')).toBe('CVC');
      expect(text('[data-testid="equipment-vendor"]')).toBe('Acme');
      expect(text('[data-testid="equipment-zone"]')).toBe('Hall');
      expect(text('[data-testid="equipment-interval"]')).toBe('15 min');
    });

    it('should render dashes for a missing zone and meter scope', async () => {
      equipment.set(makeEquipment({ zone: null, meterScope: null }));

      await render();

      expect(text('[data-testid="equipment-zone"]')).toBe('—');
      expect(text('[data-testid="equipment-scope"]')).toBe('—');
    });
  });

  describe('breadcrumb', () => {
    it('should only show the root before the equipment is known', async () => {
      await render();

      expect(one('[data-testid="breadcrumb-buildings"]')?.getAttribute('href')).toBe('/buildings');
      expect(one('[data-testid="breadcrumb-building"]')).toBeNull();
      expect(one('[data-testid="breadcrumb-equipment"]')).toBeNull();
    });

    it('should link to the building and end on the equipment', async () => {
      await renderLoaded();

      expect(one('[data-testid="breadcrumb-building"]')?.getAttribute('href')).toBe(
        '/buildings/bld-warsaw',
      );
      expect(text('[data-testid="breadcrumb-building"]')).toBe('Varsovie');
      expect(text('[data-testid="breadcrumb-equipment"]')).toBe('CPT-CVC-01');
      expect(one('[data-testid="breadcrumb-equipment"]')?.getAttribute('aria-current')).toBe(
        'page',
      );
    });
  });

  describe('metric', () => {
    it('should offer a select when the equipment has several metrics', async () => {
      await renderLoaded();

      expect(one('[data-testid="metric-select"]')).not.toBeNull();
      expect(one('[data-testid="metric-label"]')).toBeNull();
    });

    it('should show the metric as text when there is a single one', async () => {
      equipment.set(makeEquipment());
      selectedMetric.set('active-energy');

      await render();

      expect(text('[data-testid="metric-label"]')).toContain('Énergie active');
      expect(one('[data-testid="metric-select"]')).toBeNull();
    });

    it('should select the metric picked in the list', async () => {
      await renderLoaded();
      const select = fixture.debugElement.query(By.directive(MatSelect)).injector.get(MatSelect);

      select.options.find((option) => option.value === 'hvac-status')?.select();
      await fixture.whenStable();

      expect(service.selectMetric).toHaveBeenCalledWith('hvac-status');
    });

    it('should ignore a value that is not a metric', async () => {
      await renderLoaded();
      const select = fixture.debugElement.query(By.directive(MatSelect)).injector.get(MatSelect);

      fixture.componentInstance.onSelectMetric(new MatSelectChange(select, 'bogus'));
      fixture.componentInstance.onSelectMetric(new MatSelectChange(select, 42));

      expect(service.selectMetric).not.toHaveBeenCalled();
    });
  });

  describe('period', () => {
    it.each([
      ['period-7-days', '7-days'],
      ['period-4-weeks', '4-weeks'],
      ['period-8-weeks', '8-weeks'],
    ])('should select the period when %s is clicked', async (testId, period) => {
      selectedPeriod.set(period === '7-days' ? '4-weeks' : '7-days');
      await renderLoaded();

      one(`[data-testid="${testId}"] button`)?.click();
      await fixture.whenStable();

      expect(service.selectPeriod).toHaveBeenCalledWith(period);
    });

    it('should ignore a value that is not a period', async () => {
      await renderLoaded();
      const toggle = fixture.debugElement
        .query(By.directive(MatButtonToggle))
        .injector.get(MatButtonToggle);

      fixture.componentInstance.onSelectPeriod(new MatButtonToggleChange(toggle, 'forever'));
      fixture.componentInstance.onSelectPeriod(new MatButtonToggleChange(toggle, null));

      expect(service.selectPeriod).not.toHaveBeenCalled();
    });
  });

  describe('series', () => {
    it('should show the series loading state', async () => {
      isSeriesLoading.set(true);
      await renderLoaded();

      expect(one('[data-testid="series-loading"]')).not.toBeNull();
      expect(one('[data-testid="equipment-chart"]')).toBeNull();
      expect(one('[data-testid="latest-values-table"]')).toBeNull();
    });

    it('should show the series error in French', async () => {
      seriesProblem.set({ type: 'invalid-metric', title: 'x' });
      await renderLoaded();

      expect(text('[data-testid="series-error"]')).toBe(
        "Cette métrique n'est pas disponible pour cet équipement.",
      );
      expect(one('[data-testid="equipment-chart"]')).toBeNull();
      expect(one('[data-testid="latest-values-table"]')).toBeNull();
    });

    it('should show the empty series state without chart nor table', async () => {
      await renderLoaded();
      isSeriesEmpty.set(true);
      await fixture.whenStable();

      expect(text('[data-testid="series-empty"]')).toBe('Aucune mesure sur cette période.');
      expect(one('[data-testid="equipment-chart"]')).toBeNull();
      expect(one('[data-testid="latest-values-table"]')).toBeNull();
    });

    it('should show the chart when the series has values', async () => {
      await renderLoaded();

      expect(one('[data-testid="equipment-chart"]')).not.toBeNull();
      expect(one('[data-testid="series-empty"]')).toBeNull();
    });

    it('should list the latest values with the unit and dashes for missing samples', async () => {
      latestPoints.set([
        makePoint('2026-10-30T10:00:00.000Z', 1234.5678),
        makePoint('2026-10-30T09:45:00.000Z', null),
      ]);
      await renderLoaded();

      const rows = all('[data-testid="latest-value-row"]');
      const values = all('[data-testid="latest-value"]').map((cell) =>
        (cell.textContent ?? '').replace(/\s/g, ' ').trim(),
      );
      expect(rows).toHaveLength(2);
      expect(values).toEqual(['1 234,568', '—']);
      expect(text('[data-testid="latest-values-table"] th.cell-numeric')).toBe('Valeur (kWh)');
      expect(text('h2.text-heading')).toBe('48 dernières valeurs brutes');
    });

    it('should format timestamps as dd/MM/yyyy HH:mm', async () => {
      const timestamp = '2026-10-30T10:05:00.000Z';
      latestPoints.set([makePoint(timestamp, 1)]);
      await renderLoaded();

      const local = new Date(timestamp);
      const pad = (value: number): string => String(value).padStart(2, '0');
      expect(text('[data-testid="latest-value-timestamp"]')).toBe(
        `${pad(local.getDate())}/${pad(local.getMonth() + 1)}/${local.getFullYear()} ${pad(local.getHours())}:${pad(local.getMinutes())}`,
      );
    });
  });
});
