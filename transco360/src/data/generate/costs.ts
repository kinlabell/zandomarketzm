/**
 * Couts directs d'exploitation (hors carburant et hors maintenance, qui sont
 * calcules a partir de leurs propres faits).
 *
 * Perimetre volontairement limite aux couts DIRECTEMENT imputables a un bus ou
 * a une ligne. C'est la raison pour laquelle le module Rentabilite parle de
 * « performance contributive » et jamais de « benefice net » : les charges de
 * structure ne sont pas modelisees.
 */

import { BUS_BY_ID } from '../seed/fleet';
import { LINE_BY_ID } from '../seed/network';
import { createRng } from '../seed/rng';
import type { BusDay, CostRecord } from '../types';

/** Bareme journalier par bus en service (FC, charges comprises). */
export const DAILY_COST_MODEL = {
  /** Conducteur + receveur + quote-part du personnel d'appui du depot. */
  personnelPerBusDayFC: 98_000,
  /** Personnel minimal maintenu meme lorsque le bus ne roule pas. */
  personnelIdlePerBusDayFC: 34_000,
  /** Assurance et taxes, dues que le bus roule ou non. */
  insurancePerBusDayFC: 12_000,
  /** Peages et redevances de gare, par rotation interurbaine. */
  tollPerInterurbanRotationFC: 15_000,
  /** Nettoyage, redevances d'arret, consommables. */
  sundriesPerBusDayFC: 18_000,
} as const;

export function generateCostRecords(busDays: BusDay[]): CostRecord[] {
  const records: CostRecord[] = [];

  for (const bd of busDays) {
    const bus = BUS_BY_ID.get(bd.busId);
    const line = LINE_BY_ID.get(bd.lineId);
    if (!bus || !line) continue;

    const rng = createRng(`cost|${bd.busId}|${bd.date}`);
    const activity = line.activity;

    const personnel = bd.available
      ? Math.round(DAILY_COST_MODEL.personnelPerBusDayFC * rng.jitter(0.04))
      : DAILY_COST_MODEL.personnelIdlePerBusDayFC;

    records.push({
      date: bd.date,
      kind: 'personnel',
      amountFC: personnel,
      lineId: bd.lineId,
      busId: bd.busId,
      activity,
    });

    records.push({
      date: bd.date,
      kind: 'assurance',
      amountFC: DAILY_COST_MODEL.insurancePerBusDayFC,
      lineId: bd.lineId,
      busId: bd.busId,
      activity,
    });

    if (bd.available) {
      records.push({
        date: bd.date,
        kind: 'autres',
        amountFC: Math.round(DAILY_COST_MODEL.sundriesPerBusDayFC * rng.jitter(0.12)),
        lineId: bd.lineId,
        busId: bd.busId,
        activity,
      });
    }

    if (line.kind === 'interurbain' && bd.rotationsDone > 0) {
      records.push({
        date: bd.date,
        kind: 'peages',
        amountFC: bd.rotationsDone * DAILY_COST_MODEL.tollPerInterurbanRotationFC,
        lineId: bd.lineId,
        busId: bd.busId,
        activity,
      });
    }
  }

  return records;
}
