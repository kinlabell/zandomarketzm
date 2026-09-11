/**
 * Enveloppe de tracabilite des indicateurs.
 *
 * Un indicateur affiche au DG n'est jamais un simple nombre : il transporte sa
 * formule, les valeurs qui y sont entrees, son niveau de fiabilite et son
 * horodatage. C'est ce qui permet de repondre a la question « d'ou vient ce
 * chiffre ? » sur n'importe quelle case de l'interface.
 */

import type { Reliability } from '../data/types';

export type { Reliability };

export type MetricUnit = 'FC' | '%' | 'km' | 'L' | 'u' | 'j' | 'L/100km';

export interface MetricInput {
  label: string;
  value: string;
}

export interface Metric {
  value: number;
  unit: MetricUnit;
  reliability: Reliability;
  /** Origine de la donnee, en langage de gestion. */
  source: string;
  /** Formule appliquee, lisible par un non-informaticien. */
  formula: string;
  /** Valeurs reellement utilisees dans le calcul. */
  inputs: MetricInput[];
  computedAt: string;
}

export const RELIABILITY_LABEL: Record<Reliability, string> = {
  automatique: 'Automatique',
  declaratif: 'Declaratif',
  estime: 'Estime',
  a_verifier: 'A verifier',
};

export const RELIABILITY_DESCRIPTION: Record<Reliability, string> = {
  automatique:
    'Donnee issue directement des enregistrements transactionnels simules, sans ressaisie.',
  declaratif:
    'Donnee saisie ou declaree par un agent ou un depot. Fiabilite dependante de la saisie.',
  estime:
    'Valeur reconstituee par un modele de calcul a partir d autres donnees. Ordre de grandeur.',
  a_verifier:
    'Ecart detecte par une regle de controle. La valeur doit etre verifiee avant toute decision.',
};

/**
 * Horloge de session : toutes les donnees du prototype sont reputees mises a
 * jour au meme instant. Figee au chargement pour que l'affichage reste stable
 * pendant une presentation.
 */
const SESSION_CLOCK = new Date();

export function sessionTime(): string {
  return SESSION_CLOCK.toISOString();
}

/** « 09:42 » — horodatage court affiche dans les panneaux de fiabilite. */
export function sessionClockLabel(): string {
  return new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(SESSION_CLOCK);
}

export function metric(
  value: number,
  unit: MetricUnit,
  reliability: Reliability,
  source: string,
  formula: string,
  inputs: MetricInput[] = [],
): Metric {
  return {
    value: Number.isFinite(value) ? value : 0,
    unit,
    reliability,
    source,
    formula,
    inputs,
    computedAt: sessionTime(),
  };
}

/** Division protegee : evite les NaN et les divisions par zero dans l'UI. */
export function safeRatio(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : numerator / denominator;
}
