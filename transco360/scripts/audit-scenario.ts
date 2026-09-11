/**
 * Lecture du scenario de demonstration dans les chiffres.
 *
 * Verifie que le recit presente au DG se lit effectivement dans les donnees
 * calculees : l'ecart, sa decomposition, la ligne concernee, les bus, la
 * reconciliation et le registre d'anomalies.
 *
 *   npx vite-node scripts/audit-scenario.ts [AAAA-MM-JJ]
 */

import { buildDataset } from '../src/data/dataset';
import { buildPeriodRange, previousRange } from '../src/engine/period';
import { lineVariances, varianceVsPeriod, varianceVsTarget } from '../src/engine/variance';
import { reconcile } from '../src/engine/reconciliation';
import { detectAnomalies } from '../src/engine/anomalies/detect';
import { fleetOverview, fleetStatusCounts, maintenanceOrders } from '../src/engine/maintenance';
import { contribution } from '../src/engine/profitability';

const ds = buildDataset(process.argv[2]);
const range = buildPeriodRange(ds, 'mois');
const previous = previousRange(range);

const m = (n: number) => `${(n / 1_000_000).toFixed(1)} M FC`;
const pct = (n: number) => `${(n * 100).toFixed(1)} %`;

console.log(`\n=== SCENARIO DE DEMONSTRATION — ${ds.today} ===`);
console.log(`Periode analysee : ${range.label} (${range.days} jours)\n`);

// --- Etape 1 : l'ecart -------------------------------------------------------
const network = varianceVsTarget(ds, {}, range);
console.log('ETAPE 1 — Le DG ouvre TRANSCO 360');
console.log(`  Realise  ${m(network.actualFC)}   Objectif ${m(network.referenceFC)}`);
console.log(`  Ecart    ${m(network.gapFC)} (${pct(network.gapRate)})\n`);

// --- Etape 2 : pourquoi ------------------------------------------------------
console.log('ETAPE 2 — Il clique sur l ecart : decomposition');
for (const factor of network.factors) {
  console.log(`  ${factor.label.padEnd(34)} ${m(factor.contributionFC).padStart(12)}   (reel ${factor.actual.toFixed(3)} / ref ${factor.reference.toFixed(3)})`);
}
console.log(`  ${'Autres activites (contractuel)'.padEnd(34)} ${m(network.otherActivitiesFC).padStart(12)}`);
console.log(`  ${'Residu de decomposition'.padEnd(34)} ${network.residualFC.toFixed(6)} FC (doit valoir 0)\n`);

// --- Etape 3 : quelle ligne --------------------------------------------------
console.log('ETAPE 3 — Quelle ligne porte l ecart ?');
for (const line of lineVariances(ds, range).slice(0, 4)) {
  console.log(`  ${line.lineCode}  ${m(line.actualFC).padStart(11)} vs ${m(line.referenceFC).padStart(11)}  ecart ${m(line.gapFC).padStart(11)} (${pct(line.gapRate)})`);
}

// --- Etape 4 : la ligne L07 --------------------------------------------------
const l07 = varianceVsTarget(ds, { lineId: 'L07' }, range);
const l07vsPrev = varianceVsPeriod(ds, { lineId: 'L07' }, range, previous);
console.log(`\nETAPE 4 — Fiche ligne L07`);
console.log(`  vs objectif        ${m(l07.gapFC)} (${pct(l07.gapRate)})`);
console.log(`  vs periode N-1     ${m(l07vsPrev.gapFC)} (${pct(l07vsPrev.gapRate)})`);
for (const factor of l07.factors) {
  if (Math.abs(factor.contributionFC) < 100_000) continue;
  console.log(`    ${factor.label.padEnd(32)} ${m(factor.contributionFC).padStart(12)}`);
}

// --- Etape 5 : la flotte -----------------------------------------------------
const fleet = fleetOverview(ds, { lineId: 'L07' }, range);
console.log(`\nETAPE 5 — Flotte de L07`);
console.log(`  statuts : ${JSON.stringify(fleetStatusCounts(fleet))}`);
for (const bus of fleet) {
  console.log(`  ${bus.busId}  ${bus.status.padEnd(12)} dispo ${pct(bus.availability).padStart(7)}  km ${bus.kmRunInPeriod.toString().padStart(6)}  recette ${m(bus.recordedRevenueFC)}`);
}

// --- Etape 6 : la maintenance ------------------------------------------------
const orders = maintenanceOrders(ds, { lineId: 'L07' }, range).filter((o) => o.open);
console.log(`\nETAPE 6 — Maintenance : ${orders.length} ordres ouverts`);
for (const order of orders) {
  console.log(`  ${order.id}  ${order.busId}  ${order.failure.padEnd(13)} ${order.immobilizationDays} j  cout ${m(order.totalCostFC)}  impact recette estime ${m(order.estimatedRevenueImpactFC)}`);
}

// --- Etape 7 : la reconciliation ---------------------------------------------
const cascade = reconcile(ds, {}, range);
console.log(`\nETAPE 7 — Reconciliation (reseau)`);
for (const level of cascade.levels) {
  if (!level.available) {
    console.log(`  ${level.label.padEnd(34)} non disponible a ce perimetre`);
    continue;
  }
  const units = level.units !== undefined ? `${level.units.toLocaleString('fr-FR')} u` : '';
  console.log(`  ${level.label.padEnd(34)} ${m(level.amountFC).padStart(12)} ${units.padStart(12)}  ecart ${m(level.gapFC).padStart(11)} (${pct(level.lossRate)})`);
}

// --- Etape 8 : les anomalies -------------------------------------------------
const anomalies = detectAnomalies(ds);
const critical = anomalies.filter((a) => a.severity === 'critique');
console.log(`\nETAPE 8 — Registre d anomalies : ${anomalies.length} (dont ${critical.length} critiques)`);
for (const anomaly of anomalies.slice(0, 12)) {
  console.log(`  [${anomaly.severity.toUpperCase().padEnd(10)}] ${anomaly.ruleId.padEnd(20)} ${anomaly.scopeLabel.padEnd(34)} impact estime ${m(anomaly.estimatedImpactFC)}`);
}

// --- Rentabilite -------------------------------------------------------------
const perf = contribution(ds, {}, range);
const perfL07 = contribution(ds, { lineId: 'L07' }, range);
console.log(`\nRENTABILITE`);
console.log(`  Reseau : recettes ${m(perf.revenueFC)} - couts ${m(perf.costs.totalFC)} = ${m(perf.contributionFC)} (${pct(perf.contributionRate)})`);
console.log(`  L07    : recettes ${m(perfL07.revenueFC)} - couts ${m(perfL07.costs.totalFC)} = ${m(perfL07.contributionFC)} (${pct(perfL07.contributionRate)})`);
console.log('');
