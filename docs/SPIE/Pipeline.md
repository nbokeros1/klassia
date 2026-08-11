# Pipeline officiel SPIE
## Du curriculum au copilote d'enseignement

> Référence : [Architecture.md](Architecture.md)  
> Version : SPIE-PERSISTENCE-01

> **Note SPIE-PERSISTENCE-01 :** Le pipeline `build-year` (`/api/spie/build-year`)
> implémente un pattern plus strict que les étapes conceptuelles ci-dessous :
> **GENERATE → VALIDATE → PERSIST → VERIFY → EMIT SUCCESS**.
> Chaque DB write est re-lu avant d'émettre le succès SSE.
> Voir [Persistence_Pipeline.md](Persistence_Pipeline.md) pour le détail.

---

## Vue d'ensemble

```
INPUT                          PIPELINE                         OUTPUT
─────                          ────────                         ──────

Province + Matière + Niveau
         │
         ▼
┌─────────────────┐
│  ÉTAPE 1        │
│  Sélection      │   PPE identifie le gabarit,
│  Curriculaire   │   le vocabulaire provincial,
│                 │   les normes applicables
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  ÉTAPE 2        │
│  Ingestion      │   CKG reçoit le document        →  CurriculumDocument
│  Documentaire   │   curriculaire (PDF/DOCX/URL)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  ÉTAPE 3        │
│  Extraction     │   CKG extrait RAG, RAS,         →  CurriculumExtraction
│  Curriculaire   │   compétences, concepts,
│                 │   vocabulaire via IA
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  ÉTAPE 4        │
│  Graphe         │   CKG construit le Knowledge    →  KnowledgeGraph
│  de Connaissances│  Graph avec toutes les relations
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  ÉTAPE 5        │
│  Calendrier     │   LCE construit le calendrier   →  AcademicCalendar
│  Scolaire       │   avec jours fériés et
│                 │   événements scolaires
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  ÉTAPE 6        │
│  Plan Annuel    │   PGE génère le plan annuel     →  AnnualPlan
│                 │   équilibré sur les semaines
│                 │   disponibles
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  ÉTAPE 7        │
│  Séquences      │   PGE découpe le plan annuel    →  SequencePlan[]
│                 │   en séquences thématiques
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  ÉTAPE 8        │
│  Plans de leçon │   PGE génère chaque leçon       →  LessonPlan
│  (à la demande) │   selon le gabarit provincial
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  ÉTAPE 9        │
│  Validation     │   TQE vérifie : alignement,     →  QualityReport
│  Qualité        │   Bloom, différenciation,
│                 │   durée, perspective autochtone
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  ÉTAPE 10       │
│  Enseigner      │   PGE + LCE alimentent le       →  Session en direct
│  (temps réel)   │   copilot d'enseignement
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  ÉTAPE 11       │
│  Suivre         │   LCE met à jour la             →  ContinuityReport
│  la Progression │   progression réelle vs.
│                 │   le plan annuel
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  ÉTAPE 12       │
│  Réflexion      │   PAE génère insights,          →  TeacherInsight[]
│  Professionnelle│   recommandations et réflexion  →  TeachingReflection
└─────────────────┘
```

---

## Détail de chaque étape

### Étape 1 — Sélection curriculaire

**Pourquoi elle existe**  
Avant de traiter un curriculum, SPIE doit savoir qui le demande et comment l'adapter. Cette étape initialise le contexte provincial.

**Entrées**
- Province/pays sélectionné par l'enseignant
- Niveau scolaire
- Matière(s)
- Langue d'enseignement

**Sorties**
- `ProvinceEducation` : profil complet de la province
- `TemplateSelection` : gabarit à utiliser
- Identifiant du Curriculum à utiliser

**Validation**
- La province est supportée par ScorgIA
- Le curriculum existe pour ce niveau/matière

**Étape suivante**  
Si l'enseignant a déjà un curriculum indexé → passer à l'Étape 4  
Sinon → Étape 2

---

### Étape 2 — Ingestion documentaire

**Pourquoi elle existe**  
Le curriculum officiel peut venir de plusieurs sources. CKG doit pouvoir traiter n'importe quel format.

**Entrées**
- Fichier uploadé (PDF, DOCX) ou URL du document officiel
- Métadonnées : province, matière, niveau, version

**Sorties**
- `CurriculumDocument` persisté dans Supabase Storage + DB

**Validation**
- Le fichier est lisible et non corrompu
- La taille est dans les limites acceptables
- Le document semble être un curriculum (sanity check basique)

**Étape suivante** → Étape 3

---

### Étape 3 — Extraction curriculaire

**Pourquoi elle existe**  
Un PDF de curriculum n'est pas directement utilisable. Il faut en extraire une structure exploitable par le Knowledge Graph.

**Entrées**
- `CurriculumDocument` de l'Étape 2
- `ProvinceEducation` de l'Étape 1 (pour savoir quel vocabulaire utiliser)

**Sorties**
- `CurriculumExtraction` avec tous les outcomes, compétences, concepts, vocabulaire

**Validation**
- Score de confiance de l'extraction ≥ 70%
- Nombre minimal d'outcomes extraits
- Pas de doublons évidents

**Étape suivante** → Étape 4

---

### Étape 4 — Construction du graphe

**Pourquoi elle existe**  
La puissance de SPIE vient des relations entre les éléments du curriculum. Le graphe rend ces relations interrogeables.

**Entrées**
- `CurriculumExtraction` de l'Étape 3

**Sorties**
- Nœuds et relations dans la base de données (ou graphe en mémoire)

**Validation**
- Toutes les relations référencent des nœuds existants
- Pas de cycles dans les relations de prérequis

**Étape suivante** → Étape 5

---

### Étape 5 — Calendrier scolaire

**Pourquoi elle existe**  
Le plan annuel doit respecter le calendrier réel : jours fériés, pédagogiques, examens provinciaux. Sans calendrier, les durées estimées sont fictives.

**Entrées**
- Province
- Année scolaire
- Conseil scolaire (pour les jours pédagogiques locaux)

**Sorties**
- `AcademicCalendar` avec semaines disponibles, événements, blocs d'examens

**Validation**
- Le calendrier couvre l'année scolaire complète
- Les jours fériés provinciaux sont inclus

**Étape suivante** → Étape 6

---

### Étape 6 — Plan annuel

**Pourquoi elle existe**  
L'enseignant a besoin d'un plan macro pour l'année : quelle séquence enseigner quand, combien de semaines par thème, où placer les évaluations sommatives.

**Entrées**
- Knowledge Graph (quoi enseigner)
- `AcademicCalendar` (quand enseigner)
- Profil de l'enseignant (style, préférences)

**Sorties**
- `AnnualPlan` avec séquences ordonnées et datées

**Validation**
- Tous les RAG sont couverts
- La durée totale respecte les semaines disponibles
- Les évaluations sommatives sont distribuées équitablement

**Étape suivante** → Étape 7

---

### Étape 7 — Séquences

**Pourquoi elle existe**  
Le plan annuel est trop macro pour l'enseignement quotidien. Les séquences sont le niveau intermédiaire : un thème, 2–4 semaines, 5–15 leçons.

**Entrées**
- `AnnualPlan` de l'Étape 6
- RAS correspondants dans le Knowledge Graph

**Sorties**
- `SequencePlan[]` avec leçons numérotées et RAS assignés

**Validation**
- Tous les RAS du plan annuel sont assignés à au moins une leçon
- Les prérequis sont respectés dans l'ordre des leçons

**Étape suivante** → Étape 8 (à la demande de l'enseignant)

---

### Étape 8 — Plans de leçon

**Pourquoi elle existe**  
C'est le cœur de la valeur de ScorgIA : générer une leçon complète, conforme au gabarit provincial, alignée sur les RAS, différenciée, en quelques secondes.

**Entrées**
- `SequencePlan` de l'Étape 7 (contexte)
- RAS spécifiques à couvrir
- Gabarit provincial (PPE)
- Profil IA de l'enseignant

**Sorties**
- `LessonPlan` complet selon le gabarit provincial

**Validation** → Étape 9 (TQE)

**Étape suivante** → Étape 9

---

### Étape 9 — Validation qualité

**Pourquoi elle existe**  
ScorgIA s'engage sur la qualité pédagogique. TQE est le garde-fou qui s'assure que chaque leçon livrée respecte les standards attendus.

**Entrées**
- `LessonPlan` de l'Étape 8
- `CurriculumExtraction` (pour vérifier l'alignement)
- Règles provinciales (PPE)

**Sorties**
- `QualityReport` avec score (0–100), problèmes identifiés, suggestions
- Si score < 60 : retour à l'Étape 8 avec feedback

**Validation**
- Score ≥ 60 pour livrer à l'enseignant
- Aucun problème critique (alignement curriculaire manquant)

**Étape suivante** → Enseignant reçoit la leçon

---

### Étapes 10–12 — Enseigner, Suivre, Réfléchir

Ces étapes se déroulent en temps réel pendant l'année scolaire.

- **Étape 10 (Enseigner)** : le copilot IA accompagne la séance en direct
- **Étape 11 (Suivre)** : LCE met à jour le plan annuel selon le réel
- **Étape 12 (Réfléchir)** : PAE génère les insights professionnels

Ces étapes sont détaillées dans [Architecture.md](Architecture.md) (sections LCE et PAE).
