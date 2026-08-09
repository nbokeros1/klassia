# SPIE-X — Principes d'architecture
## Les règles fondamentales de ScorgIA V1

**Date** : 2026-08-04  
**Autorité** : Ces principes priment sur tout autre choix technique.

---

## Principe 1 — Séparation déterminisme / stochasticité

**Règle** : Tout ce qui peut être calculé sans IA DOIT être calculé sans IA.

- Le SPIE (SPIE-01 à SPIE-07) est entièrement déterministe — zéro appels Claude.
- Les décisions pédagogiques (peut-on générer ? plan faisable ? stratégie valide ?) sont calculées par des moteurs déterministes, auditables, reproductibles.
- Claude est réservé à la **génération de contenu textuel** — pas aux décisions pédagogiques.

**Pourquoi** : Un enseignant doit pouvoir comprendre pourquoi une décision a été prise. Un système stochastique ne peut pas expliquer ses décisions de manière fiable.

---

## Principe 2 — Traçabilité obligatoire

**Règle** : Chaque décision pédagogique est tracée avec question / réponse / rationale / score.

- `PedagogicalDecisionTree` trace toutes les décisions du `StrategyBuilder`.
- `SimulationReport` liste chaque risque détecté avec sa source.
- `ContextScore` explique chaque dimension avec son poids.

**Pourquoi** : L'enseignant n'est pas un utilisateur passif. Il doit comprendre et pouvoir contester chaque recommandation.

---

## Principe 3 — L'enseignant décide toujours

**Règle** : `autoApplicable: false` sur toutes les recommandations (DEC-017). Jamais d'application automatique.

- Le SPIE propose — l'enseignant dispose.
- Les recommandations PPS, PTE, PSE sont des suggestions, pas des commandes.
- Aucune modification de données ne se fait sans action explicite de l'enseignant.

**Pourquoi** : La confiance des enseignants envers l'IA passe par le contrôle. Un système qui agit seul perd la confiance au premier faux pas.

---

## Principe 4 — Dégradation gracieuse

**Règle** : Un moteur SPIE sans toutes ses sources doit quand même fonctionner avec un résultat partiel.

- PCE retourne un `PedagogicalContext` même si les sources sont incomplètes (`partial: true`).
- PSE accepte des entrées optionnelles (context, twin, simulation, academicTime).
- CIE retourne un résultat même sur un curriculum de faible qualité (seuil = 40, pas 100).

**Pourquoi** : Attendre la perfection avant de générer bloquerait la majorité des enseignants. Informer plutôt que bloquer.

---

## Principe 5 — Immuabilité de build-system-prompt.ts

**Règle** : `src/lib/ia/build-system-prompt.ts` ne peut PAS être modifié via SPIE (DEC-005).

- Ce fichier contient le `SYSTEM_PROMPT_LECON` — le gabarit pédagogique officiel en 7 blocs.
- Toute modification de ce fichier nécessite une décision explicite hors SPIE.
- Les moteurs SPIE enrichissent le **contexte** injecté dans le prompt, pas le prompt lui-même.

**Pourquoi** : La cohérence pédagogique de la plateforme repose sur ce gabarit. Le modifier via un moteur d'automatisation créerait des dérives incontrôlées.

---

## Principe 6 — Couches distinctes sans couplage fort

**Règle** : Les couches (DB → domain SPIE → IA) communiquent via des contrats de types TypeScript explicites, jamais via des objets DB bruts.

- Les routes API ne passent pas de `Row` Supabase directement aux moteurs SPIE.
- Les mappers (Sprint 1) traduisent entre les deux représentations.
- Chaque couche peut évoluer indépendamment.

**Pourquoi** : La DB peut changer de schéma sans casser le SPIE. Le SPIE peut changer d'algorithmes sans toucher à la DB.

---

## Principe 7 — Un seul chemin de génération

**Règle** : Toute génération de contenu passe par PCE → build-system-prompt.ts → Claude. Pas de raccourcis.

- Il n'existe pas de route de génération qui contourne PCE.
- Il n'existe pas de prompt qui contourne `build-system-prompt.ts`.
- La qualité pédagogique est garantie par le respect de ce chemin.

**Pourquoi** : Des raccourcis créent des modes de génération de qualité hétérogène. La promesse de KlassIA+ est la rigueur pédagogique, pas la vitesse.

---

## Principe 8 — Sécurité par défaut

**Règle** : RLS activé sur toutes les tables Supabase. Toute nouvelle table doit avoir une politique RLS avant d'être mise en production.

- Un enseignant ne peut voir que ses propres données.
- L'admin (enwaha22@gmail.com) a un accès élargi via une politique dédiée.
- Aucune table n'est publiquement lisible sans décision explicite.

**Pourquoi** : Les données pédagogiques sont sensibles. Une fuite de données de classe est un incident grave.

---

## Principe 9 — Pas de nouvelle couche architecturale sans justification

**Règle** : À partir de SPIE-X, aucun nouveau moteur d'architecture ne doit être ajouté sauf justification exceptionnelle documentée.

- Les prochains sprints développent des **fonctionnalités**, pas de l'architecture.
- Si un besoin semble nécessiter un nouveau moteur, vérifier d'abord si un moteur existant peut être étendu.
- Toute exception doit être documentée dans `Decision_Log.md` avec un DEC-XXX.

**Pourquoi** : L'architecture a atteint sa maturité. Ajouter des couches crée de la complexité sans valeur ajoutée pédagogique.

---

## Principe 10 — Documentation synchrone avec le code

**Règle** : Chaque moteur SPIE a son fichier de documentation correspondant dans `docs/SPIE/`. Ils évoluent ensemble.

- Pas de code sans documentation.
- Pas de documentation sans code correspondant.
- Les décisions architecturales sont documentées dans `Decision_Log.md` (DEC-XXX).

**Pourquoi** : La plateforme est construite pour durer. Un code sans documentation devient inconnu en 6 mois.
