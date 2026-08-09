# Domain Model SPIE
## Objets métier — Cycle de vie, responsabilités, relations

> Référence : [Architecture.md](Architecture.md)  
> TypeScript : `src/lib/spie/types/`  
> Version : SPIE-01

---

## Vue d'ensemble des relations

```
ProvinceEducation
    ├── SchoolAuthority[]
    └── Curriculum[]
              ├── CurriculumDocument[]
              └── CurriculumExtraction
                        ├── LearningOutcomeGeneral[]
                        │       └── LearningOutcomeSpecific[]
                        │               ├── Competency[]
                        │               ├── Concept[]
                        │               └── Vocabulary[]
                        └── BigIdea[]

Utilisateur (enseignant)
    └── Classe
              ├── AcademicCalendar
              ├── AnnualPlan
              │       └── SequencePlan[]
              │               └── LessonPlan[]
              │                       ├── LessonActivity[]
              │                       ├── Quiz[]
              │                       ├── Assessment[]
              │                       ├── QualityReport (TQE)
              │                       └── TeachingReflection (PAE)
              └── PedagogicalResource[]
```

---

## Objets de configuration provinciale

### ProvinceEducation
**Raison d'exister** : Encode les règles pédagogiques d'une province. Chaque province a son vocabulaire (RAG/RAS vs. Expectations), ses exigences (différenciation obligatoire ou non), ses normes professionnelles.

**Cycle de vie** : Créé par l'équipe ScorgIA. Mis à jour lors des réformes curriculaires provinciales. L'enseignant ne le crée pas — il le sélectionne.

**Relations** : Contient des `SchoolAuthority[]`. Référence des `Curriculum[]`. Possède des `ProvinceRules`.

**Fichier** : `src/lib/spie/types/province.ts`

---

### SchoolAuthority
**Raison d'exister** : Un conseil scolaire peut avoir des règles différentes de la province (gabarits spécifiques, calendriers locaux, curriculum supplémentaire). Les autorités scolaires des Premières Nations peuvent avoir leurs propres gabarits.

**Cycle de vie** : Créé par l'équipe ScorgIA. Peut être créé par un administrateur d'école.

**Relations** : Appartient à `ProvinceEducation`. Peut avoir ses propres `Curriculum[]`.

---

## Objets curriculaires

### Curriculum
**Raison d'exister** : Représente un programme officiel d'études. C'est la source de vérité pour tout ce que l'enseignant doit enseigner.

**Cycle de vie** : 
1. Créé manuellement par l'équipe ScorgIA pour les curricula communs
2. Peut être créé par un enseignant qui importe son curriculum local
3. Versionnement automatique si la province met à jour son programme

**Relations** : Appartient à `ProvinceEducation`. Contient `CurriculumDocument[]`. Produit `CurriculumExtraction`.

**Contraintes** : Un curriculum `statut='actif'` ne peut pas être supprimé si des `AnnualPlan` y font référence.

---

### CurriculumDocument
**Raison d'exister** : Le document source brut (PDF, Word, URL) depuis lequel CKG extrait le knowledge graph. Plusieurs documents peuvent couvrir un curriculum (document primaire + guides supplémentaires).

**Cycle de vie** :
1. Uploadé par enseignant ou équipe ScorgIA
2. `statut: 'brut'` → indexation → `statut: 'indexe'` → extraction → `statut: 'extrait'`
3. Si l'extraction échoue : `statut: 'erreur'` + message d'erreur

---

### CurriculumExtraction
**Raison d'exister** : Le résultat structuré après que CKG a traité un `CurriculumDocument`. C'est le pont entre le PDF brut et le Knowledge Graph.

**Cycle de vie** :
1. Déclenchée automatiquement après l'upload d'un `CurriculumDocument`
2. `statut: 'pending'` → `statut: 'en_cours'` → `statut: 'complete'`
3. Peut être re-déclenchée si le prompt d'extraction est amélioré (`promptVersion` change)

---

## Objets du Knowledge Graph

### LearningOutcomeGeneral
**Raison d'exister** : Le résultat d'apprentissage macro (RAG en Alberta, Overall Expectation en Ontario, Compétence disciplinaire au Québec). Organise les RAS sous lui.

**Vocabulaire provincial** :
| Province | Terme |
|----------|-------|
| Alberta | Résultat d'apprentissage général (RAG) |
| Saskatchewan | Résultat d'apprentissage général (RAG) |
| Ontario | Overall Expectation |
| Québec | Compétence disciplinaire |
| BC | Big Idea (+ Curricular Competency) |

---

### LearningOutcomeSpecific
**Raison d'exister** : L'outcome précis et mesurable qu'une leçon doit couvrir. C'est l'unité de base de l'alignement curriculaire dans ScorgIA.

**Contrainte clé** : Chaque `LessonPlan` doit référencer au moins un `LearningOutcomeSpecific`. C'est la règle d'alignement fondamentale vérifiée par TQE.

---

### Competency
**Raison d'exister** : Les compétences décrivent ce que l'élève peut **faire**, pas ce qu'il **sait**. Elles transcendent souvent les matières (compétences transversales).

---

### BigIdea
**Raison d'exister** : Concept propre à BC Curriculum et IB. Une grande idée est le fil conducteur d'une matière à un niveau. Elle donne du sens aux outcomes spécifiques.

---

### Concept & Vocabulary
**Raison d'exister** : Les concepts sont les idées clés d'une discipline. Le vocabulaire est la langue de la discipline. Les deux sont nécessaires pour générer du contenu pédagogique précis.

---

## Objets de planification

### AnnualPlan
**Raison d'exister** : La vue macro de toute l'année scolaire. Permet à l'enseignant et à ScorgIA de s'assurer que tout le curriculum sera couvert dans le temps disponible.

**Correspondance DB** : `ProgrammeAnnuel` (database.ts)

**Cycle de vie** :
1. Généré par PGE à partir du Knowledge Graph + calendrier
2. `statut: 'brouillon'` → enseignant révise → `statut: 'actif'`
3. Mis à jour automatiquement par LCE au fil de l'année (`statut: 'actif'` permanent)
4. `statut: 'archive'` en fin d'année scolaire

**Contrainte** : Un `AnnualPlan` ne peut être archivé que si toutes ses `SequencePlan` sont `statut: 'complete'` ou `statut: 'archivee'`.

---

### SequencePlan
**Raison d'exister** : Découpe le plan annuel en unités thématiques cohérentes de 2–6 semaines. C'est le niveau de planification idéal : assez macro pour voir la progression, assez précis pour s'y tenir.

**Correspondance DB** : `Unite` dans `ContenuProgramme` (database.ts)

**Cycle de vie** :
1. Généré par PGE en même temps que l'`AnnualPlan`
2. `statut: 'planifiee'` → dès que la première leçon est enseignée → `statut: 'en_cours'`
3. `statut: 'complete'` après la dernière leçon + évaluation sommative

---

### LessonPlan
**Raison d'exister** : Le plan de leçon est le cœur de la valeur pédagogique de ScorgIA. Il est généré selon le gabarit provincial, aligné sur les outcomes spécifiques, et validé par TQE.

**Correspondance DB** : `Lecon` + `ContenuLecon` (database.ts)

**Cycle de vie** :
1. Généré par PGE sur demande de l'enseignant
2. `statut: 'brouillon'` → TQE valide → `statut: 'prete'`
3. Enseigné : `statut: 'en_cours'` → `statut: 'enseignee'`
4. Réflexion faite : `statut: 'complete'`
5. `statut: 'a_revoir'` si l'enseignant veut la retravailler

**Règle absolue** : Le `contenu_json` (`ContenuLecon`) ne peut jamais être modifié directement par le code. Il doit passer par le workspace Préparer ou l'API `/api/ia/generer`.

---

### LessonActivity
**Raison d'exister** : Décompose la leçon en activités discrètes (amorce, modélisation, pratique guidée, etc.). Utile pour le mode Enseigner (timeline) et la génération d'activités supplémentaires.

---

## Objets d'évaluation

### Quiz
**Raison d'exister** : Évaluation rapide, formative ou sommative. Peut être lancé en temps réel (mode Enseigner) ou assigné comme devoir.

**Correspondance DB** : Tables `quiz`, `questions_quiz`, `sessions_quiz`.

---

### Assessment (Évaluation sommative)
**Raison d'exister** : Évaluation plus formelle avec grille d'évaluation, critères de succès, pondération. Généralement à la fin d'une séquence.

---

### QualityReport
**Raison d'exister** : Le rapport de TQE. Donne à l'enseignant un score de qualité et des recommandations concrètes pour améliorer sa leçon avant de l'enseigner.

**Cycle de vie** : Généré automatiquement après chaque génération de `LessonPlan`. Mis à jour si l'enseignant modifie la leçon. Archivé avec la leçon.

---

## Objets de ressources et configuration

### Template (Gabarit)
**Raison d'exister** : ScorgIA supporte plusieurs gabarits de leçon. Les gabarits officiels suivent les standards provinciaux. L'enseignant peut créer ou importer ses propres gabarits.

**Versionnement** : Les gabarits officiels sont versionnés. Une nouvelle version ne brise pas les leçons existantes (migration optionnelle).

---

### ProfessionalStandard
**Raison d'exister** : Les normes professionnelles (TQS Alberta, Standards Ontario) permettent à ScorgIA d'aligner la qualité des leçons avec les attentes de la profession enseignante.

**Note** : SPIE-01 définit la structure mais n'intègre pas de contenu normatif officiel non vérifié. Les indicateurs seront ajoutés dans SPIE-05 (TQE).

---

### AcademicCalendar
**Raison d'exister** : Le calendrier est la contrainte ultime du plan annuel. Sans lui, les estimations de durée sont théoriques.

**Cycle de vie** : 
1. ScorgIA fournit un calendrier de base par province/année
2. L'enseignant peut le personnaliser (ajouter jours pédagogiques locaux)
3. LCE le consulte à chaque mise à jour du plan annuel
