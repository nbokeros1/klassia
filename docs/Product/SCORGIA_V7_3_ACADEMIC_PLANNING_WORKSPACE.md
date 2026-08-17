# SCORGIA V7.3 — Academic Planning Workspace

**Livraison :** août 2026  
**Commit :** feat: SCORGIA-V7.3 — academic planning workspace and curriculum traceability  
**Portée :** Transformation des onglets « Mon Année » en espace de planification pédagogique complet

---

## Contexte

V7.0 à V7.2 ont livré le moteur de données ScorgIA (dérivation, états, couverture), le cockpit global enseignant, et l'espace Élèves & Soutien. V7.3 ferme la boucle en exposant toute la chaîne pédagogique dans l'interface Mon Année — du résultat d'apprentissage à la leçon enseignée — sans reconstruire les moteurs existants.

---

## Nouveaux onglets (6 migrated tabs)

### 1. Curriculum
Composant : `CurriculumView`  
Source de données : `ContenuProgramme.curriculum_outcomes[]` (V2) ou fallback V1.

- **V2** : tableau de tous les résultats d'apprentissage (RA) avec colonnes Code, Description, Type, Séquences liées, Leçons liées, Statut (couvert / non couvert), Confiance (high / medium / low).
- Clic sur une ligne → panneau `RaDrillPanel` en plein écran : description complète, chaîne descendante Unité → Leçon avec badges de statut.
- **V1 fallback** : message clair « Programme V1 — résultats d'apprentissage non disponibles » avec lien vers l'éditeur.

### 2. Syllabus
Composant : `SyllabusTab`  
Source : `TeachingPack.contenu_json.syllabus` en priorité, puis `ProgrammeAnnuel.syllabus_json`.

- Vue lecture seule du syllabus complet via `SyllabusViewer` existant.
- Notice + lien direct vers l'éditeur syllabus.
- Graceful empty state si aucun syllabus disponible.

### 3. Plan Annuel
Composant : `PlanAnnuelView`  
Source : `ContenuProgramme.unites[]`.

- Métadonnées globales : titre, nb unités, total leçons, nb semaines.
- Cartes UniteCard expand/collapse : barre de progression, statut (Terminée / En cours / À venir), objectifs, grandes idées, concepts clés, justification pédagogique, activité culminante, évaluation prévue.
- Liste des leçons dans chaque unité avec badges de statut (Enseignée / Préparée / Planifiée).

### 4. Séquences
Composant : `SequencesView`  
Source : `ContenuProgramme.unites[]` + `lessonStateMap`.

- Une section par séquence (= unité dans le modèle DB) avec indicateur couleur.
- Statistiques : enseignées/total, nb préparées.
- Auto-ouvre la séquence en cours (partiellement enseignée).
- Détail de chaque leçon : numéro, titre, sujet, objectif d'apprentissage, justification, RA liés, durée, date d'enseignement si disponible, lien vers la leçon préparée.

### 5. Plans de Leçon
Composant : `PlansLeconView`  
Source : `ContenuProgramme.unites[]` + `Lecon[]` (DB) + `lessonStateMap`.

- Panneau gauche : arbre navigateur Unité → Leçons avec pastilles de statut.
- Panneau droit : si la leçon a un `lecon_id` → affichage complet du plan (ContenuLecon) en sections collapsables ; sinon → état « Non préparé » avec lien vers Préparer.
- Sections du plan : Identification, Ancrage curriculaire, Objectifs, Critères, Matériel, Amorce, Modelage, Pratique guidée, Pratique autonome, Consolidation, Évaluation formative, Différenciation, Notes enseignant.

### 6. Leçons
Composant : `LeconsWorkspace`  
Source : `ContenuProgramme.unites[]` + `Lecon[]` (DB) + `lessonStateMap`.

- Barre de stats globale : nb enseignées / préparées / planifiées.
- Explorer gauche : liste filtrée (Toutes / Enseignées / Préparées / Non préparées), groupée par séquence.
- Viewer droit : contenu complet de la leçon (`ContenuLecon`) avec toutes les sections, ou état « Non préparée » avec objectif d'apprentissage du programme.

---

## Principe de backward compatibility

Tous les composants gèrent les deux formats :

| Format | Indicateur | Comportement |
|--------|-----------|--------------|
| V1 | `curriculum_outcomes` absent | Fallback informatif, lien vers éditeur |
| V2 | `curriculum_outcomes` présent | Vue complète avec traçabilité |

Aucun champ inventé. Si une donnée est absente → « Non disponible » ou état vide informatif.

---

## Fetch de données

`[classeId]/page.tsx` effectue désormais 4 requêtes en parallèle :
1. `teaching_events` par `teaching_pack_id`
2. `eleves` par `classe_id`
3. `student_support_plans` par `classe_id` (graceful)
4. `lecons` par `classe_id` (colonnes : id, titre, sujet, numero, statut, duree_minutes, contenu_json, timestamps)

---

## Contraintes respectées

- Moteurs V7.0/V7.1 non reconstruits — réutilisation de `lessonStateMap`, `curriculumCoverage`, `deriveData`
- Aucune dépendance ajoutée — Tiptap déjà présent, pas d'import externe
- Aucune migration distante exécutée
- Aucune donnée fictive
- `tsc --noEmit` : 0 erreurs
- `npm run build` : succès
