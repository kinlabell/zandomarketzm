# TRANSCO 360 — Architecture technique et modèle de données

**Document d'étape 1.** Aucun écran n'est codé avant validation de ce document.
Prototype de démonstration — données fictives, non connecté aux systèmes TRANSCO.

---

## 0. Résumé des décisions

| Sujet | Décision | Raison courte |
|---|---|---|
| Stack | **Vite 8 + React 19 + TypeScript + Tailwind 4** | SPA statique, démarrage instantané, 100 % offline, aucun serveur à faire tourner pendant la présentation |
| Emplacement | Dossier `transco360/` autonome dans le dépôt | N'altère pas le starter Next.js/Firebase existant, projet isolé et évolutif |
| Graphiques | **SVG écrits à la main** (pas de librairie de charts) | Contrôle total du rendu premium, lisibilité tactile, zéro dépendance lourde, performance iPad |
| État | Contexte React + reducer + `localStorage` | Pas besoin de Redux ; l'état utile est petit (journal d'événements) |
| Données | Dataset généré par **générateur déterministe seedé**, pas de chiffres écrits en dur | Cohérence garantie entre tous les modules, recalcul réel |
| Calculs | Couche `engine/` de fonctions pures, testée (Vitest) | Logique métier séparée de l'UI, vérifiable |
| Carte | Carte schématique SVG de Kinshasa dessinée à la main | Aucune API externe, fonctionne offline |
| PWA | Manifest + service worker de précache + icônes iOS | Installable sur l'écran d'accueil de l'iPad, plein écran, offline |
| Cible d'affichage | iPad paysage (1180 pt) prioritaire, iPad portrait (820 pt) traité, desktop bonus | C'est le support réel de la présentation |

---

## 1. Choix de la stack — justification

La consigne autorisait Next.js **ou** Vite. Je recommande **Vite**.

**Pourquoi pas Next.js ici :**
- Next.js apporte SSR, routage serveur, API routes, middleware — aucun de ces éléments n'a d'utilité : il n'y a pas de backend, pas de base de données, pas d'authentification réelle.
- Un `next start` impose un process Node pendant la démonstration. Sur iPad, il faudrait un serveur distant, donc une connexion Internet — exactement le risque à éliminer (§30 du cahier des charges).
- Le `next export` statique fonctionne, mais on paie la complexité de Next sans en tirer bénéfice.

**Pourquoi Vite :**
- Build = un dossier statique. On peut l'ouvrir depuis n'importe quel hébergement statique, l'installer en PWA sur l'iPad, puis **couper le Wi-Fi** : tout continue de fonctionner.
- Démarrage dev < 1 s, rechargement instantané pendant la phase de construction.
- Aucune dépendance serveur = aucune panne possible en salle de réunion.

**Dépendances retenues (volontairement minimales) :**

| Paquet | Rôle | Justification |
|---|---|---|
| `react`, `react-dom` | UI | — |
| `react-router-dom` | Routage, deep-linking | Le mode démo pilote la navigation par URL (robustesse) |
| `tailwindcss` | Design system utilitaire | Vitesse + cohérence |
| `typescript` | Typage du modèle de données | Garantit la cohérence des entités |
| `vitest` | Tests des calculs | Exigence §40/§41 : logique métier testable |
| `vite-plugin-pwa` | Manifest + service worker | PWA sans écrire le SW à la main |

**Refusé volontairement :** Recharts / Chart.js / D3 (poids, rendu générique « dashboard IA », maîtrise limitée du tactile), Framer Motion (animations CSS suffisent), date-fns/dayjs (formatage `Intl` natif suffit en FR), toute librairie de cartographie.

Le dépôt actuel (`nextjs-13-firebase-starter`) n'est pas touché : le prototype vit dans `transco360/`, ce qui le rend extractible tel quel vers son propre dépôt le jour où le projet est retenu.

---

## 2. Arborescence du projet

```
transco360/
├── docs/
│   ├── 00-ARCHITECTURE.md          ← ce document
│   ├── 01-DATASET.md               ← dictionnaire de données (phase B)
│   └── 02-SCENARIO-DEMO.md         ← script de présentation (phase F)
├── public/
│   ├── manifest.webmanifest
│   ├── icons/                      (192, 512, apple-touch-icon)
│   └── brand/transco-mark.svg
├── index.html
├── src/
│   ├── main.tsx
│   ├── App.tsx                     ← routeur + providers
│   │
│   ├── data/                       ← DONNÉES (aucun JSX ici)
│   │   ├── seed/
│   │   │   ├── rng.ts              générateur pseudo-aléatoire déterministe (mulberry32)
│   │   │   ├── calendar.ts         calendrier glissant 90 jours, jours ouvrés/fériés
│   │   │   ├── network.ts          7 lignes, arrêts, tarifs, objectifs
│   │   │   ├── fleet.ts            24 bus
│   │   │   ├── staff.ts            12 agents codifiés
│   │   │   ├── activities.ts       5 activités
│   │   │   └── script.ts           événements scriptés du scénario (incident L07…)
│   │   ├── generate/
│   │   │   ├── operations.ts       bus-jour : disponibilité, rotations, km
│   │   │   ├── revenue.ts          titres émis/validés, transactions agrégées
│   │   │   ├── fuel.ts             dotations carburant
│   │   │   ├── maintenance.ts      ordres de travaux
│   │   │   ├── costs.ts            personnel, pièces, autres coûts directs
│   │   │   ├── cash.ts             sessions de caisse
│   │   │   └── transactions.ts     transactions unitaires à la demande (lazy)
│   │   ├── dataset.ts              assemblage + gel du dataset de base
│   │   └── types.ts                toutes les interfaces du modèle
│   │
│   ├── engine/                     ← CALCULS (fonctions pures, testées)
│   │   ├── metric.ts               type Metric<T> + traçabilité de source
│   │   ├── aggregate.ts            agrégations par période / activité / ligne / bus
│   │   ├── revenue.ts              recette théorique, encaissée, écarts
│   │   ├── variance.ts             MOTEUR DE VARIANCE (substitutions en chaîne)
│   │   ├── availability.ts         disponibilité flotte
│   │   ├── fuel.ts                 consommation théorique vs observée
│   │   ├── maintenance.ts          immobilisations, coûts, impact recettes
│   │   ├── profitability.ts        performance contributive
│   │   ├── reconciliation.ts       cascade émis → comptabilisé
│   │   ├── anomalies/
│   │   │   ├── rules.ts            règles de détection paramétrées
│   │   │   └── detect.ts           exécution des règles sur le dataset
│   │   ├── compare.ts              comparateur périodes/lignes/bus/activités
│   │   └── __tests__/              tests Vitest des calculs
│   │
│   ├── store/                      ← ÉTAT DE SESSION
│   │   ├── LedgerContext.tsx       journal d'événements (transactions injectées, décisions…)
│   │   ├── SessionContext.tsx      rôle actif, période sélectionnée, contexte de drill
│   │   ├── DemoContext.tsx         mode démo guidé
│   │   ├── persistence.ts          localStorage + reset démo
│   │   └── selectors.ts            dataset de base + journal → vue courante (mémoïsée)
│   │
│   ├── design/                     ← DESIGN SYSTEM
│   │   ├── tokens.css              couleurs, espacements, typographie, rayons
│   │   ├── primitives/             Button, Card, Tabs, Sheet, Table, Badge, Drawer…
│   │   ├── charts/                 BarChart, LineChart, Waterfall, Donut, Sparkline, Gauge (SVG)
│   │   └── patterns/               KpiCard, DrillRow, SourceBadge, StatusPill, EmptyState
│   │
│   ├── features/
│   │   ├── control-tower/          TRANSCO 360 — 13 modules
│   │   │   ├── 01-overview/
│   │   │   ├── 02-revenue/
│   │   │   ├── 03-reconciliation/
│   │   │   ├── 04-controls/        anomalies + workflow de justification
│   │   │   ├── 05-operations/      exploitation & coûts
│   │   │   ├── 06-fleet/
│   │   │   ├── 07-maintenance/
│   │   │   ├── 08-fuel/
│   │   │   ├── 09-profitability/
│   │   │   ├── 10-compare/
│   │   │   ├── 11-reports/
│   │   │   ├── 12-audit-trail/
│   │   │   └── 13-sources/
│   │   ├── public-app/             application voyageur (11 écrans)
│   │   ├── demo-mode/              pilote du scénario guidé
│   │   └── shell/                  lanceur, sélecteur de rôle, bandeau démo
│   │
│   ├── lib/
│   │   ├── format.ts               FC, %, km, litres, dates (fr-CD)
│   │   ├── rbac.ts                 rôles et permissions
│   │   └── ids.ts                  identifiants lisibles
│   └── styles/index.css
├── tailwind.config.ts
├── vite.config.ts
└── README.md
```

Règle d'architecture : **`data/` ne connaît pas `engine/`, `engine/` ne connaît pas React, `features/` ne calcule rien.** Toute valeur affichée provient d'une fonction de `engine/`.

---

## 3. Modèle de données

### 3.1 Entités de référence (le socle immuable)

```ts
type ActivityId = 'urbain' | 'interurbain' | 'scolaire' | 'location' | 'publicite';
type Reliability = 'automatique' | 'declaratif' | 'estime' | 'a_verifier';

interface Line {
  id: 'L01'|'L02'|…|'L07';
  name: string;                  // « Gare Centrale ↔ UPN »
  activity: 'urbain' | 'interurbain';
  distanceKm: number;
  stopIds: string[];
  fareFC: number;                // tarif unitaire
  plannedRotationsPerBusDay: number;
  assignedBusIds: string[];      // ← relation forte, source de toute cohérence
  monthlyTargetFC: number;
}

interface Stop { id: string; name: string; x: number; y: number; lineIds: string[]; }
// x/y = coordonnées de la carte schématique (viewBox SVG), pas des coordonnées GPS

interface Bus {
  id: 'TR-1842' | …;             // 24 bus
  lineId: Line['id'];
  model: string; seats: number; yearInService: number;
  odometerKm: number;
  fuelNormL100: number;          // norme constructeur ajustée au profil de ligne
  status: 'circulation'|'disponible'|'maintenance'|'immobilise'|'hors_service';
  depotId: string;
}

interface Agent {                // 12 agents — AUCUN nom réel
  code: 'AG-1042' | …;
  role: 'conduite'|'recette'|'controle'|'technique'|'caisse';
  depotId: string;
  lineIds: string[];
}

interface Depot { id: 'DEP-KIN-01'|…; name: string; busIds: string[]; }

interface Activity { id: ActivityId; label: string; revenueModel: 'transactionnel'|'contractuel'; monthlyTargetFC: number; }
```

### 3.2 Faits quotidiens (90 jours glissants × entités)

```ts
interface BusDay {                       // 24 bus × 90 jours = 2 160 lignes
  date: string; busId: string; lineId: string;
  available: boolean;
  unavailabilityReason?: 'maintenance_preventive'|'panne'|'accident'|'pieces'|'administratif';
  rotationsPlanned: number; rotationsDone: number;
  kmRun: number;
  driverCode: string; conductorCode: string;
}

interface LineDay {                      // 7 × 90 = 630 lignes
  date: string; lineId: string;
  titlesIssued: number;                  // titres émis (billetterie existante)
  titlesValidated: number;               // titres validés à bord
  transactionsCount: number;             // transactions enregistrées par le système
  expectedRevenueFC: number;             // validations × tarif
  recordedRevenueFC: number;             // remonté par la billetterie
}

interface FuelRecord { date; busId; litresIssued; kmCovered; unitPriceFC; }
interface MaintenanceOrder {
  id; busId; type: 'preventive'|'corrective'; failure: FailureType;
  openedAt; closedAt?; immobilizationDays; laborCostFC; partsCostFC; technicianCode;
}
interface CostRecord { date; scope: {lineId?; busId?; activity?}; kind: 'personnel'|'pieces'|'peages'|'assurance'|'autres'; amountFC; }
interface CashSession {                  // contrôle caisse, par dépôt et par jour
  date; depotId; cashierCode;
  expectedFC; declaredFC; depositedFC; postedFC;  // attendu / déclaré / déposé / comptabilisé
  status: 'ouverte'|'bloquee'|'justifiee'|'validee';
}
interface ContractRevenue { date; activity: 'scolaire'|'location'|'publicite'; contractRef; amountFC; }
```

### 3.3 Entités dérivées (jamais écrites en dur — produites par `engine/`)

```ts
interface Anomaly {
  id; detectedAt; rule: RuleId; severity: 'normal'|'surveiller'|'critique';
  scope: { lineId?; busId?; depotId?; agentCode?; date };
  observed: number; expected: number; deviation: number; deviationPct: number;
  statement: string;                     // formulation neutre, jamais accusatoire
  status: 'detectee'|'a_verifier'|'en_analyse'|'justifiee'|'validee'|'rejetee'|'action_corrective'|'cloturee';
  assignedRole: Role;
  estimatedImpactFC: number;
}

interface AuditEvent {                   // journal append-only
  id; at: ISO; actorRole: Role; actorCode: string;   // « EXP-003 », jamais un nom
  action: 'detection'|'consultation'|'transmission'|'justification'|'decision'|'cloture'|'injection'|'export';
  targetType; targetId; note?; decision?: 'validee'|'rejetee';
}
```

### 3.4 Enveloppe de fiabilité — la réponse à « d'où vient ce chiffre ? »

Chaque indicateur affiché n'est pas un `number` mais un objet traçable :

```ts
interface Metric {
  value: number;
  unit: 'FC'|'%'|'km'|'L'|'u';
  reliability: Reliability;              // 🟢 automatique 🟡 déclaratif 🔵 estimé 🔴 à vérifier
  source: string;                        // « Validations embarquées (simulées) »
  formula: string;                       // « Σ(validations) × tarif ligne »
  inputs: { label: string; value: string }[];   // les nombres réellement utilisés
  computedAt: string;                    // horodatage
}
```

Chaque KPI porte une pastille cliquable ouvrant un panneau qui affiche formule, entrées et horodatage. C'est le point qui distingue ce prototype d'une maquette : **on peut ouvrir n'importe quel chiffre et voir d'où il sort.**

### 3.5 Relations entre entités

```
Depot ──< Bus ──< BusDay >── Calendar(90j)
  │        │        │
  │        │        ├──< FuelRecord
  │        │        └──< MaintenanceOrder
  │        └── lineId ──> Line ──< Stop
  │                        │
  │                        └──< LineDay ──< Transaction (générée à la demande)
  ├──< Agent
  └──< CashSession

Activity ──< Line (urbain/interurbain)
Activity ──< ContractRevenue (scolaire/location/publicité)

[Toutes les tables de faits] ──> engine/anomalies ──> Anomaly ──> AuditEvent
```

**Invariant fondateur :** un bus n'existe qu'à un seul endroit (`fleet.ts`) et son `lineId` est l'unique lien. Si `TR-1842` est immobilisé, il l'est dans la flotte, ses `BusDay` passent à `available: false`, ses rotations tombent à 0, son `kmRun` à 0, donc sa consommation carburant disparaît, la recette de L07 baisse, la disponibilité de L07 baisse, l'écart budgétaire de L07 se creuse, et le moteur de variance impute cet écart au facteur « disponibilité ». **Rien de tout cela n'est écrit à la main.**

---

## 4. Volumétrie et stratégie de génération

| Table | Volume | Stratégie |
|---|---|---|
| Référentiels | ~60 objets | En dur, écrits à la main (lignes, bus, agents) |
| `BusDay` | 2 160 | Généré au chargement (< 20 ms) |
| `LineDay` | 630 | Généré au chargement |
| `FuelRecord` | ~1 900 | Généré au chargement |
| `MaintenanceOrder` | ~70 | Généré au chargement |
| `CashSession` | ~270 | Généré au chargement |
| **Transactions unitaires** | ~580 000 si tout généré | **Générées à la demande** |

**Problème :** le drill-down doit descendre jusqu'à la transaction, mais matérialiser 580 000 lignes tuerait l'iPad.

**Solution :** générateur déterministe seedé par `hash(busId + date)`. Les agrégats de `LineDay` sont calculés analytiquement ; les transactions unitaires d'un couple (bus, jour) — environ 200 à 400 lignes — ne sont produites que lorsque l'utilisateur ouvre ce niveau, et elles somment **exactement** à l'agrégat correspondant (le générateur répartit un total connu). Le drill-down va donc jusqu'au bout sans coût mémoire.

**Calendrier glissant :** la période couvre les 90 jours précédant la date réelle du jour. Les événements du scénario (immobilisation des bus de L07, écart de caisse, dérive carburant) sont définis en **décalages relatifs** (J-12, J-9, J-3…), donc l'histoire racontée reste identique quelle que soit la date de la présentation, et les chiffres ne « périment » jamais. Une variable `?date=` permet de figer une date pour les répétitions.

---

## 5. Calculs nécessaires

### 5.1 Chaîne de base

```
Recette attendue      = Σ validations × tarif de la ligne
Écart de collecte     = recette enregistrée − recette attendue
Taux de collecte      = recette enregistrée / recette attendue
Disponibilité         = bus·jours disponibles / bus·jours théoriques
Taux de rotation      = rotations réalisées / rotations planifiées
Fréquentation moyenne = validations / rotation réalisée
Conso. théorique (L)  = km parcourus × norme L/100 / 100
Écart carburant       = (litres dotés − conso. théorique) / conso. théorique
Coût carburant        = litres × prix unitaire
Coût maintenance      = (main-d'œuvre + pièces) imputé au bus, étalé sur la période
Coûts directs         = carburant + maintenance + pièces + personnel affecté + autres
Performance contributive = recettes − coûts directs      ← JAMAIS « bénéfice net »
Marge contributive %  = performance contributive / recettes
Impact immobilisation = jours immobilisés × recette moyenne journalière du bus (🔵 estimé)
Variation             = (période N − période N-1) / période N-1
Atteinte d'objectif   = réalisé / objectif
```

### 5.2 Moteur de variance — méthode

La recette d'une ligne se décompose en une identité multiplicative :

```
R = J × B × D × Rot × Ch × T × C

J   = nombre de jours de la période
B   = nombre de bus affectés à la ligne
D   = taux de disponibilité
Rot = rotations par bus·jour disponible
Ch   = validations par rotation (fréquentation)
T   = tarif moyen encaissé par validation
C   = taux de collecte (recette enregistrée / recette attendue)
```

L'écart entre réalisé et objectif est décomposé par **substitutions en chaîne** (méthode classique du contrôle de gestion) :

```
Contribution du facteur i = (∏ facteurs réels avant i) × (réel_i − objectif_i) × (∏ facteurs objectifs après i)
```

Propriété : la somme des contributions est **exactement** égale à l'écart total — il n'y a pas de résidu inventé. Le poste « Autres » n'apparaît que pour agréger les activités non transactionnelles (scolaire, location, publicité), ce qui est honnête.

Restitution à l'écran (exemple de forme, valeurs produites par le calcul) :

```
Écart total                    −33,8 M FC
├─ Disponibilité de la flotte   −9,8 M FC   ← 3 bus immobilisés sur L07
├─ Rotations                    −8,4 M FC
├─ Fréquentation                −7,2 M FC
├─ Tarif moyen / mix             −5,1 M FC
├─ Taux de collecte              −3,3 M FC   ← renvoie vers Réconciliation
└─ Autres activités                 …
```

**Honnêteté méthodologique affichée dans l'interface :** « Moteur analytique de démonstration — décomposition par substitutions en chaîne. L'ordre des facteurs influence l'allocation. Ce n'est pas un modèle économétrique. »

### 5.3 Cascade de réconciliation

```
Titres émis → Titres validés → Transactions → Recette attendue
 → Recette encaissée → Recette déposée → Recette comptabilisée
```

Six écarts calculés, chacun avec son taux de déperdition, son niveau de fiabilité et un bouton **ANALYSER L'ÉCART** qui ouvre la ventilation par ligne / dépôt / jour et propose la création d'une anomalie.

### 5.4 Règles de détection d'anomalies (paramétrées, pas codées en dur)

| Règle | Test | Seuil surveiller / critique |
|---|---|---|
| `ECART_CARBURANT` | conso observée vs théorique | +12 % / +20 % |
| `ECART_COLLECTE` | recette enregistrée vs attendue | −2 % / −5 % |
| `ECART_CAISSE` | déposé vs déclaré | 50 000 / 200 000 FC |
| `RATIO_VALIDATION` | validés / émis | < 97 % / < 94 % |
| `KM_INCOHERENT` | km déclarés vs rotations × distance ligne | ±10 % / ±18 % |
| `DISPONIBILITE_LIGNE` | disponibilité de la ligne | < 85 % / < 78 % |
| `PANNE_RECURRENTE` | même type de panne sur un bus | 3 / 5 en 60 j |
| `ROTATION_MANQUANTE` | rotations réalisées vs planifiées | < 90 % / < 80 % |
| `INCOHERENCE_CROISEE` | carburant consommé sans km parcourus | présence |

Chaque anomalie est formulée de façon neutre : **« Écart de consommation nécessitant vérification »**, jamais une imputation à une personne. Un bandeau permanent rappelle : *la décision appartient à l'humain*.

---

## 6. Liste des écrans

### TRANSCO 360 (poste de pilotage) — 13 modules

| # | Écran | Contenu clé | Rôles |
|---|---|---|---|
| 01 | Executive Overview | Recettes jour/mois, objectif, écart, évolution, bus en circulation, disponibilité, alertes critiques, performance par activité, top lignes, lignes en difficulté | DG, AUDIT, EXP |
| 02 | Recettes | Séries temporelles, ventilation activité → ligne → bus → transaction, moteur de variance | DG, AUDIT |
| 03 | Réconciliation | Cascade en 7 niveaux + analyse d'écart + contrôle caisse | DG, AUDIT |
| 04 | Contrôle & anomalies | Liste filtrable, fiche anomalie, workflow de justification | DG, AUDIT |
| 05 | Exploitation & coûts | Rotations, km, coûts directs par ligne et par activité | DG, EXP |
| 06 | Flotte | Vue globale par statut + fiche bus complète | DG, EXP |
| 07 | Maintenance | Immobilisations, durées, coûts, typologie de pannes, préventif/correctif | DG, EXP |
| 08 | Carburant | Théorique vs observé, litres, km, coût, écart, tendance | DG, EXP |
| 09 | Rentabilité | Performance contributive par ligne / bus / activité | DG |
| 10 | Comparateur | Période × ligne × bus × activité, côte à côte | DG, AUDIT, EXP |
| 11 | Rapports | Synthèses préformatées, export (impression / JSON local) | DG, AUDIT |
| 12 | Piste d'audit | Journal horodaté qui / quoi / quand / pourquoi / décision | DG, AUDIT |
| 13 | Sources & fiabilité | Inventaire des indicateurs, provenance, niveau de fiabilité, fraîcheur | DG, AUDIT |

Écrans transverses : **lanceur** (choix 360 / application publique), **sélecteur de rôle**, **panneau « d'où vient ce chiffre ? »**, **overlay mode démo**, **réinitialisation de la démonstration**.

### Application publique (voyageur) — 11 écrans

Accueil · Recherche de trajet · Résultats · Fiche ligne · Carte schématique · Ma carte de transport · Recharge simulée · Historique · Notifications · Réclamation · Compte.

Pas de tunnel d'achat. L'écran « Ma carte » porte l'action **« Valider un trajet »** — le pont vers TRANSCO 360.

---

## 7. Navigation et drill-down

### 7.1 Routage

```
/                                  Lanceur
/360/overview                      Module 01
/360/revenue?activity=&line=&bus=&period=  Module 02 (état de drill dans l'URL)
/360/reconciliation
/360/controls            /360/controls/:anomalyId
/360/operations
/360/fleet               /360/fleet/:busId
/360/maintenance         /360/maintenance/:orderId
/360/fuel
/360/profitability
/360/compare
/360/reports
/360/audit
/360/sources
/app/…                             11 écrans voyageur
```

**Tout l'état de navigation est dans l'URL.** Conséquences : chaque étape du mode démo est une simple URL (donc infalsifiable et rejouable), un rafraîchissement accidentel pendant la présentation ne perd rien, et le retour arrière du navigateur fonctionne naturellement.

### 7.2 Chaîne de drill-down (exigence §12)

```
Overview  ─clic sur l'écart→  Recettes (variance décomposée)
          ─clic sur un facteur→  Activité  →  Ligne (L07)
          →  Bus de la ligne  →  Bus immobilisés
          →  Fiche bus  →  Historique maintenance  →  Ordre de travaux
          →  Coût d'immobilisation  →  Impact estimé sur les recettes
          →  Transactions du jour  →  Anomalie  →  Justification  →  Décision  →  Piste d'audit
```

Mécanisme : un composant `DrillRow` unique, réutilisé partout, qui affiche une valeur + son delta + un chevron, et qui connaît sa cible. Un fil d'Ariane persistant en haut de page (`Recettes › Urbain › L07 › TR-1842 › 11/09`) permet de remonter d'un doigt — essentiel au tactile.

---

## 8. Scénario de démonstration

11 étapes, pilotées par URL, chacune avec un titre court, une narration d'une ligne et une zone mise en évidence.

| Étape | Écran | Ce que le DG voit | Ce que ça démontre |
|---|---|---|---|
| 1 | Overview | Recettes du mois **−7,8 %** vs objectif | Combien ? |
| 2 | Recettes → variance | Décomposition de l'écart en 6 facteurs | Pourquoi ? |
| 3 | Recettes → ligne | **L07 : −14 %**, principal contributeur | Où ? |
| 4 | Fiche ligne L07 | Rotations −9 %, disponibilité 75 %, recettes −14 % | Cohérence |
| 5 | Flotte (filtre L07) | **3 bus immobilisés** | Cause physique |
| 6 | Maintenance | Type de panne, durée, coût, impact estimé sur les recettes | Coût de l'immobilisation |
| 7 | Réconciliation | Cascade + écart de 261 500 FC | Où est le risque ? |
| 8 | Anomalie | « Anomalie nécessitant vérification » + workflow | Contrôle |
| 9 | Piste d'audit | Détection → consultation → justification → décision | Traçabilité |
| 10 | Application publique | Le voyageur valide un trajet | L'origine de la donnée |
| 11 | Retour Overview | Transaction visible : recette, cascade et KPI recalculés | Voyageur → donnée → pilotage |

**Mode démo guidé :** bouton flottant, bandeau « Étape 3/11 — Identifier la ligne concernée », boutons **Retour / Passer / Quitter**, reprise possible après rafraîchissement (étape stockée). Objectif : la présentation tient même sous stress, même si on se perd dans les clics.

---

## 9. Le pont Application publique → TRANSCO 360

C'est le moment clé de la démonstration, et il doit être **réel**, pas scénarisé.

```
Écran « Ma carte » → bouton « Valider un trajet »
   ↓  choix ligne (L07 par défaut) + bus + arrêt
   ↓  débit du solde de la carte (simulé)
LEDGER : un événement { type:'validation', lineId, busId, fareFC, at } est ajouté au journal
   ↓  persisté en localStorage
SELECTORS : dataset de base + journal → LineDay du jour recalculé
   ↓
TRANSCO 360 :
   • Overview        → recettes du jour +tarif, compteur de transactions +1
   • Réconciliation  → +1 titre validé, +1 transaction, écart recalculé
   • Recettes        → la ligne L07 bouge, la variance est recalculée
   • Fiche bus       → la transaction apparaît dans la liste unitaire
   • Piste d'audit   → un événement « injection » horodaté est journalisé
```

**Architecture retenue : dataset immuable + journal d'événements superposé.** Le dataset de base n'est jamais muté. Tout ce que fait l'utilisateur (validation voyageur, changement de statut d'anomalie, justification, décision, validation de caisse) devient un événement dans un journal. La vue affichée est `réduire(dataset, journal)`. Trois bénéfices : la piste d'audit tombe gratuitement (le journal *est* l'audit trail), le bouton « Réinitialiser la démonstration » vide simplement le journal, et il est impossible de corrompre les données de référence.

Pour rendre l'effet visible en salle : les KPI impactés s'animent brièvement et affichent « mis à jour à l'instant », et un bandeau « 1 transaction injectée depuis l'application voyageur » apparaît, cliquable jusqu'à la transaction.

---

## 10. Rôles et gouvernance

| Rôle | Code affiché | Accès | Capacités |
|---|---|---|---|
| Direction générale | `DG-001` | Les 13 modules | Consulter, comparer, exporter, décider |
| Audit & contrôle | `AUD-002` | Overview, Recettes, Réconciliation, Anomalies, Audit, Sources | Instruire, demander justification, valider/rejeter |
| Exploitation | `EXP-003` | Overview, Exploitation, Flotte, Maintenance, Carburant | Fournir justification, déclarer une action corrective |

Principes appliqués dans le code : matrice de permissions déclarative (`lib/rbac.ts`), modules masqués **et** routes gardées, aucune capacité d'édition des données de référence depuis l'UI, journalisation systématique de toute action, identités affichées sous forme de codes (jamais de noms), séparation des pouvoirs (celui qui justifie n'est pas celui qui valide).

---

## 11. Stratégie responsive iPad

**Cibles réelles en points CSS :** iPad 11" A16 — portrait **820 × 1180**, paysage **1180 × 820**. Le paysage n'est donc *pas* un écran large : une sidebar de 260 px y coûterait 22 % de la surface utile.

| Breakpoint | Contexte | Traitement TRANSCO 360 |
|---|---|---|
| < 768 | Téléphone | Application publique uniquement ; 360 en mode consultation simplifiée |
| 768 – 1024 | **iPad portrait** | Rail d'icônes 76 px, grille KPI 2 colonnes, graphiques pleine largeur empilés, tableaux en cartes empilées |
| 1024 – 1366 | **iPad paysage** (cible principale) | Rail 76 px extensible en overlay, grille KPI 4 colonnes, graphique principal + panneau latéral de drill, tableaux 5–6 colonnes visibles |
| > 1366 | Desktop | Sidebar déployée 240 px, grille 12 colonnes, panneau de drill persistant |

**Règles tactiles :**
- Toute cible interactive ≥ 44 × 44 pt, espacement minimal 8 pt entre cibles.
- Aucune information accessible uniquement au survol : le tooltip de fiabilité s'ouvre au **tap** dans un panneau, pas au hover.
- Le drill-down s'ouvre dans un **panneau latéral (paysage)** ou une **feuille glissante par le bas (portrait)**, jamais une modale centrée qui casse le fil de lecture.
- Défilement horizontal de tableau uniquement en dernier recours, avec colonne d'identité figée et indicateur d'ombre.
- `touch-action: manipulation` pour supprimer le délai de double-tap, inertie de scroll native préservée.
- Graphiques dimensionnés en `viewBox` SVG : nets sur écran Retina, sans image bitmap.
- Respect des `safe-area-inset` en mode plein écran installé.
- Orientation : aucun verrouillage, la bascule portrait/paysage recompose la grille sans rechargement.

Le mode démo affiche aussi une aide au geste (« touchez l'écart pour l'analyser ») pour que la présentation reste fluide même avec un doigt tremblant.

---

## 12. Stratégie offline

- **Aucun appel réseau au runtime.** Pas d'API, pas de CDN, pas de police Google, pas de tuiles cartographiques, pas d'image distante.
- Le dataset est **généré en mémoire au démarrage** à partir du code, donc rien à télécharger.
- Typographie : pile système (`-apple-system` / `SF Pro` sur iPad) — rendu natif, poids zéro. Si une police de marque est requise, elle sera auto-hébergée en WOFF2 sous-ensemblé.
- Visuels : uniquement du SVG écrit à la main (marque, icônes, carte, graphiques).
- L'état de session (journal d'événements, rôle, progression de la démo) est dans `localStorage` : couper le Wi-Fi ou fermer l'onglet ne perd rien.
- Test de recette explicite : installer la PWA, activer le mode Avion, dérouler le scénario complet.

## 13. Stratégie PWA

- `manifest.webmanifest` : nom « TRANSCO 360 », `display: standalone`, orientation `any`, couleurs de thème, icônes 192/512 + maskable.
- Balises iOS : `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`, `apple-touch-icon` 180 px, écrans de démarrage aux dimensions iPad.
- Service worker (via `vite-plugin-pwa`, stratégie *precache + cache-first*) : toute l'application est mise en cache à la première visite ; les mises à jour sont prises automatiquement au rechargement suivant.
- Résultat visé : depuis l'écran d'accueil de l'iPad, l'icône TRANSCO ouvre l'application en plein écran, sans barre d'adresse, instantanément, sans connexion.
- Repli : si la PWA pose problème le jour J, l'application reste un site statique ordinaire, et un build local peut être servi depuis un simple dossier.

---

## 14. Identité visuelle

- Charte sobre et institutionnelle, construite sur des **jetons de design** (`tokens.css`) pour pouvoir basculer sur les couleurs officielles TRANSCO en un seul fichier.
- Anti-« dashboard généré par IA » : pas de dégradés violets, pas de cartes flottantes à ombres multiples, pas de bleu partout. Fond neutre chaud, densité d'information maîtrisée, hiérarchie typographique forte, filets fins, couleur réservée au **sens** (statut, écart, gravité) et non à la décoration.
- Le sémantique d'abord : vert = conforme, ambre = à surveiller, rouge = critique, bleu = estimé/informatif. Ces quatre couleurs ne servent à rien d'autre.
- **Logo :** je n'inventerai pas de logo officiel. À défaut d'un fichier fourni, une marque typographique neutre « TRANSCO » sera utilisée, accompagnée partout de la mention **« Prototype conceptuel — non connecté aux systèmes TRANSCO »**. Si tu disposes du logo officiel, fournis-le et je l'intègre.
- Bandeau permanent, discret mais toujours visible : **ENVIRONNEMENT DE DÉMONSTRATION — Données fictives**.

---

## 15. Performance

| Cible | Moyen |
|---|---|
| Chargement initial < 1,5 s | Bundle < 250 Ko gzip, zéro image bitmap, aucune police distante |
| Génération du dataset < 50 ms | Générateur arithmétique, 2 160 lignes maximum matérialisées |
| Navigation instantanée | Sélecteurs mémoïsés, calculs recalculés uniquement si le journal change |
| Défilement fluide | Listes > 200 lignes fenêtrées, pas d'ombres animées, `content-visibility` |
| Animations | Uniquement `transform`/`opacity`, 150–200 ms, jamais bloquantes ; respect de `prefers-reduced-motion` |

---

## 16. Tests

- **Vitest sur `engine/`** : identité de la décomposition de variance (somme des contributions = écart total), cohérence de la cascade de réconciliation, conservation des sommes entre transactions unitaires et agrégats, déclenchement des règles d'anomalie aux seuils, non-négativité et bornes des taux.
- **Cohérence du dataset** : test qui vérifie qu'aucun bus n'apparaît sur deux lignes, qu'aucun `BusDay` indisponible n'a de km, que la somme des recettes par ligne égale le total réseau, etc.
- **Recette manuelle** (checklist §41) : navigation, drill-down complet niveau par niveau, workflow d'anomalie, injection voyageur → dashboard, iPad portrait, iPad paysage, desktop, mode avion.

---

## 17. Risques techniques et parades

| # | Risque | Impact | Parade |
|---|---|---|---|
| R1 | Incohérence entre modules (le défaut n° 1 des prototypes) | Perte totale de crédibilité devant le DG | Source unique, génération dérivée, tests de cohérence automatisés, aucun nombre écrit en dur dans l'UI |
| R2 | Volumétrie des transactions sur iPad | Ralentissements, plantage | Agrégats + génération unitaire à la demande, seedée et réversible |
| R3 | Le paysage iPad n'est que 1180 pt | Interface à l'étroit, illisible | Rail compact 76 px, panneau de drill en surcouche, densité calibrée sur 1180 |
| R4 | Service worker servant une version périmée | Démonstration figée sur un ancien build | Versionnement du cache, bouton « Vérifier la mise à jour », test avant la présentation |
| R5 | Dérive du calendrier (données « vieilles ») | Chiffres incohérents plus tard | Fenêtre glissante de 90 jours ancrée sur la date du jour, scénario en offsets relatifs |
| R6 | Manipulation tactile imprécise pendant la présentation | Blocage en direct | Mode démo guidé piloté par URL, cibles ≥ 44 pt, retour arrière toujours disponible |
| R7 | Confusion prototype / système réel | Risque de crédibilité et de gouvernance | Bandeau permanent, mentions dans chaque export, écran « Sources & fiabilité » explicite |
| R8 | Le moteur de variance perçu comme une boîte noire | Contestation devant le DG | Formule affichée, entrées affichées, méthode nommée, limites reconnues à l'écran |
| R9 | Formulation accusatoire d'une anomalie | Risque humain et juridique | Vocabulaire contrôlé centralisé, aucune imputation nominative, décision toujours humaine |
| R10 | Dérive de périmètre (30 écrans à moitié finis) | Démonstration bancale | Priorisation stricte : les 11 étapes du scénario d'abord, en profondeur |

---

## 18. Écarts proposés par rapport au cahier des charges

Sept ajustements que je recommande, tous dans le sens de la crédibilité :

1. **Vite plutôt que Next.js** (§32 le permettait) — offline réel, aucune dépendance serveur le jour J. *Justifié en §1.*
2. **Dataset immuable + journal d'événements** plutôt qu'un dataset mutable — la piste d'audit (§16) devient une conséquence de l'architecture au lieu d'un écran figuré, et la réinitialisation de la démo est triviale.
3. **Transactions générées à la demande** plutôt que 580 000 lignes préchargées — permet un drill-down jusqu'à la transaction sans sacrifier la fluidité sur iPad.
4. **Enveloppe `Metric` avec formule et entrées** plutôt qu'une simple pastille de fiabilité (§7) — on peut ouvrir n'importe quel chiffre et voir le calcul. C'est, à mon avis, l'argument le plus différenciant du prototype.
5. **Décomposition par substitutions en chaîne** plutôt qu'une ventilation forfaitaire (§9) — méthode réelle de contrôle de gestion, somme exacte, défendable devant un directeur financier, et ses limites sont affichées.
6. **Calendrier glissant** plutôt que dates figées — le prototype ne vieillit pas entre deux présentations.
7. **Graphiques SVG maison** plutôt qu'une librairie — évite le rendu générique qui trahit immédiatement une maquette générée.

---

## 19. Phases de construction

| Phase | Contenu | Livrable vérifiable |
|---|---|---|
| **A** | Initialisation Vite + TS + Tailwind, arborescence, jetons de design | `npm run dev` démarre, page vide charpentée |
| **B** | Dataset central + types + générateurs | Écran de contrôle listant les volumes et les totaux |
| **C** | Moteur de calcul + tests Vitest | Tests verts, cohérence prouvée |
| **D** | Design system : primitives, graphiques SVG, patterns | Galerie de composants |
| **E** | TRANSCO 360 — 13 modules + drill-down | Parcours complet navigable |
| **F** | Scénario DG (11 étapes) affiné sur les données réelles | Le récit tient de bout en bout |
| **G** | Application publique — 11 écrans | Parcours voyageur |
| **H** | Pont voyageur → 360 | L'injection modifie réellement les indicateurs |
| **I** | Mode démo guidé + PWA + offline | Installable, fonctionne en mode Avion |
| **J** | Recette iPad portrait/paysage/desktop, corrections, README | Checklist §41 entièrement cochée |

---

## 20. Points à valider avant la phase A

1. **Emplacement et stack** — projet Vite autonome dans `transco360/`, starter Next.js existant inchangé ?
2. **Identité visuelle** — disposes-tu du logo officiel TRANSCO et des couleurs de la charte, ou je pars sur une marque typographique neutre à remplacer ensuite ?
3. **Priorité de construction** — les 13 modules en largeur, ou d'abord les 8 modules du scénario en profondeur maximale puis les 5 restants ?

Le reste (nommage des lignes, tarifs, seuils d'anomalie, libellés) relève de choix courants que je traiterai sans demander de validation, en les documentant dans `docs/01-DATASET.md`.
