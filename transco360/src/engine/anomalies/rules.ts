/**
 * Regles de controle.
 *
 * PRINCIPE NON NEGOCIABLE : une regle detecte un ECART, jamais une faute.
 * Les libelles sont neutres et ne designent jamais une personne. La decision
 * appartient toujours a un responsable humain, apres justification.
 */

import type { Role } from '../../data/types';

export type RuleId =
  | 'ECART_CARBURANT'
  | 'ECART_COLLECTE'
  | 'ECART_CAISSE'
  | 'RATIO_VALIDATION'
  | 'KM_INCOHERENT'
  | 'DISPONIBILITE_LIGNE'
  | 'PANNE_RECURRENTE'
  | 'ROTATION_MANQUANTE'
  | 'INCOHERENCE_CROISEE';

export type Severity = 'normal' | 'surveiller' | 'critique';

export type AnomalyFamily =
  | 'recettes'
  | 'transactions'
  | 'carburant'
  | 'kilometrage'
  | 'disponibilite'
  | 'maintenance'
  | 'rotations'
  | 'caisse'
  | 'coherence';

export interface RuleDefinition {
  id: RuleId;
  label: string;
  family: AnomalyFamily;
  /** Ce que la regle mesure, en une phrase de gestion. */
  measures: string;
  /** Seuil de mise sous surveillance. */
  watch: number;
  /** Seuil critique. */
  critical: number;
  /** Sens de comparaison : 'above' = l'ecart est un depassement. */
  direction: 'above' | 'below';
  unit: '%' | 'FC' | 'u';
  /** Service qui instruit l'anomalie en premier. */
  owner: Role;
  /** Verification concrete a mener — ce que le systeme PROPOSE, pas ce qu'il conclut. */
  suggestedCheck: string;
}

export const RULES: Record<RuleId, RuleDefinition> = {
  ECART_CARBURANT: {
    id: 'ECART_CARBURANT',
    label: 'Ecart de consommation de carburant',
    family: 'carburant',
    measures:
      'Dotation de carburant observee comparee a la consommation theorique calculee sur les kilometres parcourus.',
    watch: 0.12,
    critical: 0.2,
    direction: 'above',
    unit: '%',
    owner: 'EXPLOITATION',
    suggestedCheck:
      'Verifier les bons de dotation, l etat du vehicule et les conditions de circulation sur la periode.',
  },
  ECART_COLLECTE: {
    id: 'ECART_COLLECTE',
    label: 'Ecart entre recette attendue et recette enregistree',
    family: 'recettes',
    measures:
      'Part de la recette attendue (validations x tarif) effectivement enregistree par le systeme.',
    watch: 0.02,
    critical: 0.05,
    direction: 'above',
    unit: '%',
    owner: 'AUDIT',
    suggestedCheck:
      'Rapprocher le journal des validations et le journal des transactions sur les journees concernees.',
  },
  ECART_CAISSE: {
    id: 'ECART_CAISSE',
    label: 'Ecart de caisse entre montant declare et montant depose',
    family: 'caisse',
    measures: 'Difference entre la recette declaree par le depot et le montant depose.',
    watch: 50_000,
    critical: 200_000,
    direction: 'above',
    unit: 'FC',
    owner: 'AUDIT',
    suggestedCheck:
      'Demander le bordereau de depot et le justificatif de la difference au depot concerne.',
  },
  RATIO_VALIDATION: {
    id: 'RATIO_VALIDATION',
    label: 'Taux de validation des titres emis inferieur a la norme',
    family: 'transactions',
    measures: 'Part des titres emis qui sont effectivement valides a bord.',
    watch: 0.97,
    critical: 0.94,
    direction: 'below',
    unit: '%',
    owner: 'AUDIT',
    suggestedCheck:
      'Verifier le fonctionnement des valideurs embarques et la remontee des donnees sur la ligne.',
  },
  KM_INCOHERENT: {
    id: 'KM_INCOHERENT',
    label: 'Kilometrage incoherent avec les rotations declarees',
    family: 'kilometrage',
    measures:
      'Kilometres enregistres compares aux kilometres theoriques (rotations realisees x longueur de ligne x 2).',
    watch: 0.1,
    critical: 0.18,
    direction: 'above',
    unit: '%',
    owner: 'EXPLOITATION',
    suggestedCheck:
      'Verifier les feuilles de route, les deviations d itineraire et le relais des compteurs.',
  },
  DISPONIBILITE_LIGNE: {
    id: 'DISPONIBILITE_LIGNE',
    label: 'Disponibilite de la ligne inferieure a la norme',
    family: 'disponibilite',
    measures: 'Bus-jours disponibles rapportes aux bus-jours programmes sur la ligne.',
    watch: 0.85,
    critical: 0.78,
    direction: 'below',
    unit: '%',
    owner: 'EXPLOITATION',
    suggestedCheck:
      'Examiner les ordres de travaux ouverts et le delai d approvisionnement des pieces.',
  },
  PANNE_RECURRENTE: {
    id: 'PANNE_RECURRENTE',
    label: 'Pannes repetees de meme nature sur un vehicule',
    family: 'maintenance',
    measures: 'Nombre d interventions du meme type sur un meme bus en 60 jours.',
    watch: 3,
    critical: 5,
    direction: 'above',
    unit: 'u',
    owner: 'EXPLOITATION',
    suggestedCheck:
      'Analyser la qualite des reparations precedentes et l opportunite d une revision complete.',
  },
  ROTATION_MANQUANTE: {
    id: 'ROTATION_MANQUANTE',
    label: 'Rotations realisees inferieures au plan',
    family: 'rotations',
    measures: 'Rotations effectuees rapportees aux rotations planifiees.',
    watch: 0.9,
    critical: 0.8,
    direction: 'below',
    unit: '%',
    owner: 'EXPLOITATION',
    suggestedCheck:
      'Verifier les causes de non-realisation : congestion, dotation carburant, indisponibilite de conducteur.',
  },
  INCOHERENCE_CROISEE: {
    id: 'INCOHERENCE_CROISEE',
    label: 'Dotation de carburant sans kilometrage associe',
    family: 'coherence',
    measures:
      'Journees pour lesquelles une dotation de carburant est enregistree alors qu aucun kilometre n est declare.',
    watch: 1,
    critical: 2,
    direction: 'above',
    unit: 'u',
    owner: 'AUDIT',
    suggestedCheck:
      'Rapprocher le bon de dotation et la feuille de route de la journee concernee.',
  },
};

export const RULE_LIST = Object.values(RULES);

export const FAMILY_LABEL: Record<AnomalyFamily, string> = {
  recettes: 'Recettes',
  transactions: 'Transactions',
  carburant: 'Carburant',
  kilometrage: 'Kilometrage',
  disponibilite: 'Disponibilite',
  maintenance: 'Maintenance',
  rotations: 'Rotations',
  caisse: 'Caisse',
  coherence: 'Coherence des donnees',
};

export const SEVERITY_LABEL: Record<Severity, string> = {
  normal: 'Normal',
  surveiller: 'A surveiller',
  critique: 'Critique',
};

/** Classe une mesure par rapport aux seuils de sa regle. */
export function severityOf(rule: RuleDefinition, observed: number): Severity {
  if (rule.direction === 'above') {
    if (observed >= rule.critical) return 'critique';
    if (observed >= rule.watch) return 'surveiller';
    return 'normal';
  }
  if (observed <= rule.critical) return 'critique';
  if (observed <= rule.watch) return 'surveiller';
  return 'normal';
}
