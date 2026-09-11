/**
 * Assemblage du dataset central.
 *
 * Point d'entree unique des donnees du prototype. Le dataset est construit une
 * seule fois au demarrage puis considere comme IMMUABLE : toute action de
 * l'utilisateur (validation voyageur, justification d'anomalie, decision)
 * est enregistree dans le journal d'evenements et superposee a la lecture.
 *
 * Toutes les donnees sont fictives.
 */

import { ACTIVITIES } from './seed/activities';
import { AGENTS } from './seed/staff';
import { DEPOTS, LINES, STOPS } from './seed/network';
import { FLEET } from './seed/fleet';
import { buildPeriod, resolveToday } from './seed/calendar';
import { generateBusDays } from './generate/operations';
import { generateCashSessions } from './generate/cash';
import { generateContractRevenues } from './generate/contracts';
import { generateCostRecords } from './generate/costs';
import { FUEL_UNIT_PRICE_FC, generateFuelRecords } from './generate/fuel';
import { generateLineDays } from './generate/revenue';
import { generateMaintenanceOrders } from './generate/maintenance';
import type { Dataset, IsoDate } from './types';

export function buildDataset(explicitToday?: IsoDate): Dataset {
  const today = resolveToday(explicitToday);
  const dates = buildPeriod(today);

  const busDays = generateBusDays(today, dates);
  const lineDays = generateLineDays(busDays, dates);
  const fuel = generateFuelRecords(busDays, today);
  const maintenance = generateMaintenanceOrders(busDays, today);
  const costs = generateCostRecords(busDays);
  const cashSessions = generateCashSessions(busDays, dates, today);
  const contractRevenues = generateContractRevenues(dates);

  return {
    today,
    dates,
    activities: ACTIVITIES,
    depots: DEPOTS,
    stops: STOPS,
    lines: LINES,
    buses: FLEET,
    agents: AGENTS,
    busDays,
    lineDays,
    fuel,
    maintenance,
    costs,
    cashSessions,
    contractRevenues,
    fuelUnitPriceFC: FUEL_UNIT_PRICE_FC,
  };
}

let cached: Dataset | null = null;

/** Dataset de la session courante. Construit une fois, reutilise ensuite. */
export function getDataset(): Dataset {
  cached ??= buildDataset();
  return cached;
}

/** Reinitialise le cache — utilise par les tests et le reset de demonstration. */
export function resetDatasetCache(): void {
  cached = null;
}
