/**
 * Personnel fictif : 12 agents identifies par un code d'anonymisation.
 *
 * AUCUN nom reel de salarie n'est utilise dans le prototype. Les anomalies et
 * la piste d'audit ne referencent que ces codes, jamais une personne.
 */

import type { Agent } from '../types';

export const AGENTS: Agent[] = [
  { code: 'AG-1042', role: 'conduite', depotId: 'DEP-01', lineIds: ['L02', 'L07'] },
  { code: 'AG-1057', role: 'conduite', depotId: 'DEP-01', lineIds: ['L03', 'L05'] },
  { code: 'AG-1063', role: 'conduite', depotId: 'DEP-02', lineIds: ['L01', 'L04'] },
  { code: 'AG-1078', role: 'conduite', depotId: 'DEP-02', lineIds: ['L01', 'L07'] },
  { code: 'AG-1087', role: 'conduite', depotId: 'DEP-03', lineIds: ['L02', 'L06'] },
  { code: 'AG-1096', role: 'recette', depotId: 'DEP-01', lineIds: ['L03', 'L05', 'L07'] },
  { code: 'AG-1108', role: 'recette', depotId: 'DEP-02', lineIds: ['L01', 'L04'] },
  { code: 'AG-1119', role: 'recette', depotId: 'DEP-03', lineIds: ['L02', 'L06'] },
  { code: 'AG-1134', role: 'controle', depotId: 'DEP-01', lineIds: ['L01', 'L02', 'L03', 'L04', 'L05', 'L06', 'L07'] },
  { code: 'AG-1147', role: 'technique', depotId: 'DEP-01', lineIds: ['L02', 'L03', 'L05', 'L07'] },
  { code: 'AG-1158', role: 'technique', depotId: 'DEP-02', lineIds: ['L01', 'L04'] },
  { code: 'AG-1166', role: 'caisse', depotId: 'DEP-03', lineIds: ['L02', 'L06'] },
];

export const AGENT_BY_CODE = new Map(AGENTS.map((a) => [a.code, a]));

export function agentsFor(role: Agent['role'], lineId?: string): Agent[] {
  return AGENTS.filter(
    (a) => a.role === role && (!lineId || a.lineIds.includes(lineId)),
  );
}

/** Un caissier par depot — utilise par le controle de caisse. */
export const CASHIER_BY_DEPOT: Record<string, string> = {
  'DEP-01': 'AG-1096',
  'DEP-02': 'AG-1108',
  'DEP-03': 'AG-1166',
};
