# SCORGIA — Pedagogical Data Depth Audit
**Version :** V7.4.2  
**Date :** 2026-08-18  
**Rôle :** Architecte logiciel senior + architecte systèmes curriculum + architecte données senior + ingénieur produit pédagogique senior  
**Portée :** Forensic uniquement. Aucune implémentation, aucune migration, aucun push.  
**Statut :** AUDIT COMPLET · En attente décision Product Owner

---

## 1. Classe de test réelle

| Champ | Valeur |
|---|---|
| Matières | Français ; Études Sociales |
| Classe | 8 B |
| Niveau | Secondaire 3 |
| Année scolaire | 2026–2027 |
| Province (probable) | Alberta (Secondaire 3 = Grade 9, éducation francophone en contexte minoritaire) |
| Curriculum de référence | Alberta French Language Arts + Alberta Social Studies, Grade 9 |

**Données accessibles via code :**

Le Teaching Pack est persisté dans `teaching_packs.contenu_json` (type `BuildState`) et le programme dans `programme_annuel.contenu_json` (type `ContenuProgramme`). Les leçons DB individuelles sont dans la table `lecons`. Les événements d'enseignement sont dans `teaching_events`.

Aucun accès direct à la base Supabase n'étant disponible en session d'audit, la traçabilité est effectuée par analyse statique du pipeline de code.

---

## 2. Audit des sources curriculaires

### 2.1 Sources disponibles dans le code

**Route V1** (`/api/ia/curriculum/route.ts`) — `CURRICULA_CONTEXT` :

| Clé | Contenu transmis à l'IA |
|---|---|
| `quebec` | String statique : "PFEQ/MEES, compétences transversales…" (~120 chars) |
| `ontario` | String statique : "Ontario Curriculum, overall/specific expectations…" (~110 chars) |
| `alberta` | String statique : "Alberta Program of Studies, learning outcomes, key concepts, essential questions, competencies." (~100 chars) |
| `bc` | String statique : "BC Curriculum, Big ideas, curricular competencies…" (~100 chars) |
| `contenu_curriculum` | Fichier uploadé par l'enseignant, **tronqué à 6 000 chars** |
| _(fallback)_ | "Programme général adapté au niveau" — 37 chars |

**Route V2** (`/api/spie/build-year/route.ts`) :

| Source | Traitement |
|---|---|
| `curriculumCtx` (syllabus pré-généré) | `substring(0, 2000)` — **2 000 chars maximum** |

### 2.2 Moteur d'extraction SPIE-02 (non utilisé en production)

Le fichier `src/lib/spie/curriculum/extraction/extraction-prompt.ts` implémente un moteur d'extraction riche :

- Extraction jusqu'à **12 000 chars** de document curriculaire
- Vocabs provinciaux : Alberta RAG/RAS, Ontario Overall/Specific, Québec compétences disciplinaires, BC Big Ideas, etc.
- Output : `CurriculumExtractionRaw` → `NormalizedOutcome[]` avec : code, texte, type (`general|specifique|competence|big_idea|indicateur`), vocabulaireProvincial, niveauBloom, parentCode, conceptsReferenced
- **Status : IMPLÉMENTÉ MAIS JAMAIS APPELÉ par la route de production**

### 2.3 Conclusion

| Source | Alberta Sec 3 (Français) | Chars transmis | Outcomes normalisés |
|---|---|---|---|
| V1 (clé `alberta`) | String générique 100 chars | 100 | 0 |
| V1 (fichier uploadé) | Texte brut tronqué | ≤ 6 000 | 0 |
| V2 (syllabus context) | Aperçu du syllabus brut | ≤ 2 000 | 0 |
| SPIE-02 (si branché) | Document complet structuré | ≤ 12 000 | Tous les RAG/RAS |

---

## 3. Modèle canonique V7 — inventaire des types TypeScript

### 3.1 Hiérarchie de production (ce qui existe en base)

```
TeachingPack (teaching_packs)
  └── BuildState (contenu_json.build_state)
        ├── pack:             StepResult
        ├── curriculum:       StepResult
        ├── syllabus:         StepResult
        ├── programme_annuel: StepResult  ← ObjectId vers programme_annuel.id
        ├── plans_lecon:      StepResult
        ├── premiere_lecon:   StepResult
        └── quiz:             StepResult

ProgrammeAnnuel (programme_annuel)
  └── contenu_json: ContenuProgramme
        ├── titre: string
        ├── nb_semaines: number
        ├── source_curriculum: string
        ├── curriculum_outcomes?: CurriculumOutcome[]   ← V2 only
        └── unites: Unite[]
              ├── numero, titre, theme
              ├── semaine_debut, semaine_fin
              ├── objectifs: string[]
              ├── competences?: string[]
              ├── justification_pedagogique?: string     ← V2 only
              ├── grandes_idees?: string[]               ← V2 only
              ├── concepts_cles?: string[]               ← V2 only
              ├── curriculum_outcome_ids?: string[]      ← V2 only
              ├── activite_culminante?: string           ← V2 only
              ├── evaluation_prevue?: string             ← V2 only
              └── lecons: LeconProgramme[]
                    ├── numero, titre, sujet
                    ├── duree_minutes, type, lecon_id?
                    ├── statut?: string
                    ├── objectif_apprentissage?: string  ← V2 only
                    ├── curriculum_outcome_ids?: string[]← V2 only
                    ├── activite_principale?: string     ← V2 only
                    ├── preuve_apprentissage?: string    ← V2 only
                    └── justification?: string           ← V2 only

Lecon (lecons) — document de plan de leçon individuel
  └── contenu_json: LeconContent
        ├── objectifs, criteres, materiel
        ├── avant: { amorce, mise_en_situation }
        ├── pendant: { modelisation, pratique_guidee, pratique_autonome }
        ├── apres: { retour, integration }
        ├── evaluation_formative, differentiation_universelle
        └── curriculum_outcome_ids?: string[]           ← si connecté

TeachingEvent (teaching_events)
  ├── sequence_index  ← index dans contenu_json.unites[]  (= UniteIndex, pas un ID de séquence)
  ├── lecon_index
  ├── taught_at, duration_minutes
  └── notes, teacher_assessment
```

### 3.2 Modèle AYDTE — hiérarchie riche (existe mais non branché)

```
AcademicYearTwin (src/lib/spie/aydte/types/twin.ts)
  ├── id, classeId, matiereId, annee
  ├── sequences: SequenceBlock[]        ← entité séquence de premier rang
  │     ├── id, titre, description
  │     ├── outcomeIds: string[]        ← pointeurs vers NormalizedOutcome.id
  │     ├── semaineDébut, semainesFin
  │     ├── dureeEstimeeHeures
  │     ├── statut: 'planifiee'|'en_cours'|'terminee'|'reportee'
  │     ├── ordre, leconIds, quizIds
  │     └── needsRecalculation
  └── calendar: AnnualPlanNode[]
        ├── sequenceId → SequenceBlock
        ├── semaine, dureeMinutes
        └── confirme
```

### 3.3 Gap : champs prévus absents du schéma de production

| Champ | Prévu dans la spec | Présent en production |
|---|---|---|
| `question_directrice` | Oui (mention V8) | ❌ Non |
| `CCHP` (critères de cohérence hiérarchique) | Oui (mention V8) | ❌ Non |
| Entité `Sequence` de premier rang | Oui (AYDTE) | ❌ Non — aliasé `Unite` |
| `NormalizedOutcome` en base | Oui (SPIE-02) | ❌ Non — stocké en AI-output brut |
| `niveauBloom` par leçon | Oui (extraction) | ❌ Non |
| `prerequis` inter-unités | Oui (constraint-engine) | ❌ Non |

---

## 4. Anatomie du générateur de programme annuel

### 4.1 Route V2 de production : `/api/spie/build-year/route.ts`

**Flux complet :**

```
1. Auth + entitlement check
2. Lire TeachingPack, Classe, Matière depuis Supabase
3. Générer syllabus (appel IA #1, schema simplifié)
4. Construire curriculumCtx = syllabus_text.substring(0, 2000)  ← TRONCATURE ICI
5. Appel IA #2 (claude-sonnet-4-6) avec prompt riche :
   - Règle n°1 : "JAMAIS 'Unité 1', 'Leçon 1', 'Contenu à définir'"
   - Schema : ContenuProgramme V2 complet (justification_pedagogique, grandes_idees, etc.)
6. JSON.parse(response) → ContenuProgramme
7. Insérer dans programme_annuel (contenu_json = ContenuProgramme)
8. Générer aperçu calendrier (déterministe, pas IA)
9. Générer plans de leçon (appels IA supplémentaires)
```

**Validateurs :** `src/lib/spie/validators/curriculum-validator.ts` et `plan-validator.ts` existent mais leur intégration dans la route n'est pas confirmée par lecture directe.

**Absence notable :** Aucun appel à :
- `buildExtractionUserPrompt()` (SPIE-02)
- `AnnualPlanningEngine.plan()` (AYDTE)
- `PGEEngine.generateAnnualPlan()` (PGE — stubs uniquement)

### 4.2 Route V1 : `/api/ia/curriculum/route.ts`

**Flux complet :**

```
1. Auth check
2. Construire curriculumCtx :
   - Si clé officielle (ex: 'alberta') → string statique ~100 chars
   - Si fichier uploadé → contenu_curriculum.substring(0, 6000)
   - Sinon → "Programme général adapté au niveau"
3. Appel IA (claude-sonnet-4-6), schema simplifié :
   {titre, nb_semaines, source_curriculum, unites[{numero, titre, theme, semaine_debut, semaine_fin, objectifs, competences, lecons[{numero, titre, sujet, duree_minutes, type}]}]}
4. JSON.parse(response)
   └── Si ÉCHEC → fallback codé en dur :
         6 unités × 5 leçons
         titre: "Unité {i+1}"           ← ORIGINE DES DONNÉES TOXIQUES
         objectifs: ["Objectif principal", "Objectif secondaire"]
         lecon.titre: "Leçon {i*5+j+1}"
         lecon.sujet: "Contenu à définir"
5. Si classe_id fourni → INSERT programme_annuel.contenu_json = programme (incluant données toxiques si fallback)
```

**Appelée depuis :** `src/app/dashboard/classes/[id]/planification/page.tsx` (flux de création de classe).

### 4.3 Moteur PGE — stubs non implémentés

`src/lib/spie/engines/pge/pge-engine.ts` déclare l'interface complète mais toutes les méthodes lancent :
```typescript
throw new Error('PGEEngine.generateAnnualPlan — not implemented (SPIE-04)')
```
**SPIE-04 n'a pas été livré.**

---

## 5. Modèle de séquence — entité de premier rang ?

### 5.1 En production : NON

- Aucune table `sequences` dans `supabase/schema.sql`
- `TeachingEvent.sequence_index` : entier qui indexe `contenu_json.unites[]`
- "Séquence" dans le code legacy = alias de "Unité"
- `BuildState.counts.sequences` = `unites.length`
- Hiérarchie réelle en base : **Programme → Unité → Leçon** (pas de niveau intermédiaire)

### 5.2 Dans AYDTE : OUI — implémenté mais non branché

`SequenceBlock` dans `src/lib/spie/aydte/types/twin.ts` :
```typescript
interface SequenceBlock {
  id: string                            // UUID propre
  titre: string                         // ex: "Séquence A1 — Interaction et partage"
  outcomeIds: string[]                  // pointeurs vers NormalizedOutcome.id
  semaineDébut?: number
  semainesFin?: number
  dureeEstimeeHeures: number
  statut: 'planifiee'|'en_cours'|'terminee'|'reportee'
  leconIds: string[]                    // leçons DB associées
  quizIds: string[]
  needsRecalculation: boolean
}
```

`AnnualPlanningEngine.plan()` génère ces SequenceBlocks à partir de `NormalizedOutcome[]` et les alloue sur le calendrier. La granularité est **Programme → Séquence (par outcome group) → Leçon**.

**Verdict :** Une entité Séquence de premier rang EXISTE dans l'architecture cible mais nécessite :
1. Table `sequences` en base
2. Branchement de SPIE-02 (extraction) → AYDTE (planning) → PGE (génération)
3. Migration des données existantes

---

## 6. Matrice de richesse pédagogique

La matrice trace chaque champ pédagogique à travers les 8 étapes du pipeline.

**Légende :** ✅ Présent et utilisé · ⚠️ Présent mais limité · ❌ Absent · 🔲 Implémenté mais non branché

| Champ pédagogique | Curriculum source | Extraction SPIE-02 | Prompt V1 | Prompt V2 | Contenu_json DB | PedagogicalYearTree | UI Mon Année |
|---|---|---|---|---|---|---|---|
| **Titre d'unité réel** | ✅ si PDF fourni | 🔲 | ⚠️ AI (pas de code) | ✅ AI (avec règles) | ⚠️ si IA réussit | ✅ lu directement | ✅ si non toxique |
| **Code outcome (ex: A1.2)** | ✅ dans curriculum | 🔲 normalisé | ❌ | ⚠️ string libre | ⚠️ dans curriculum_outcome_ids | ❌ non exposé | ❌ |
| **Texte outcome complet** | ✅ | 🔲 | ❌ | ⚠️ tronqué 2000 chars | ⚠️ dans curriculum_outcomes[] | ⚠️ via allOutcomes | ⚠️ SequencesView V2 only |
| **Niveau Bloom** | ✅ implicite | 🔲 extrait | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Parent/Enfant outcome** | ✅ hiérarchie RAG/RAS | 🔲 parentCode | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Grandes idées (BC/AB)** | ✅ dans curriculum | 🔲 bigIdeas[] | ❌ | ✅ V2 schema | ✅ V2 contenu_json | ✅ hasV2Data | ✅ SequencesView |
| **Justification pédagogique** | — | 🔲 concepts | ❌ | ✅ V2 schema | ✅ V2 contenu_json | ✅ | ✅ SequencesView |
| **Concepts clés** | ✅ | 🔲 | ❌ | ✅ V2 schema | ✅ V2 contenu_json | ✅ | ✅ SequencesView |
| **Activité culminante** | — | — | ❌ | ✅ V2 schema | ✅ V2 contenu_json | ✅ | ✅ SequencesView |
| **Objectif d'apprentissage (leçon)** | ✅ outcome parent | 🔲 | ❌ | ✅ V2 schema | ✅ V2 contenu_json | ✅ | ✅ LeconsWorkspace |
| **Preuve d'apprentissage** | — | — | ❌ | ✅ V2 schema | ✅ V2 contenu_json | ✅ | ✅ LeconsWorkspace |
| **Question directrice** | ✅ big ideas | 🔲 | ❌ | ❌ | ❌ | ❌ | ⓘ "prévu V8" |
| **CCHP / Cohérence hiérarchique** | — | 🔲 contraintes | ❌ | ❌ | ❌ | ❌ | ⓘ "prévu V8" |
| **Séquence (entité propre)** | ✅ structure RAG | 🔲 groups | ❌ | ❌ | ❌ (aliasé Unite) | N/A | N/A |
| **Progression intra-unité** | ✅ ordre RAS | 🔲 prereqs | ❌ | ⚠️ ordre numérique | ⚠️ ordre numérique | ✅ leconIdx | ✅ |
| **Statut d'enseignement** | — | — | — | — | ✅ teaching_events | ✅ lessonStateMap | ✅ tous les onglets |
| **Checklist plan de leçon** | — | — | — | — | ✅ lecons table | ✅ leconDB | ✅ PlansLeconView |

**Synthèse matrice :**

- Les champs de **richesse pédagogique V2** (grandes_idées, justification, concepts_cles, activite_culminante, objectif_apprentissage, preuve_apprentissage) existent dans le schéma V2 et sont affichés par Mon Année — **mais seulement pour les programmes générés via le nouveau flux SPIE**.
- Les programmes générés via V1 (flux planification) n'ont aucun de ces champs.
- Les champs issus de l'extraction normalisée SPIE-02 (niveauBloom, parentCode, contraintes) ne sont **jamais** présents en base de données.

---

## 7. Trace end-to-end : un outcome curriculaire réel

**Outcome choisi :** Alberta French Language Arts, Grade 9 (Secondaire 3)  
RAG (Résultat d'Apprentissage Général) : **A1 — Interaction et partage**  
RAS (Résultat d'Apprentissage Spécifique) : **A1.1 — L'élève partagera des informations, des idées, des expériences en utilisant un vocabulaire précis et varié**

### Étape 1 — Curriculum source

Le document Alberta French Language Arts (PDF ~120 pages) contient :
- Section A : Communication orale → A1 (Interaction et partage), A2 (Exploration et compréhension)
- Indicateurs de maîtrise, descripteurs d'évaluation, vocabulaire pédagogique

**Ce que le pipeline voit :**

| Route | Contenu reçu | Outcome A1.1 visible ? |
|---|---|---|
| V1 (clé `alberta`) | "Alberta Program of Studies, learning outcomes…" (100 chars) | ❌ Non — string générique |
| V1 (fichier PDF uploadé) | Texte brut du PDF, 6 000 chars | ⚠️ Peut-être — si A1 est dans les 6 000 premiers chars |
| V2 (SPIE syllabus ctx) | Aperçu du syllabus généré (2 000 chars) | ⚠️ Dépend si l'IA a mentionné A1 dans le syllabus |
| SPIE-02 extraction (non branché) | Texte complet normalisé, 12 000 chars, NormalizedOutcome | ✅ Oui — code "A1.1", texte complet, type "specifique", niveauBloom "synthétiser", parentCode "A1" |

### Étape 2 — Génération IA

**Scénario A — V2 (SPIE build-year), appel IA réussit :**

Prompt reçoit 2 000 chars du syllabus. Si A1 y est mentionné :

```json
{
  "curriculum_outcomes": [
    { "id": "co_001", "code": "A1", "titre": "Interaction et partage", "description": "...", "type": "general" }
  ],
  "unites": [
    {
      "numero": 1,
      "titre": "Communication orale — Interaction et partage",
      "justification_pedagogique": "Développer les compétences de communication interpersonnelle en contexte francophone minoritaire",
      "grandes_idees": ["La langue est un outil d'identité et de connexion sociale"],
      "curriculum_outcome_ids": ["co_001"],
      "objectifs": ["Partager des informations en utilisant un vocabulaire précis"],
      "lecons": [
        {
          "titre": "Discussion structurée — Partager ses idées",
          "objectif_apprentissage": "L'élève sera capable d'utiliser un vocabulaire varié pour exprimer ses idées",
          "curriculum_outcome_ids": ["co_001"]
        }
      ]
    }
  ]
}
```

**Ce qui est PERDU par rapport à SPIE-02 :**
- Code exact "A1.1" (RAS) — l'IA peut ne générer que "A1" (RAG)
- `niveauBloom: "synthétiser"` — non demandé dans le schéma
- `parentCode` et hiérarchie RAG→RAS — aplatie en curriculum_outcomes[] flat
- Indicateurs de maîtrise — non demandés
- Contraintes de séquençage (A1 avant A2) — non capturées

**Scénario B — V1 (planification), JSON.parse échoue :**

```json
{
  "unites": [
    { "numero": 1, "titre": "Unité 1", "objectifs": ["Objectif principal", "Objectif secondaire"],
      "lecons": [{ "titre": "Leçon 1", "sujet": "Contenu à définir" }] }
  ]
}
```

L'outcome A1.1 "L'élève partagera des informations…" est **entièrement perdu**.

### Étape 3 — Persistance

Le JSON généré est stocké dans `programme_annuel.contenu_json`. En Scénario A : richesse partielle. En Scénario B : données toxiques.

Aucune validation ne bloque la persistance de "Unité 1" ou "Objectif principal".

### Étape 4 — Vue Mon Année (PedagogicalYearTree)

`buildPedagogicalYearTree(contenu, lecons, map)` lit `contenu.unites[]` tel quel.

| Champ affiché | Scénario A (V2 ok) | Scénario B (V1 fallback) |
|---|---|---|
| Titre unité | "Communication orale — Interaction et partage" | "Unité 1" |
| Objectifs | Liste réelle | "Objectif principal" |
| Grandes idées | "La langue est un outil…" | _(absent)_ |
| Code outcome | "A1" | _(absent)_ |
| Bloom | _(absent — jamais capturé)_ | _(absent)_ |
| Titre leçon | "Discussion structurée — Partager ses idées" | "Leçon 1" |

### Résumé de la trace

L'outcome A1.1 subit **5 points de perte d'information** :

1. **Troncature du curriculum** : 2 000 / 6 000 chars au lieu de 12 000 chars structurés
2. **Aplatissement de la hiérarchie RAG→RAS** : un seul niveau `curriculum_outcomes[]`
3. **Absence de niveauBloom** : non demandé dans aucun des deux schémas
4. **Absence de contraintes de séquençage** : A1 peut apparaître avant ou après A2
5. **Risque de fallback V1** : si JSON.parse échoue, tout est perdu et remplacé par des données toxiques

---

## 8. Origine des chaînes génériques

### 8.1 "Unité 1", "Objectif principal", "Leçon 1", "Contenu à définir"

**Origine unique et confirmée :** `/api/ia/curriculum/route.ts`, lignes 116–138.

```typescript
// Déclenché quand JSON.parse(texte_ia) lève une exception
programme = {
  titre: `Programme de ${matiere || 'Matière'} — ${niveau || 'Niveau'}`,
  nb_semaines,
  unites: Array.from({ length: 6 }, (_, i) => ({
    numero: i + 1,
    titre: `Unité ${i + 1}`,                              // ← "Unité 1" ... "Unité 6"
    objectifs: ['Objectif principal', 'Objectif secondaire'], // ← chaînes toxiques
    lecons: Array.from({ length: 5 }, (_, j) => ({
      numero: i * 5 + j + 1,
      titre: `Leçon ${i * 5 + j + 1}`,                   // ← "Leçon 1" ... "Leçon 30"
      sujet: 'Contenu à définir',                          // ← données toxiques
    })),
  })),
}
```

**Cause déclenchante :** L'IA retourne du texte non-JSON (markdown, explication, timeout, rate limit, refusal). `JSON.parse()` lève `SyntaxError`. Le `catch {}` est silencieux — aucun log, aucun warning, aucun blocage de persistance.

**Classification :** Catégorie F (héritage) + Catégorie B (fallback API frontend)

### 8.2 Pourquoi la route V2 ne produit-elle PAS ces chaînes ?

La route `/api/spie/build-year/route.ts` contient dans son prompt :

```
RÈGLE N°1 : JAMAIS utiliser des titres génériques comme "Unité 1", "Leçon 1", "Contenu à définir", "Objectif général". Chaque unité et leçon doit avoir un titre spécifique ancré dans le curriculum réel.
```

La route V2 n'a pas de fallback codé en dur — si le JSON.parse échoue, elle retourne une erreur HTTP.  
**En revanche, si la route V1 est utilisée** (flux planification, onboarding), le risque de contamination subsiste.

### 8.3 Persistance des données toxiques

Une fois `programme_annuel.contenu_json` = `{unites: [{titre: "Unité 1"...}]}`, toutes les routes qui lisent ce programme afficheront ces données. Il n'y a pas de mécanisme de détection ou nettoyage post-insertion.

---

## 9. Analyse des écarts — modèle cible vs modèle réel

### 9.1 Modèle cible (spec)

```
PedagogicalYear
  └── ClasseSubject
        └── CurriculumSource (NormalizedOutcome[])
              └── AnnualProgramme
                    └── SequenceBlock[]    ← entité propre, liée à NormalizedOutcome
                          └── Lesson[]     ← chaque leçon liée à des outcomes spécifiques
                                └── LessonPlan
```

### 9.2 Modèle réel

```
TeachingPack
  └── programme_annuel.contenu_json: ContenuProgramme
        └── unites[]                 ← "séquence" = "unité" (même chose)
              └── lecons[]           ← programme leçons (pas table DB)

lecons (table DB)
  └── plan de leçon individuel

teaching_events
  └── séquence = sequence_index = index dans unites[]
```

### 9.3 Tableau des écarts

| Concept cible | Statut | Écart |
|---|---|---|
| Curriculum normalisé (NormalizedOutcome[]) | 🔲 Architecturé, non branché | Engine SPIE-02 existe mais le pipeline production le bypass |
| Séquence de premier rang (SequenceBlock) | 🔲 Architecturé, non persisté | AcademicYearTwin existe, pas de table sequences |
| Hiérarchie RAG→RAS dans le plan | ❌ Absente | Seulement curriculum_outcomes[] flat |
| niveauBloom par outcome | ❌ Absent | Non capturé dans aucun schéma DB |
| Contraintes de séquençage | ❌ Absentes | constraint-engine.ts existe, non branché |
| Calcul de couverture curriculaire | ❌ Absent | AnnualPlanningEngine.coveragePercent n'est pas en base |
| Validation anti-placeholder | ⚠️ Partielle | Prompt V2 seulement, pas de validation post-insertion |
| Correspondance leçon DB ↔ programme leçon | ⚠️ Partielle | Via lecon_id optionnel dans LeconProgramme |

---

## 10. Recommandations architecturales

Chaque recommandation est classifiée selon les catégories de dette :
- **A** : Architecture (conception)  
- **B** : API/Backend (route)  
- **C** : Cache/performance  
- **D** : Data (modèle)  
- **E** : Extraction (SPIE-02)  
- **F** : Fallback/héritage  
- **G** : Génération (SPIE-04/PGE)  
- **H** : UI/Hydratation

### DEC-026 — Supprimer le fallback hardcodé V1 [F · CRITIQUE]

**Problème :** Le bloc `catch {}` dans `/api/ia/curriculum` insère des données toxiques sans signal d'erreur.

**Recommandation :** Remplacer le fallback silencieux par un retour d'erreur HTTP explicite. Le frontend doit informer l'enseignant que la génération a échoué et l'inviter à réessayer.

```typescript
// Au lieu de :
catch { programme = { unites: Array.from({length: 6}, ...) } }
// Faire :
catch (parseError) {
  return NextResponse.json({ success: false, error: 'Réponse IA invalide — réessayez' }, { status: 422 })
}
```

**Impact :** Élimine 100% du risque de création de données toxiques. N'affecte pas les classes existantes.

---

### DEC-027 — Augmenter le budget curriculum context V2 [B · MAJEUR]

**Problème :** `curriculumCtx.substring(0, 2000)` — un curriculum Alberta Français Sec 3 complet fait 50 000+ chars. 2 000 chars = 1,5 pages seulement.

**Recommandation :** Passer à `substring(0, 8000)` immédiatement (doublement du context window utilisé, compatible token budget actuel). Planifier la migration vers l'extraction structurée SPIE-02 pour V7.5.

**Impact :** Amélioration directe de la qualité des titres et objectifs générés.

---

### DEC-028 — Brancher SPIE-02 en amont du build-year [E · STRATÉGIQUE]

**Problème :** Le moteur d'extraction curriculum SPIE-02 est entièrement implémenté (`extraction-prompt.ts`, `extraction-normalizer.ts`) mais la route `build-year` envoie du texte brut tronqué.

**Recommandation :** Ajouter une étape dans le pipeline `build-year` :

```typescript
// Avant l'appel IA principal :
const extractionResult = await curriculumExtractorService.extract(curriculumText, { province, matiere, niveaux })
const normalizedOutcomes: NormalizedOutcome[] = extractionResult.outcomes

// Puis transmettre à l'IA avec structure :
const outcomeCtx = JSON.stringify(normalizedOutcomes.slice(0, 40))  // ~4000 chars structurés
```

**Impact :** Les `curriculum_outcome_ids` dans le plan généré pointent vers des codes réels (A1.1, A1.2) au lieu de IDs AI-inventés.

---

### DEC-029 — Créer la table `sequences` et brancher AYDTE [D + G · STRATÉGIQUE]

**Problème :** `SequenceBlock` et `AnnualPlanningEngine` existent mais aucune table `sequences` en base. Le groupement par prerequisite et le calcul de couverture curriculaire sont impossibles.

**Recommandation :** V7.5 — migration SQL + branchement `AnnualPlanningEngine.plan()`.

```sql
CREATE TABLE sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  programme_annuel_id uuid REFERENCES programme_annuel(id),
  titre text NOT NULL,
  ordre int NOT NULL,
  outcome_ids text[],
  semaine_debut int,
  semaine_fin int,
  statut text DEFAULT 'planifiee',
  created_at timestamptz DEFAULT now()
);
```

**Impact :** Permet le modèle complet Programme → Séquence → Unité → Leçon.

---

### DEC-030 — Implémenter PGE SPIE-04 [G · STRATÉGIQUE]

**Problème :** `PGEEngine.generateAnnualPlan()` lance `throw new Error('not implemented — SPIE-04')`.

**Recommandation :** Implémenter les méthodes en déléguant aux routes existantes (`/api/spie/build-year`, `/api/ia/generer`) avec le modèle normalisé comme input.

---

### DEC-031 — Validator anti-placeholder post-insertion [B · MAJEUR]

**Recommandation :** Ajouter une validation avant toute insertion dans `programme_annuel` :

```typescript
function hasPlaceholderData(contenu: ContenuProgramme): boolean {
  return contenu.unites.some(u =>
    /^Unité \d+$/.test(u.titre) ||
    u.objectifs.includes('Objectif principal') ||
    u.lecons.some(l => /^Leçon \d+$/.test(l.titre) || l.sujet === 'Contenu à définir')
  )
}
```

**Impact :** Deuxième ligne de défense même si DEC-026 est en place.

---

### DEC-032 — Rétrocompatibilité : détection et flag V1 vs V2 [H · MODÉRÉ]

**Recommandation :** Ajouter à `ContenuProgramme` un champ `schema_version: 'v1' | 'v2'`. La UI Mon Année affiche une bannière "Programme V1 — régénérez pour activer toutes les fonctionnalités V2" pour les programmes sans `justification_pedagogique`.

---

## 11. Compatibilité des données V1 à V7

### 11.1 Coexistence actuelle

| Version de génération | Champs disponibles | Affichage Mon Année |
|---|---|---|
| V1 (via /api/ia/curriculum, succès IA) | titre, objectifs, competences, lecons basiques | Titre et objectifs affichés ; aucun badge V2 |
| V1 (fallback codé en dur) | Données toxiques | "Unité 1", "Objectif principal", "Leçon 1" |
| V2 (via /api/spie/build-year) | Tous les champs V2 | Affichage complet avec justification, grandes_idees, etc. |

### 11.2 Stratégie de migration recommandée

**Phase 1 (V7.4.x) — Déjà livré :**
- Détection `hasV2Data` dans `buildPedagogicalYearTree` — les champs V2 s'affichent si présents, masqués sinon
- Bandeaux informatifs `ⓘ` pour les champs absents

**Phase 2 (V7.5) — Recommandé :**
- DEC-026 : Supprimer fallback V1 → éliminer la source de création de nouvelles données toxiques
- DEC-027 : Budget context × 4 en V2
- DEC-028 : SPIE-02 extraction branché dans build-year
- DEC-031 : Validator anti-placeholder

**Phase 3 (V8) — Planifié :**
- DEC-029 : Table sequences + AYDTE
- DEC-030 : PGE SPIE-04 implémenté
- `question_directrice`, `CCHP` ajoutés au schéma

**Stratégie de nettoyage des données toxiques existantes :**

Identifier les programmes avec données toxiques :
```sql
SELECT id, classe_id, titre, created_at
FROM programme_annuel
WHERE contenu_json->'unites'->0->>'titre' LIKE 'Unité %'
   OR contenu_json->'unites'->0->'objectifs'->0 = '"Objectif principal"';
```

Proposer à l'enseignant de régénérer ces programmes via le nouveau flux V2.

---

## Annexe — Index des fichiers audités

| Fichier | Rôle | Statut |
|---|---|---|
| `src/app/api/ia/curriculum/route.ts` | Route V1 génération programme | ⚠️ Fallback toxique (DEC-026) |
| `src/app/api/spie/build-year/route.ts` | Route V2 production | ⚠️ Context tronqué (DEC-027) |
| `src/lib/spie/curriculum/extraction/extraction-prompt.ts` | Extraction SPIE-02 | 🔲 Non branché (DEC-028) |
| `src/lib/spie/curriculum/extraction/extraction-normalizer.ts` | Normalisation curriculum | 🔲 Non branché |
| `src/lib/spie/aydte/planning/annual-planning-engine.ts` | AYDTE séquences | 🔲 Non branché (DEC-029) |
| `src/lib/spie/aydte/types/twin.ts` | AcademicYearTwin, SequenceBlock | 🔲 Types non persistés |
| `src/lib/spie/engines/pge/pge-engine.ts` | PGE génération | ❌ Stubs SPIE-04 (DEC-030) |
| `src/lib/spie/build-pipeline.ts` | BuildState machine | ✅ En production |
| `src/lib/spie/pedagogical-year-tree.ts` | Vue canonique V7 | ✅ En production |
| `src/lib/types/teaching-pack.ts` | Types TeachingPack | ✅ En production |
| `src/lib/types/database.ts` | Types Supabase | ✅ En production |
| `supabase/schema.sql` | Schéma DB | ⚠️ Pas de table sequences |
