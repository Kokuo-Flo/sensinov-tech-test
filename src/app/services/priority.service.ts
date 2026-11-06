import { computed, Injectable, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';

import { ReferenceDao } from '#dao/reference.dao';
import { type Building } from '#models/building.model';
import { type Country } from '#models/country.model';
import { type DataProblem } from '#models/data-problem.model';
import {
  FINDING_PERIOD,
  type Finding,
  getEvidenceLink,
  isDataQualityFinding,
} from '#models/finding.model';
import {
  DEFAULT_PRIORITY_SORT_KEY,
  type EstimatedReduction,
  type ImpactAssumptions,
  type PriorityRow,
  type PrioritySortKey,
} from '#models/impact.model';
import { getMeasurementPeriodRange } from '#models/measurement-period.model';
import { FindingService } from '#services/finding.service';
import { toDataProblem } from '#utils/data-problem.utils';
import {
  EARLY_HVAC_RECOVERABLE_SHARE,
  EARLY_HVAC_REFERENCE_LEAD_HOURS,
} from '#utils/detection/early-hvac-start.utils';
import {
  HEATING_SETPOINT_ENERGY_SHARE_PER_CELSIUS,
  HEATING_SETPOINT_REFERENCE_CELSIUS,
} from '#utils/detection/heating-setpoint.utils';
import {
  LOW_OCCUPANCY_NOMINAL_PEAK_RATIO,
  LOW_OCCUPANCY_RECOVERABLE_SHARE,
} from '#utils/detection/low-occupancy.utils';
import {
  NIGHT_BASELOAD_CLOSED_HOURS_PER_WORKING_DAY,
  NIGHT_BASELOAD_HEALTHY_RATIO,
} from '#utils/detection/night-baseload.utils';
import {
  estimateImpact,
  getAnnualisationFactor,
  getEstimatedReduction,
  getWindowWeeks,
  sortByImpact,
  sumImpacts,
  WEEKS_PER_YEAR,
} from '#utils/impact.utils';

const COLLATOR = new Intl.Collator('fr-FR', { sensitivity: 'base' });
const WINDOW_WEEKS = getWindowWeeks(getMeasurementPeriodRange(FINDING_PERIOD));

type UnrankedRow = Omit<PriorityRow, 'rank'>;

/**
 * Yearly stake of the detected wastes: joins the findings of `FindingService` with buildings and country
 * factors, ranks them, and relates them to the baseline emissions of the portfolio. Consumed by the priorities
 * page.
 */
@Injectable({ providedIn: 'root' })
export class PriorityService {
  // --- Injections ---
  private readonly _findingService = inject(FindingService);
  private readonly _referenceDao = inject(ReferenceDao);

  // --- Constants ---
  private readonly _annualisationFactor = getAnnualisationFactor(WINDOW_WEEKS);

  // --- Internal signals ---
  private readonly _sortKey = signal<PrioritySortKey>(DEFAULT_PRIORITY_SORT_KEY);

  private readonly _countriesResource = rxResource({
    stream: () => this._referenceDao.getCountries(),
    defaultValue: [],
  });

  private readonly _countries = computed(() =>
    this._countriesResource.hasValue() ? this._countriesResource.value() : [],
  );
  /** Buildings with at least one data-quality finding. */
  private readonly _dataQualityBuildingIds = computed(
    () =>
      new Set(
        this._findingService
          .findings()
          .filter(isDataQualityFinding)
          .map((finding: Finding) => finding.buildingId),
      ),
  );
  /** Every quantified waste, unsorted; a finding without excess energy or without known country is left out. */
  private readonly _unrankedRows = computed<UnrankedRow[]>(() => {
    const buildings = new Map(
      this._findingService.buildings().map((building: Building) => [building.id, building] as const),
    );
    const countries = new Map(
      this._countries().map((country: Country) => [country.code, country] as const),
    );
    const dataQualityBuildingIds: ReadonlySet<string> = this._dataQualityBuildingIds();
    return this._findingService.findings().flatMap((finding: Finding): UnrankedRow[] => {
      const building = buildings.get(finding.buildingId);
      const country = building === undefined ? undefined : countries.get(building.countryCode);
      if (building === undefined || country === undefined) {
        return [];
      }
      const impact = estimateImpact(finding, country, this._annualisationFactor);
      if (impact === null) {
        return [];
      }
      return [
        {
          finding,
          buildingName: building.name,
          country,
          impact,
          hasDataQualityIssue: dataQualityBuildingIds.has(finding.buildingId),
          evidenceLink: getEvidenceLink(finding),
        },
      ];
    });
  });

  public readonly sortKey = this._sortKey.asReadonly();
  /** Quantified wastes from the largest to the smallest stake under the selected sort. */
  public readonly rows = computed<PriorityRow[]>(() =>
    sortByImpact(this._unrankedRows(), this._sortKey()).map((row: UnrankedRow, index: number) => ({
      ...row,
      rank: index + 1,
    })),
  );
  public readonly totals = computed(() =>
    sumImpacts(this._unrankedRows().map((row: UnrankedRow) => row.impact)),
  );
  public readonly estimatedReduction = computed<EstimatedReduction>(() =>
    getEstimatedReduction(
      this._findingService.buildings(),
      this._countries(),
      this._unrankedRows().map((row: UnrankedRow) => row.impact),
    ),
  );
  /** Buildings whose figures are to be confirmed, by name. */
  public readonly dataQualityBuildings = computed(() =>
    this._findingService
      .buildings()
      .filter((building: Building) => this._dataQualityBuildingIds().has(building.id))
      .sort((left: Building, right: Building) => COLLATOR.compare(left.name, right.name)),
  );
  public readonly assumptions = computed<ImpactAssumptions>(() => {
    const countries = new Map(
      this._unrankedRows().map((row: UnrankedRow) => [row.country.code, row.country] as const),
    );
    return {
      windowWeeks: WINDOW_WEEKS,
      weeksPerYear: WEEKS_PER_YEAR,
      annualisationFactor: this._annualisationFactor,
      earlyStartReferenceLeadHours: EARLY_HVAC_REFERENCE_LEAD_HOURS,
      earlyStartRecoverableShare: EARLY_HVAC_RECOVERABLE_SHARE,
      nightHealthyRatio: NIGHT_BASELOAD_HEALTHY_RATIO,
      nightClosedHoursPerWorkingDay: NIGHT_BASELOAD_CLOSED_HOURS_PER_WORKING_DAY,
      setpointReferenceCelsius: HEATING_SETPOINT_REFERENCE_CELSIUS,
      setpointEnergySharePerCelsius: HEATING_SETPOINT_ENERGY_SHARE_PER_CELSIUS,
      nominalOccupancyPeakRatio: LOW_OCCUPANCY_NOMINAL_PEAK_RATIO,
      lowOccupancyRecoverableShare: LOW_OCCUPANCY_RECOVERABLE_SHARE,
      countries: [...countries.values()].sort((left: Country, right: Country) =>
        COLLATOR.compare(left.name, right.name),
      ),
    };
  });
  public readonly isLoading = computed(
    () => this._findingService.isLoading() || this._countriesResource.isLoading(),
  );
  public readonly problem = computed<DataProblem | null>(() => {
    const findingProblem = this._findingService.problem();
    if (findingProblem !== null) {
      return findingProblem;
    }
    const error = this._countriesResource.error();
    return error === undefined ? null : toDataProblem(error);
  });

  public selectSortKey(key: PrioritySortKey): void {
    this._sortKey.set(key);
  }
}
