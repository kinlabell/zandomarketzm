/**
 * Reconciliation : la cascade qui va du titre emis a la recette comptabilisee.
 *
 * Chaque niveau est un fait mesure ; l'ecart entre deux niveaux est une
 * deperdition a expliquer. Le module ne conclut jamais a une faute : il
 * localise, chiffre et propose une verification.
 */

import type { Dataset } from '../data/types';
import {
  aggregateOperations,
  aggregateTicketing,
  selectBusDays,
  selectLineDays,
  type Scope,
} from './aggregate';
import { safeRatio, type Reliability } from './metric';
import { isInRange, type PeriodRange } from './period';

export interface CascadeLevel {
  id: string;
  label: string;
  description: string;
  /** Volume (titres, transactions). Absent pour les niveaux purement monetaires. */
  units?: number;
  amountFC: number;
  /** Ecart avec le niveau precedent (negatif = deperdition). */
  gapFC: number;
  gapUnits?: number;
  /** Taux de deperdition par rapport au niveau precedent. */
  lossRate: number;
  /** Taux de deperdition cumule depuis le premier niveau. */
  cumulativeLossRate: number;
  reliability: Reliability;
  source: string;
  /** Faux lorsque le niveau n'est pas mesurable au perimetre demande. */
  available: boolean;
  unavailableReason?: string;
}

export interface ReconciliationResult {
  levels: CascadeLevel[];
  /** Ecart principal soumis a analyse : recette attendue - recette encaissee. */
  collectionGapFC: number;
  collectionGapRate: number;
  /** Ecart de tresorerie : recette encaissee - recette deposee. */
  depositGapFC: number;
  /** Ecart de comptabilisation : recette deposee - recette comptabilisee. */
  postingGapFC: number;
  cashAvailable: boolean;
}

/** Le depot et la comptabilisation se lisent par depot, jamais par ligne. */
const CASH_SCOPE_NOTE =
  'Le depot en banque et la comptabilisation sont suivis par depot, pas par ligne. Selectionnez le reseau ou un depot pour lire ces deux niveaux.';

export function reconcile(
  dataset: Dataset,
  scope: Scope,
  range: PeriodRange,
): ReconciliationResult {
  const ticketing = aggregateTicketing(selectLineDays(dataset, scope, range));
  const operations = aggregateOperations(selectBusDays(dataset, scope, range));

  const averageFare = safeRatio(ticketing.expectedRevenueFC, ticketing.titlesValidated);
  const issuedValueFC = Math.round(ticketing.titlesIssued * averageFare);

  const cashAvailable = !scope.lineId && !scope.busId;
  const cashRows = dataset.cashSessions.filter(
    (c) => isInRange(c.date, range) && (!scope.depotId || c.depotId === scope.depotId),
  );
  const depositedFC = cashRows.reduce((s, c) => s + c.depositedFC, 0);
  const postedFC = cashRows.reduce((s, c) => s + c.postedFC, 0);

  const raw: Omit<CascadeLevel, 'gapFC' | 'lossRate' | 'cumulativeLossRate'>[] = [
    {
      id: 'emis',
      label: 'Titres emis',
      description: 'Titres mis a disposition par le systeme de billetterie.',
      units: ticketing.titlesIssued,
      amountFC: issuedValueFC,
      reliability: 'automatique',
      source: 'Systeme de billetterie (simule)',
      available: true,
    },
    {
      id: 'valides',
      label: 'Titres valides — recette attendue',
      description: 'Titres effectivement valides a bord, valorises au tarif de la ligne.',
      units: ticketing.titlesValidated,
      amountFC: ticketing.expectedRevenueFC,
      reliability: 'automatique',
      source: 'Validations embarquees (simulees)',
      available: true,
    },
    {
      id: 'transactions',
      label: 'Transactions enregistrees',
      description: 'Validations remontees au systeme central.',
      units: ticketing.transactionsCount,
      amountFC: ticketing.recordedRevenueFC,
      reliability: 'automatique',
      source: 'Journal des transactions (simule)',
      available: true,
    },
    {
      id: 'encaissee',
      label: 'Recette encaissee',
      description: 'Recette remontee par les equipes de recette a la fin du service.',
      amountFC: operations.recordedRevenueFC,
      reliability: 'declaratif',
      source: 'Remontee de recette par bus',
      available: true,
    },
    {
      id: 'deposee',
      label: 'Recette deposee',
      description: 'Montant effectivement depose par le depot.',
      amountFC: cashAvailable ? depositedFC : 0,
      reliability: 'declaratif',
      source: 'Sessions de caisse par depot',
      available: cashAvailable,
      ...(cashAvailable ? {} : { unavailableReason: CASH_SCOPE_NOTE }),
    },
    {
      id: 'comptabilisee',
      label: 'Recette comptabilisee',
      description: 'Montant integre en comptabilite.',
      amountFC: cashAvailable ? postedFC : 0,
      reliability: 'declaratif',
      source: 'Comptabilisation (simulee)',
      available: cashAvailable,
      ...(cashAvailable ? {} : { unavailableReason: CASH_SCOPE_NOTE }),
    },
  ];

  const first = raw[0]?.amountFC ?? 0;
  const levels: CascadeLevel[] = raw.map((level, index) => {
    const previous = raw[index - 1];
    const gapFC = index === 0 ? 0 : level.amountFC - (previous?.amountFC ?? 0);
    const gapUnits =
      index > 0 && level.units !== undefined && previous?.units !== undefined
        ? level.units - previous.units
        : undefined;
    return {
      ...level,
      gapFC: level.available ? gapFC : 0,
      ...(gapUnits !== undefined ? { gapUnits } : {}),
      lossRate: index === 0 ? 0 : safeRatio(gapFC, previous?.amountFC ?? 0),
      cumulativeLossRate: index === 0 ? 0 : safeRatio(level.amountFC - first, first),
    };
  });

  return {
    levels,
    collectionGapFC: ticketing.recordedRevenueFC - ticketing.expectedRevenueFC,
    collectionGapRate: safeRatio(
      ticketing.recordedRevenueFC - ticketing.expectedRevenueFC,
      ticketing.expectedRevenueFC,
    ),
    depositGapFC: cashAvailable ? depositedFC - operations.recordedRevenueFC : 0,
    postingGapFC: cashAvailable ? postedFC - depositedFC : 0,
    cashAvailable,
  };
}

// ---------------------------------------------------------------------------
// « ANALYSER L'ECART »
// ---------------------------------------------------------------------------

export interface GapContributor {
  key: string;
  label: string;
  expectedFC: number;
  recordedFC: number;
  gapFC: number;
  share: number;
  collectionRate: number;
}

/** Ventilation de l'ecart de collecte par ligne. */
export function analyseGapByLine(
  dataset: Dataset,
  range: PeriodRange,
  scope: Scope = {},
): GapContributor[] {
  const rows = selectLineDays(dataset, scope, range);
  const byLine = new Map<string, { expected: number; recorded: number }>();

  for (const row of rows) {
    const entry = byLine.get(row.lineId) ?? { expected: 0, recorded: 0 };
    entry.expected += row.expectedRevenueFC;
    entry.recorded += row.recordedRevenueFC;
    byLine.set(row.lineId, entry);
  }

  const totalGap = [...byLine.values()].reduce((s, e) => s + (e.recorded - e.expected), 0);

  return [...byLine.entries()]
    .map(([lineId, entry]) => {
      const line = dataset.lines.find((l) => l.id === lineId);
      const gapFC = entry.recorded - entry.expected;
      return {
        key: lineId,
        label: line ? `${line.code} — ${line.name}` : lineId,
        expectedFC: entry.expected,
        recordedFC: entry.recorded,
        gapFC,
        share: safeRatio(gapFC, totalGap === 0 ? 1 : totalGap),
        collectionRate: safeRatio(entry.recorded, entry.expected),
      };
    })
    .sort((a, b) => a.gapFC - b.gapFC);
}

/** Ventilation de l'ecart de collecte par jour, pour situer le point de rupture. */
export function analyseGapByDay(
  dataset: Dataset,
  range: PeriodRange,
  scope: Scope = {},
): GapContributor[] {
  const rows = selectLineDays(dataset, scope, range);
  const byDay = new Map<string, { expected: number; recorded: number }>();

  for (const row of rows) {
    const entry = byDay.get(row.date) ?? { expected: 0, recorded: 0 };
    entry.expected += row.expectedRevenueFC;
    entry.recorded += row.recordedRevenueFC;
    byDay.set(row.date, entry);
  }

  const totalGap = [...byDay.values()].reduce((s, e) => s + (e.recorded - e.expected), 0);

  return [...byDay.entries()]
    .map(([date, entry]) => ({
      key: date,
      label: date,
      expectedFC: entry.expected,
      recordedFC: entry.recorded,
      gapFC: entry.recorded - entry.expected,
      share: safeRatio(entry.recorded - entry.expected, totalGap === 0 ? 1 : totalGap),
      collectionRate: safeRatio(entry.recorded, entry.expected),
    }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

// ---------------------------------------------------------------------------
// Controle caisse
// ---------------------------------------------------------------------------

export interface CashControlRow {
  id: string;
  date: string;
  depotId: string;
  depotName: string;
  cashierCode: string;
  expectedFC: number;
  declaredFC: number;
  depositedFC: number;
  postedFC: number;
  declarationGapFC: number;
  depositGapFC: number;
  postingGapFC: number;
  status: string;
  /** Vrai si l'ecart depasse le seuil : la validation est bloquee tant qu'il n'est pas justifie. */
  blocked: boolean;
}

export const CASH_BLOCKING_THRESHOLD_FC = 200_000;

export function cashControl(
  dataset: Dataset,
  range: PeriodRange,
  depotId?: string,
): CashControlRow[] {
  return dataset.cashSessions
    .filter((c) => isInRange(c.date, range) && (!depotId || c.depotId === depotId))
    .map((c) => {
      const depositGapFC = c.depositedFC - c.declaredFC;
      return {
        id: c.id,
        date: c.date,
        depotId: c.depotId,
        depotName: dataset.depots.find((d) => d.id === c.depotId)?.name ?? c.depotId,
        cashierCode: c.cashierCode,
        expectedFC: c.expectedFC,
        declaredFC: c.declaredFC,
        depositedFC: c.depositedFC,
        postedFC: c.postedFC,
        declarationGapFC: c.declaredFC - c.expectedFC,
        depositGapFC,
        postingGapFC: c.postedFC - c.depositedFC,
        status: c.status,
        blocked: Math.abs(depositGapFC) >= CASH_BLOCKING_THRESHOLD_FC,
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}
