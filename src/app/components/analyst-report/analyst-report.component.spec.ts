import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { LOCALE_ID, signal, type WritableSignal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { type DataProblem } from '#models/data-problem.model';
import { makeReport } from '#testing/fixtures';
import { provideServiceMock } from '#testing/service-mock';

import { AnalystReportComponent } from './analyst-report.component';
import { AnalystReportService } from './analyst-report.service';

registerLocaleData(localeFr);

type ListedReport = ReturnType<AnalystReportService['reports']>[number];

function listedReport(overrides: Partial<ListedReport> = {}): ListedReport {
  return { ...makeReport(), recommendations: [], ...overrides };
}

describe('AnalystReportComponent', () => {
  let fixture: ComponentFixture<AnalystReportComponent>;
  let reports: WritableSignal<ListedReport[]>;
  let isLoading: WritableSignal<boolean>;
  let problem: WritableSignal<DataProblem | null>;

  function all(selector: string): HTMLElement[] {
    return Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>(selector),
    );
  }

  function one(selector: string): HTMLElement | null {
    return (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(selector);
  }

  async function render(): Promise<void> {
    fixture = TestBed.createComponent(AnalystReportComponent);
    await fixture.whenStable();
  }

  beforeEach(() => {
    reports = signal<ListedReport[]>([]);
    isLoading = signal(false);
    problem = signal<DataProblem | null>(null);
    TestBed.configureTestingModule({
      providers: [
        { provide: LOCALE_ID, useValue: 'fr-FR' },
        provideServiceMock(AnalystReportService, { reports, isLoading, problem }),
      ],
    });
  });

  it('should show the loading state only', async () => {
    isLoading.set(true);

    await render();

    expect(one('[data-testid="analyst-report-loading"]')).not.toBeNull();
    expect(one('[data-testid="analyst-report-empty"]')).toBeNull();
  });

  it('should show the French error message', async () => {
    problem.set({ type: 'unknown-error', title: 'x' });

    await render();

    expect(one('[data-testid="analyst-report-error"]')?.textContent?.trim()).toBe(
      'Une erreur est survenue. Réessayez plus tard.',
    );
  });

  it('should say « Rapport introuvable. » on a not-found problem', async () => {
    problem.set({ type: 'not-found', title: 'x' });

    await render();

    expect(one('[data-testid="analyst-report-error"]')?.textContent?.trim()).toBe(
      'Rapport introuvable.',
    );
  });

  it('should show the empty state when no report is published', async () => {
    await render();

    expect(one('[data-testid="analyst-report-empty"]')?.textContent?.trim()).toBe(
      'Aucun rapport publié.',
    );
    expect(all('[data-testid="analyst-report"]')).toHaveLength(0);
  });

  it('should render the report header with a French long date', async () => {
    reports.set([
      listedReport({
        title: 'Rapport T3',
        author: 'Alice Martin',
        publishedAt: '2026-10-15T00:00:00.000Z',
        recommendations: [],
      }),
    ]);

    await render();

    expect(one('[data-testid="analyst-report-title"]')?.textContent?.trim()).toBe('Rapport T3');
    expect(one('[data-testid="analyst-report-author"]')?.textContent?.trim()).toBe('Alice Martin');
    expect(one('[data-testid="analyst-report-date"]')?.textContent?.trim()).toBe('15 octobre 2026');
    expect(one('[data-testid="analyst-report-date"]')?.getAttribute('datetime')).toBe(
      '2026-10-15T00:00:00.000Z',
    );
  });

  it('should show the empty recommendation state', async () => {
    reports.set([listedReport({ recommendations: [] })]);

    await render();

    expect(one('[data-testid="recommendation-list-empty"]')?.textContent?.trim()).toBe(
      'Aucune recommandation.',
    );
  });

  it('should tag a portfolio-wide recommendation « Ensemble du parc » and the others with the building', async () => {
    reports.set([
      listedReport({
        recommendations: [
          {
            id: 'r1',
            buildingId: null,
            title: 'Parc',
            description: 'Desc parc',
            buildingName: null,
          },
          {
            id: 'r2',
            buildingId: 'bld-warsaw',
            title: 'Local',
            description: 'Desc local',
            buildingName: 'Varsovie',
          },
        ],
      }),
    ]);

    await render();

    const rows = all('[data-testid="recommendation"]');
    const byTitle = (title: string): HTMLElement | undefined =>
      rows.find(
        (row) =>
          row.querySelector('[data-testid="recommendation-title"]')?.textContent?.trim() === title,
      );
    expect(rows).toHaveLength(2);
    expect(
      byTitle('Parc')
        ?.querySelector('[data-testid="recommendation-building"]')
        ?.textContent?.trim(),
    ).toBe('Ensemble du parc');
    expect(
      byTitle('Parc')
        ?.querySelector('[data-testid="recommendation-description"]')
        ?.textContent?.trim(),
    ).toBe('Desc parc');
    expect(
      byTitle('Local')
        ?.querySelector('[data-testid="recommendation-building"]')
        ?.textContent?.trim(),
    ).toBe('Varsovie');
  });
});
