/**
 * MOTEUR DE VARIANCE.
 *
 * Methode : decomposition par SUBSTITUTIONS EN CHAINE, technique classique du
 * controle de gestion. La recette est ecrite comme un produit de facteurs :
 *
 *   R = bus-jours programmes x disponibilite x rotations/bus-jour disponible
 *       x validations/rotation x tarif moyen x taux de collecte
 *
 * La contribution du facteur i a l'ecart vaut :
 *
 *   (produit des facteurs REELS avant i) x (reel_i - reference_i)
 *   x (produit des facteurs de REFERENCE apres i)
 *
 * Propriete : la somme des contributions est EXACTEMENT egale a l'ecart total.
 * Il n'y a donc aucun residu invente. En contrepartie, l'ordre des facteurs
 * influence la repartition — l'ordre retenu suit la chaine de causalite
 * operationnelle, de la capacite disponible jusqu'a l'encaissement, et il est
 * affiche dans l'interface.
 *
 * Ce n'est pas un modele econometrique : c'est un moteur analytique de
 * demonstration, applique a des donnees fictives.
 */

import { LINE_BY_ID } from '../data/seed/network';
import type { Dataset, Line } from '../data/types';
import {
  aggregateContracts,
  aggregateOperations,
  monthlyTargetOf,
  selectBusDays,
  type Scope,
} from './aggregate';
import { safeRatio } from './metric';
import { proratedTarget, type PeriodRange } from './period';

/** Normes de gestion utilisees pour decomposer un objectif de recette. */
export const MANAGEMENT_NORMS = {
  /** Taux de disponibilite de la flotte vise par l'exploitation. */
  availabilityTarget: 0.94,
  /** Taux de collecte vise (recette enregistree / recette attendue). */
  collectionTarget: 0.99,
} as const;

export type VarianceFactorId =
  | 'perimetre'
  | 'disponibilite'
  | 'rotations'
  | 'frequentation'
  | 'tarif'
  | 'collecte';

export interface FactorDefinition {
  id: VarianceFactorId;
  label: string;
  unit: string;
  question: string;
}

/** Ordre = chaine de causalite operationnelle. Il structure toute la lecture. */
export const FACTOR_DEFINITIONS: FactorDefinition[] = [
  {
    id: 'perimetre',
    label: 'Perimetre (bus-jours programmes)',
    unit: 'bus-jours',
    question: 'Le volume de service programme a-t-il change ?',
  },
  {
    id: 'disponibilite',
    label: 'Disponibilite de la flotte',
    unit: '%',
    question: 'Les bus prevus etaient-ils en etat de rouler ?',
  },
  {
    id: 'rotations',
    label: 'Rotations realisees',
    unit: 'rot./bus-jour',
    question: 'Les bus disponibles ont-ils effectue leurs rotations ?',
  },
  {
    id: 'frequentation',
    label: 'Frequentation',
    unit: 'validations/rotation',
    question: 'Les rotations effectuees ont-elles transporte autant de voyageurs ?',
  },
  {
    id: 'tarif',
    label: 'Tarif moyen encaisse',
    unit: 'FC',
    question:
      'Le tarif moyen par validation a-t-il evolue ? Sur un perimetre multi-lignes, ce facteur porte aussi l effet de mix : perdre du volume sur une ligne a tarif eleve fait baisser le tarif moyen du reseau.',
  },
  {
    id: 'collecte',
    label: 'Taux de collecte',
    unit: '%',
    question: 'La recette attendue a-t-elle ete integralement enregistree ?',
  },
];

export interface VarianceFactor extends FactorDefinition {
  actual: number;
  reference: number;
  contributionFC: number;
  /** Part de l'ecart total portee par ce facteur. */
  share: number;
}

export interface LineVariance {
  lineId: string;
  lineCode: string;
  lineName: string;
  actualFC: number;
  referenceFC: number;
  gapFC: number;
  gapRate: number;
  contributions: Record<VarianceFactorId, number>;
}

export interface VarianceBridge {
  scope: Scope;
  referenceLabel: string;
  referenceFC: number;
  actualFC: number;
  gapFC: number;
  gapRate: number;
  factors: VarianceFactor[];
  /** Ecart porte par les activites contractuelles (scolaire, location, publicite). */
  otherActivitiesFC: number;
  /** Doit rester negligeable : c'est le controle de l'identite de decomposition. */
  residualFC: number;
  method: string;
  factorOrder: string;
}

type FactorVector = [number, number, number, number, number, number];

const FACTOR_ORDER: VarianceFactorId[] = [
  'perimetre',
  'disponibilite',
  'rotations',
  'frequentation',
  'tarif',
  'collecte',
];

function vectorOf(totals: ReturnType<typeof aggregateOperations>): FactorVector {
  return [
    totals.busDaysScheduled,
    totals.availability,
    totals.rotationsPerAvailableBusDay,
    totals.boardingsPerRotation,
    totals.averageFareFC,
    totals.collectionRate,
  ];
}

/**
 * Decompose un objectif de recette en facteurs de gestion.
 * Les normes (disponibilite, collecte), le parc et le plan de rotation sont
 * donnes ; la frequentation budgetee est la variable deduite — c'est
 * exactement la facon dont un budget d'exploitation se construit a l'envers.
 */
function targetVectorOf(
  totals: ReturnType<typeof aggregateOperations>,
  line: Line,
  targetFC: number,
): FactorVector {
  const busDaysScheduled = totals.busDaysScheduled;
  const availability = MANAGEMENT_NORMS.availabilityTarget;
  const rotations = safeRatio(totals.rotationsPlanned, busDaysScheduled);
  const fare = line.fareFC;
  const collection = MANAGEMENT_NORMS.collectionTarget;
  const denominator = busDaysScheduled * availability * rotations * fare * collection;
  const boardings = denominator === 0 ? 0 : targetFC / denominator;
  return [busDaysScheduled, availability, rotations, boardings, fare, collection];
}

/**
 * Contributions de chaque facteur a l'ecart entre deux vecteurs.
 * La somme des contributions vaut exactement produit(reel) - produit(reference).
 */
export function chainedSubstitution(
  actual: FactorVector,
  reference: FactorVector,
): number[] {
  const contributions: number[] = [];
  for (let i = 0; i < actual.length; i++) {
    let before = 1;
    for (let k = 0; k < i; k++) before *= actual[k] as number;
    let after = 1;
    for (let k = i + 1; k < actual.length; k++) after *= reference[k] as number;
    contributions.push(before * ((actual[i] as number) - (reference[i] as number)) * after);
  }
  return contributions;
}

function linesInScope(dataset: Dataset, scope: Scope): Line[] {
  return dataset.lines.filter((line) => {
    if (scope.lineId) return line.id === scope.lineId;
    if (scope.activity) return line.activity === scope.activity;
    if (scope.busId) {
      const bus = dataset.buses.find((b) => b.id === scope.busId);
      return bus?.lineId === line.id;
    }
    if (scope.depotId) {
      return dataset.buses.some((b) => b.depotId === scope.depotId && b.lineId === line.id);
    }
    return true;
  });
}

function emptyContributions(): Record<VarianceFactorId, number> {
  return {
    perimetre: 0,
    disponibilite: 0,
    rotations: 0,
    frequentation: 0,
    tarif: 0,
    collecte: 0,
  };
}

interface BridgeInput {
  dataset: Dataset;
  scope: Scope;
  range: PeriodRange;
  referenceLabel: string;
  /** Produit le vecteur de reference et le montant de reference d'une ligne. */
  referenceOf: (line: Line, lineScope: Scope) => { vector: FactorVector; amountFC: number };
  /** Ecart des activites contractuelles, deja calcule par l'appelant. */
  otherActivitiesFC: number;
  /** Recette contractuelle realisee sur la periode (0 hors perimetre reseau). */
  contractualActualFC: number;
  /** Recette contractuelle de reference (objectif ou periode precedente). */
  contractualReferenceFC: number;
  method: string;
}

function buildBridge(input: BridgeInput): VarianceBridge {
  const { dataset, scope, range } = input;
  const lines = linesInScope(dataset, scope);

  // La decomposition est faite au niveau AFFICHE, a partir des facteurs agreges
  // du perimetre. Consequence : les valeurs « reel » et « reference » lues a
  // cote de chaque facteur sont exactement celles qui produisent sa
  // contribution — aucun effet de composition cache entre les deux colonnes.
  const scopeTotals = aggregateOperations(selectBusDays(dataset, scope, range));
  const scopeActual = vectorOf(scopeTotals);
  const scopeReference = aggregateReferenceVector(input, lines, scopeTotals);

  const referenceFC = lines.reduce(
    (sum, line) => sum + input.referenceOf(line, { ...scope, lineId: line.id }).amountFC,
    0,
  );

  const totalActual = scopeTotals.recordedRevenueFC + input.contractualActualFC;
  const totalReference = referenceFC + input.contractualReferenceFC;
  const gapFC = totalActual - totalReference;

  const contributions = chainedSubstitution(scopeActual, scopeReference);
  const totals = emptyContributions();
  FACTOR_ORDER.forEach((id, index) => {
    totals[id] = contributions[index] as number;
  });

  const contributionSum = FACTOR_ORDER.reduce((s, id) => s + totals[id], 0);

  const factors: VarianceFactor[] = FACTOR_DEFINITIONS.map((definition, index) => ({
    ...definition,
    actual: scopeActual[index] as number,
    reference: scopeReference[index] as number,
    contributionFC: totals[definition.id],
    share: safeRatio(totals[definition.id], gapFC === 0 ? 1 : Math.abs(gapFC)),
  }));

  return {
    scope,
    referenceLabel: input.referenceLabel,
    referenceFC: totalReference,
    actualFC: totalActual,
    gapFC,
    gapRate: safeRatio(gapFC, totalReference),
    factors,
    otherActivitiesFC: input.otherActivitiesFC,
    residualFC: gapFC - contributionSum - input.otherActivitiesFC,
    method: input.method,
    factorOrder: FACTOR_DEFINITIONS.map((f) => f.label).join(' -> '),
  };
}

function aggregateReferenceVector(
  input: BridgeInput,
  lines: Line[],
  scopeTotals: ReturnType<typeof aggregateOperations>,
): FactorVector {
  // Les references de chaque ligne sont recomposees en volumes, puis ramenees
  // a des ratios agreges. Le produit du vecteur obtenu vaut exactement la somme
  // des references des lignes : la decomposition reste exacte au niveau reseau.
  if (lines.length === 1 && lines[0]) {
    return input.referenceOf(lines[0], { ...input.scope, lineId: lines[0].id }).vector;
  }

  let availableBusDays = 0;
  let rotations = 0;
  let boardings = 0;
  let expectedRevenue = 0;
  let totalReference = 0;

  for (const line of lines) {
    const ref = input.referenceOf(line, { ...input.scope, lineId: line.id });
    const [scheduled, availability, rotationsPerDay, boardingsPerRotation, fare] = ref.vector;
    const lineAvailableBusDays = scheduled * availability;
    const lineRotations = lineAvailableBusDays * rotationsPerDay;
    const lineBoardings = lineRotations * boardingsPerRotation;
    availableBusDays += lineAvailableBusDays;
    rotations += lineRotations;
    boardings += lineBoardings;
    expectedRevenue += lineBoardings * fare;
    totalReference += ref.amountFC;
  }

  const scheduled = scopeTotals.busDaysScheduled;
  return [
    scheduled,
    safeRatio(availableBusDays, scheduled),
    safeRatio(rotations, availableBusDays),
    safeRatio(boardings, rotations),
    safeRatio(expectedRevenue, boardings),
    safeRatio(totalReference, expectedRevenue),
  ];
}

// ---------------------------------------------------------------------------
// API publique
// ---------------------------------------------------------------------------

/** Ecart entre le realise et l'objectif de la periode. */
export function varianceVsTarget(
  dataset: Dataset,
  scope: Scope,
  range: PeriodRange,
): VarianceBridge {
  const includesContracts = !scope.lineId && !scope.busId && !scope.depotId;
  const contractActual = includesContracts
    ? aggregateContracts(dataset, range, scope.activity).collectedFC
    : 0;
  const contractTarget = includesContracts
    ? dataset.activities
        .filter((a) => a.revenueModel === 'contractuel')
        .filter((a) => !scope.activity || a.id === scope.activity)
        .reduce((s, a) => s + proratedTarget(a.monthlyTargetFC, range), 0)
    : 0;

  const input: BridgeInput = {
    dataset,
    scope,
    range,
    referenceLabel: 'Objectif de la periode',
    otherActivitiesFC: contractActual - contractTarget,
    contractualActualFC: contractActual,
    contractualReferenceFC: contractTarget,
    method:
      'Substitutions en chaine. L objectif de recette est decompose selon les normes de gestion (disponibilite 94 %, plan de rotation, tarif en vigueur, collecte 99 %) ; la frequentation budgetee en est deduite.',
    referenceOf: (line, lineScope) => {
      const totals = aggregateOperations(selectBusDays(dataset, lineScope, range));
      const amountFC = proratedTarget(monthlyTargetOf(dataset, { lineId: line.id }), range);
      return { vector: targetVectorOf(totals, line, amountFC), amountFC };
    },
  };

  return buildBridge(input);
}

/** Ecart entre deux periodes de meme duree. */
export function varianceVsPeriod(
  dataset: Dataset,
  scope: Scope,
  range: PeriodRange,
  reference: PeriodRange,
): VarianceBridge {
  const includesContracts = !scope.lineId && !scope.busId && !scope.depotId;
  const contractActual = includesContracts
    ? aggregateContracts(dataset, range, scope.activity).collectedFC
    : 0;
  const contractReference = includesContracts
    ? aggregateContracts(dataset, reference, scope.activity).collectedFC
    : 0;

  const input: BridgeInput = {
    dataset,
    scope,
    range,
    referenceLabel: reference.label,
    otherActivitiesFC: contractActual - contractReference,
    contractualActualFC: contractActual,
    contractualReferenceFC: contractReference,
    method:
      'Substitutions en chaine entre deux periodes de meme duree. Les facteurs de reference sont les facteurs reellement constates sur la periode precedente.',
    referenceOf: (_line, lineScope) => {
      const totals = aggregateOperations(selectBusDays(dataset, lineScope, reference));
      return { vector: vectorOf(totals), amountFC: totals.recordedRevenueFC };
    },
  };

  return buildBridge(input);
}

/**
 * Classement des lignes par contribution a l'ecart : repond a la question
 * « quelle ligne porte l'ecart ? », point d'entree du drill-down.
 */
export function lineVariances(
  dataset: Dataset,
  range: PeriodRange,
  reference?: PeriodRange,
): LineVariance[] {
  return dataset.lines
    .map((line) => {
      const lineScope: Scope = { lineId: line.id };
      const actual = aggregateOperations(selectBusDays(dataset, lineScope, range));
      const bridge = reference
        ? varianceVsPeriod(dataset, lineScope, range, reference)
        : varianceVsTarget(dataset, lineScope, range);

      const contributions = emptyContributions();
      for (const factor of bridge.factors) {
        contributions[factor.id] = factor.contributionFC;
      }

      return {
        lineId: line.id,
        lineCode: line.code,
        lineName: line.name,
        actualFC: actual.recordedRevenueFC,
        referenceFC: bridge.referenceFC,
        gapFC: bridge.gapFC,
        gapRate: bridge.gapRate,
        contributions,
      };
    })
    .sort((a, b) => a.gapFC - b.gapFC);
}

export function lineOf(lineId: string): Line | undefined {
  return LINE_BY_ID.get(lineId);
}
