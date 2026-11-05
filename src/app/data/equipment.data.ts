import {
  type Equipment,
  type MetricDefinition,
  type SamplingIntervalMinutes,
} from '#models/equipment.model';

/**
 * 7 equipments per building, supplied by 4 fictional vendors with their own naming, unit and sampling habits:
 * - Enerlog (meters): French labels `CPT-GEN-01`, kWh, 15 min.
 * - Voltmark (meters): dotted labels `VM.MAIN.001`, reports **Wh** instead of kWh, 60 min.
 * - AirFlux Controls (building automation): `AHU_Main`, `TT_North`…, 15 min.
 * - Sensiq (building automation): lowercase `cta-01`, `temp-nord`…, 60 min.
 * Every meter of a building comes from the same meter vendor, so main and sub-meters share one interval.
 */

interface MeterVendorProfile {
  readonly vendor: string;
  readonly energyUnit: 'kWh' | 'Wh';
  readonly samplingIntervalMinutes: SamplingIntervalMinutes;
  readonly mainName: string;
  readonly hvacName: string;
  readonly lightingPlugsName: string;
}

interface AutomationVendorProfile {
  readonly vendor: string;
  readonly samplingIntervalMinutes: SamplingIntervalMinutes;
  readonly ahuName: string;
  readonly ahuZone: string;
  readonly occupancyName: string;
  readonly occupancyZone: string;
  readonly northSensorName: string;
  readonly southSensorName: string;
}

interface BuildingVendors {
  readonly buildingId: string;
  readonly meter: MeterVendorProfile;
  readonly automation: AutomationVendorProfile;
}

const ENERLOG: MeterVendorProfile = {
  vendor: 'Enerlog',
  energyUnit: 'kWh',
  samplingIntervalMinutes: 15,
  mainName: 'CPT-GEN-01',
  hvacName: 'CPT-CVC-01',
  lightingPlugsName: 'CPT-ECL-PC-01',
};

const VOLTMARK: MeterVendorProfile = {
  vendor: 'Voltmark',
  energyUnit: 'Wh',
  samplingIntervalMinutes: 60,
  mainName: 'VM.MAIN.001',
  hvacName: 'VM.HVAC.002',
  lightingPlugsName: 'VM.LTG-PLG.003',
};

const AIRFLUX: AutomationVendorProfile = {
  vendor: 'AirFlux Controls',
  samplingIntervalMinutes: 15,
  ahuName: 'AHU_Main',
  ahuZone: 'Toiture',
  occupancyName: 'OCC_Building',
  occupancyZone: 'Entrées',
  northSensorName: 'TT_North',
  southSensorName: 'TT_South',
};

const SENSIQ: AutomationVendorProfile = {
  vendor: 'Sensiq',
  samplingIntervalMinutes: 60,
  ahuName: 'cta-01',
  ahuZone: 'Local technique',
  occupancyName: 'occ-01',
  occupancyZone: 'Contrôle d’accès',
  northSensorName: 'temp-nord',
  southSensorName: 'temp-sud',
};

/** Same order as `BUILDINGS`. */
const BUILDING_VENDORS: readonly BuildingVendors[] = [
  { buildingId: 'bld-paris', meter: ENERLOG, automation: AIRFLUX },
  { buildingId: 'bld-lyon', meter: ENERLOG, automation: SENSIQ },
  { buildingId: 'bld-warsaw', meter: VOLTMARK, automation: AIRFLUX },
  { buildingId: 'bld-berlin', meter: VOLTMARK, automation: AIRFLUX },
  { buildingId: 'bld-munich', meter: ENERLOG, automation: AIRFLUX },
  { buildingId: 'bld-madrid', meter: ENERLOG, automation: SENSIQ },
  { buildingId: 'bld-milan', meter: VOLTMARK, automation: SENSIQ },
  { buildingId: 'bld-amsterdam', meter: ENERLOG, automation: AIRFLUX },
  { buildingId: 'bld-brussels', meter: VOLTMARK, automation: SENSIQ },
  { buildingId: 'bld-krakow', meter: VOLTMARK, automation: AIRFLUX },
];

const TEMPERATURE_METRICS: readonly MetricDefinition[] = [
  { key: 'indoor-temperature', unit: '°C' },
];

export const EQUIPMENTS: readonly Equipment[] = BUILDING_VENDORS.flatMap(
  (vendors: BuildingVendors) => buildEquipments(vendors),
);

export function findEquipment(equipmentId: string): Equipment | null {
  return EQUIPMENTS.find((equipment: Equipment) => equipment.id === equipmentId) ?? null;
}

export function findBuildingEquipments(buildingId: string): Equipment[] {
  return EQUIPMENTS.filter((equipment: Equipment) => equipment.buildingId === buildingId);
}

function buildEquipments({ buildingId, meter, automation }: BuildingVendors): Equipment[] {
  const prefix = `eq-${buildingId.replace(/^bld-/, '')}`;
  const energyMetrics: readonly MetricDefinition[] = [
    { key: 'active-energy', unit: meter.energyUnit },
  ];
  const meterBase = {
    buildingId,
    type: 'energy-meter',
    vendor: meter.vendor,
    zone: null,
    samplingIntervalMinutes: meter.samplingIntervalMinutes,
    metrics: energyMetrics,
  } as const;
  const automationBase = {
    buildingId,
    vendor: automation.vendor,
    meterScope: null,
    samplingIntervalMinutes: automation.samplingIntervalMinutes,
  } as const;

  return [
    { ...meterBase, id: `${prefix}-main-meter`, name: meter.mainName, meterScope: 'main' },
    { ...meterBase, id: `${prefix}-hvac-meter`, name: meter.hvacName, meterScope: 'hvac' },
    {
      ...meterBase,
      id: `${prefix}-lighting-meter`,
      name: meter.lightingPlugsName,
      meterScope: 'lighting-plugs',
    },
    {
      ...automationBase,
      id: `${prefix}-ahu`,
      name: automation.ahuName,
      type: 'hvac-unit',
      zone: automation.ahuZone,
      metrics: [
        { key: 'hvac-status', unit: 'on/off' },
        { key: 'heating-setpoint', unit: '°C' },
      ],
    },
    {
      ...automationBase,
      id: `${prefix}-occupancy`,
      name: automation.occupancyName,
      type: 'occupancy-sensor',
      zone: automation.occupancyZone,
      metrics: [{ key: 'occupancy-count', unit: 'pers.' }],
    },
    {
      ...automationBase,
      id: `${prefix}-temp-north`,
      name: automation.northSensorName,
      type: 'temperature-sensor',
      zone: 'Nord',
      metrics: TEMPERATURE_METRICS,
    },
    {
      ...automationBase,
      id: `${prefix}-temp-south`,
      name: automation.southSensorName,
      type: 'temperature-sensor',
      zone: 'Sud',
      metrics: TEMPERATURE_METRICS,
    },
  ];
}
