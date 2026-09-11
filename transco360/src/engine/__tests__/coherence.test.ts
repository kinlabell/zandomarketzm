/**
 * Tests de coherence du dataset.
 *
 * Ces tests sont la garantie centrale du prototype : ils verifient qu'aucun
 * module ne peut afficher un chiffre qui contredirait un autre module.
 */

import { describe, expect, it } from 'vitest';
import { buildDataset } from '../../data/dataset';
import { generateTransactions } from '../../data/generate/transactions';
import { LINE_BY_ID } from '../../data/seed/network';

const dataset = buildDataset('2026-09-11');

describe('dataset', () => {
  it('couvre 90 jours consecutifs se terminant a la date de reference', () => {
    expect(dataset.dates).toHaveLength(90);
    expect(dataset.dates.at(-1)).toBe(dataset.today);
    for (let i = 1; i < dataset.dates.length; i++) {
      const previous = new Date(`${dataset.dates[i - 1]}T00:00:00Z`).getTime();
      const current = new Date(`${dataset.dates[i]}T00:00:00Z`).getTime();
      expect(current - previous).toBe(86_400_000);
    }
  });

  it('genere un enregistrement par bus et par jour, sans orphelin', () => {
    expect(dataset.busDays).toHaveLength(dataset.buses.length * dataset.dates.length);
    const busIds = new Set(dataset.buses.map((b) => b.id));
    expect(dataset.busDays.every((bd) => busIds.has(bd.busId))).toBe(true);
  });

  it('affecte chaque bus a une seule ligne', () => {
    for (const bus of dataset.buses) {
      const lines = new Set(
        dataset.busDays.filter((bd) => bd.busId === bus.id).map((bd) => bd.lineId),
      );
      expect(lines.size).toBe(1);
      expect([...lines][0]).toBe(bus.lineId);
    }
  });

  it("n'attribue ni kilometre ni recette a un bus indisponible", () => {
    const faulty = dataset.busDays.filter(
      (bd) => !bd.available && (bd.kmRun > 0 || bd.recordedRevenueFC > 0 || bd.rotationsDone > 0),
    );
    expect(faulty).toHaveLength(0);
  });

  it('fait correspondre exactement la somme des bus et la somme des lignes', () => {
    const byBus = dataset.busDays.reduce((s, bd) => s + bd.recordedRevenueFC, 0);
    const byLine = dataset.lineDays.reduce((s, ld) => s + ld.recordedRevenueFC, 0);
    expect(byBus).toBe(byLine);
  });

  it('valorise la recette attendue au tarif de la ligne', () => {
    for (const ld of dataset.lineDays.slice(0, 120)) {
      const fare = LINE_BY_ID.get(ld.lineId)?.fareFC ?? 0;
      expect(ld.expectedRevenueFC).toBe(ld.titlesValidated * fare);
    }
  });

  it('ne valide jamais plus de titres qu il n en a ete emis', () => {
    const faulty = dataset.lineDays.filter((ld) => ld.titlesValidated > ld.titlesIssued);
    expect(faulty).toHaveLength(0);
  });

  it('associe un ordre de travaux a chaque immobilisation en cours', () => {
    const unavailableToday = dataset.busDays.filter(
      (bd) => bd.date === dataset.today && !bd.available,
    );
    for (const bd of unavailableToday) {
      const order = dataset.maintenance.find((o) => o.busId === bd.busId && !o.closedAt);
      expect(order, `aucun ordre ouvert pour ${bd.busId}`).toBeDefined();
    }
  });

  it('aligne la duree des ordres de travaux sur les jours reellement immobilises', () => {
    for (const order of dataset.maintenance) {
      const days = dataset.busDays.filter(
        (bd) =>
          bd.busId === order.busId &&
          !bd.available &&
          bd.date >= order.openedAt &&
          bd.date <= (order.closedAt ?? dataset.today),
      ).length;
      expect(days).toBe(order.immobilizationDays);
    }
  });

  it('ne consomme du carburant que sur des jours documentes', () => {
    const busDayKeys = new Set(dataset.busDays.map((bd) => `${bd.busId}|${bd.date}`));
    const orphans = dataset.fuel.filter((f) => !busDayKeys.has(`${f.busId}|${f.date}`));
    expect(orphans).toHaveLength(0);
  });

  it('assied les sessions de caisse sur les recettes reelles du depot', () => {
    const session = dataset.cashSessions.find((c) => c.date === dataset.dates[45]);
    expect(session).toBeDefined();
    if (!session) return;
    const busesOfDepot = new Set(
      dataset.buses.filter((b) => b.depotId === session.depotId).map((b) => b.id),
    );
    const expected = dataset.busDays
      .filter((bd) => bd.date === session.date && busesOfDepot.has(bd.busId))
      .reduce((s, bd) => s + bd.recordedRevenueFC, 0);
    expect(session.expectedFC).toBe(Math.round(expected));
  });
});

describe('transactions unitaires generees a la demande', () => {
  const busDay = dataset.busDays.find(
    (bd) => bd.date === dataset.today && bd.boardings > 0,
  );

  it('produit exactement le nombre de validations de l agregat', () => {
    expect(busDay).toBeDefined();
    if (!busDay) return;
    expect(generateTransactions(busDay)).toHaveLength(busDay.boardings);
  });

  it('reproduit exactement la recette enregistree via les transactions remontees', () => {
    if (!busDay) return;
    const transactions = generateTransactions(busDay);
    const synced = transactions.filter((t) => t.synced);
    const fare = LINE_BY_ID.get(busDay.lineId)?.fareFC ?? 0;
    expect(synced.length * fare).toBe(
      Math.round(busDay.recordedRevenueFC / fare) * fare,
    );
  });

  it('est deterministe : deux appels donnent le meme resultat', () => {
    if (!busDay) return;
    expect(generateTransactions(busDay)).toEqual(generateTransactions(busDay));
  });

  it('repartit les validations sur les rotations reellement effectuees', () => {
    if (!busDay) return;
    const rotations = new Set(generateTransactions(busDay).map((t) => t.rotationIndex));
    expect(Math.max(...rotations)).toBeLessThanOrEqual(busDay.rotationsDone);
  });
});
