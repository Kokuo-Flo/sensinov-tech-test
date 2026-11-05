/**
 * Measurement generator — 8 weeks of 15-min/60-min readings for every equipment, fully deterministic.
 *
 * 1. `building-simulation`: the physical state of each building is simulated once on a 15-min grid, from
 *    `clock` (local day/hour), `outdoor-climate`, `occupancy`, `hvac`, `lighting-plugs` and `indoor-temperature`.
 *    Wastes A1–A5 of `INJECTED_ANOMALIES` alter that physics.
 * 2. `series`: each equipment reads the state through its scope or zone, adds sensor noise, converts to its vendor
 *    unit and sampling interval; `data-quality` applies defects DQ1–DQ2.
 *
 * Seeds: one per building for weather, attendance and baseload; one per series (`'<equipmentId>:<metric>'`) for noise.
 */
export { MEASUREMENT_WINDOW } from './clock';
export { generateMeasurementSeries, selectSeriesRange } from './series';
