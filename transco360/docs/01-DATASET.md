# Dictionnaire du jeu de données fictif

**Toutes les données de ce document et du prototype sont fictives.**
Aucune donnée réelle de TRANSCO n'est utilisée. Aucun nom de salarié n'apparaît :
le personnel est identifié par des codes d'anonymisation (`AG-1042`…).

---

## 1. Principe de génération

Le dataset n'est **pas** un fichier de chiffres figés. Il est **produit au démarrage**
par un générateur pseudo-aléatoire déterministe (`mulberry32`, graine dérivée d'un
hachage FNV-1a). Deux conséquences :

- **Reproductibilité.** Une même date de référence produit exactement le même jeu de
  données, sur n'importe quelle machine. Les tests peuvent donc porter sur des valeurs
  précises.
- **Cohérence structurelle.** Les recettes, le carburant, la maintenance et les anomalies
  ne sont pas inventés séparément : ils dérivent tous de la même table pivot
  (`BusDay` : un bus, un jour).

La chaîne de dérivation est la suivante :

```
Référentiels (lignes, bus, agents, arrêts)
        │
        ▼
BusDay  ── disponibilité, rotations, km, validations, recette
        │
        ├──► LineDay        (cascade billettique par ligne)
        ├──► FuelRecord     (dotations de carburant)
        ├──► MaintenanceOrder (déduits des séquences d'indisponibilité)
        ├──► CostRecord     (personnel, assurance, péages, consommables)
        └──► CashSession    (attendu = recettes des bus du dépôt)
                    │
                    ▼
            engine/ ── indicateurs, variance, réconciliation, anomalies
```

**Aucun indicateur n'est stocké.** Tout ce que voit l'utilisateur est recalculé.

---

## 2. Calendrier

Fenêtre **glissante de 90 jours** se terminant à la date du jour. Le prototype ne vieillit
donc jamais. `?date=AAAA-MM-JJ` fige la date pour les répétitions.

| Jour | Intensité de service |
|---|---|
| Lundi–vendredi | 100 % |
| Samedi | 82 % |
| Dimanche | 55 % |

La période d'analyse par défaut est une **fenêtre glissante de 30 jours**, et non le mois
calendaire : un mois en cours serait quasi vide si la présentation avait lieu le 2 du mois.
Les objectifs mensuels sont ramenés au prorata de la durée de la période affichée.

---

## 3. Réseau

5 lignes urbaines, 2 lignes interurbaines, 26 arrêts. Les quartiers cités existent à
Kinshasa ; le réseau, les tarifs, les distances et les objectifs sont fictifs.
Les coordonnées x/y des arrêts servent au tracé de la carte schématique (viewBox
1000 × 640) — ce ne sont **pas** des coordonnées GPS.

| Ligne | Desserte | Type | Distance | Tarif | Rot./bus/j | Bus | Objectif mensuel |
|---|---|---|---|---|---|---|---|
| L01 | Gare Centrale ↔ UPN | urbain | 14 km | 1 000 FC | 7 | 4 | 79 M FC |
| L02 | Gare Centrale ↔ Aéroport de Ndjili | urbain | 24 km | 1 500 FC | 5 | 4 | 95 M FC |
| L03 | Rond-point Victoire ↔ Kingasani | urbain | 20 km | 1 200 FC | 6 | 3 | 59 M FC |
| L04 | Gombe ↔ Selembao | urbain | 12 km | 1 000 FC | 8 | 3 | 59 M FC |
| L05 | Matete ↔ Bandalungwa | urbain | 16 km | 1 000 FC | 7 | 3 | 57 M FC |
| L06 | Kinshasa ↔ Maluku | interurbain | 78 km | 5 000 FC | 2 | 2 | 37 M FC |
| L07 | Kinshasa ↔ Kasangulu | interurbain | 42 km | 3 500 FC | 3 | 5 | 84 M FC |

Une **rotation** = un aller-retour. Les kilomètres parcourus valent donc
`rotations × distance × 2`.

**Calibrage des objectifs.** Ils ne sont pas déduits du réalisé : ce sont des données
d'entrée de gestion. Ils ont été fixés à environ 96 % du régime normal observé sur le
mois de référence de la période, ce qui produit une situation réaliste — les mois
antérieurs à l'incident dépassent légèrement l'objectif, la période courante décroche.

| Périmètre | Objectif mensuel |
|---|---|
| Transactionnel (7 lignes) | 470 M FC |
| Contractuel (scolaire, location, publicité) | 66 M FC |
| **Total réseau** | **536 M FC** |

---

## 4. Flotte

24 bus (`TR-1802` … `TR-2079`), répartis sur 3 dépôts (Limete, Kintambo, Ndjili).
Chaque bus porte : modèle, nombre de places, année de mise en service, kilométrage au
compteur, et **norme de consommation** (L/100 km) servant au calcul de la consommation
théorique. Un bus n'appartient qu'à **une seule ligne** — c'est l'invariant qui garantit
la cohérence entre tous les modules.

## 5. Personnel

12 agents codifiés, répartis en cinq rôles : conduite, recette, contrôle, technique,
caisse. Un agent est rattaché à un dépôt et à un ou plusieurs lignes. **Les anomalies ne
nomment jamais un agent** — un test automatisé le vérifie.

## 6. Activités

| Activité | Modèle de recette | Objectif mensuel |
|---|---|---|
| Réseau urbain | transactionnel | 349 M FC |
| Réseau interurbain | transactionnel | 121 M FC |
| Transport scolaire | contractuel | 32 M FC |
| Location de véhicules | contractuel | 22 M FC |
| Publicité embarquée | contractuel | 12 M FC |

Les activités contractuelles sont portées par 8 contrats fictifs. Leur recette est
reconnue au prorata du service rendu, facturée, puis encaissée avec un taux de
recouvrement inférieur à 100 % (93 % scolaire, 97,5 % location, 88 % publicité) — ce qui
crée un point de contrôle propre au contractuel.

---

## 7. Volumétrie produite

| Table | Volume | Génération |
|---|---|---|
| `BusDay` | 2 160 | au démarrage |
| `LineDay` | 630 | au démarrage |
| `FuelRecord` | ~2 080 | au démarrage |
| `MaintenanceOrder` | ~36 | déduits des indisponibilités |
| `CostRecord` | ~7 000 | au démarrage |
| `CashSession` | 270 | au démarrage |
| `ContractRevenue` | ~490 | au démarrage |
| **Transactions unitaires** | ~580 000 sur la période | **à la demande uniquement** |

Temps de génération complet : **~120 ms**.

### Transactions à la demande

Matérialiser 580 000 validations saturerait une tablette. Le générateur produit donc les
transactions d'un couple (bus, jour) — 200 à 400 lignes — seulement quand l'utilisateur
ouvre ce niveau, à partir d'une graine dérivée de `busId + date`.

Deux garanties, vérifiées par des tests :
- le nombre de transactions produites **égale exactement** le nombre de validations de
  l'agrégat ;
- la part marquée « non remontée au système central » reproduit **exactement** l'écart
  entre recette attendue et recette enregistrée.

Le drill-down descend donc jusqu'à la transaction sans jamais charger la totalité.

---

## 8. Événements scriptés du scénario

Le fichier `src/data/seed/script.ts` ne contient **aucun indicateur** : il décrit des
**causes physiques**, exprimées en décalages relatifs à la date du jour. Tous les chiffres
présentés au DG en découlent par calcul.

| Événement | Portée | Fenêtre | Effet calculé |
|---|---|---|---|
| Panne moteur | TR-2037 (L07) | J-13 → en cours | Immobilisation 14 j, coût 8,3 M FC |
| Attente de pièces (transmission) | TR-2048 (L07) | J-9 → en cours | Immobilisation 10 j, coût 5,1 M FC |
| Panne de freinage | TR-2056 (L07) | J-6 → en cours | Immobilisation 7 j, coût 2,4 M FC |
| Révision périodique | TR-2079 (L07) | J-21 → J-19 | 3 j |
| 3 pannes électriques | TR-1842 (L02) | J-58, J-34, J-16 | Déclenche la règle « panne récurrente » |
| Dérive de dotation carburant | TR-1842 | 30 j | +21 % vs consommation théorique → **critique** |
| Dérive de dotation carburant | TR-1893 | 30 j | +14 % → à surveiller |
| Dérive du taux de collecte | L03, L07 | J-18 / J-10 | Écart de réconciliation |
| Taux de validation dégradé | L03 (94,1 %), L07 (95,8 %) | permanent | Règle « ratio de validation » |
| Écart de caisse | DEP-01 | J-2 | 261 500 FC non déposés → **validation bloquée** |
| Écart de caisse | DEP-03 | J-5 | 84 000 FC + 140 000 FC non comptabilisés |
| Retard de comptabilisation | DEP-02 | J-1 | 320 000 FC |
| Incohérence kilométrique | TR-1959 (L05) | 20 j | +19 % de km vs rotations déclarées |
| Baisse de fréquentation | L02 (−7 %), L04 (−5 %) | J-24 / J-15 | Travaux de voirie, concurrence |
| Baisse de rotations | L02, L03, L07 | J-20 / J-11 / J-13 | Congestion, rupture de dotation, report de service |

---

## 9. Ce que produisent ces causes (vérifié par le script d'audit)

Situation obtenue sur les 30 derniers jours :

| Indicateur | Valeur calculée |
|---|---|
| Recettes réalisées | 499,4 M FC |
| Objectif de la période | 536,0 M FC |
| **Écart** | **−36,6 M FC (−6,8 %)** |
| Disponibilité du réseau | 92,8 % (norme 94 %) |
| L07 vs objectif | **−17,9 M FC (−21,3 %)** |
| L07 vs période précédente | −18,1 M FC (−21,5 %) |
| L07 — disponibilité | 76,7 % |
| L07 — bus immobilisés | 3 sur 5 |
| Anomalies détectées | 13, dont 4 critiques |
| Performance contributive réseau | 191,8 M FC (38,4 %) |
| Performance contributive L07 | **−6,4 M FC (−9,8 %)** |

Décomposition de l'écart réseau par le moteur de variance :

| Facteur | Contribution |
|---|---|
| Périmètre (bus-jours programmés) | 0,0 M FC |
| Disponibilité de la flotte | −6,1 M FC |
| Rotations réalisées | −15,9 M FC |
| Fréquentation | +0,1 M FC |
| Tarif moyen encaissé (effet de mix) | −9,1 M FC |
| Taux de collecte | −2,3 M FC |
| Autres activités (contractuel) | −3,3 M FC |
| **Résidu de décomposition** | **0,000000 FC** |

Le résidu nul n'est pas un hasard d'affichage : c'est la propriété mathématique de la
méthode des substitutions en chaîne, et elle est vérifiée par un test.

---

## 10. Scripts de contrôle

```bash
npx vite-node scripts/audit-dataset.ts    # volumes, totaux, contrôles de cohérence
npx vite-node scripts/audit-scenario.ts   # le scénario de démonstration, étape par étape
npm test                                   # 44 tests de cohérence et de calcul
```

Les deux scripts acceptent une date : `npx vite-node scripts/audit-scenario.ts 2026-12-03`.
