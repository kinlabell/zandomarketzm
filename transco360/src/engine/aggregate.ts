/**
 * Agregations de base.
 *
 * Toutes les vues du prototype (reseau, activite, ligne, bus, depot) passent
 * par ces fonctions. Un seul chemin de calcul : c'est ce qui garantit qu'un
 * meme chiffre lu sur deux ecrans differents est bien le meme chiffre.
 */

import { BUS_BY_ID } from '../data/seed/fleet';
import { LINE_BY_ID } from '../data/seed/network';
import type {
  ActivityId,
  BusDay,
  CostRecord,
  Dataset,
  FuelRecord,
  LineDay,
  MaintenanceOrder,
} from '../data/types';
import { safeRatio } from './metric';
import { isInRange, type PeriodRange } from './period';

export interface Scope {
  activity?: ActivityId;
  lineId?: string;
  busId?: string;
  depotId?: string;
}

export const NETWORK_SCOPE: Scope = {};

/** Libelle lisible du perimetre, utilise par le fil d'Ariane. */
export function scopeLabel(scope: Scope): string {
  if (scope.busId) return scope.busId;
  if (scope.lineId) return LINE_BY_ID.get(scope.lineId)?.code ?? scope.lineId;
  if (scope.depotId) return scope.depotId;
  if (scope.activity) return scope.activity;
  return 'Reseau';
}

function busMatches(busId: string, scope: Scope): boolean {
  const bus = BUS_BY_ID.get(busId);
  if (!bus) return false;
  if (scope.busId && bus.id !== scope.busId) return false;
  if (scope.lineId && bus.lineId !== scope.lineId) return false;
  if (scope.depotId && bus.depotId !== scope.depotId) return false;
  if (scope.activity) {
    const line = LINE_BY_ID.get(bus.lineId);
    if (!line || line.activity !== scope.activity) return false;
  }
  return true;
}

export function selectBusDays(
  dataset: Dataset,
  scope: Scope,
  range: PeriodRange,
): BusDay[] {
  return dataset.busDays.filter(
    (bd) => isInRange(bd.date, range) && busMatches(bd.busId, scope),
  );
}

export function selectLineDays(
  dataset: Dataset,
  scope: Scope,
  range: PeriodRange,
): LineDay[] {
  return dataset.lineDays.filter((ld) => {
    if (!isInRange(ld.date, range)) return false;
    if (scope.lineId && ld.lineId !== scope.lineId) return false;
    if (scope.activity) {
      const line = LINE_BY_ID.get(ld.lineId);
      if (!line || line.activity !== scope.activity) return false;
    }
    // Un perimetre « bus » ou « depot » n'a pas de sens au niveau billettique :
    // la cascade des titres se lit par ligne.
    return true;
  });
}

export function selectFuel(
  dataset: Dataset,
  scope: Scope,
  range: PeriodRange,
): FuelRecord[] {
  return dataset.fuel.filter(
    (f) => isInRange(f.date, range) && busMatches(f.busId, scope),
  );
}

export function selectCosts(
  dataset: Dataset,
  scope: Scope,
  range: PeriodRange,
): CostRecord[] {
  return dataset.costs.filter(
    (c) => isInRange(c.date, range) && (c.busId ? busMatches(c.busId, scope) : true),
  );
}

export function selectMaintenance(
  dataset: Dataset,
  scope: Scope,
  range: PeriodRange,
): MaintenanceOrder[] {
  return dataset.maintenance.filter(
    (o) => isInRange(o.openedAt, range) && busMatches(o.busId, scope),
  );
}

// ---------------------------------------------------------------------------
// Totaux d'exploitation
// ---------------------------------------------------------------------------

export interface OperationsTotals {
  /** Nombre de bus distincts presents dans le perimetre. */
  busCount: number;
  busDaysScheduled: number;
  busDaysAvailable: number;
  /** bus-jours disponibles / bus-jours programmes. */
  availability: number;
  rotationsPlanned: number;
  rotationsDone: number;
  /** rotations realisees / rotations planifiees. */
  rotationRate: number;
  /** rotations realisees par bus-jour disponible — facteur du moteur de variance. */
  rotationsPerAvailableBusDay: number;
  kmRun: number;
  boardings: number;
  /** validations par rotation realisee — la « frequentation ». */
  boardingsPerRotation: number;
  /** recette attendue / validations — le tarif moyen encaisse. */
  averageFareFC: number;
  expectedRevenueFC: number;
  recordedRevenueFC: number;
  /** recette enregistree / recette attendue — le taux de collecte. */
  collectionRate: number;
  collectionGapFC: number;
}

export function aggregateOperations(rows: BusDay[]): OperationsTotals {
  const busDaysScheduled = rows.length;
  const busDaysAvailable = rows.reduce((s, r) => s + (r.available ? 1 : 0), 0);
  const rotationsPlanned = rows.reduce((s, r) => s + r.rotationsPlanned, 0);
  const rotationsDone = rows.reduce((s, r) => s + r.rotationsDone, 0);
  const kmRun = rows.reduce((s, r) => s + r.kmRun, 0);
  const boardings = rows.reduce((s, r) => s + r.boardings, 0);
  const expectedRevenueFC = rows.reduce((s, r) => s + r.expectedRevenueFC, 0);
  const recordedRevenueFC = rows.reduce((s, r) => s + r.recordedRevenueFC, 0);

  return {
    busCount: new Set(rows.map((r) => r.busId)).size,
    busDaysScheduled,
    busDaysAvailable,
    availability: safeRatio(busDaysAvailable, busDaysScheduled),
    rotationsPlanned,
    rotationsDone,
    rotationRate: safeRatio(rotationsDone, rotationsPlanned),
    rotationsPerAvailableBusDay: safeRatio(rotationsDone, busDaysAvailable),
    kmRun,
    boardings,
    boardingsPerRotation: safeRatio(boardings, rotationsDone),
    averageFareFC: safeRatio(expectedRevenueFC, boardings),
    expectedRevenueFC,
    recordedRevenueFC,
    collectionRate: safeRatio(recordedRevenueFC, expectedRevenueFC),
    collectionGapFC: recordedRevenueFC - expectedRevenueFC,
  };
}

// ---------------------------------------------------------------------------
// Totaux billettiques
// ---------------------------------------------------------------------------

export interface TicketingTotals {
  titlesIssued: number;
  titlesValidated: number;
  transactionsCount: number;
  expectedRevenueFC: number;
  recordedRevenueFC: number;
  /** titres valides / titres emis. */
  validationRate: number;
}

export function aggregateTicketing(rows: LineDay[]): TicketingTotals {
  const titlesIssued = rows.reduce((s, r) => s + r.titlesIssued, 0);
  const titlesValidated = rows.reduce((s, r) => s + r.titlesValidated, 0);
  return {
    titlesIssued,
    titlesValidated,
    transactionsCount: rows.reduce((s, r) => s + r.transactionsCount, 0),
    expectedRevenueFC: rows.reduce((s, r) => s + r.expectedRevenueFC, 0),
    recordedRevenueFC: rows.reduce((s, r) => s + r.recordedRevenueFC, 0),
    validationRate: safeRatio(titlesValidated, titlesIssued),
  };
}

// ---------------------------------------------------------------------------
// Recettes contractuelles
// ---------------------------------------------------------------------------

export interface ContractTotals {
  recognizedFC: number;
  invoicedFC: number;
  collectedFC: number;
  recoveryRate: number;
}

export function aggregateContracts(
  dataset: Dataset,
  range: PeriodRange,
  activity?: ActivityId,
): ContractTotals {
  const rows = dataset.contractRevenues.filter(
    (c) => isInRange(c.date, range) && (!activity || c.activity === activity),
  );
  const invoicedFC = rows.reduce((s, r) => s + r.invoicedFC, 0);
  const collectedFC = rows.reduce((s, r) => s + r.collectedFC, 0);
  return {
    recognizedFC: rows.reduce((s, r) => s + r.amountFC, 0),
    invoicedFC,
    collectedFC,
    recoveryRate: safeRatio(collectedFC, invoicedFC),
  };
}

// ---------------------------------------------------------------------------
// Couts directs
// ---------------------------------------------------------------------------

export interface CostTotals {
  fuelFC: number;
  litres: number;
  maintenanceLaborFC: number;
  maintenancePartsFC: number;
  personnelFC: number;
  tollsFC: number;
  insuranceFC: number;
  sundriesFC: number;
  totalFC: number;
}

export function aggregateCosts(
  dataset: Dataset,
  scope: Scope,
  range: PeriodRange,
): CostTotals {
  const fuelRows = selectFuel(dataset, scope, range);
  const costRows = selectCosts(dataset, scope, range);
  const orders = selectMaintenance(dataset, scope, range);

  const litres = fuelRows.reduce((s, f) => s + f.litresIssued, 0);
  const fuelFC = fuelRows.reduce((s, f) => s + f.litresIssued * f.unitPriceFC, 0);
  const maintenanceLaborFC = orders.reduce((s, o) => s + o.laborCostFC, 0);
  const maintenancePartsFC = orders.reduce((s, o) => s + o.partsCostFC, 0);

  const byKind = (kind: CostRecord['kind']) =>
    costRows.filter((c) => c.kind === kind).reduce((s, c) => s + c.amountFC, 0);

  const personnelFC = byKind('personnel');
  const tollsFC = byKind('peages');
  const insuranceFC = byKind('assurance');
  const sundriesFC = byKind('autres') + byKind('pieces');

  return {
    fuelFC,
    litres,
    maintenanceLaborFC,
    maintenancePartsFC,
    personnelFC,
    tollsFC,
    insuranceFC,
    sundriesFC,
    totalFC:
      fuelFC +
      maintenanceLaborFC +
      maintenancePartsFC +
      personnelFC +
      tollsFC +
      insuranceFC +
      sundriesFC,
  };
}

// ---------------------------------------------------------------------------
// Objectifs
// ---------------------------------------------------------------------------

/** Objectif mensuel du perimetre, avant prorata temporel. */
export function monthlyTargetOf(dataset: Dataset, scope: Scope): number {
  if (scope.busId) {
    const bus = BUS_BY_ID.get(scope.busId);
    const line = bus ? LINE_BY_ID.get(bus.lineId) : undefined;
    if (!line) return 0;
    // L'objectif de ligne est reparti entre ses bus au prorata du parc.
    const busesOnLine = dataset.buses.filter((b) => b.lineId === line.id).length || 1;
    return line.monthlyTargetFC / busesOnLine;
  }
  if (scope.lineId) return LINE_BY_ID.get(scope.lineId)?.monthlyTargetFC ?? 0;
  if (scope.activity) {
    return dataset.activities.find((a) => a.id === scope.activity)?.monthlyTargetFC ?? 0;
  }
  if (scope.depotId) {
    // Un depot n'a pas d'objectif propre : on somme la part des bus qu'il exploite.
    return dataset.buses
      .filter((b) => b.depotId === scope.depotId)
      .reduce((sum, bus) => {
        const line = LINE_BY_ID.get(bus.lineId);
        if (!line) return sum;
        const busesOnLine = dataset.buses.filter((b) => b.lineId === line.id).length || 1;
        return sum + line.monthlyTargetFC / busesOnLine;
      }, 0);
  }
  return dataset.activities.reduce((s, a) => s + a.monthlyTargetFC, 0);
}
