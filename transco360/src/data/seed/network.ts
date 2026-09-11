/**
 * Reseau fictif : arrets, lignes, depots.
 *
 * Les quartiers cites existent a Kinshasa mais le reseau, les tarifs, les
 * distances et les objectifs sont entierement fictifs. Les coordonnees x/y
 * servent uniquement au trace de la carte schematique (viewBox 1000 x 640) :
 * ce n'est pas une carte geographique.
 */

import type { Depot, Line, Stop } from '../types';

export const MAP_VIEWBOX = { width: 1000, height: 640 };

export const DEPOTS: Depot[] = [
  { id: 'DEP-01', name: 'Depot Limete', zone: 'Centre-est' },
  { id: 'DEP-02', name: 'Depot Kintambo', zone: 'Ouest' },
  { id: 'DEP-03', name: 'Depot Ndjili', zone: 'Est' },
];

export const STOPS: Stop[] = [
  { id: 'ST-01', name: 'UPN', x: 92, y: 302, isInterchange: false },
  { id: 'ST-02', name: 'Kintambo Magasin', x: 188, y: 232, isInterchange: true },
  { id: 'ST-03', name: 'Ngaliema', x: 150, y: 152, isInterchange: false },
  { id: 'ST-04', name: 'Gare Centrale', x: 420, y: 176, isInterchange: true },
  { id: 'ST-05', name: 'Gombe — Boulevard', x: 468, y: 104, isInterchange: false },
  { id: 'ST-06', name: 'Rond-point Victoire', x: 418, y: 306, isInterchange: true },
  { id: 'ST-07', name: 'Kasa-Vubu', x: 340, y: 246, isInterchange: true },
  { id: 'ST-08', name: 'Bandalungwa', x: 252, y: 288, isInterchange: false },
  { id: 'ST-09', name: 'Limete 7e rue', x: 556, y: 248, isInterchange: true },
  { id: 'ST-10', name: 'Debonhomme', x: 516, y: 358, isInterchange: false },
  { id: 'ST-11', name: 'Matete', x: 598, y: 402, isInterchange: true },
  { id: 'ST-12', name: 'Lemba Super', x: 488, y: 420, isInterchange: false },
  { id: 'ST-13', name: 'Ngaba', x: 398, y: 428, isInterchange: true },
  { id: 'ST-14', name: 'Selembao', x: 296, y: 432, isInterchange: false },
  { id: 'ST-15', name: 'Masina Sans-fil', x: 760, y: 212, isInterchange: true },
  { id: 'ST-16', name: 'Ndjili Quartier 7', x: 836, y: 246, isInterchange: false },
  { id: 'ST-17', name: 'Aeroport de Ndjili', x: 912, y: 178, isInterchange: false },
  { id: 'ST-18', name: 'Kingasani', x: 858, y: 352, isInterchange: false },
  { id: 'ST-19', name: 'Kimbanseke', x: 774, y: 420, isInterchange: false },
  { id: 'ST-20', name: 'Righini', x: 672, y: 300, isInterchange: false },
  { id: 'ST-21', name: 'Pont Matete', x: 640, y: 336, isInterchange: false },
  { id: 'ST-22', name: 'Kinkole', x: 922, y: 116, isInterchange: false },
  { id: 'ST-23', name: 'Maluku', x: 958, y: 66, isInterchange: false },
  { id: 'ST-24', name: 'Mont-Ngafula', x: 274, y: 502, isInterchange: false },
  { id: 'ST-25', name: 'Kimwenza', x: 214, y: 548, isInterchange: false },
  { id: 'ST-26', name: 'Kasangulu', x: 116, y: 584, isInterchange: false },
];

/**
 * Objectifs mensuels : ce sont des donnees d'entree de gestion (fixees par la
 * direction), pas des resultats. Ils sont volontairement distincts du realise
 * genere, ce qui produit l'ecart analyse par le moteur de variance.
 */
export const LINES: Line[] = [
  {
    id: 'L01',
    code: 'L01',
    name: 'Gare Centrale <-> UPN',
    kind: 'urbain',
    activity: 'urbain',
    distanceKm: 14,
    stopIds: ['ST-04', 'ST-07', 'ST-08', 'ST-02', 'ST-01'],
    fareFC: 1000,
    plannedRotationsPerBusDay: 7,
    referenceBoardingsPerRotation: 108,
    monthlyTargetFC: 79_000_000,
    colorToken: 'line-01',
  },
  {
    id: 'L02',
    code: 'L02',
    name: 'Gare Centrale <-> Aeroport de Ndjili',
    kind: 'urbain',
    activity: 'urbain',
    distanceKm: 24,
    stopIds: ['ST-04', 'ST-09', 'ST-20', 'ST-15', 'ST-16', 'ST-17'],
    fareFC: 1500,
    plannedRotationsPerBusDay: 5,
    referenceBoardingsPerRotation: 124,
    monthlyTargetFC: 95_000_000,
    colorToken: 'line-02',
  },
  {
    id: 'L03',
    code: 'L03',
    name: 'Rond-point Victoire <-> Kingasani',
    kind: 'urbain',
    activity: 'urbain',
    distanceKm: 20,
    stopIds: ['ST-06', 'ST-10', 'ST-11', 'ST-21', 'ST-19', 'ST-18'],
    fareFC: 1200,
    plannedRotationsPerBusDay: 6,
    referenceBoardingsPerRotation: 112,
    monthlyTargetFC: 59_000_000,
    colorToken: 'line-03',
  },
  {
    id: 'L04',
    code: 'L04',
    name: 'Gombe <-> Selembao',
    kind: 'urbain',
    activity: 'urbain',
    distanceKm: 12,
    stopIds: ['ST-05', 'ST-04', 'ST-07', 'ST-13', 'ST-14'],
    fareFC: 1000,
    plannedRotationsPerBusDay: 8,
    referenceBoardingsPerRotation: 96,
    monthlyTargetFC: 59_000_000,
    colorToken: 'line-04',
  },
  {
    id: 'L05',
    code: 'L05',
    name: 'Matete <-> Bandalungwa',
    kind: 'urbain',
    activity: 'urbain',
    distanceKm: 16,
    stopIds: ['ST-11', 'ST-12', 'ST-13', 'ST-06', 'ST-07', 'ST-08'],
    fareFC: 1000,
    plannedRotationsPerBusDay: 7,
    referenceBoardingsPerRotation: 104,
    monthlyTargetFC: 57_000_000,
    colorToken: 'line-05',
  },
  {
    id: 'L06',
    code: 'L06',
    name: 'Kinshasa <-> Maluku',
    kind: 'interurbain',
    activity: 'interurbain',
    distanceKm: 78,
    stopIds: ['ST-04', 'ST-15', 'ST-16', 'ST-22', 'ST-23'],
    fareFC: 5000,
    plannedRotationsPerBusDay: 2,
    referenceBoardingsPerRotation: 72,
    monthlyTargetFC: 37_000_000,
    colorToken: 'line-06',
  },
  {
    id: 'L07',
    code: 'L07',
    name: 'Kinshasa <-> Kasangulu',
    kind: 'interurbain',
    activity: 'interurbain',
    distanceKm: 42,
    stopIds: ['ST-04', 'ST-06', 'ST-13', 'ST-24', 'ST-25', 'ST-26'],
    fareFC: 3500,
    plannedRotationsPerBusDay: 3,
    referenceBoardingsPerRotation: 64,
    monthlyTargetFC: 84_000_000,
    colorToken: 'line-07',
  },
];

export const LINE_BY_ID = new Map(LINES.map((l) => [l.id, l]));
export const STOP_BY_ID = new Map(STOPS.map((s) => [s.id, s]));
