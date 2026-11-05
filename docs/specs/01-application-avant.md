# 01 — Application « avant »

**Statut** : Validé · **Date** : 2026-11-05

## Problème

Après 2 mois de POC sur 10 bâtiments, les émissions n'ont pas bougé. Les capteurs remontent pourtant leurs données, mais l'expérience actuelle les présente **une page par équipement** : courbes brutes, unités hétérogènes selon le fournisseur, aucune vue bâtiment, aucune traduction en €, kWh évités ou kgCO₂e, aucune priorisation et aucun moyen d'agir. Les recommandations de l'analyste vivent dans un rapport texte, non chiffré, sans responsable ni suivi. Cette étape reproduit fidèlement cette situation pour en faire le point de départ démontrable des évolutions, et pose le jeu de données complet dont ces évolutions auront besoin.

## Utilisateurs

- **Responsable technique de site** (facility manager) : consulte les équipements de son bâtiment, sans savoir quoi regarder en premier.
- **Energy manager du parc** : doit arbitrer entre bâtiments, mais n'a aucune vue comparative.
- **Direction RSE** : porte l'engagement −30 %, ne voit aucune trajectoire.

## Objectifs

- [ ] Naviguer Bâtiments → équipements d'un bâtiment → page d'un équipement (courbe brute + valeurs brutes).
- [ ] Consulter le rapport de l'analyste (recommandations en texte libre).
- [ ] Toutes les données viennent du faux backend via des DAO, jamais d'un import direct dans un composant.
- [ ] Les gaspillages et défauts de qualité listés plus bas sont présents dans les données, de façon déterministe (identiques à chaque chargement).
- [ ] Les données de référence nécessaires aux évolutions sont servies, même si l'écran « avant » ne les affiche pas : facteurs d'émission, prix de l'énergie, consommation de référence, engagement −30 %.
- [ ] `npm run check` vert.

## Hors périmètre

- Toute agrégation, KPI, comparaison, conversion en €/CO₂, détection ou priorisation : c'est l'objet des évolutions.
- Données météo et normalisation climatique : reportées, la période (septembre–octobre) reste comparable.
- Authentification, multi-utilisateurs.

## Solution

Une application volontairement pauvre côté **expérience**, mais propre côté **code** : c'est la base des évolutions. Les écrans affichent ce que le client voit aujourd'hui, avec les unités brutes du fournisseur (Wh ou kWh, pas de 15 ou 60 min).

| Route | Écran | Contenu |
| ----- | ----- | ------- |
| `/` | — | redirige vers `/buildings` |
| `/buildings` | Liste des bâtiments | tableau : nom, ville, pays, surface, année de construction — lien vers le bâtiment |
| `/buildings/:buildingId` | Équipements d'un bâtiment | en-tête bâtiment + tableau : nom, type, fournisseur, zone, pas de mesure — lien vers l'équipement |
| `/equipments/:equipmentId` | Page équipement | fil d'Ariane, sélecteur de métrique (si plusieurs), sélecteur de période (7 jours / 4 semaines / 8 semaines), courbe brute, tableau des dernières valeurs brutes (48 dernières), unité fournisseur |
| `/reports` | Rapport analyste | rapport(s) : titre, auteur, date, recommandations en texte libre rattachées à un bâtiment |

En-tête : titre de l'application + navigation « Bâtiments » / « Rapport analyste » + interrupteur thème clair / sombre à droite. Interface en français, locale `fr-FR` (dates et nombres).

**Rendu** : Angular Material 3, thème chaleureux (primaire vert sauge, neutres pierre / sable), mode sombre sur fond ≈ #121212 (pas de noir pur). Tableaux triables, cartes, courbe Chart.js aux couleurs du thème. L'interface est soignée pour présenter une base professionnelle — **l'expérience, elle, reste volontairement celle d'aujourd'hui** : la démo doit montrer que le problème n'est pas esthétique.

États obligatoires sur chaque écran : chargement, erreur (`ApiProblem` → message français ; `not-found` → « introuvable »), liste vide.

### Contrat de données

#### Modèles (`src/app/models/`)

```typescript
// country.model.ts
export const COUNTRY_CODES = ['FR', 'DE', 'PL', 'ES', 'IT', 'NL', 'BE'] as const;
export type CountryCode = (typeof COUNTRY_CODES)[number];

export interface Country {
  readonly code: CountryCode;
  readonly name: string;                                  // French label
  readonly gridEmissionFactorKgCo2ePerKwh: number;        // location-based electricity factor
  readonly electricityPriceEurPerKwh: number;
}

// building.model.ts
export interface Building {
  readonly id: string;                                    // 'bld-warsaw'
  readonly name: string;
  readonly city: string;
  readonly countryCode: CountryCode;
  readonly surfaceM2: number;
  readonly constructionYear: number;
  readonly floors: number;
  readonly occupancyCapacity: number;                     // persons
  readonly baselineAnnualEnergyKwh: number;               // reference year consumption (commitment baseline)
}

// commitment.model.ts
export interface EmissionCommitment {
  readonly baselineYear: number;                          // 2025
  readonly targetYear: number;                            // 2028
  readonly targetReductionPercent: number;                // 30
}

// equipment.model.ts
export const EQUIPMENT_TYPES = ['energy-meter', 'hvac-unit', 'occupancy-sensor', 'temperature-sensor'] as const;
export type EquipmentType = (typeof EQUIPMENT_TYPES)[number];

export const METER_SCOPES = ['main', 'hvac', 'lighting-plugs'] as const;
export type MeterScope = (typeof METER_SCOPES)[number];

export const METRIC_KEYS = ['active-energy', 'hvac-status', 'heating-setpoint', 'occupancy-count', 'indoor-temperature'] as const;
export type MetricKey = (typeof METRIC_KEYS)[number];

export interface MetricDefinition {
  readonly key: MetricKey;
  readonly unit: string;                                  // vendor unit, as received: 'kWh' | 'Wh' | '°C' | 'pers.' | 'on/off'
}

export interface Equipment {
  readonly id: string;                                    // 'eq-warsaw-hvac-meter'
  readonly buildingId: string;
  readonly name: string;                                  // vendor-style label: 'CPT-CVC-01', 'AHU_North'…
  readonly type: EquipmentType;
  readonly vendor: string;                                // fictional vendor
  readonly zone: string | null;
  readonly meterScope: MeterScope | null;                 // energy meters only
  readonly samplingIntervalMinutes: 15 | 60;
  readonly metrics: readonly MetricDefinition[];
}

// measurement.model.ts
export interface MeasurementPoint {
  readonly timestamp: string;                             // ISO-8601 UTC, start of interval
  readonly value: number | null;                          // null = missing sample
}

export interface MeasurementSeries {
  readonly equipmentId: string;
  readonly metric: MetricKey;
  readonly unit: string;
  readonly intervalMinutes: 15 | 60;
  readonly points: readonly MeasurementPoint[];
}

// analyst-report.model.ts
export interface AnalystRecommendation {
  readonly id: string;
  readonly buildingId: string | null;                     // null = portfolio-wide
  readonly title: string;
  readonly description: string;                           // free text, not quantified
}

export interface AnalystReport {
  readonly id: string;
  readonly title: string;
  readonly author: string;
  readonly publishedAt: string;                           // ISO date
  readonly recommendations: readonly AnalystRecommendation[];
}
```

#### Points d'accès du faux backend

| Méthode | Chemin | Réponse | Erreurs |
| ------- | ------ | ------- | ------- |
| GET | `/api/buildings` | `Building[]` | — |
| GET | `/api/buildings/:buildingId` | `Building` | 404 `not-found` |
| GET | `/api/buildings/:buildingId/equipments` | `Equipment[]` | 404 `not-found` |
| GET | `/api/equipments/:equipmentId` | `Equipment` | 404 `not-found` |
| GET | `/api/equipments/:equipmentId/measurements?metric=&from=&to=` | `MeasurementSeries` | 404 `not-found` · 400 `invalid-metric` (métrique absente de l'équipement) · 400 `invalid-range` |
| GET | `/api/countries` | `Country[]` | — |
| GET | `/api/commitment` | `EmissionCommitment` | — |
| GET | `/api/reports` | `AnalystReport[]` | — |

`from` / `to` : ISO-8601, optionnels, bornés à la fenêtre de données ; `from` absent = début de fenêtre, `to` absent = fin.

### Jeu de données

**Fenêtre** : du lundi 2026-09-07 00:00 UTC au lundi 2026-11-02 00:00 UTC (8 semaines, POC démarré il y a 2 mois). Instant de référence constant — jamais `Date.now()`. Le rythme journalier est calculé sur l'heure locale approximée à UTC+1.

**10 bâtiments** (noms fictifs) :

| id | Nom | Ville | Pays | Surface | Année | Particularité |
| -- | --- | ----- | ---- | ------- | ----- | ------------- |
| `bld-paris` | Le Lumière | Paris | FR | 12 000 m² | 2008 | sain (témoin) |
| `bld-lyon` | Part-Dieu Sud | Lyon | FR | 8 500 m² | 1994 | **A2** |
| `bld-warsaw` | Mokotów Office | Varsovie | PL | 15 000 m² | 2012 | **A1** |
| `bld-berlin` | Spree Campus | Berlin | DE | 18 000 m² | 2001 | **A4** |
| `bld-munich` | Isar Tower | Munich | DE | 22 000 m² | 2015 | **A5** |
| `bld-madrid` | Castellana 200 | Madrid | ES | 10 000 m² | 1988 | **A3** |
| `bld-milan` | Porta Nuova B | Milan | IT | 9 000 m² | 2018 | sain |
| `bld-amsterdam` | Zuidas Hub | Amsterdam | NL | 7 000 m² | 2005 | **DQ1** |
| `bld-brussels` | Quartier Léopold | Bruxelles | BE | 6 000 m² | 1979 | **DQ2** |
| `bld-krakow` | Zabłocie Park | Cracovie | PL | 5 000 m² | 2019 | sain, mais réseau très carboné |

**7 équipements par bâtiment** (70 au total) : compteur général, sous-compteur CVC, sous-compteur éclairage & prises, centrale de traitement d'air (`hvac-status` + `heating-setpoint`), capteur d'occupation, 2 sondes de température (zones Nord / Sud).

Hétérogénéité fournisseurs : 4 fournisseurs fictifs, nommages d'équipements différents selon le fournisseur ; pas de 15 min ou 60 min ; un fournisseur de compteurs remonte des **Wh** au lieu de kWh.

**Facteurs pays** (ordres de grandeur, électricité, location-based) : FR 0,05 · DE 0,38 · PL 0,66 · ES 0,15 · IT 0,26 · NL 0,33 · BE 0,16 kgCO₂e/kWh. Prix : 0,18 à 0,30 €/kWh.

**Engagement** : base 2025, cible 2028, −30 %.

**Comportement nominal** : occupation en semaine 8 h–19 h (≈ 60–70 % de la capacité), quasi nulle le week-end ; CVC en marche en semaine 7 h–19 h ; consigne de chauffage 21 °C ; besoin de chauffage croissant de septembre (doux) à fin octobre (saison de chauffe) ; talon de nuit éclairage & prises ≈ 2–3 W/m² ; intensité annuelle plausible 150–250 kWh/m². Le compteur général = CVC + éclairage & prises + un petit résiduel. Bruit déterministe sur toutes les séries.

**Anomalies injectées** (vérité terrain des futures détections — documentées dans le fichier de données, non exposées par l'API) :

| Code | Bâtiment | Anomalie | Signature attendue |
| ---- | -------- | -------- | ------------------ |
| A1 | Varsovie | CVC en marche le week-end (8 h–18 h) avec occupation ≈ 0 | `hvac-status` = 1 samedi/dimanche ; énergie CVC week-end ≈ 70 % d'un jour ouvré |
| A2 | Lyon | Consigne de chauffage à 23 °C | `heating-setpoint` = 23 ; température intérieure ≈ 23 °C ; CVC ≈ +14 % |
| A3 | Madrid | Talon de nuit élevé (éclairage & prises restent allumés) | nuit ≈ 60 % de la puissance de jour sur le sous-compteur éclairage & prises |
| A4 | Berlin | Démarrage CVC à 4 h au lieu de 7 h | `hvac-status` = 1 dès 4 h en semaine |
| A5 | Munich | Occupation à 30 % de la capacité, bâtiment conditionné en entier | occupation ≈ 30 % ; CVC identique à un bâtiment plein |
| DQ1 | Amsterdam | Sonde de température Nord figée 5 jours (12→16 octobre) | valeur constante 21,4 °C |
| DQ2 | Bruxelles | Compteur général muet 3 jours (20→22 octobre) | `value: null` |

**Rapport analyste** (publié le 2026-10-05, « Analyste énergie ») : 6 recommandations en texte libre, vagues et non chiffrées — Lyon (« les températures semblent élevées, revoir les consignes »), Varsovie (« consommation observée le week-end, à investiguer »), Berlin (« horaires de la CTA à optimiser »), Munich (« occupation inférieure à la capacité, réfléchir à la gestion des espaces »), et 2 générales (éco-gestes, relamping LED à moyen terme). **Madrid (A3) n'y figure pas** : l'analyse manuelle l'a manquée.

### Fichiers impactés

| Fichier | Changement | Risque |
| ------- | ---------- | ------ |
| `src/app/models/{country,building,commitment,equipment,measurement,analyst-report}.model.ts` | nouveaux types | Faible |
| `src/app/mocks/data/*.mock.ts` | référentiels, générateur de séries, anomalies, rapport | Moyen — réalisme et déterminisme |
| `src/app/mocks/mock-routes.ts` | 8 routes | Faible |
| `src/app/dao/{building,equipment,reference,report}.dao.ts` | accès HTTP | Faible |
| `src/app/services/*.service.ts`, services compagnons | état + erreurs | Faible |
| `src/app/components/**` | 4 écrans, courbe partagée (Chart.js derrière `LINE_CHART_FACTORY`), fil d'Ariane, interrupteur de thème | Moyen — Chart.js sous jsdom |
| `src/styles/_theme.scss`, `_theme-colors.scss` | thème Material 3 clair / sombre, source unique des couleurs | Faible |
| `src/app/services/theme.service.ts` | mode clair / sombre persistant | Faible |
| `src/app/pipes/*.pipe.ts` | libellés type / métrique | Faible |
| `src/app/app.routes.ts`, `app.config.ts`, `app.component.*` | routes, locale `fr-FR`, navigation | Faible |

## Arbitrages

| Décision | Alternative écartée | Raison |
| -------- | ------------------- | ------ |
| Données générées par code, graine fixe | JSON statiques | ~400 000 points : générer à la demande est plus léger, et le générateur documente les anomalies |
| Faux backend en intercepteur HTTP | Services qui lisent des constantes | Le code applicatif est celui d'une vraie API ; brancher un backend = retirer l'intercepteur |
| Unités brutes du fournisseur (Wh/kWh) affichées telles quelles | Normaliser dès l'API | Reproduit l'hétérogénéité réelle ; la normalisation est une évolution à part entière |
| Référentiels (facteurs CO₂, prix, référence, engagement) servis dès maintenant | Les ajouter plus tard | Le jeu de données est la fondation commune de l'avant / après |
| Anomalies non exposées par l'API | Endpoint « vérité terrain » | Une détection doit les retrouver depuis les mesures ; la vérité terrain sert aux tests |
| Chart.js en axe linéaire temporel (timestamps) | Adaptateur de dates Chart.js | Une dépendance en moins ; formatage via `Intl` |
| **Angular Material** comme bibliothèque UI | PrimeNG 22 | Depuis la v22, PrimeNG est sous licence commerciale : sans clé, un bandeau « Invalid PrimeUI license » s'affiche ; licence payante par développeur pour une entreprise. Material : officiel, MIT, aligné sur les versions d'Angular |
| Chart.js utilisé directement, derrière une factory injectable | `p-chart` (PrimeNG), wrappers tiers | `p-chart` est déprécié en v22 ; Chart.js tree-shaké, testable avec une fausse factory |
| Thème Material 3 = source unique des couleurs (`--mat-sys-*`) | Tokens couleur maison + thème de la librairie | Deux sources divergent ; nos utilitaires s'appuient sur les variables système |
| Mode sombre par `color-scheme` + classe sur `<html>` | Deux thèmes compilés | Un seul thème, couleurs en `light-dark()`, bascule sans rechargement |
| Interface soignée dès l'« avant » | Écran volontairement daté | Le contraste avant / après doit porter sur l'expérience (priorisation, action), pas sur le maquillage |

## Questions ouvertes

- [ ] Ajouter la météo extérieure pour normaliser les consommations ? — à décider au moment des détections
