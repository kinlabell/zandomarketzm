/**
 * Detection d'anomalies.
 *
 * Les anomalies ne sont pas ecrites dans le dataset : elles sont RECALCULEES
 * en appliquant les regles de controle aux faits. Changez une donnee source et
 * l'anomalie apparait ou disparait d'elle-meme.
 *
 * La fenetre de controle est fixe (30 derniers jours) et independante de la
 * periode selectionnee a l'ecran : un registre d'anomalies ne doit pas changer
 * de contenu parce qu'on a change de filtre d'affichage.
 */

import { addDays } from '../../data/seed/calendar';
import type { Dataset, IsoDate, Role } from '../../data/types';
import {
  aggregateOperations,
  aggregateTicketing,
  selectBusDays,
  selectLineDays,
} from '../aggregate';
import { fuelAnalysis } from '../fuel';
import { safeRatio } from '../metric';
import { buildPeriodRange, type PeriodRange } from '../period';
import { RULES, severityOf, type AnomalyFamily, type RuleId, type Severity } from './rules';

export interface AnomalyScope {
  lineId?: string;
  busId?: string;
  depotId?: string;
  sessionId?: string;
  /** Journee concernee lorsque l'anomalie porte sur un fait date. */
  date?: IsoDate;
  /** Discriminant complementaire, lorsqu'un meme perimetre porte plusieurs anomalies de la meme regle. */
  variant?: string;
}

export interface DetectedAnomaly {
  /** Identifiant stable : permet de suivre l'anomalie dans le workflow. */
  id: string;
  ruleId: RuleId;
  family: AnomalyFamily;
  label: string;
  severity: Severity;
  scope: AnomalyScope;
  /** Libelle du perimetre, deja formate pour l'affichage. */
  scopeLabel: string;
  detectedAt: IsoDate;
  /** Valeur constatee et valeur de reference, dans l'unite de la regle. */
  observed: number;
  reference: number;
  deviation: number;
  deviationRate: number;
  unit: '%' | 'FC' | 'u';
  /** Formulation NEUTRE. Ne designe jamais une personne ni une intention. */
  statement: string;
  suggestedCheck: string;
  owner: Role;
  /** Impact estime sur la recette ou la tresorerie (FC). Toujours « estime ». */
  estimatedImpactFC: number;
}

/** Fenetre de controle : 30 derniers jours, independante de l'affichage. */
export function controlWindow(dataset: Dataset): PeriodRange {
  return buildPeriodRange(dataset, 'mois');
}

function scopeKey(scope: AnomalyScope): string {
  const base =
    scope.sessionId ?? scope.busId ?? scope.lineId ?? scope.depotId ?? 'reseau';
  return scope.variant ? `${base}#${scope.variant}` : base;
}

export function detectAnomalies(dataset: Dataset): DetectedAnomaly[] {
  const range = controlWindow(dataset);
  const found: DetectedAnomaly[] = [];

  const push = (
    ruleId: RuleId,
    scope: AnomalyScope,
    scopeLabel: string,
    detectedAt: IsoDate,
    observed: number,
    reference: number,
    statement: string,
    estimatedImpactFC: number,
  ) => {
    const rule = RULES[ruleId];
    const severity = severityOf(rule, observed);
    if (severity === 'normal') return;
    found.push({
      id: `${ruleId}|${scopeKey(scope)}`,
      ruleId,
      family: rule.family,
      label: rule.label,
      severity,
      scope,
      scopeLabel,
      detectedAt,
      observed,
      reference,
      deviation: observed - reference,
      deviationRate: safeRatio(observed - reference, reference),
      unit: rule.unit,
      statement,
      suggestedCheck: rule.suggestedCheck,
      owner: rule.owner,
      estimatedImpactFC: Math.round(estimatedImpactFC),
    });
  };

  // --- Carburant -----------------------------------------------------------
  for (const row of fuelAnalysis(dataset, {}, range)) {
    push(
      'ECART_CARBURANT',
      { busId: row.busId, lineId: row.lineId },
      `${row.busId} — ${row.lineId}`,
      dataset.today,
      row.gapRate,
      0,
      `Dotation de carburant superieure de ${(row.gapRate * 100).toFixed(1)} % a la consommation theorique du vehicule sur les 30 derniers jours. Verification necessaire.`,
      Math.max(0, row.excessCostFC),
    );

    if (row.issuesWithoutRun > 0) {
      push(
        'INCOHERENCE_CROISEE',
        { busId: row.busId, lineId: row.lineId },
        `${row.busId} — ${row.lineId}`,
        dataset.today,
        row.issuesWithoutRun,
        0,
        `${row.issuesWithoutRun} journee(s) avec dotation de carburant enregistree sans kilometre declare. Verification necessaire.`,
        row.issuesWithoutRun * 38 * dataset.fuelUnitPriceFC,
      );
    }
  }

  // --- Lignes : collecte, validation, disponibilite, rotations -------------
  for (const line of dataset.lines) {
    const scope = { lineId: line.id };
    const label = `${line.code} — ${line.name}`;
    const operations = aggregateOperations(selectBusDays(dataset, scope, range));
    const ticketing = aggregateTicketing(selectLineDays(dataset, scope, range));

    const collectionShortfall = 1 - operations.collectionRate;
    push(
      'ECART_COLLECTE',
      scope,
      label,
      dataset.today,
      collectionShortfall,
      0,
      `${(collectionShortfall * 100).toFixed(1)} % de la recette attendue n apparait pas dans le journal des transactions. Verification necessaire.`,
      Math.abs(operations.collectionGapFC),
    );

    push(
      'RATIO_VALIDATION',
      scope,
      label,
      dataset.today,
      ticketing.validationRate,
      0.976,
      `Taux de validation de ${(ticketing.validationRate * 100).toFixed(1)} % sur les titres emis, sous la norme de 97,6 %. Verification necessaire.`,
      Math.max(0, (0.976 - ticketing.validationRate) * ticketing.expectedRevenueFC),
    );

    push(
      'DISPONIBILITE_LIGNE',
      scope,
      label,
      dataset.today,
      operations.availability,
      0.94,
      `Disponibilite de ${(operations.availability * 100).toFixed(1)} % sur la ligne, sous la norme d exploitation de 94 %.`,
      Math.max(0, (0.94 - operations.availability) * operations.busDaysScheduled) *
        safeRatio(operations.recordedRevenueFC, operations.busDaysAvailable),
    );

    push(
      'ROTATION_MANQUANTE',
      scope,
      label,
      dataset.today,
      operations.rotationRate,
      1,
      `${(operations.rotationsPlanned - operations.rotationsDone).toFixed(0)} rotations planifiees non realisees sur la periode, soit un taux de realisation de ${(operations.rotationRate * 100).toFixed(1)} %.`,
      (operations.rotationsPlanned - operations.rotationsDone) *
        safeRatio(operations.recordedRevenueFC, operations.rotationsDone),
    );
  }

  // --- Kilometrage ---------------------------------------------------------
  for (const bus of dataset.buses) {
    const rows = selectBusDays(dataset, { busId: bus.id }, range);
    const line = dataset.lines.find((l) => l.id === bus.lineId);
    if (!line || rows.length === 0) continue;

    const kmRun = rows.reduce((s, r) => s + r.kmRun, 0);
    const rotations = rows.reduce((s, r) => s + r.rotationsDone, 0);
    const theoreticalKm = rotations * line.distanceKm * 2;
    if (theoreticalKm === 0) continue;

    const deviation = Math.abs(kmRun - theoreticalKm) / theoreticalKm;
    push(
      'KM_INCOHERENT',
      { busId: bus.id, lineId: bus.lineId },
      `${bus.id} — ${line.code}`,
      dataset.today,
      deviation,
      0,
      `Ecart de ${(deviation * 100).toFixed(1)} % entre les kilometres enregistres (${kmRun.toLocaleString('fr-FR')} km) et les kilometres theoriques des rotations realisees (${Math.round(theoreticalKm).toLocaleString('fr-FR')} km). Verification necessaire.`,
      (Math.abs(kmRun - theoreticalKm) * bus.fuelNormL100 * dataset.fuelUnitPriceFC) / 100,
    );
  }

  // --- Caisse --------------------------------------------------------------
  for (const session of dataset.cashSessions) {
    if (session.date < range.from || session.date > range.to) continue;
    const gap = Math.abs(session.declaredFC - session.depositedFC);
    if (gap === 0) continue;
    push(
      'ECART_CAISSE',
      { sessionId: session.id, depotId: session.depotId, date: session.date },
      `${dataset.depots.find((d) => d.id === session.depotId)?.name ?? session.depotId} — ${session.date}`,
      session.date,
      gap,
      0,
      `Difference de ${gap.toLocaleString('fr-FR')} FC entre le montant declare et le montant depose. Justification attendue du depot.`,
      gap,
    );
  }

  // --- Pannes recurrentes --------------------------------------------------
  const recurrenceFrom = addDays(dataset.today, -59);
  for (const bus of dataset.buses) {
    const orders = dataset.maintenance.filter(
      (o) => o.busId === bus.id && o.openedAt >= recurrenceFrom,
    );
    const byFailure = new Map<string, number>();
    for (const order of orders) {
      byFailure.set(order.failure, (byFailure.get(order.failure) ?? 0) + 1);
    }
    for (const [failure, count] of byFailure) {
      const cost = orders
        .filter((o) => o.failure === failure)
        .reduce((s, o) => s + o.laborCostFC + o.partsCostFC, 0);
      push(
        'PANNE_RECURRENTE',
        { busId: bus.id, lineId: bus.lineId, variant: failure },
        `${bus.id} — ${failure}`,
        dataset.today,
        count,
        1,
        `${count} interventions de type « ${failure} » sur ce vehicule en 60 jours. Analyse technique recommandee.`,
        cost,
      );
    }
  }

  const severityWeight: Record<Severity, number> = { critique: 0, surveiller: 1, normal: 2 };
  return found.sort(
    (a, b) =>
      severityWeight[a.severity] - severityWeight[b.severity] ||
      b.estimatedImpactFC - a.estimatedImpactFC,
  );
}
