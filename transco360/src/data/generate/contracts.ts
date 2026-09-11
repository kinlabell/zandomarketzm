/**
 * Recettes des activites contractuelles (scolaire, location, publicite).
 *
 * Modele different du transactionnel : la recette est reconnue au prorata du
 * service rendu, facturee mensuellement, puis encaissee avec un taux de
 * recouvrement inferieur a 100 %. L'ecart entre facture et encaisse est un
 * point de controle a part entiere.
 */

import { CONTRACTS } from '../seed/activities';
import { isSaturday, isSunday } from '../seed/calendar';
import { createRng } from '../seed/rng';
import type { ContractRevenue, IsoDate } from '../types';

/** Taux de recouvrement moyen par activite. */
const RECOVERY_RATE: Record<string, number> = {
  scolaire: 0.93,
  location: 0.975,
  publicite: 0.88,
};

export function generateContractRevenues(dates: IsoDate[]): ContractRevenue[] {
  const rows: ContractRevenue[] = [];

  for (const contract of CONTRACTS) {
    for (const date of dates) {
      const rng = createRng(`contract|${contract.ref}|${date}`);

      // Le scolaire ne produit pas de service le week-end ; la publicite court
      // tous les jours ; la location est ponctuelle et irreguliere.
      let intensity = 1;
      if (contract.activity === 'scolaire') {
        intensity = isSunday(date) || isSaturday(date) ? 0 : 1.4;
      } else if (contract.activity === 'location') {
        intensity = rng.chance(0.45) ? rng.range(1.4, 3.2) : 0;
      }

      const dailyBase = contract.monthlyFC / 30;
      const amountFC = Math.round(dailyBase * intensity * rng.jitter(0.06));
      if (amountFC <= 0) continue;

      const recovery = (RECOVERY_RATE[contract.activity] ?? 0.95) * rng.jitter(0.02);

      rows.push({
        date,
        activity: contract.activity,
        contractRef: contract.ref,
        amountFC,
        invoicedFC: amountFC,
        collectedFC: Math.round(amountFC * Math.min(1, recovery)),
      });
    }
  }

  return rows;
}
