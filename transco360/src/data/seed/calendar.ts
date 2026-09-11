/**
 * Calendrier glissant de la demonstration.
 *
 * La periode couvre les 90 jours qui precedent la date du jour (incluse).
 * Consequence : le prototype ne « vieillit » pas entre deux presentations, et
 * les evenements du scenario sont definis en decalages relatifs (J-12, J-9…),
 * donc le recit reste identique quelle que soit la date de la demonstration.
 *
 * `?date=AAAA-MM-JJ` dans l'URL permet de figer la date pour les repetitions.
 */

import type { IsoDate } from '../types';

export const PERIOD_DAYS = 90;

export function toIsoDate(d: Date): IsoDate {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function fromIsoDate(iso: IsoDate): Date {
  return new Date(`${iso}T00:00:00Z`);
}

export function addDays(iso: IsoDate, days: number): IsoDate {
  const d = fromIsoDate(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return toIsoDate(d);
}

export function daysBetween(from: IsoDate, to: IsoDate): number {
  return Math.round(
    (fromIsoDate(to).getTime() - fromIsoDate(from).getTime()) / 86_400_000,
  );
}

/** 0 = dimanche … 6 = samedi. */
export function weekday(iso: IsoDate): number {
  return fromIsoDate(iso).getUTCDay();
}

export function isSunday(iso: IsoDate): boolean {
  return weekday(iso) === 0;
}

export function isSaturday(iso: IsoDate): boolean {
  return weekday(iso) === 6;
}

/** Mois au format « 2026-09 », cle d'agregation mensuelle. */
export function monthKey(iso: IsoDate): string {
  return iso.slice(0, 7);
}

/**
 * Resout la date de reference de la demonstration.
 * Priorite : parametre explicite > `?date=` > date du jour.
 */
export function resolveToday(explicit?: string): IsoDate {
  if (explicit && /^\d{4}-\d{2}-\d{2}$/.test(explicit)) return explicit;
  if (typeof window !== 'undefined') {
    const fromUrl = new URLSearchParams(window.location.search).get('date');
    if (fromUrl && /^\d{4}-\d{2}-\d{2}$/.test(fromUrl)) return fromUrl;
  }
  return toIsoDate(new Date());
}

/** Les 90 dates de la periode, de la plus ancienne a la plus recente. */
export function buildPeriod(today: IsoDate, days = PERIOD_DAYS): IsoDate[] {
  const start = addDays(today, -(days - 1));
  return Array.from({ length: days }, (_, i) => addDays(start, i));
}

/**
 * Intensite de service d'une journee (multiplicateur applique aux rotations et
 * a la frequentation). Kinshasa : samedi plus calme, dimanche nettement plus.
 */
export function serviceIntensity(iso: IsoDate): number {
  if (isSunday(iso)) return 0.55;
  if (isSaturday(iso)) return 0.82;
  return 1;
}

/** Libelle court « 11 sept. » pour les axes de graphiques. */
export function shortLabel(iso: IsoDate): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(fromIsoDate(iso));
}

/** Libelle long « jeudi 11 septembre 2026 ». */
export function longLabel(iso: IsoDate): string {
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(fromIsoDate(iso));
}

/** Libelle de mois « septembre 2026 ». */
export function monthLabel(key: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(fromIsoDate(`${key}-01`));
}
