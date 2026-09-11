/**
 * Periodes d'analyse.
 *
 * La periode par defaut est une fenetre GLISSANTE de 30 jours, et non le mois
 * calendaire en cours : un mois en cours serait presque vide si la
 * presentation avait lieu le 2 du mois. La fenetre glissante donne un resultat
 * stable et comparable quel que soit le jour de la demonstration.
 */

import { addDays, daysBetween, longLabel, monthKey, monthLabel, shortLabel } from '../data/seed/calendar';
import type { Dataset, IsoDate } from '../data/types';

export type PeriodKey = 'jour' | 'semaine' | 'mois' | 'trimestre' | 'mois_calendaire';

export interface PeriodRange {
  key: PeriodKey;
  from: IsoDate;
  to: IsoDate;
  days: number;
  label: string;
  /** Libelle de la periode de comparaison (periode precedente de meme duree). */
  comparisonLabel: string;
}

export const PERIOD_OPTIONS: { key: PeriodKey; label: string; shortLabel: string }[] = [
  { key: 'jour', label: "Aujourd'hui", shortLabel: 'Jour' },
  { key: 'semaine', label: '7 derniers jours', shortLabel: '7 j' },
  { key: 'mois', label: '30 derniers jours', shortLabel: '30 j' },
  { key: 'trimestre', label: '90 derniers jours', shortLabel: '90 j' },
  { key: 'mois_calendaire', label: 'Mois en cours', shortLabel: 'Mois' },
];

const PERIOD_LENGTH: Record<Exclude<PeriodKey, 'mois_calendaire'>, number> = {
  jour: 1,
  semaine: 7,
  mois: 30,
  trimestre: 90,
};

export function buildPeriodRange(dataset: Dataset, key: PeriodKey): PeriodRange {
  if (key === 'mois_calendaire') {
    const from = `${monthKey(dataset.today)}-01`;
    const days = daysBetween(from, dataset.today) + 1;
    return {
      key,
      from,
      to: dataset.today,
      days,
      label: monthLabel(monthKey(dataset.today)),
      comparisonLabel: 'Mois precedent',
    };
  }

  const days = PERIOD_LENGTH[key];
  const from = addDays(dataset.today, -(days - 1));
  return {
    key,
    from,
    to: dataset.today,
    days,
    label:
      key === 'jour'
        ? longLabel(dataset.today)
        : `${shortLabel(from)} — ${shortLabel(dataset.today)}`,
    comparisonLabel: `${days} jours precedents`,
  };
}

/** Periode immediatement anterieure, de meme duree. Base des variations. */
export function previousRange(range: PeriodRange): PeriodRange {
  const to = addDays(range.from, -1);
  const from = addDays(to, -(range.days - 1));
  return {
    key: range.key,
    from,
    to,
    days: range.days,
    label: `${shortLabel(from)} — ${shortLabel(to)}`,
    comparisonLabel: range.comparisonLabel,
  };
}

export function isInRange(date: IsoDate, range: PeriodRange): boolean {
  return date >= range.from && date <= range.to;
}

/** Liste des dates de la periode, utilisee par les series temporelles. */
export function datesOf(dataset: Dataset, range: PeriodRange): IsoDate[] {
  return dataset.dates.filter((d) => isInRange(d, range));
}

/**
 * Objectif ramene a la duree de la periode.
 * Les objectifs du referentiel sont MENSUELS (base 30 jours).
 */
export function proratedTarget(monthlyTargetFC: number, range: PeriodRange): number {
  return (monthlyTargetFC * range.days) / 30;
}
