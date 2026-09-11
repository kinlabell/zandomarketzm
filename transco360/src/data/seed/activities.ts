/**
 * Activites de TRANSCO retenues pour la demonstration.
 *
 * Deux modeles de recette coexistent :
 *  - transactionnel : la recette nait d'une validation a bord (urbain, interurbain) ;
 *  - contractuel    : la recette nait d'un contrat facture (scolaire, location, publicite).
 * Cette distinction structure toute la reconciliation et le moteur de variance.
 */

import type { Activity } from '../types';

export const ACTIVITIES: Activity[] = [
  {
    id: 'urbain',
    label: 'Reseau urbain',
    shortLabel: 'Urbain',
    revenueModel: 'transactionnel',
    monthlyTargetFC: 349_000_000,
    description: '5 lignes urbaines exploitees en service regulier.',
  },
  {
    id: 'interurbain',
    label: 'Reseau interurbain',
    shortLabel: 'Interurbain',
    revenueModel: 'transactionnel',
    monthlyTargetFC: 121_000_000,
    description: '2 lignes de liaison vers la peripherie.',
  },
  {
    id: 'scolaire',
    label: 'Transport scolaire',
    shortLabel: 'Scolaire',
    revenueModel: 'contractuel',
    monthlyTargetFC: 32_000_000,
    description: 'Conventions avec des etablissements scolaires, facturation mensuelle.',
  },
  {
    id: 'location',
    label: 'Location de vehicules',
    shortLabel: 'Location',
    revenueModel: 'contractuel',
    monthlyTargetFC: 22_000_000,
    description: 'Mise a disposition ponctuelle de bus avec conducteur.',
  },
  {
    id: 'publicite',
    label: 'Publicite embarquee',
    shortLabel: 'Publicite',
    revenueModel: 'contractuel',
    monthlyTargetFC: 12_000_000,
    description: 'Habillage publicitaire des bus et affichage aux arrets.',
  },
];

export const ACTIVITY_BY_ID = new Map(ACTIVITIES.map((a) => [a.id, a]));

/** Contrats fictifs alimentant les activites contractuelles. */
export const CONTRACTS = [
  { ref: 'CT-SCO-014', activity: 'scolaire' as const, monthlyFC: 12_400_000, label: 'Convention scolaire — reseau Gombe' },
  { ref: 'CT-SCO-021', activity: 'scolaire' as const, monthlyFC: 9_800_000, label: 'Convention scolaire — reseau Limete' },
  { ref: 'CT-SCO-033', activity: 'scolaire' as const, monthlyFC: 8_600_000, label: 'Convention scolaire — reseau Ndjili' },
  { ref: 'CT-LOC-108', activity: 'location' as const, monthlyFC: 9_200_000, label: 'Location — administration publique' },
  { ref: 'CT-LOC-117', activity: 'location' as const, monthlyFC: 6_400_000, label: 'Location — evenementiel' },
  { ref: 'CT-LOC-126', activity: 'location' as const, monthlyFC: 5_100_000, label: 'Location — entreprise miniere' },
  { ref: 'CT-PUB-042', activity: 'publicite' as const, monthlyFC: 7_300_000, label: 'Habillage publicitaire — 14 bus' },
  { ref: 'CT-PUB-049', activity: 'publicite' as const, monthlyFC: 4_200_000, label: 'Affichage aux arrets — 18 points' },
];
