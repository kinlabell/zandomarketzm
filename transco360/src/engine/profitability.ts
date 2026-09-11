/**
 * Rentabilite — au sens de la PERFORMANCE CONTRIBUTIVE.
 *
 * Le prototype ne calcule que les couts DIRECTEMENT imputables a un bus ou a
 * une ligne : carburant, maintenance, pieces, personnel affecte, peages,
 * assurance, consommables. Les charges de structure (siege, amortissements,
 * frais financiers, fiscalite) ne sont pas modelisees.
 *
 * Le resultat ne doit donc JAMAIS etre presente comme un benefice net. Le
 * libelle retenu partout dans l'interface est « performance contributive ».
 */

import type { Dataset } from '../data/types';
import {
  aggregateContracts,
  aggregateCosts,
  aggregateOperations,
  selectBusDays,
  type CostTotals,
  type Scope,
} from './aggregate';
import { safeRatio } from './metric';
import type { PeriodRange } from './period';

export const CONTRIBUTION_LABEL = 'Performance contributive';
export const CONTRIBUTION_DISCLAIMER =
  'Recettes moins couts directs identifies. Les charges de structure ne sont pas incluses : ce resultat n est pas un benefice net.';

export interface ContributionResult {
  scope: Scope;
  revenueFC: number;
  costs: CostTotals;
  contributionFC: number;
  contributionRate: number;
  /** Recette et cout ramenes au kilometre parcouru. */
  revenuePerKmFC: number;
  costPerKmFC: number;
  contributionPerKmFC: number;
  kmRun: number;
}

export function contribution(
  dataset: Dataset,
  scope: Scope,
  range: PeriodRange,
): ContributionResult {
  const operations = aggregateOperations(selectBusDays(dataset, scope, range));
  const costs = aggregateCosts(dataset, scope, range);

  // Les activites contractuelles ne sont rattachees ni a une ligne ni a un bus.
  const includesContracts = !scope.lineId && !scope.busId && !scope.depotId;
  const contractRevenue = includesContracts
    ? aggregateContracts(dataset, range, scope.activity).collectedFC
    : 0;

  const revenueFC = operations.recordedRevenueFC + contractRevenue;
  const contributionFC = revenueFC - costs.totalFC;

  return {
    scope,
    revenueFC,
    costs,
    contributionFC,
    contributionRate: safeRatio(contributionFC, revenueFC),
    revenuePerKmFC: safeRatio(revenueFC, operations.kmRun),
    costPerKmFC: safeRatio(costs.totalFC, operations.kmRun),
    contributionPerKmFC: safeRatio(contributionFC, operations.kmRun),
    kmRun: operations.kmRun,
  };
}

export interface ContributionRow extends ContributionResult {
  key: string;
  label: string;
}

/** Performance contributive ligne par ligne, classee de la meilleure a la pire. */
export function contributionByLine(
  dataset: Dataset,
  range: PeriodRange,
): ContributionRow[] {
  return dataset.lines
    .map((line) => ({
      key: line.id,
      label: `${line.code} — ${line.name}`,
      ...contribution(dataset, { lineId: line.id }, range),
    }))
    .sort((a, b) => b.contributionFC - a.contributionFC);
}

/** Performance contributive bus par bus. */
export function contributionByBus(
  dataset: Dataset,
  range: PeriodRange,
  scope: Scope = {},
): ContributionRow[] {
  const busIds = [
    ...new Set(selectBusDays(dataset, scope, range).map((bd) => bd.busId)),
  ];
  return busIds
    .map((busId) => ({
      key: busId,
      label: busId,
      ...contribution(dataset, { busId }, range),
    }))
    .sort((a, b) => b.contributionFC - a.contributionFC);
}

/** Performance contributive par activite. */
export function contributionByActivity(
  dataset: Dataset,
  range: PeriodRange,
): ContributionRow[] {
  return dataset.activities.map((activity) => {
    if (activity.revenueModel === 'contractuel') {
      const totals = aggregateContracts(dataset, range, activity.id);
      // Les activites contractuelles n'ont pas de couts directs modelises :
      // la marge affichee est donc la recette encaissee elle-meme, et c'est
      // signale comme tel dans l'interface.
      const costs = aggregateCosts(dataset, { activity: activity.id }, range);
      return {
        key: activity.id,
        label: activity.label,
        scope: { activity: activity.id },
        revenueFC: totals.collectedFC,
        costs,
        contributionFC: totals.collectedFC - costs.totalFC,
        contributionRate: safeRatio(totals.collectedFC - costs.totalFC, totals.collectedFC),
        revenuePerKmFC: 0,
        costPerKmFC: 0,
        contributionPerKmFC: 0,
        kmRun: 0,
      };
    }
    return {
      key: activity.id,
      label: activity.label,
      ...contribution(dataset, { activity: activity.id }, range),
    };
  });
}
