/**
 * Evenements scriptes du scenario de demonstration.
 *
 * Ce fichier ne contient AUCUN indicateur : il decrit des causes physiques
 * (un bus immobilise, une derive de dotation carburant, un depot de caisse
 * incomplet). Tous les chiffres presentes au DG — ecarts, variances, anomalies —
 * sont ensuite CALCULES a partir de ces causes par `src/engine/`.
 *
 * Les decalages sont exprimes en jours par rapport a la date du jour
 * (0 = aujourd'hui, -13 = il y a treize jours). La demonstration raconte donc
 * toujours la meme histoire, quelle que soit la date de la presentation.
 */

import type { AgentCode, BusId, DepotId, FailureType, LineId, UnavailabilityReason } from '../types';

/** Immobilisation programmee d'un bus (donne lieu a un ordre de travaux). */
export interface ScriptedImmobilization {
  busId: BusId;
  startOffset: number;
  /** `null` = immobilisation toujours en cours a la date du jour. */
  endOffset: number | null;
  reason: UnavailabilityReason;
  type: 'preventive' | 'corrective';
  failure: FailureType;
  laborCostFC: number;
  partsCostFC: number;
  technicianCode: AgentCode;
  note: string;
}

/**
 * Coeur du scenario : trois bus de L07 immobilises simultanement.
 * C'est la cause physique de la baisse de disponibilite, de la chute des
 * rotations, donc de la baisse de recette de la ligne — et de la contribution
 * « disponibilite » dans la decomposition de l'ecart.
 */
export const SCRIPTED_IMMOBILIZATIONS: ScriptedImmobilization[] = [
  {
    busId: 'TR-2037',
    startOffset: -13,
    endOffset: null,
    reason: 'panne',
    type: 'corrective',
    failure: 'moteur',
    laborCostFC: 1_850_000,
    partsCostFC: 6_400_000,
    technicianCode: 'AG-1147',
    note: 'Perte de compression — depose moteur en cours.',
  },
  {
    busId: 'TR-2048',
    startOffset: -9,
    endOffset: null,
    reason: 'attente_pieces',
    type: 'corrective',
    failure: 'transmission',
    laborCostFC: 920_000,
    partsCostFC: 4_150_000,
    technicianCode: 'AG-1147',
    note: 'Boite de vitesses — piece en attente d importation.',
  },
  {
    busId: 'TR-2056',
    startOffset: -6,
    endOffset: null,
    reason: 'panne',
    type: 'corrective',
    failure: 'freinage',
    laborCostFC: 640_000,
    partsCostFC: 1_780_000,
    technicianCode: 'AG-1147',
    note: 'Circuit pneumatique de freinage — immobilisation de securite.',
  },
  {
    busId: 'TR-2079',
    startOffset: -21,
    endOffset: -19,
    reason: 'maintenance_preventive',
    type: 'preventive',
    failure: 'revision',
    laborCostFC: 380_000,
    partsCostFC: 620_000,
    technicianCode: 'AG-1147',
    note: 'Revision periodique 150 000 km.',
  },
  // Historique de pannes recurrentes sur TR-1842 — alimente la regle
  // PANNE_RECURRENTE et donne du corps a la fiche bus.
  {
    busId: 'TR-1842',
    startOffset: -58,
    endOffset: -56,
    reason: 'panne',
    type: 'corrective',
    failure: 'electrique',
    laborCostFC: 310_000,
    partsCostFC: 480_000,
    technicianCode: 'AG-1147',
    note: 'Alternateur — remplacement.',
  },
  {
    busId: 'TR-1842',
    startOffset: -34,
    endOffset: -33,
    reason: 'panne',
    type: 'corrective',
    failure: 'electrique',
    laborCostFC: 240_000,
    partsCostFC: 350_000,
    technicianCode: 'AG-1147',
    note: 'Faisceau electrique — reprise du cablage.',
  },
  {
    busId: 'TR-1842',
    startOffset: -16,
    endOffset: -15,
    reason: 'panne',
    type: 'corrective',
    failure: 'electrique',
    laborCostFC: 290_000,
    partsCostFC: 410_000,
    technicianCode: 'AG-1147',
    note: 'Demarreur — troisieme intervention electrique en 60 jours.',
  },
  {
    busId: 'TR-1925',
    startOffset: -41,
    endOffset: -37,
    reason: 'accident',
    type: 'corrective',
    failure: 'carrosserie',
    laborCostFC: 1_120_000,
    partsCostFC: 2_260_000,
    technicianCode: 'AG-1158',
    note: 'Choc lateral — reparation carrosserie et parebrise.',
  },
  {
    busId: 'TR-1938',
    startOffset: -27,
    endOffset: -24,
    reason: 'maintenance_preventive',
    type: 'preventive',
    failure: 'revision',
    laborCostFC: 420_000,
    partsCostFC: 780_000,
    technicianCode: 'AG-1147',
    note: 'Revision periodique 300 000 km.',
  },
  {
    busId: 'TR-1871',
    startOffset: -12,
    endOffset: -10,
    reason: 'panne',
    type: 'corrective',
    failure: 'pneumatique',
    laborCostFC: 180_000,
    partsCostFC: 1_240_000,
    technicianCode: 'AG-1147',
    note: 'Train de pneumatiques arriere.',
  },
];

/**
 * Derive de dotation carburant : les litres dotes depassent la consommation
 * theorique calculee a partir des kilometres reellement parcourus.
 * Ce n'est PAS une accusation — c'est un ecart a verifier.
 */
export interface ScriptedFuelDrift {
  busId: BusId;
  fromOffset: number;
  toOffset: number;
  /** Surplus applique a la consommation theorique (0.21 = +21 %). */
  excessRatio: number;
}

export const SCRIPTED_FUEL_DRIFTS: ScriptedFuelDrift[] = [
  { busId: 'TR-1842', fromOffset: -29, toOffset: 0, excessRatio: 0.21 },
  { busId: 'TR-1893', fromOffset: -29, toOffset: 0, excessRatio: 0.14 },
];

/**
 * Derive du taux de collecte : l'ecart entre la recette attendue (validations
 * x tarif) et la recette effectivement enregistree se creuse sur une ligne.
 * C'est le point d'entree du module Reconciliation.
 */
export interface ScriptedCollectionDrift {
  lineId: LineId;
  fromOffset: number;
  toOffset: number;
  /** Taux de collecte force sur la periode (0.962 = 96,2 % de la recette attendue). */
  collectionRate: number;
}

export const SCRIPTED_COLLECTION_DRIFTS: ScriptedCollectionDrift[] = [
  { lineId: 'L03', fromOffset: -18, toOffset: 0, collectionRate: 0.958 },
  { lineId: 'L07', fromOffset: -10, toOffset: 0, collectionRate: 0.969 },
];

/** Ecart de caisse : difference entre le declare et le depose. */
export interface ScriptedCashGap {
  depotId: DepotId;
  offset: number;
  /** Montant non depose (FC). */
  gapFC: number;
  /** Montant declare mais non encore comptabilise (FC). */
  postingGapFC: number;
}

export const SCRIPTED_CASH_GAPS: ScriptedCashGap[] = [
  { depotId: 'DEP-01', offset: -2, gapFC: 261_500, postingGapFC: 0 },
  { depotId: 'DEP-03', offset: -5, gapFC: 84_000, postingGapFC: 140_000 },
  { depotId: 'DEP-02', offset: -1, gapFC: 0, postingGapFC: 320_000 },
];

/**
 * Incoherence kilometrique : les kilometres declares ne correspondent pas aux
 * rotations realisees x la longueur de la ligne.
 */
export interface ScriptedKmDrift {
  busId: BusId;
  fromOffset: number;
  toOffset: number;
  /** Multiplicateur applique aux km theoriques (1.16 = +16 %). */
  ratio: number;
}

export const SCRIPTED_KM_DRIFTS: ScriptedKmDrift[] = [
  { busId: 'TR-1959', fromOffset: -20, toOffset: 0, ratio: 1.19 },
];

/**
 * Baisse de frequentation independante de l'offre (concurrence, travaux de
 * voirie) : agit sur le nombre de validations par rotation.
 */
export interface ScriptedRidershipDrift {
  lineId: LineId;
  fromOffset: number;
  toOffset: number;
  /** Multiplicateur de frequentation (0.91 = -9 %). */
  ratio: number;
  cause: string;
}

export const SCRIPTED_RIDERSHIP_DRIFTS: ScriptedRidershipDrift[] = [
  { lineId: 'L02', fromOffset: -24, toOffset: 0, ratio: 0.93, cause: 'Travaux de voirie — Boulevard Lumumba' },
  { lineId: 'L04', fromOffset: -15, toOffset: 0, ratio: 0.95, cause: 'Concurrence accrue du transport artisanal' },
];

/**
 * Baisse de rotations non liee a la disponibilite (congestion, ruptures de
 * carburant au depot). Agit sur les rotations realisees par bus disponible.
 */
export interface ScriptedRotationDrift {
  lineId: LineId;
  fromOffset: number;
  toOffset: number;
  ratio: number;
  cause: string;
}

export const SCRIPTED_ROTATION_DRIFTS: ScriptedRotationDrift[] = [
  { lineId: 'L02', fromOffset: -20, toOffset: 0, ratio: 0.94, cause: 'Congestion — chantier Boulevard Lumumba' },
  { lineId: 'L03', fromOffset: -11, toOffset: 0, ratio: 0.95, cause: 'Rupture ponctuelle de dotation carburant au depot' },
  { lineId: 'L07', fromOffset: -13, toOffset: 0, ratio: 0.96, cause: 'Report de service sur les bus restants' },
];
