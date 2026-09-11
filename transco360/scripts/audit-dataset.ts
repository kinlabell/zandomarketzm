/**
 * Controle de coherence du dataset genere.
 *
 * Utilitaire de mise au point : imprime les volumes, les totaux et les
 * indicateurs cles du jeu de donnees fictif afin de verifier que les ordres de
 * grandeur restent credibles et que le scenario de demonstration se lit bien
 * dans les chiffres.
 *
 *   npx vite-node scripts/audit-dataset.ts [AAAA-MM-JJ]
 */

import { buildDataset } from '../src/data/dataset';
import { monthKey } from '../src/data/seed/calendar';

const today = process.argv[2];
const t0 = Date.now();
const ds = buildDataset(today);
const elapsed = Date.now() - t0;

const fc = (n: number) => new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FC';
const pct = (n: number) => (n * 100).toFixed(1) + ' %';

console.log(`\n=== DATASET TRANSCO 360 (fictif) ===`);
console.log(`Date de reference : ${ds.today}`);
console.log(`Periode           : ${ds.dates[0]} -> ${ds.dates[ds.dates.length - 1]} (${ds.dates.length} jours)`);
console.log(`Genere en         : ${elapsed} ms`);

console.log(`\n--- Volumes ---`);
console.log(`lignes ${ds.lines.length} | bus ${ds.buses.length} | agents ${ds.agents.length} | arrets ${ds.stops.length}`);
console.log(`busDays ${ds.busDays.length} | lineDays ${ds.lineDays.length} | fuel ${ds.fuel.length}`);
console.log(`maintenance ${ds.maintenance.length} | couts ${ds.costs.length} | caisses ${ds.cashSessions.length} | contrats ${ds.contractRevenues.length}`);

// --- Periode glissante de 30 jours -------------------------------------------
// C'est la periode d'analyse par defaut du prototype : elle donne un resultat
// stable quel que soit le jour de la presentation, contrairement au mois en
// cours qui serait vide le 1er du mois.
const months = [...new Set(ds.dates.map(monthKey))];
const last30 = new Set(ds.dates.slice(-30));
const prev30 = new Set(ds.dates.slice(-60, -30));
const monthDays = ds.dates.slice(-30);
const monthLineDays = ds.lineDays.filter((d) => last30.has(d.date));
const monthContracts = ds.contractRevenues.filter((d) => last30.has(d.date));

const transactionalRevenue = monthLineDays.reduce((s, d) => s + d.recordedRevenueFC, 0);
const contractualRevenue = monthContracts.reduce((s, d) => s + d.collectedFC, 0);
const expected = monthLineDays.reduce((s, d) => s + d.expectedRevenueFC, 0);

const lineTarget = ds.lines.reduce((s, l) => s + l.monthlyTargetFC, 0);
const contractTarget = ds.activities
  .filter((a) => a.revenueModel === 'contractuel')
  .reduce((s, a) => s + a.monthlyTargetFC, 0);
const totalTarget = lineTarget + contractTarget;

// L'objectif mensuel est ramene au prorata du nombre de jours de la periode.
const daysElapsed = monthDays.length;
const daysInMonth = 30;
const proratedTarget = (totalTarget * daysElapsed) / daysInMonth;

console.log(`\n--- 30 derniers jours (${monthDays[0]} -> ${ds.today}) ---`);
console.log(`Recette transactionnelle encaissee : ${fc(transactionalRevenue)}`);
console.log(`Recette contractuelle encaissee    : ${fc(contractualRevenue)}`);
console.log(`TOTAL realise                      : ${fc(transactionalRevenue + contractualRevenue)}`);
console.log(`Recette attendue (validations)     : ${fc(expected)}`);
console.log(`Objectif mensuel complet           : ${fc(totalTarget)}`);
console.log(`Objectif au prorata du mois        : ${fc(proratedTarget)}`);
console.log(`Ecart vs objectif prorata          : ${fc(transactionalRevenue + contractualRevenue - proratedTarget)} (${pct((transactionalRevenue + contractualRevenue) / proratedTarget - 1)})`);

// --- Par ligne --------------------------------------------------------------
console.log(`\n--- Par ligne : 30 derniers jours vs 30 jours precedents ---`);
console.log('ligne  realise 30j         objectif           ecart obj  var. N-1  dispo   rot.   collecte');
for (const line of ds.lines) {
  const rows = monthLineDays.filter((d) => d.lineId === line.id);
  const prevRows = ds.lineDays.filter((d) => d.lineId === line.id && prev30.has(d.date));
  const realized = rows.reduce((s, d) => s + d.recordedRevenueFC, 0);
  const previous = prevRows.reduce((s, d) => s + d.recordedRevenueFC, 0);
  const target = (line.monthlyTargetFC * daysElapsed) / daysInMonth;
  const sched = rows.reduce((s, d) => s + d.busDaysScheduled, 0);
  const avail = rows.reduce((s, d) => s + d.busDaysAvailable, 0);
  const rotP = rows.reduce((s, d) => s + d.rotationsPlanned, 0);
  const rotD = rows.reduce((s, d) => s + d.rotationsDone, 0);
  const exp = rows.reduce((s, d) => s + d.expectedRevenueFC, 0);
  console.log(
    `${line.id}   ${fc(realized).padEnd(18)} ${fc(target).padEnd(18)} ${pct(realized / target - 1).padStart(8)} ${pct(realized / previous - 1).padStart(9)}  ${pct(avail / sched).padStart(6)} ${pct(rotD / rotP).padStart(6)} ${pct(realized / exp).padStart(8)}`,
  );
}

// --- Suggestion de calibrage des objectifs ----------------------------------
// Reference = mois complet le plus ancien de la periode (regime « normal »,
// avant les evenements du scenario). L'objectif est cette reference majoree
// d'une ambition de croissance.
const reference = months[1] ?? months[0]!;
console.log(`\n--- Calibrage : recette du mois de reference ${reference} (regime normal) ---`);
for (const line of ds.lines) {
  const rows = ds.lineDays.filter((d) => d.lineId === line.id && monthKey(d.date) === reference);
  const realized = rows.reduce((s, d) => s + d.recordedRevenueFC, 0);
  console.log(`${line.id} : ${fc(realized).padEnd(18)} objectif actuel ${fc(line.monthlyTargetFC)}`);
}

// --- Comparaison mensuelle --------------------------------------------------
console.log(`\n--- Recette encaissee par mois (transactionnel) ---`);
for (const m of months) {
  const rows = ds.lineDays.filter((d) => monthKey(d.date) === m);
  const total = rows.reduce((s, d) => s + d.recordedRevenueFC, 0);
  const l07 = rows.filter((d) => d.lineId === 'L07').reduce((s, d) => s + d.recordedRevenueFC, 0);
  console.log(`${m} : total ${fc(total).padEnd(18)} dont L07 ${fc(l07)}`);
}

// --- Etat du jour -----------------------------------------------------------
const todayBusDays = ds.busDays.filter((b) => b.date === ds.today);
console.log(`\n--- Aujourd'hui (${ds.today}) ---`);
console.log(`bus programmes ${todayBusDays.length} | disponibles ${todayBusDays.filter((b) => b.available).length}`);
console.log(`recette du jour ${fc(todayBusDays.reduce((s, b) => s + b.recordedRevenueFC, 0))}`);
const openOrders = ds.maintenance.filter((o) => !o.closedAt);
console.log(`ordres de travaux ouverts : ${openOrders.length} -> ${openOrders.map((o) => `${o.busId} (${o.lineId}, ${o.immobilizationDays}j, ${o.failure})`).join(' | ')}`);

// --- Couts et contribution --------------------------------------------------
const monthCosts = ds.costs.filter((c) => last30.has(c.date));
const monthFuel = ds.fuel.filter((f) => last30.has(f.date));
const monthMaint = ds.maintenance.filter((o) => last30.has(o.openedAt));
const fuelCost = monthFuel.reduce((s, f) => s + f.litresIssued * f.unitPriceFC, 0);
const maintCost = monthMaint.reduce((s, o) => s + o.laborCostFC + o.partsCostFC, 0);
const otherCost = monthCosts.reduce((s, c) => s + c.amountFC, 0);
const totalCost = fuelCost + maintCost + otherCost;
const revenue = transactionalRevenue + contractualRevenue;
console.log(`\n--- Couts directs (30 derniers jours) ---`);
console.log(`carburant ${fc(fuelCost)} | maintenance ${fc(maintCost)} | autres directs ${fc(otherCost)}`);
console.log(`TOTAL ${fc(totalCost)} | performance contributive ${fc(revenue - totalCost)} (${pct((revenue - totalCost) / revenue)})`);

// --- Coherence --------------------------------------------------------------
console.log(`\n--- Controles de coherence ---`);
const busIds = new Set(ds.buses.map((b) => b.id));
const orphanBusDays = ds.busDays.filter((b) => !busIds.has(b.busId)).length;
const kmWhenUnavailable = ds.busDays.filter((b) => !b.available && b.kmRun > 0).length;
const revenueWhenUnavailable = ds.busDays.filter((b) => !b.available && b.recordedRevenueFC > 0).length;
const busDayTotal = ds.busDays.reduce((s, b) => s + b.recordedRevenueFC, 0);
const lineDayTotal = ds.lineDays.reduce((s, d) => s + d.recordedRevenueFC, 0);
console.log(`busDays orphelins            : ${orphanBusDays} (attendu 0)`);
console.log(`km sur bus indisponible      : ${kmWhenUnavailable} (attendu 0)`);
console.log(`recette sur bus indisponible : ${revenueWhenUnavailable} (attendu 0)`);
console.log(`somme busDays == somme lineDays : ${busDayTotal === lineDayTotal ? 'OK' : `ECART ${busDayTotal - lineDayTotal}`}`);
console.log('');
