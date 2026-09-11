/**
 * Carburant : consommation theorique (calculee) contre dotation observee
 * (declaree).
 *
 * La consommation theorique n'est pas une donnee : elle est RECALCULEE a
 * partir des kilometres reellement parcourus et de la norme du vehicule.
 * L'ecart entre les deux est ce que le module donne a verifier.
 */

import { BUS_BY_ID } from '../data/seed/fleet';
import type { Dataset } from '../data/types';
import { selectBusDays, selectFuel, type Scope } from './aggregate';
import { safeRatio } from './metric';
import type { PeriodRange } from './period';

/** Seuils d'ecart de consommation. */
export const FUEL_THRESHOLDS = { watch: 0.12, critical: 0.2 } as const;

export type FuelStatus = 'normal' | 'surveiller' | 'critique';

export interface FuelRow {
  busId: string;
  lineId: string;
  model: string;
  kmRun: number;
  normL100: number;
  theoreticalLitres: number;
  observedLitres: number;
  gapLitres: number;
  gapRate: number;
  observedL100: number;
  costFC: number;
  theoreticalCostFC: number;
  excessCostFC: number;
  status: FuelStatus;
  /** Jours ou une dotation a ete enregistree sans kilometre parcouru. */
  issuesWithoutRun: number;
}

export function fuelStatusOf(gapRate: number): FuelStatus {
  if (gapRate >= FUEL_THRESHOLDS.critical) return 'critique';
  if (gapRate >= FUEL_THRESHOLDS.watch) return 'surveiller';
  return 'normal';
}

export function fuelAnalysis(
  dataset: Dataset,
  scope: Scope,
  range: PeriodRange,
): FuelRow[] {
  const fuelRows = selectFuel(dataset, scope, range);
  const busDays = selectBusDays(dataset, scope, range);

  const kmByBus = new Map<string, number>();
  for (const bd of busDays) {
    kmByBus.set(bd.busId, (kmByBus.get(bd.busId) ?? 0) + bd.kmRun);
  }

  const byBus = new Map<string, { litres: number; costFC: number; withoutRun: number }>();
  for (const row of fuelRows) {
    const entry = byBus.get(row.busId) ?? { litres: 0, costFC: 0, withoutRun: 0 };
    entry.litres += row.litresIssued;
    entry.costFC += row.litresIssued * row.unitPriceFC;
    if (row.kmCovered === 0) entry.withoutRun += 1;
    byBus.set(row.busId, entry);
  }

  const rows: FuelRow[] = [];
  for (const [busId, entry] of byBus) {
    const bus = BUS_BY_ID.get(busId);
    if (!bus) continue;
    const kmRun = kmByBus.get(busId) ?? 0;
    const theoreticalLitres = (kmRun * bus.fuelNormL100) / 100;
    const gapLitres = entry.litres - theoreticalLitres;
    const gapRate = safeRatio(gapLitres, theoreticalLitres);
    const theoreticalCostFC = theoreticalLitres * dataset.fuelUnitPriceFC;

    rows.push({
      busId,
      lineId: bus.lineId,
      model: bus.model,
      kmRun,
      normL100: bus.fuelNormL100,
      theoreticalLitres,
      observedLitres: entry.litres,
      gapLitres,
      gapRate,
      observedL100: safeRatio(entry.litres * 100, kmRun),
      costFC: entry.costFC,
      theoreticalCostFC,
      excessCostFC: entry.costFC - theoreticalCostFC,
      status: fuelStatusOf(gapRate),
      issuesWithoutRun: entry.withoutRun,
    });
  }

  return rows.sort((a, b) => b.gapRate - a.gapRate);
}

export interface FuelTotals {
  kmRun: number;
  theoreticalLitres: number;
  observedLitres: number;
  gapLitres: number;
  gapRate: number;
  costFC: number;
  excessCostFC: number;
  averageL100: number;
  busesToWatch: number;
  busesCritical: number;
}

export function fuelTotals(rows: FuelRow[]): FuelTotals {
  const kmRun = rows.reduce((s, r) => s + r.kmRun, 0);
  const theoreticalLitres = rows.reduce((s, r) => s + r.theoreticalLitres, 0);
  const observedLitres = rows.reduce((s, r) => s + r.observedLitres, 0);
  return {
    kmRun,
    theoreticalLitres,
    observedLitres,
    gapLitres: observedLitres - theoreticalLitres,
    gapRate: safeRatio(observedLitres - theoreticalLitres, theoreticalLitres),
    costFC: rows.reduce((s, r) => s + r.costFC, 0),
    excessCostFC: rows.reduce((s, r) => s + r.excessCostFC, 0),
    averageL100: safeRatio(observedLitres * 100, kmRun),
    busesToWatch: rows.filter((r) => r.status === 'surveiller').length,
    busesCritical: rows.filter((r) => r.status === 'critique').length,
  };
}
