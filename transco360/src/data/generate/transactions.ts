/**
 * Transactions unitaires — generees A LA DEMANDE.
 *
 * Materialiser les ~580 000 validations de la periode saturerait la memoire
 * d'une tablette. On ne genere donc que les transactions du couple (bus, jour)
 * reellement ouvert par l'utilisateur, a partir d'une graine derivee de
 * l'identifiant du bus et de la date.
 *
 * Garantie de coherence : le nombre de transactions produites est exactement
 * le nombre de validations de l'agregat, et la part non synchronisee reproduit
 * exactement l'ecart entre recette attendue et recette enregistree.
 */

import { LINE_BY_ID } from '../seed/network';
import { createRng, splitTotal } from '../seed/rng';
import type { BusDay, Transaction } from '../types';

/** Amplitude du service : premiere et derniere validation de la journee. */
const SERVICE_START_MINUTES = 5 * 60 + 30; // 05h30
const SERVICE_END_MINUTES = 20 * 60 + 30; // 20h30

const MEDIA_MIX: { media: Transaction['media']; weight: number }[] = [
  { media: 'carte', weight: 0.52 },
  { media: 'ticket', weight: 0.38 },
  { media: 'mobile', weight: 0.1 },
];

function pickMedia(draw: number): Transaction['media'] {
  let acc = 0;
  for (const entry of MEDIA_MIX) {
    acc += entry.weight;
    if (draw < acc) return entry.media;
  }
  return 'ticket';
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.floor(minutes % 60);
  const s = Math.floor((minutes % 1) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Produit les validations d'un bus pour une journee donnee.
 * Deterministe : deux appels successifs renvoient exactement la meme liste.
 */
export function generateTransactions(busDay: BusDay): Transaction[] {
  if (busDay.boardings === 0) return [];

  const line = LINE_BY_ID.get(busDay.lineId);
  if (!line) return [];

  const rng = createRng(`tx|${busDay.busId}|${busDay.date}`);
  const rotations = Math.max(1, busDay.rotationsDone);
  const perRotation = splitTotal(busDay.boardings, rotations, rng, 0.18);

  // Nombre de validations effectivement remontees au systeme central.
  const syncedTarget = Math.min(
    busDay.boardings,
    Math.round(busDay.recordedRevenueFC / line.fareFC),
  );
  const unsyncedCount = Math.max(0, busDay.boardings - syncedTarget);

  // Les validations non remontees sont tirees au sort une fois pour toutes.
  const unsyncedIndexes = new Set<number>();
  const unsyncedRng = createRng(`tx-sync|${busDay.busId}|${busDay.date}`);
  let guard = 0;
  while (unsyncedIndexes.size < unsyncedCount && guard < unsyncedCount * 12 + 100) {
    unsyncedIndexes.add(unsyncedRng.int(0, busDay.boardings - 1));
    guard++;
  }

  const windowLength = (SERVICE_END_MINUTES - SERVICE_START_MINUTES) / rotations;
  const transactions: Transaction[] = [];
  let index = 0;

  for (let r = 0; r < rotations; r++) {
    const count = perRotation[r] ?? 0;
    const windowStart = SERVICE_START_MINUTES + r * windowLength;

    for (let i = 0; i < count; i++) {
      const at = windowStart + rng.range(0, windowLength * 0.92);
      const stopId = line.stopIds[rng.int(0, line.stopIds.length - 1)] ?? line.stopIds[0]!;
      const media = pickMedia(rng.next());

      transactions.push({
        id: `TX-${busDay.date.replace(/-/g, '')}-${busDay.busId.slice(-4)}-${String(index + 1).padStart(4, '0')}`,
        at: `${busDay.date}T${minutesToTime(at)}`,
        date: busDay.date,
        busId: busDay.busId,
        lineId: busDay.lineId,
        stopId,
        rotationIndex: r + 1,
        fareFC: line.fareFC,
        media,
        ...(media === 'carte'
          ? { cardRef: `TC-${String(rng.int(100_000, 999_999))}` }
          : {}),
        synced: !unsyncedIndexes.has(index),
      });
      index++;
    }
  }

  return transactions.sort((a, b) => a.at.localeCompare(b.at));
}
