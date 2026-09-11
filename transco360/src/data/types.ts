/**
 * Modele de donnees du prototype TRANSCO 360.
 *
 * Regle fondatrice : chaque entite n'est definie qu'a un seul endroit et les
 * liens se font par identifiant. Aucun indicateur n'est stocke ici — tout ce
 * qui est affiche est recalcule par `src/engine/` a partir de ces faits.
 *
 * Toutes les donnees sont FICTIVES.
 */

// ---------------------------------------------------------------------------
// Identifiants
// ---------------------------------------------------------------------------

export type LineId = string; // « L01 » … « L07 »
export type BusId = string; // « TR-1842 »
export type AgentCode = string; // « AG-1042 »
export type DepotId = string; // « DEP-01 »
export type StopId = string; // « ST-014 »
export type IsoDate = string; // « 2026-09-11 »
export type IsoDateTime = string; // « 2026-09-11T09:42:00 »

// ---------------------------------------------------------------------------
// Referentiels
// ---------------------------------------------------------------------------

/**
 * Niveau de fiabilite d'une donnee. Affiche a cote de chaque indicateur pour
 * repondre a la question « d'ou vient ce chiffre ? ».
 *  - automatique : enregistrement transactionnel, sans ressaisie
 *  - declaratif  : saisi ou declare par un agent ou un depot
 *  - estime      : reconstitue par un modele de calcul
 *  - a_verifier  : ecart detecte par une regle de controle
 */
export type Reliability = 'automatique' | 'declaratif' | 'estime' | 'a_verifier';

export type ActivityId =
  | 'urbain'
  | 'interurbain'
  | 'scolaire'
  | 'location'
  | 'publicite';

/** Comment l'activite produit de la recette. */
export type RevenueModel = 'transactionnel' | 'contractuel';

export interface Activity {
  id: ActivityId;
  label: string;
  shortLabel: string;
  revenueModel: RevenueModel;
  /** Objectif mensuel fixe par la direction (FC). */
  monthlyTargetFC: number;
  description: string;
}

export type NetworkKind = 'urbain' | 'interurbain';

export interface Stop {
  id: StopId;
  name: string;
  /** Coordonnees de la carte schematique (viewBox 0..1000 x 0..640). Pas du GPS. */
  x: number;
  y: number;
  isInterchange: boolean;
}

export interface Line {
  id: LineId;
  code: string; // « L07 »
  name: string; // « Kinshasa <-> Kasangulu »
  kind: NetworkKind;
  activity: Extract<ActivityId, 'urbain' | 'interurbain'>;
  /** Longueur d'un trajet simple (km). Une rotation = aller + retour. */
  distanceKm: number;
  stopIds: StopId[];
  /** Tarif unitaire de reference (FC). */
  fareFC: number;
  /** Rotations planifiees par bus disponible et par jour ouvre. */
  plannedRotationsPerBusDay: number;
  /** Validations attendues par rotation a pleine charge de reference. */
  referenceBoardingsPerRotation: number;
  /** Objectif mensuel de la ligne (FC). */
  monthlyTargetFC: number;
  colorToken: string;
}

export type BusStatus =
  | 'circulation'
  | 'disponible'
  | 'maintenance'
  | 'immobilise'
  | 'hors_service';

export interface Bus {
  id: BusId;
  lineId: LineId;
  depotId: DepotId;
  model: string;
  seats: number;
  yearInService: number;
  /** Kilometrage au compteur au premier jour de la periode. */
  odometerStartKm: number;
  /** Norme de consommation retenue pour le bus (L/100 km). */
  fuelNormL100: number;
}

export type AgentRole =
  | 'conduite'
  | 'recette'
  | 'controle'
  | 'technique'
  | 'caisse';

export interface Agent {
  /** Code d'anonymisation. Aucun nom reel n'est utilise dans le prototype. */
  code: AgentCode;
  role: AgentRole;
  depotId: DepotId;
  lineIds: LineId[];
}

export interface Depot {
  id: DepotId;
  name: string;
  zone: string;
}

// ---------------------------------------------------------------------------
// Faits quotidiens
// ---------------------------------------------------------------------------

export type UnavailabilityReason =
  | 'maintenance_preventive'
  | 'panne'
  | 'accident'
  | 'attente_pieces'
  | 'administratif';

/** Un bus, un jour. C'est la table pivot de tout le systeme. */
export interface BusDay {
  date: IsoDate;
  busId: BusId;
  lineId: LineId;
  available: boolean;
  unavailabilityReason?: UnavailabilityReason;
  rotationsPlanned: number;
  rotationsDone: number;
  kmRun: number;
  /** Validations enregistrees a bord sur la journee. */
  boardings: number;
  /** Recette attendue = validations x tarif (FC). */
  expectedRevenueFC: number;
  /** Recette effectivement remontee par la billetterie (FC). */
  recordedRevenueFC: number;
  driverCode: AgentCode;
  conductorCode: AgentCode;
}

/** Une ligne, un jour : la cascade billettique agregee. */
export interface LineDay {
  date: IsoDate;
  lineId: LineId;
  /** Titres mis a disposition par le systeme de billetterie existant. */
  titlesIssued: number;
  /** Titres effectivement valides a bord. */
  titlesValidated: number;
  /** Transactions enregistrees par le systeme. */
  transactionsCount: number;
  expectedRevenueFC: number;
  recordedRevenueFC: number;
  busDaysScheduled: number;
  busDaysAvailable: number;
  rotationsPlanned: number;
  rotationsDone: number;
  kmRun: number;
}

export interface FuelRecord {
  date: IsoDate;
  busId: BusId;
  lineId: LineId;
  /** Litres reellement dotes au bus (declaratif). */
  litresIssued: number;
  kmCovered: number;
  unitPriceFC: number;
}

export type FailureType =
  | 'moteur'
  | 'transmission'
  | 'freinage'
  | 'pneumatique'
  | 'electrique'
  | 'carrosserie'
  | 'climatisation'
  | 'revision';

export interface MaintenanceOrder {
  id: string; // « OT-2026-0148 »
  busId: BusId;
  lineId: LineId;
  type: 'preventive' | 'corrective';
  failure: FailureType;
  openedAt: IsoDate;
  closedAt?: IsoDate;
  /** Jours d'immobilisation constates (ou en cours). */
  immobilizationDays: number;
  laborCostFC: number;
  partsCostFC: number;
  technicianCode: AgentCode;
  note: string;
}

export type CostKind =
  | 'personnel'
  | 'pieces'
  | 'peages'
  | 'assurance'
  | 'autres';

export interface CostRecord {
  date: IsoDate;
  kind: CostKind;
  amountFC: number;
  lineId?: LineId;
  busId?: BusId;
  activity: ActivityId;
}

export type CashStatus = 'ouverte' | 'bloquee' | 'justifiee' | 'validee';

/** Controle de caisse : attendu -> declare -> depose -> comptabilise. */
export interface CashSession {
  id: string;
  date: IsoDate;
  depotId: DepotId;
  cashierCode: AgentCode;
  expectedFC: number;
  declaredFC: number;
  depositedFC: number;
  postedFC: number;
  status: CashStatus;
}

/** Recette des activites contractuelles (scolaire, location, publicite). */
export interface ContractRevenue {
  date: IsoDate;
  activity: Extract<ActivityId, 'scolaire' | 'location' | 'publicite'>;
  contractRef: string;
  amountFC: number;
  invoicedFC: number;
  collectedFC: number;
}

/** Transaction unitaire — generee a la demande, jamais stockee en masse. */
export interface Transaction {
  id: string;
  at: IsoDateTime;
  date: IsoDate;
  busId: BusId;
  lineId: LineId;
  stopId: StopId;
  rotationIndex: number;
  fareFC: number;
  media: 'carte' | 'ticket' | 'mobile';
  cardRef?: string;
  /** Faux si la validation n'a pas ete remontee au systeme central. */
  synced: boolean;
  /** Vrai si la transaction provient de l'application voyageur du prototype. */
  injected?: boolean;
}

// ---------------------------------------------------------------------------
// Dataset de base (immuable)
// ---------------------------------------------------------------------------

export interface Dataset {
  /** Date de reference de la demonstration (dernier jour de la periode). */
  today: IsoDate;
  /** 90 jours glissants, du plus ancien au plus recent. */
  dates: IsoDate[];
  activities: Activity[];
  depots: Depot[];
  stops: Stop[];
  lines: Line[];
  buses: Bus[];
  agents: Agent[];
  busDays: BusDay[];
  lineDays: LineDay[];
  fuel: FuelRecord[];
  maintenance: MaintenanceOrder[];
  costs: CostRecord[];
  cashSessions: CashSession[];
  contractRevenues: ContractRevenue[];
  /** Prix moyen du litre de gazole retenu pour la periode (FC). */
  fuelUnitPriceFC: number;
}

// ---------------------------------------------------------------------------
// Gouvernance
// ---------------------------------------------------------------------------

export type Role = 'DG' | 'AUDIT' | 'EXPLOITATION';

export interface RoleProfile {
  id: Role;
  /** Code affiche dans la piste d'audit — jamais un nom de personne. */
  actorCode: string;
  label: string;
  description: string;
  modules: string[];
  can: {
    justify: boolean;
    decide: boolean;
    validateCash: boolean;
    export: boolean;
  };
}
