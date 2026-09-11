/**
 * Tests de la couche de calcul.
 *
 * Le test le plus important est celui de l'identite de decomposition du moteur
 * de variance : si la somme des contributions ne redonne pas exactement
 * l'ecart total, l'analyse presentee au DG est fausse.
 */

import { describe, expect, it } from 'vitest';
import { buildDataset } from '../../data/dataset';
import {
  aggregateOperations,
  aggregateTicketing,
  selectBusDays,
  selectLineDays,
} from '../aggregate';
import { buildPeriodRange, previousRange, proratedTarget } from '../period';
import { chainedSubstitution, lineVariances, varianceVsPeriod, varianceVsTarget } from '../variance';
import { reconcile, analyseGapByLine, cashControl } from '../reconciliation';
import { fuelAnalysis, fuelTotals } from '../fuel';
import { contribution, contributionByLine } from '../profitability';
import { detectAnomalies } from '../anomalies/detect';

const dataset = buildDataset('2026-09-11');
const range = buildPeriodRange(dataset, 'mois');
const previous = previousRange(range);

describe('substitutions en chaine', () => {
  it('redonne exactement l ecart entre les deux produits', () => {
    const actual: [number, number, number, number, number, number] = [
      120, 0.77, 2.4, 61, 3500, 0.984,
    ];
    const reference: [number, number, number, number, number, number] = [
      120, 0.94, 2.9, 64, 3500, 0.99,
    ];
    const contributions = chainedSubstitution(actual, reference);
    const productOf = (v: number[]) => v.reduce((a, b) => a * b, 1);
    expect(contributions.reduce((a, b) => a + b, 0)).toBeCloseTo(
      productOf(actual) - productOf(reference),
      6,
    );
  });

  it('attribue zero a un facteur identique des deux cotes', () => {
    const actual: [number, number, number, number, number, number] = [10, 1, 1, 1, 1, 1];
    const reference: [number, number, number, number, number, number] = [10, 1, 1, 1, 1, 1];
    expect(chainedSubstitution(actual, reference).every((c) => c === 0)).toBe(true);
  });
});

describe('moteur de variance', () => {
  it('boucle sans residu face a l objectif', () => {
    const bridge = varianceVsTarget(dataset, {}, range);
    expect(Math.abs(bridge.residualFC)).toBeLessThan(1);
  });

  it('boucle sans residu face a la periode precedente', () => {
    const bridge = varianceVsPeriod(dataset, {}, range, previous);
    expect(Math.abs(bridge.residualFC)).toBeLessThan(1);
  });

  it('retient l objectif au prorata de la duree de la periode', () => {
    const bridge = varianceVsTarget(dataset, { lineId: 'L07' }, range);
    const line = dataset.lines.find((l) => l.id === 'L07');
    expect(bridge.referenceFC).toBeCloseTo(
      proratedTarget(line?.monthlyTargetFC ?? 0, range),
      6,
    );
  });

  it('reconstitue le realise du perimetre', () => {
    const bridge = varianceVsTarget(dataset, { lineId: 'L07' }, range);
    const totals = aggregateOperations(selectBusDays(dataset, { lineId: 'L07' }, range));
    expect(bridge.actualFC).toBe(totals.recordedRevenueFC);
  });

  it('impute a la disponibilite l essentiel de l ecart de L07', () => {
    const bridge = varianceVsTarget(dataset, { lineId: 'L07' }, range);
    const availability = bridge.factors.find((f) => f.id === 'disponibilite');
    expect(availability).toBeDefined();
    expect(availability?.contributionFC).toBeLessThan(0);
    const worst = [...bridge.factors].sort((a, b) => a.contributionFC - b.contributionFC)[0];
    expect(worst?.id).toBe('disponibilite');
  });

  it('affiche pour chaque facteur des valeurs coherentes avec sa contribution', () => {
    // Garde-fou : les colonnes « reel » et « reference » lues a l ecran doivent
    // etre exactement celles qui produisent la contribution affichee. Sans quoi
    // un facteur pourrait montrer un ecart tout en contribuant zero.
    for (const bridge of [
      varianceVsTarget(dataset, {}, range),
      varianceVsTarget(dataset, { activity: 'urbain' }, range),
      varianceVsTarget(dataset, { lineId: 'L02' }, range),
    ]) {
      for (const factor of bridge.factors) {
        const gap = factor.actual - factor.reference;
        if (Math.abs(gap) < 1e-9) {
          expect(Math.abs(factor.contributionFC)).toBeLessThan(1);
        } else {
          expect(Math.sign(factor.contributionFC)).toBe(Math.sign(gap));
        }
      }
    }
  });

  it('classe L07 comme premiere contributrice a l ecart du reseau', () => {
    const ranking = lineVariances(dataset, range);
    expect(ranking[0]?.lineId).toBe('L07');
    expect(ranking[0]?.gapFC).toBeLessThan(0);
  });
});

describe('reconciliation', () => {
  const result = reconcile(dataset, {}, range);

  it('enchaine les niveaux de la cascade dans l ordre decroissant', () => {
    const monetary = result.levels.filter((l) => l.available && l.id !== 'comptabilisee');
    for (let i = 1; i < monetary.length; i++) {
      expect(monetary[i]?.amountFC).toBeLessThanOrEqual(monetary[i - 1]?.amountFC ?? 0);
    }
  });

  it('calcule un ecart de collecte egal a la difference des deux niveaux', () => {
    const attendu = result.levels.find((l) => l.id === 'valides');
    const enregistre = result.levels.find((l) => l.id === 'transactions');
    expect(result.collectionGapFC).toBe(
      (enregistre?.amountFC ?? 0) - (attendu?.amountFC ?? 0),
    );
    expect(result.collectionGapFC).toBeLessThan(0);
  });

  it('ventile l ecart de collecte a la ligne pres', () => {
    const contributors = analyseGapByLine(dataset, range);
    const sum = contributors.reduce((s, c) => s + c.gapFC, 0);
    expect(sum).toBeCloseTo(result.collectionGapFC, 0);
  });

  it('ne prononce pas le depot et la comptabilisation au niveau d une ligne', () => {
    const lineResult = reconcile(dataset, { lineId: 'L07' }, range);
    expect(lineResult.cashAvailable).toBe(false);
    const depose = lineResult.levels.find((l) => l.id === 'deposee');
    expect(depose?.available).toBe(false);
    expect(depose?.unavailableReason).toBeTruthy();
  });

  it('bloque la validation des sessions de caisse au-dela du seuil', () => {
    const blocked = cashControl(dataset, range).filter((row) => row.blocked);
    expect(blocked.length).toBeGreaterThan(0);
    expect(blocked.every((row) => Math.abs(row.depositGapFC) >= 200_000)).toBe(true);
  });
});

describe('carburant', () => {
  it('recalcule la consommation theorique a partir des kilometres et de la norme', () => {
    const rows = fuelAnalysis(dataset, {}, range);
    for (const row of rows.slice(0, 5)) {
      expect(row.theoreticalLitres).toBeCloseTo((row.kmRun * row.normL100) / 100, 6);
    }
  });

  it('signale TR-1842 comme ecart critique de consommation', () => {
    const row = fuelAnalysis(dataset, {}, range).find((r) => r.busId === 'TR-1842');
    expect(row).toBeDefined();
    expect(row?.status).toBe('critique');
    expect(row?.gapRate).toBeGreaterThan(0.15);
  });

  it('agrege les litres sans perte', () => {
    const rows = fuelAnalysis(dataset, {}, range);
    const totals = fuelTotals(rows);
    expect(totals.observedLitres).toBe(rows.reduce((s, r) => s + r.observedLitres, 0));
  });
});

describe('performance contributive', () => {
  it('vaut recettes moins couts directs', () => {
    const result = contribution(dataset, {}, range);
    expect(result.contributionFC).toBeCloseTo(result.revenueFC - result.costs.totalFC, 6);
  });

  it('somme les couts directs poste par poste', () => {
    const { costs } = contribution(dataset, {}, range);
    const sum =
      costs.fuelFC +
      costs.maintenanceLaborFC +
      costs.maintenancePartsFC +
      costs.personnelFC +
      costs.tollsFC +
      costs.insuranceFC +
      costs.sundriesFC;
    expect(costs.totalFC).toBeCloseTo(sum, 6);
  });

  it('produit une contribution par ligne pour les sept lignes', () => {
    expect(contributionByLine(dataset, range)).toHaveLength(7);
  });
});

describe('detection d anomalies', () => {
  const anomalies = detectAnomalies(dataset);

  it('produit un registre non vide avec des identifiants uniques', () => {
    expect(anomalies.length).toBeGreaterThan(5);
    expect(new Set(anomalies.map((a) => a.id)).size).toBe(anomalies.length);
  });

  it('detecte la disponibilite critique de L07', () => {
    const anomaly = anomalies.find(
      (a) => a.ruleId === 'DISPONIBILITE_LIGNE' && a.scope.lineId === 'L07',
    );
    expect(anomaly).toBeDefined();
    expect(anomaly?.severity).toBe('critique');
  });

  it('detecte l ecart de consommation de TR-1842', () => {
    const anomaly = anomalies.find(
      (a) => a.ruleId === 'ECART_CARBURANT' && a.scope.busId === 'TR-1842',
    );
    expect(anomaly).toBeDefined();
  });

  it('detecte l ecart de caisse scripte', () => {
    const anomaly = anomalies.find((a) => a.ruleId === 'ECART_CAISSE');
    expect(anomaly).toBeDefined();
    expect(anomaly?.estimatedImpactFC).toBeGreaterThan(0);
  });

  it('n emploie jamais de formulation accusatoire', () => {
    const forbidden = /fraud|vol|voleur|detourn|coupable|malversation|triche/i;
    for (const anomaly of anomalies) {
      expect(forbidden.test(anomaly.statement)).toBe(false);
      expect(forbidden.test(anomaly.label)).toBe(false);
    }
  });

  it('ne designe jamais un agent dans le perimetre d une anomalie', () => {
    for (const anomaly of anomalies) {
      expect(anomaly.statement).not.toMatch(/AG-\d{4}/);
    }
  });
});

describe('periodes', () => {
  it('place la periode de comparaison juste avant, avec la meme duree', () => {
    expect(previous.days).toBe(range.days);
    const gap =
      (new Date(`${range.from}T00:00:00Z`).getTime() -
        new Date(`${previous.to}T00:00:00Z`).getTime()) /
      86_400_000;
    expect(gap).toBe(1);
  });

  it('ramene l objectif mensuel au prorata de la duree', () => {
    const week = buildPeriodRange(dataset, 'semaine');
    expect(proratedTarget(30_000_000, week)).toBeCloseTo(7_000_000, 6);
  });

  it('agrege la billettique sur la periode demandee', () => {
    const totals = aggregateTicketing(selectLineDays(dataset, {}, range));
    expect(totals.titlesValidated).toBeGreaterThan(0);
    expect(totals.validationRate).toBeGreaterThan(0.9);
    expect(totals.validationRate).toBeLessThan(1);
  });
});
