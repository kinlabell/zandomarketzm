/**
 * Agregation billettique par ligne et par jour.
 *
 * La cascade de reconciliation se construit ici :
 *   titres emis -> titres valides -> transactions enregistrees -> recette.
 * Chaque niveau est une donnee de fait ; les ecarts sont calcules plus tard
 * par `engine/reconciliation.ts`.
 */

import { LINE_BY_ID, LINES } from '../seed/network';
import { createRng } from '../seed/rng';
import type { BusDay, IsoDate, LineDay } from '../types';

/**
 * Part des titres emis qui sont effectivement valides a bord.
 * Le complement correspond aux titres perdus, non utilises ou non remontes
 * par le systeme de billetterie existant.
 */
const BASE_VALIDATION_RATE = 0.976;

/** Lignes ou le taux de validation se degrade (point d'entree d'anomalie). */
const VALIDATION_RATE_OVERRIDES: Record<string, number> = {
  L03: 0.941,
  L07: 0.958,
};

export function generateLineDays(busDays: BusDay[], dates: IsoDate[]): LineDay[] {
  const index = new Map<string, BusDay[]>();
  for (const bd of busDays) {
    const key = `${bd.lineId}|${bd.date}`;
    const bucket = index.get(key);
    if (bucket) bucket.push(bd);
    else index.set(key, [bd]);
  }

  const lineDays: LineDay[] = [];

  for (const line of LINES) {
    for (const date of dates) {
      const rows = index.get(`${line.id}|${date}`) ?? [];
      if (rows.length === 0) continue;

      const rng = createRng(`lineday|${line.id}|${date}`);

      const titlesValidated = rows.reduce((s, r) => s + r.boardings, 0);
      const expectedRevenueFC = rows.reduce((s, r) => s + r.expectedRevenueFC, 0);
      const recordedRevenueFC = rows.reduce((s, r) => s + r.recordedRevenueFC, 0);

      const validationRate =
        (VALIDATION_RATE_OVERRIDES[line.id] ?? BASE_VALIDATION_RATE) * rng.jitter(0.006);
      const titlesIssued = titlesValidated > 0
        ? Math.round(titlesValidated / Math.min(0.999, validationRate))
        : 0;

      // Une transaction enregistree correspond a un titre valide effectivement
      // remonte par le systeme : le manquant est exactement l'ecart de recette.
      const transactionsCount = Math.round(recordedRevenueFC / line.fareFC);

      lineDays.push({
        date,
        lineId: line.id,
        titlesIssued,
        titlesValidated,
        transactionsCount,
        expectedRevenueFC,
        recordedRevenueFC,
        busDaysScheduled: rows.length,
        busDaysAvailable: rows.filter((r) => r.available).length,
        rotationsPlanned: rows.reduce((s, r) => s + r.rotationsPlanned, 0),
        rotationsDone: rows.reduce((s, r) => s + r.rotationsDone, 0),
        kmRun: rows.reduce((s, r) => s + r.kmRun, 0),
      });
    }
  }

  return lineDays;
}

/** Tarif de la ligne — utilise par la generation de transactions unitaires. */
export function fareOf(lineId: string): number {
  return LINE_BY_ID.get(lineId)?.fareFC ?? 0;
}
