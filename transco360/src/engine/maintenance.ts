/**
 * Maintenance : immobilisations, couts et impact estime sur la recette.
 *
 * L'impact d'une immobilisation n'est PAS une donnee mesuree : c'est une
 * reconstitution. Il est donc marque « estime » partout ou il est affiche, et
 * sa methode est explicitee — recette journaliere moyenne du bus lorsqu'il
 * roule, multipliee par le nombre de jours d'immobilisation.
 */

import { BUS_BY_ID } from '../data/seed/fleet';
import type { Dataset, FailureType, MaintenanceOrder } from '../data/types';
import { selectBusDays, selectMaintenance, type Scope } from './aggregate';
import { safeRatio } from './metric';
import { isInRange, type PeriodRange } from './period';

export const FAILURE_LABEL: Record<FailureType, string> = {
  moteur: 'Moteur',
  transmission: 'Transmission',
  freinage: 'Freinage',
  pneumatique: 'Pneumatiques',
  electrique: 'Electrique',
  carrosserie: 'Carrosserie',
  climatisation: 'Climatisation',
  revision: 'Revision periodique',
};

export interface MaintenanceOrderView extends MaintenanceOrder {
  lineCode: string;
  totalCostFC: number;
  open: boolean;
  /** Recette journaliere moyenne du bus lorsqu'il roule (FC). */
  dailyRevenueWhenRunningFC: number;
  /** Impact estime de l'immobilisation sur la recette (FC). */
  estimatedRevenueImpactFC: number;
}

/**
 * Recette journaliere moyenne d'un bus sur les jours ou il a effectivement
 * roule. Base de l'estimation d'impact.
 */
export function dailyRevenueWhenRunning(
  dataset: Dataset,
  busId: string,
  range: PeriodRange,
): number {
  const rows = dataset.busDays.filter(
    (bd) => bd.busId === busId && isInRange(bd.date, range) && bd.available,
  );
  const total = rows.reduce((s, bd) => s + bd.recordedRevenueFC, 0);
  return safeRatio(total, rows.length);
}

export function maintenanceOrders(
  dataset: Dataset,
  scope: Scope,
  range: PeriodRange,
  referenceRange: PeriodRange = range,
): MaintenanceOrderView[] {
  return selectMaintenance(dataset, scope, range)
    .map((order) => {
      const dailyRevenue = dailyRevenueWhenRunning(dataset, order.busId, referenceRange);
      return {
        ...order,
        lineCode: dataset.lines.find((l) => l.id === order.lineId)?.code ?? order.lineId,
        totalCostFC: order.laborCostFC + order.partsCostFC,
        open: !order.closedAt,
        dailyRevenueWhenRunningFC: dailyRevenue,
        estimatedRevenueImpactFC: dailyRevenue * order.immobilizationDays,
      };
    })
    .sort((a, b) => b.openedAt.localeCompare(a.openedAt));
}

export interface MaintenanceTotals {
  ordersCount: number;
  openCount: number;
  preventiveCount: number;
  correctiveCount: number;
  /** Part du preventif dans le nombre total d'interventions. */
  preventiveShare: number;
  immobilizationDays: number;
  laborCostFC: number;
  partsCostFC: number;
  totalCostFC: number;
  estimatedRevenueImpactFC: number;
  averageImmobilizationDays: number;
}

export function maintenanceTotals(orders: MaintenanceOrderView[]): MaintenanceTotals {
  const preventiveCount = orders.filter((o) => o.type === 'preventive').length;
  const immobilizationDays = orders.reduce((s, o) => s + o.immobilizationDays, 0);
  const laborCostFC = orders.reduce((s, o) => s + o.laborCostFC, 0);
  const partsCostFC = orders.reduce((s, o) => s + o.partsCostFC, 0);

  return {
    ordersCount: orders.length,
    openCount: orders.filter((o) => o.open).length,
    preventiveCount,
    correctiveCount: orders.length - preventiveCount,
    preventiveShare: safeRatio(preventiveCount, orders.length),
    immobilizationDays,
    laborCostFC,
    partsCostFC,
    totalCostFC: laborCostFC + partsCostFC,
    estimatedRevenueImpactFC: orders.reduce((s, o) => s + o.estimatedRevenueImpactFC, 0),
    averageImmobilizationDays: safeRatio(immobilizationDays, orders.length),
  };
}

export interface FailureBreakdown {
  failure: FailureType;
  label: string;
  count: number;
  immobilizationDays: number;
  costFC: number;
  estimatedRevenueImpactFC: number;
}

export function failureBreakdown(orders: MaintenanceOrderView[]): FailureBreakdown[] {
  const map = new Map<FailureType, FailureBreakdown>();
  for (const order of orders) {
    const entry = map.get(order.failure) ?? {
      failure: order.failure,
      label: FAILURE_LABEL[order.failure],
      count: 0,
      immobilizationDays: 0,
      costFC: 0,
      estimatedRevenueImpactFC: 0,
    };
    entry.count += 1;
    entry.immobilizationDays += order.immobilizationDays;
    entry.costFC += order.totalCostFC;
    entry.estimatedRevenueImpactFC += order.estimatedRevenueImpactFC;
    map.set(order.failure, entry);
  }
  return [...map.values()].sort((a, b) => b.costFC - a.costFC);
}

// ---------------------------------------------------------------------------
// Vue flotte
// ---------------------------------------------------------------------------

export type FleetStatus =
  | 'circulation'
  | 'disponible'
  | 'maintenance'
  | 'immobilise'
  | 'hors_service';

export const FLEET_STATUS_LABEL: Record<FleetStatus, string> = {
  circulation: 'En circulation',
  disponible: 'Disponible',
  maintenance: 'En maintenance',
  immobilise: 'Immobilise',
  hors_service: 'Hors service',
};

export interface FleetRow {
  busId: string;
  lineId: string;
  lineCode: string;
  depotId: string;
  model: string;
  seats: number;
  status: FleetStatus;
  statusSince?: string;
  unavailabilityReason?: string;
  odometerKm: number;
  kmRunInPeriod: number;
  rotationsDone: number;
  rotationRate: number;
  availability: number;
  boardings: number;
  recordedRevenueFC: number;
  openOrderId?: string;
}

/**
 * Etat de la flotte a la date du jour, enrichi des totaux de la periode.
 * Le statut n'est pas stocke : il est deduit du dernier bus-jour connu et des
 * ordres de travaux ouverts — impossible qu'il contredise la maintenance.
 */
export function fleetOverview(
  dataset: Dataset,
  scope: Scope,
  range: PeriodRange,
): FleetRow[] {
  const rows = selectBusDays(dataset, scope, range);
  const openOrders = dataset.maintenance.filter((o) => !o.closedAt);

  const byBus = new Map<string, typeof rows>();
  for (const bd of rows) {
    const bucket = byBus.get(bd.busId);
    if (bucket) bucket.push(bd);
    else byBus.set(bd.busId, [bd]);
  }

  const result: FleetRow[] = [];

  for (const [busId, busRows] of byBus) {
    const bus = BUS_BY_ID.get(busId);
    if (!bus) continue;

    const todayRow = dataset.busDays.find(
      (bd) => bd.busId === busId && bd.date === dataset.today,
    );
    const openOrder = openOrders.find((o) => o.busId === busId);

    let status: FleetStatus;
    if (openOrder) {
      status = openOrder.type === 'preventive' ? 'maintenance' : 'immobilise';
    } else if (todayRow?.available === false) {
      status = 'maintenance';
    } else if ((todayRow?.rotationsDone ?? 0) > 0) {
      status = 'circulation';
    } else {
      status = 'disponible';
    }

    const kmRunInPeriod = busRows.reduce((s, r) => s + r.kmRun, 0);
    const rotationsDone = busRows.reduce((s, r) => s + r.rotationsDone, 0);
    const rotationsPlanned = busRows.reduce((s, r) => s + r.rotationsPlanned, 0);
    const availableDays = busRows.filter((r) => r.available).length;

    result.push({
      busId,
      lineId: bus.lineId,
      lineCode: dataset.lines.find((l) => l.id === bus.lineId)?.code ?? bus.lineId,
      depotId: bus.depotId,
      model: bus.model,
      seats: bus.seats,
      status,
      ...(openOrder ? { statusSince: openOrder.openedAt, openOrderId: openOrder.id } : {}),
      ...(todayRow?.unavailabilityReason
        ? { unavailabilityReason: todayRow.unavailabilityReason }
        : {}),
      odometerKm: bus.odometerStartKm + kmRunInPeriod,
      kmRunInPeriod,
      rotationsDone,
      rotationRate: safeRatio(rotationsDone, rotationsPlanned),
      availability: safeRatio(availableDays, busRows.length),
      boardings: busRows.reduce((s, r) => s + r.boardings, 0),
      recordedRevenueFC: busRows.reduce((s, r) => s + r.recordedRevenueFC, 0),
    });
  }

  return result.sort((a, b) => a.busId.localeCompare(b.busId));
}

export function fleetStatusCounts(rows: FleetRow[]): Record<FleetStatus, number> {
  const counts: Record<FleetStatus, number> = {
    circulation: 0,
    disponible: 0,
    maintenance: 0,
    immobilise: 0,
    hors_service: 0,
  };
  for (const row of rows) counts[row.status] += 1;
  return counts;
}
