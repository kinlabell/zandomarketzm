/**
 * Ordres de travaux.
 *
 * Ils ne sont PAS inventes independamment : ils sont deduits des sequences
 * d'indisponibilite constatees dans les faits d'exploitation. Un bus immobilise
 * dans la flotte a donc necessairement un ordre de travaux correspondant, avec
 * la meme duree — c'est ce qui rend le drill-down « flotte -> maintenance »
 * coherent.
 */

import { SCRIPTED_IMMOBILIZATIONS } from '../seed/script';
import { addDays } from '../seed/calendar';
import { createRng } from '../seed/rng';
import type { BusDay, FailureType, IsoDate, MaintenanceOrder } from '../types';

/** Fourchettes de cout par type d'intervention (FC). */
const COST_MODEL: Record<FailureType, { labor: [number, number]; parts: [number, number]; note: string }> = {
  moteur: { labor: [800_000, 1_900_000], parts: [2_400_000, 6_500_000], note: 'Intervention moteur.' },
  transmission: { labor: [600_000, 1_200_000], parts: [1_500_000, 4_200_000], note: 'Intervention transmission.' },
  freinage: { labor: [280_000, 700_000], parts: [600_000, 1_800_000], note: 'Intervention circuit de freinage.' },
  pneumatique: { labor: [120_000, 260_000], parts: [400_000, 1_300_000], note: 'Remplacement de pneumatiques.' },
  electrique: { labor: [180_000, 420_000], parts: [250_000, 900_000], note: 'Intervention electrique.' },
  carrosserie: { labor: [400_000, 1_200_000], parts: [700_000, 2_400_000], note: 'Reparation de carrosserie.' },
  climatisation: { labor: [200_000, 520_000], parts: [350_000, 1_100_000], note: 'Intervention climatisation.' },
  revision: { labor: [300_000, 520_000], parts: [520_000, 980_000], note: 'Revision periodique.' },
};

const FAILURES_BY_REASON: Record<string, FailureType[]> = {
  panne: ['moteur', 'transmission', 'freinage', 'electrique', 'climatisation'],
  attente_pieces: ['transmission', 'moteur', 'freinage'],
  maintenance_preventive: ['revision'],
  accident: ['carrosserie'],
  administratif: ['revision'],
};

interface Run {
  busId: string;
  lineId: string;
  start: IsoDate;
  end: IsoDate;
  days: number;
  reason: string;
  openEnded: boolean;
}

/** Detecte les sequences consecutives d'indisponibilite, bus par bus. */
function findUnavailabilityRuns(busDays: BusDay[], today: IsoDate): Run[] {
  const byBus = new Map<string, BusDay[]>();
  for (const bd of busDays) {
    const bucket = byBus.get(bd.busId);
    if (bucket) bucket.push(bd);
    else byBus.set(bd.busId, [bd]);
  }

  const runs: Run[] = [];
  for (const [busId, rows] of byBus) {
    const sorted = [...rows].sort((a, b) => a.date.localeCompare(b.date));
    let current: Run | null = null;

    for (const bd of sorted) {
      if (!bd.available) {
        const reason = bd.unavailabilityReason ?? 'panne';
        if (current && addDays(current.end, 1) === bd.date && current.reason === reason) {
          current.end = bd.date;
          current.days += 1;
        } else {
          if (current) runs.push(current);
          current = {
            busId,
            lineId: bd.lineId,
            start: bd.date,
            end: bd.date,
            days: 1,
            reason,
            openEnded: false,
          };
        }
      } else if (current) {
        runs.push(current);
        current = null;
      }
    }
    if (current) {
      current.openEnded = current.end === today;
      runs.push(current);
    }
  }

  return runs.sort((a, b) => a.start.localeCompare(b.start));
}

export function generateMaintenanceOrders(
  busDays: BusDay[],
  today: IsoDate,
): MaintenanceOrder[] {
  const runs = findUnavailabilityRuns(busDays, today);
  const orders: MaintenanceOrder[] = [];
  let sequence = 1;

  for (const run of runs) {
    const scripted = SCRIPTED_IMMOBILIZATIONS.find(
      (imm) => imm.busId === run.busId && addDays(today, imm.startOffset) === run.start,
    );

    const rng = createRng(`maint|${run.busId}|${run.start}`);
    const failure: FailureType =
      scripted?.failure ??
      rng.pick(FAILURES_BY_REASON[run.reason] ?? (['revision'] as FailureType[]));
    const model = COST_MODEL[failure];

    const laborCostFC =
      scripted?.laborCostFC ??
      Math.round(rng.range(model.labor[0], model.labor[1]) * (0.6 + run.days * 0.25));
    const partsCostFC =
      scripted?.partsCostFC ?? Math.round(rng.range(model.parts[0], model.parts[1]));

    const id = `OT-${run.start.slice(0, 4)}-${String(sequence++).padStart(4, '0')}`;

    orders.push({
      id,
      busId: run.busId,
      lineId: run.lineId,
      type: scripted?.type ?? (run.reason === 'maintenance_preventive' ? 'preventive' : 'corrective'),
      failure,
      openedAt: run.start,
      ...(run.openEnded ? {} : { closedAt: run.end }),
      immobilizationDays: run.days,
      laborCostFC,
      partsCostFC,
      technicianCode: scripted?.technicianCode ?? rng.pick(['AG-1147', 'AG-1158']),
      note: scripted?.note ?? model.note,
    });
  }

  return orders;
}
