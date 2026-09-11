/**
 * Dotations de carburant.
 *
 * La consommation THEORIQUE est calculee ailleurs (`engine/fuel.ts`) a partir
 * des kilometres reellement parcourus et de la norme du bus. Ici on ne genere
 * que le fait declaratif : les litres effectivement dotes au vehicule.
 * L'ecart entre les deux est le materiau du module Carburant.
 */

import { BUS_BY_ID } from '../seed/fleet';
import { SCRIPTED_FUEL_DRIFTS } from '../seed/script';
import { addDays, daysBetween } from '../seed/calendar';
import { createRng } from '../seed/rng';
import type { BusDay, FuelRecord, IsoDate } from '../types';

/** Prix moyen du litre de gazole retenu pour la periode (FC). */
export const FUEL_UNIT_PRICE_FC = 4_150;

/**
 * Probabilite qu'une dotation soit enregistree alors que le bus n'a parcouru
 * aucun kilometre. Cas rare mais reel, qui alimente la regle de coherence
 * croisee « carburant sans kilometrage ».
 */
const ISSUE_WITHOUT_RUN_RATE = 0.014;

export function generateFuelRecords(busDays: BusDay[], today: IsoDate): FuelRecord[] {
  const records: FuelRecord[] = [];

  for (const bd of busDays) {
    const bus = BUS_BY_ID.get(bd.busId);
    if (!bus) continue;

    const rng = createRng(`fuel|${bd.busId}|${bd.date}`);
    const offset = daysBetween(today, bd.date);

    if (bd.kmRun === 0) {
      if (rng.chance(ISSUE_WITHOUT_RUN_RATE)) {
        records.push({
          date: bd.date,
          busId: bd.busId,
          lineId: bd.lineId,
          litresIssued: rng.int(28, 46),
          kmCovered: 0,
          unitPriceFC: FUEL_UNIT_PRICE_FC,
        });
      }
      continue;
    }

    const theoreticalLitres = (bd.kmRun * bus.fuelNormL100) / 100;

    const drift = SCRIPTED_FUEL_DRIFTS.find(
      (d) => d.busId === bd.busId && offset >= d.fromOffset && offset <= d.toOffset,
    );
    const excess = drift ? drift.excessRatio : 0;

    // Bruit de dotation : conditions de circulation, style de conduite,
    // precision des comptages au depot.
    const litresIssued = Math.max(
      1,
      Math.round(theoreticalLitres * (1 + excess) * rng.normal(1, 0.045)),
    );

    records.push({
      date: bd.date,
      busId: bd.busId,
      lineId: bd.lineId,
      litresIssued,
      kmCovered: bd.kmRun,
      unitPriceFC: FUEL_UNIT_PRICE_FC,
    });
  }

  return records;
}

/** Utilitaire de fenetre relative, partage avec les tests. */
export function dateAtOffset(today: IsoDate, offset: number): IsoDate {
  return addDays(today, offset);
}
