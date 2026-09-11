/**
 * Flotte fictive : 24 bus.
 *
 * `lineId` est le seul lien d'affectation. Il est utilise par TOUS les modules
 * (rotations, recettes, carburant, maintenance, anomalies, rentabilite) :
 * c'est ce qui garantit qu'un bus immobilise disparait partout a la fois.
 */

import type { Bus } from '../types';

export const FLEET: Bus[] = [
  // --- L01 : Gare Centrale <-> UPN (4 bus) --------------------------------
  { id: 'TR-1802', lineId: 'L01', depotId: 'DEP-02', model: 'Yutong ZK6119', seats: 88, yearInService: 2021, odometerStartKm: 214_500, fuelNormL100: 31 },
  { id: 'TR-1814', lineId: 'L01', depotId: 'DEP-02', model: 'Yutong ZK6119', seats: 88, yearInService: 2021, odometerStartKm: 228_900, fuelNormL100: 31.5 },
  { id: 'TR-1827', lineId: 'L01', depotId: 'DEP-02', model: 'Yutong ZK6119', seats: 88, yearInService: 2022, odometerStartKm: 176_300, fuelNormL100: 30 },
  { id: 'TR-1836', lineId: 'L01', depotId: 'DEP-02', model: 'Golden Dragon XML', seats: 80, yearInService: 2022, odometerStartKm: 168_700, fuelNormL100: 32 },

  // --- L02 : Gare Centrale <-> Aeroport (4 bus) ---------------------------
  { id: 'TR-1841', lineId: 'L02', depotId: 'DEP-01', model: 'Yutong ZK6122', seats: 96, yearInService: 2020, odometerStartKm: 302_400, fuelNormL100: 33 },
  { id: 'TR-1842', lineId: 'L02', depotId: 'DEP-01', model: 'Yutong ZK6122', seats: 96, yearInService: 2020, odometerStartKm: 297_100, fuelNormL100: 33.5 },
  { id: 'TR-1855', lineId: 'L02', depotId: 'DEP-03', model: 'Yutong ZK6122', seats: 96, yearInService: 2021, odometerStartKm: 251_800, fuelNormL100: 32.5 },
  { id: 'TR-1863', lineId: 'L02', depotId: 'DEP-03', model: 'Golden Dragon XML', seats: 84, yearInService: 2022, odometerStartKm: 189_400, fuelNormL100: 32 },

  // --- L03 : Victoire <-> Kingasani (3 bus) -------------------------------
  { id: 'TR-1871', lineId: 'L03', depotId: 'DEP-01', model: 'Yutong ZK6119', seats: 88, yearInService: 2021, odometerStartKm: 243_600, fuelNormL100: 31 },
  { id: 'TR-1884', lineId: 'L03', depotId: 'DEP-03', model: 'Yutong ZK6119', seats: 88, yearInService: 2022, odometerStartKm: 182_200, fuelNormL100: 30.5 },
  { id: 'TR-1893', lineId: 'L03', depotId: 'DEP-03', model: 'Higer KLQ6119', seats: 90, yearInService: 2023, odometerStartKm: 121_900, fuelNormL100: 29.5 },

  // --- L04 : Gombe <-> Selembao (3 bus) -----------------------------------
  { id: 'TR-1906', lineId: 'L04', depotId: 'DEP-02', model: 'Higer KLQ6109', seats: 72, yearInService: 2023, odometerStartKm: 108_400, fuelNormL100: 28 },
  { id: 'TR-1917', lineId: 'L04', depotId: 'DEP-02', model: 'Higer KLQ6109', seats: 72, yearInService: 2023, odometerStartKm: 114_700, fuelNormL100: 28.5 },
  { id: 'TR-1925', lineId: 'L04', depotId: 'DEP-01', model: 'Golden Dragon XML', seats: 80, yearInService: 2021, odometerStartKm: 236_100, fuelNormL100: 32 },

  // --- L05 : Matete <-> Bandalungwa (3 bus) -------------------------------
  { id: 'TR-1938', lineId: 'L05', depotId: 'DEP-01', model: 'Yutong ZK6119', seats: 88, yearInService: 2020, odometerStartKm: 288_500, fuelNormL100: 32.5 },
  { id: 'TR-1944', lineId: 'L05', depotId: 'DEP-01', model: 'Yutong ZK6119', seats: 88, yearInService: 2021, odometerStartKm: 247_300, fuelNormL100: 31.5 },
  { id: 'TR-1959', lineId: 'L05', depotId: 'DEP-02', model: 'Higer KLQ6119', seats: 90, yearInService: 2023, odometerStartKm: 132_800, fuelNormL100: 29.5 },

  // --- L06 : Kinshasa <-> Maluku (2 bus, interurbain) ---------------------
  { id: 'TR-2011', lineId: 'L06', depotId: 'DEP-03', model: 'Yutong ZK6127H', seats: 55, yearInService: 2022, odometerStartKm: 212_600, fuelNormL100: 27 },
  { id: 'TR-2024', lineId: 'L06', depotId: 'DEP-03', model: 'Yutong ZK6127H', seats: 55, yearInService: 2022, odometerStartKm: 205_900, fuelNormL100: 27.5 },

  // --- L07 : Kinshasa <-> Kasangulu (5 bus, interurbain) ------------------
  // Ligne au coeur du scenario de demonstration.
  { id: 'TR-2037', lineId: 'L07', depotId: 'DEP-01', model: 'Yutong ZK6127H', seats: 55, yearInService: 2019, odometerStartKm: 386_200, fuelNormL100: 29.5 },
  { id: 'TR-2048', lineId: 'L07', depotId: 'DEP-01', model: 'Yutong ZK6127H', seats: 55, yearInService: 2019, odometerStartKm: 372_800, fuelNormL100: 29.8 },
  { id: 'TR-2056', lineId: 'L07', depotId: 'DEP-01', model: 'King Long XMQ6127', seats: 51, yearInService: 2020, odometerStartKm: 318_400, fuelNormL100: 28.5 },
  { id: 'TR-2063', lineId: 'L07', depotId: 'DEP-02', model: 'King Long XMQ6127', seats: 51, yearInService: 2021, odometerStartKm: 264_100, fuelNormL100: 28 },
  { id: 'TR-2079', lineId: 'L07', depotId: 'DEP-02', model: 'Yutong ZK6127H', seats: 55, yearInService: 2023, odometerStartKm: 142_500, fuelNormL100: 26.5 },
];

export const BUS_BY_ID = new Map(FLEET.map((b) => [b.id, b]));

export const BUSES_BY_LINE = FLEET.reduce<Record<string, string[]>>((acc, bus) => {
  (acc[bus.lineId] ??= []).push(bus.id);
  return acc;
}, {});
