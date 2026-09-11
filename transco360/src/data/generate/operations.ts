/**
 * Generation des faits d'exploitation : un enregistrement par bus et par jour.
 *
 * C'est la table pivot du prototype. Tout le reste en decoule :
 * les recettes (validations x tarif), le carburant (km parcourus), la
 * disponibilite, les rotations, la rentabilite et les anomalies.
 *
 * Aucun indicateur n'est ecrit ici : seulement des faits.
 */

import { AGENTS } from '../seed/staff';
import { FLEET } from '../seed/fleet';
import { LINE_BY_ID } from '../seed/network';
import {
  SCRIPTED_COLLECTION_DRIFTS,
  SCRIPTED_IMMOBILIZATIONS,
  SCRIPTED_KM_DRIFTS,
  SCRIPTED_RIDERSHIP_DRIFTS,
  SCRIPTED_ROTATION_DRIFTS,
} from '../seed/script';
import { addDays, daysBetween, serviceIntensity } from '../seed/calendar';
import { createRng } from '../seed/rng';
import type { BusDay, IsoDate, UnavailabilityReason } from '../types';

/** Taux de collecte de reference hors derive scriptee. */
const BASE_COLLECTION_RATE = 0.988;
/** Part des rotations planifiees reellement effectuees en regime normal. */
const BASE_ROTATION_EFFICIENCY = 0.955;
/** Probabilite qu'un bus disponible tombe en panne un jour donne. */
const SPONTANEOUS_FAILURE_RATE = 0.012;

interface DayWindow {
  from: number;
  to: number;
}

function offsetOf(date: IsoDate, today: IsoDate): number {
  return daysBetween(today, date); // negatif dans le passe
}

function inWindow(offset: number, w: DayWindow): boolean {
  return offset >= w.from && offset <= w.to;
}

/**
 * Immobilisations forcees par le scenario, indexees par bus et par date.
 * Retourne la raison d'indisponibilite si le bus est immobilise ce jour-la.
 */
function buildScriptedUnavailability(
  today: IsoDate,
): Map<string, UnavailabilityReason> {
  const map = new Map<string, UnavailabilityReason>();
  for (const imm of SCRIPTED_IMMOBILIZATIONS) {
    const end = imm.endOffset ?? 0;
    for (let offset = imm.startOffset; offset <= end; offset++) {
      map.set(`${imm.busId}|${addDays(today, offset)}`, imm.reason);
    }
  }
  return map;
}

/**
 * Arrondi stochastique : preserve l'esperance sur un grand nombre de tirages
 * tout en gardant des rotations entieres, comme dans la realite.
 */
function roundStochastic(value: number, draw: number): number {
  const base = Math.floor(value);
  return base + (draw < value - base ? 1 : 0);
}

export function generateBusDays(today: IsoDate, dates: IsoDate[]): BusDay[] {
  const scriptedUnavailable = buildScriptedUnavailability(today);
  const busDays: BusDay[] = [];

  /**
   * Facteur reseau du jour : evenement commun a toutes les lignes (meteo,
   * tension sur l'approvisionnement, jour de paie). Evite que les lignes
   * varient de facon totalement independante, ce qui serait irrealiste.
   */
  const networkFactor = new Map<IsoDate, number>();
  const networkRng = createRng('network-factor');
  for (const date of dates) {
    networkFactor.set(date, networkRng.normal(1, 0.035));
  }

  for (const bus of FLEET) {
    const line = LINE_BY_ID.get(bus.lineId);
    if (!line) continue;

    const drivers = AGENTS.filter(
      (a) => a.role === 'conduite' && a.lineIds.includes(line.id),
    );
    const conductors = AGENTS.filter(
      (a) => a.role === 'recette' && a.lineIds.includes(line.id),
    );

    const rotationDrift = SCRIPTED_ROTATION_DRIFTS.find((d) => d.lineId === line.id);
    const ridershipDrift = SCRIPTED_RIDERSHIP_DRIFTS.find((d) => d.lineId === line.id);
    const collectionDrift = SCRIPTED_COLLECTION_DRIFTS.find((d) => d.lineId === line.id);
    const kmDrift = SCRIPTED_KM_DRIFTS.find((d) => d.busId === bus.id);

    // Qualite intrinseque du bus : un vehicule ancien tombe plus souvent en
    // panne et consomme davantage. Deterministe, derive de l'identifiant.
    const busRng = createRng(`bus-profile|${bus.id}`);
    const reliability = Math.min(1, Math.max(0.55, busRng.normal(0.92, 0.06)));

    dates.forEach((date, dayIndex) => {
      const rng = createRng(`busday|${bus.id}|${date}`);
      const offset = offsetOf(date, today);
      const intensity = serviceIntensity(date);
      const network = networkFactor.get(date) ?? 1;

      const scriptedReason = scriptedUnavailable.get(`${bus.id}|${date}`);
      const spontaneous =
        !scriptedReason &&
        rng.chance(SPONTANEOUS_FAILURE_RATE * (2 - reliability));

      const available = !scriptedReason && !spontaneous;
      const reason: UnavailabilityReason | undefined = scriptedReason
        ? scriptedReason
        : spontaneous
          ? rng.pick<UnavailabilityReason>([
              'panne',
              'maintenance_preventive',
              'attente_pieces',
              'administratif',
            ])
          : undefined;

      const rotationsPlanned = Math.max(
        1,
        Math.round(line.plannedRotationsPerBusDay * intensity),
      );

      if (!available) {
        busDays.push({
          date,
          busId: bus.id,
          lineId: line.id,
          available: false,
          ...(reason ? { unavailabilityReason: reason } : {}),
          rotationsPlanned,
          rotationsDone: 0,
          kmRun: 0,
          boardings: 0,
          expectedRevenueFC: 0,
          recordedRevenueFC: 0,
          driverCode: drivers[dayIndex % Math.max(1, drivers.length)]?.code ?? 'AG-1042',
          conductorCode:
            conductors[dayIndex % Math.max(1, conductors.length)]?.code ?? 'AG-1096',
        });
        return;
      }

      // --- Rotations -------------------------------------------------------
      let rotationEfficiency = BASE_ROTATION_EFFICIENCY * rng.jitter(0.05) * network;
      if (rotationDrift && inWindow(offset, { from: rotationDrift.fromOffset, to: rotationDrift.toOffset })) {
        rotationEfficiency *= rotationDrift.ratio;
      }
      const rotationsDone = Math.min(
        rotationsPlanned,
        Math.max(0, roundStochastic(rotationsPlanned * rotationEfficiency, rng.next())),
      );

      // --- Kilometres : une rotation = un aller-retour ----------------------
      const theoreticalKm = rotationsDone * line.distanceKm * 2;
      const kmRatio =
        kmDrift && inWindow(offset, { from: kmDrift.fromOffset, to: kmDrift.toOffset })
          ? kmDrift.ratio
          : 1;
      const kmRun = Math.round(theoreticalKm * kmRatio * rng.jitter(0.025));

      // --- Frequentation ---------------------------------------------------
      let loadFactor = rng.normal(1, 0.08) * network;
      if (ridershipDrift && inWindow(offset, { from: ridershipDrift.fromOffset, to: ridershipDrift.toOffset })) {
        loadFactor *= ridershipDrift.ratio;
      }
      // Les bus restants absorbent une partie de la demande quand la ligne
      // perd des vehicules : le report de charge est reel, mais partiel.
      loadFactor = Math.max(0.4, Math.min(1.45, loadFactor));

      const boardings = Math.max(
        0,
        Math.round(rotationsDone * line.referenceBoardingsPerRotation * loadFactor),
      );
      const expectedRevenueFC = boardings * line.fareFC;

      // --- Collecte ---------------------------------------------------------
      const collectionRate =
        collectionDrift && inWindow(offset, { from: collectionDrift.fromOffset, to: collectionDrift.toOffset })
          ? collectionDrift.collectionRate
          : BASE_COLLECTION_RATE;
      const recordedRevenueFC = Math.round(
        expectedRevenueFC * Math.min(1, collectionRate * rng.jitter(0.004)),
      );

      busDays.push({
        date,
        busId: bus.id,
        lineId: line.id,
        available: true,
        rotationsPlanned,
        rotationsDone,
        kmRun,
        boardings,
        expectedRevenueFC,
        recordedRevenueFC,
        driverCode: drivers[dayIndex % Math.max(1, drivers.length)]?.code ?? 'AG-1042',
        conductorCode:
          conductors[dayIndex % Math.max(1, conductors.length)]?.code ?? 'AG-1096',
      });
    });
  }

  return busDays;
}
