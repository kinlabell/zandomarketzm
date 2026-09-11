/**
 * Sessions de caisse : attendu -> declare -> depose -> comptabilise.
 *
 * L'« attendu » n'est pas une donnee libre : c'est la somme des recettes
 * enregistrees par les bus rattaches au depot ce jour-la. Les trois etapes
 * suivantes s'en ecartent, et ce sont ces ecarts que le module Controle caisse
 * donne a justifier.
 */

import { BUS_BY_ID } from '../seed/fleet';
import { DEPOTS } from '../seed/network';
import { CASHIER_BY_DEPOT } from '../seed/staff';
import { SCRIPTED_CASH_GAPS } from '../seed/script';
import { addDays, daysBetween } from '../seed/calendar';
import { createRng } from '../seed/rng';
import type { BusDay, CashSession, IsoDate } from '../types';

/** Au-dela de ce montant, l'ecart bloque la validation de la session. */
export const CASH_BLOCKING_THRESHOLD_FC = 200_000;

export function generateCashSessions(
  busDays: BusDay[],
  dates: IsoDate[],
  today: IsoDate,
): CashSession[] {
  const byDepotDay = new Map<string, number>();

  for (const bd of busDays) {
    const depotId = BUS_BY_ID.get(bd.busId)?.depotId;
    if (!depotId) continue;
    const key = `${depotId}|${bd.date}`;
    byDepotDay.set(key, (byDepotDay.get(key) ?? 0) + bd.recordedRevenueFC);
  }

  const sessions: CashSession[] = [];

  for (const depot of DEPOTS) {
    for (const date of dates) {
      const expectedFC = Math.round(byDepotDay.get(`${depot.id}|${date}`) ?? 0);
      if (expectedFC === 0) continue;

      const rng = createRng(`cash|${depot.id}|${date}`);
      const offset = daysBetween(today, date);
      const scripted = SCRIPTED_CASH_GAPS.find(
        (g) => g.depotId === depot.id && addDays(today, g.offset) === date,
      );

      // Freinte de caisse ordinaire : arrondis, monnaie rendue, titres annules.
      const declaredFC = Math.round(expectedFC * Math.min(1, rng.normal(0.9988, 0.0011)));

      const depositGap = scripted?.gapFC ?? (rng.chance(0.06) ? rng.int(5_000, 48_000) : 0);
      const depositedFC = Math.max(0, declaredFC - depositGap);

      // La comptabilisation accuse un jour de decalage : la veille et le jour
      // meme ne sont pas encore integralement passes en comptabilite.
      const postingLagShare = offset >= -1 ? rng.range(0.35, 0.8) : 0;
      const scriptedPostingGap = scripted?.postingGapFC ?? 0;
      const postedFC = Math.max(
        0,
        Math.round(depositedFC * (1 - postingLagShare)) - scriptedPostingGap,
      );

      const gap = declaredFC - depositedFC;
      const status: CashSession['status'] =
        offset >= -1
          ? 'ouverte'
          : gap >= CASH_BLOCKING_THRESHOLD_FC
            ? 'bloquee'
            : gap > 0
              ? 'justifiee'
              : 'validee';

      sessions.push({
        id: `CS-${date.replace(/-/g, '')}-${depot.id.slice(-2)}`,
        date,
        depotId: depot.id,
        cashierCode: CASHIER_BY_DEPOT[depot.id] ?? 'AG-1096',
        expectedFC,
        declaredFC,
        depositedFC,
        postedFC,
        status,
      });
    }
  }

  return sessions;
}
