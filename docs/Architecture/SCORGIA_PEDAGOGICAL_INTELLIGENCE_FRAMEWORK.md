# ScorgIA — Cadre d'intelligence pédagogique V7.0
## Constitution pédagogique du système

> **Statut :** Document d'architecture — V7.0  
> **Date :** 2026-08-17  
> **Portée :** Ce document est la référence normative pour toute décision de conception impliquant la génération de contenu pédagogique par ScorgIA. En cas de conflit avec d'autres documents, ce cadre prévaut.

---

## Section 1 — Philosophie fondamentale

ScorgIA n'est pas un outil de productivité qui accélère la création de documents. C'est un assistant pédagogique qui garantit la rigueur de chaque document produit.

### 1.1 La promesse centrale

Chaque document produit par ScorgIA doit être :

| Attribut | Définition |
|---------|-----------|
| **Pédagogiquement défendable** | Fondé sur des principes reconnus de la recherche en éducation |
| **Ancré dans le curriculum** | Traçable jusqu'à un résultat d'apprentissage officiel |
| **Contextualisé à la classe** | Tient compte du niveau, de la matière, des ressources déclarées |
| **Adapté au niveau** | Langage et complexité appropriés aux élèves concernés |
| **Inclusif par conception** | Intègre les principes UDL par défaut |
| **Modifiable** | L'enseignant doit toujours pouvoir ajuster sans friction |
| **Vérifiable** | Chaque affirmation a une source ou une provenance explicite |
| **Cohérent** | Aligné avec les autres documents du même pack |
| **Professionnel** | Qualité attendue d'un enseignant certifié Alberta |

### 1.2 Ce que ScorgIA n'est PAS

- Un générateur de texte automatique sans discernement pédagogique
- Un oracle qui "sait" ce qui est bon pour chaque élève
- Un substitut au jugement professionnel de l'enseignant
- Un outil de conformité administrative (ne génère pas de documents légaux)

---

## Section 2 — Sources d'autorité pédagogique

ScorgIA hiérarchise ses sources dans cet ordre strict :

```
1. OFFICIAL_CURRICULUM    — Alberta Education curriculum officiel
2. OFFICIAL_STANDARD      — TQS, ATA standards, lois provinciales (FOIP, Human Rights Act)
3. SCHOOL_POLICY          — Politiques du district / de l'école (fournies par l'enseignant)
4. TEACHER_INPUT          — Jugement professionnel de l'enseignant
5. CURRICULUM_DERIVED     — Inféré de manière déterministe du curriculum officiel
6. CALENDAR_DERIVED       — Calculé à partir du calendrier scolaire confirmé
7. STUDENT_DATA           — Données d'élèves confirmées par l'enseignant
8. AI_GENERATED           — Généré par le modèle — indicatif, pas définitif
9. EXTERNAL_RESOURCE      — Ressources pédagogiques tierces
10. MISSING               — Information absente — signalée, jamais inventée
```

**Règle d'or :** Si ScorgIA ne peut pas attribuer une provenance de niveau 1–7 à une affirmation, elle doit soit la marquer `AI_GENERATED` (indicatif) soit `MISSING` (absent). Elle ne doit jamais présenter une affirmation `AI_GENERATED` comme un fait établi.

---

## Section 3 — Chaîne canonique de planification curriculaire

Toute planification pédagogique dans ScorgIA suit cette chaîne obligatoire. Un document ne peut pas exister à un niveau sans que le niveau supérieur existe ou soit planifié.

```
CURRICULUM OFFICIEL (Alberta Education)
        │
        ▼
RÉSULTATS D'APPRENTISSAGE (RA / SLO)
        │
        ▼
UNITÉ D'APPRENTISSAGE
        │  (une unité peut avoir plusieurs séquences)
        ▼
SÉQUENCE D'ENSEIGNEMENT
        │  (une séquence contient plusieurs leçons)
        ▼
PLAN DE LEÇON
        │
        ▼
LEÇON (enseignée en classe)
        │
        ▼
ACTIVITÉS & TÂCHES
        │
        ▼
ÉVALUATION
        │
        ▼
PREUVES D'APPRENTISSAGE
        │
        ▼
PROGRESSION (suivi)
        │
        ▼
AJUSTEMENT PÉDAGOGIQUE
```

**Conséquence technique :** Le moteur de traçabilité (`traceability.ts`) vérifie que chaque RA est couvert quelque part dans cette chaîne. Les lacunes sont signalées, jamais comblées automatiquement.

---

## Section 4 — Alignement curriculaire

### 4.1 Règles d'alignement

| Règle | Description | Niveau de blocage |
|-------|-------------|------------------|
| AL-01 | Tout plan de leçon doit référencer au moins un RA officiel | Score `CURRICULUM_ALIGNMENT` < 0.5 → niveau `NOT_READY` |
| AL-02 | ScorgIA ne crée pas de RA — elle utilise les RA du programme chargé | Erreur de conception si contournée |
| AL-03 | Un RA peut être couvert sur plusieurs leçons et séquences | Normal — traçabilité capture tous les liens |
| AL-04 | Une leçon peut couvrir plusieurs RA | Acceptable — max recommandé : 3 par leçon |
| AL-05 | Le RA "générique" est interdit (`Objectif principal`, `Objectif général`) | Falsy — ScorgIA refuse d'utiliser des RA non identifiés |

### 4.2 Fallback interdit

ScorgIA ne doit **jamais** générer un plan de leçon avec un RA de type :
- "Objectif principal"
- "Unité 1 - Objectif"
- "Résultat général"
- tout RA sans `id` traçable dans le curriculum chargé

Si aucun RA n'est disponible, ScorgIA affiche un état `MISSING` explicite et demande à l'enseignant de charger le curriculum.

---

## Section 5 — Hiérarchie de planification

### 5.1 Règles de structure

| Règle | Description |
|-------|-------------|
| HIER-01 | Une unité peut contenir 1 à N séquences — l'IA ne force jamais une structure 1:1 |
| HIER-02 | Une séquence doit avoir une justification pédagogique (POURQUOI ce regroupement) |
| HIER-03 | La progression des leçons doit être cognitiquement cohérente (du simple au complexe) |
| HIER-04 | Le nombre de séquences est déterminé par le contenu, pas par une formule fixe |

### 5.2 Anti-patterns interdits

```
❌ Interdit : 1 RA = 1 unité = 1 séquence = 1 leçon (découpage mécanique)
❌ Interdit : Toutes les leçons ont la même structure (clonage sans pédagogie)
❌ Interdit : Plan de séquence sans question essentielle ou justification
✅ Attendu   : Groupement basé sur la cohérence conceptuelle et la progression
```

---

## Section 6 — Modèle de compétences transversales

ScorgIA intègre les 8 compétences transversales (dont les 6 officielles Alberta) dans tous les plans.

**Règle SC-01 :** Une compétence ne peut être déclarée dans un plan que si :
1. Une activité spécifique la travaille (`activite_concernee` non vide)
2. Une manifestation observable est décrite (`manifestation_observable`)
3. Une preuve possible est identifiée (`preuve_possible`)

**Anti-pattern interdit :** Cocher "pensée critique" sans expliquer où et comment.

---

## Section 7 — Modèle d'évaluation

### 7.1 Triangle évaluation-curriculum-instruction

```
        CURRICULUM (RA)
           /        \
          /          \
   INSTRUCTION ←→ ÉVALUATION
```

Toute évaluation doit :
- Être alignée sur les RA déclarés dans la leçon ou la séquence
- Avoir des critères de réussite explicites et observables
- Distinguer évaluation formative (pour apprendre) de sommative (de l'apprentissage)

### 7.2 Ce que ScorgIA ne fait pas

- Ne détermine pas la valeur d'une évaluation (%) — politique scolaire
- Ne crée pas de barème de notation sans que l'enseignant ait fourni la politique
- Ne génère pas les notes elles-mêmes

---

## Section 8 — Modèle d'inclusion (UDL)

### 8.1 Principe de conception universelle

Tout plan de leçon ScorgIA inclut par défaut une section de différenciation structurée en 3 niveaux :

```
supports_universels  → Pour tous les élèves, intégrés dans la conception
supports_cibles      → Pour les élèves présentant des besoins spécifiques temporaires
supports_specialises → Référence aux plans individuels (NON générés par ScorgIA)
```

### 8.2 Règles d'inclusion

| Règle | Description |
|-------|-------------|
| INC-01 | Au moins 1 support universel requis pour score `INCLUSION` ≥ 0.5 |
| INC-02 | Les supports ne doivent pas réduire les attentes — ils adaptent l'accès |
| INC-03 | ScorgIA suggère des supports basés sur les principes UDL, pas sur des diagnostics |
| INC-04 | Les besoins individuels nominatifs n'apparaissent jamais dans les plans collectifs |

---

## Section 9 — Modèle d'intervention

### 9.1 Définition

L'intervention dans ScorgIA désigne les ajustements pédagogiques basés sur des données d'élèves (résultats d'évaluation, observations de l'enseignant).

### 9.2 Cycle d'intervention

```
ENSEIGNER → OBSERVER → ÉVALUER → ANALYSER → AJUSTER → ENSEIGNER (boucle)
```

ScorgIA supporte ce cycle en :
- Capturant les réflexions post-leçon (`reflexion_enseignant`)
- Suggérant des ajustements pour la prochaine leçon (`ajustement_prochaine`)
- Alimentant le moteur de traçabilité avec les événements d'enseignement

### 9.3 Ce que ScorgIA ne fait pas

ScorgIA ne prédit pas les résultats d'élèves. Elle documente et suggère — l'enseignant décide.

---

## Section 10 — Intelligence de classe (Smart Classroom)

Le modèle Smart Classroom contextualise les suggestions de ScorgIA. Il inclut :
- La configuration physique de la classe (zones, places adaptées)
- Les groupes de travail avec justification pédagogique
- La boîte à outils disponible (numérique, physique)

**Règle SC-01 :** ScorgIA ne déclare jamais connaître "le meilleur groupement". Elle propose une structure que l'enseignant peuple et valide.

**Règle SC-02 :** Les groupes dans les plans collectifs ne contiennent jamais les noms d'élèves.

---

## Section 11 — Traçabilité

### 11.1 Graphe de traçabilité

Pour chaque RA, ScorgIA construit un graphe qui relie :

```
RA → Unités planifiées → Séquences → Plans de leçon → Leçons enseignées → Preuves d'évaluation
```

### 11.2 États possibles d'un RA

| État | Définition | Action ScorgIA |
|------|-----------|---------------|
| Planifié | Le RA figure dans au moins une unité | — |
| Enseigné | Au moins un événement d'enseignement lié | — |
| Évalué | Au moins une preuve d'évaluation liée | — |
| Lacune critique | Non planifié | Alerte rouge à l'enseignant |
| Lacune d'enseignement | Planifié mais non enseigné | Alerte orange |
| Lacune d'évaluation | Enseigné mais non évalué | Suggestion de preuve |

### 11.3 Ce que la traçabilité ne fait pas

La traçabilité ne génère pas automatiquement du contenu pour combler les lacunes. Elle signale — l'enseignant agit.

---

## Section 12 — Moteur de qualité

### 12.1 Principes

- **Déterministe :** Même entrée → même score. Pas d'aléatoire, pas d'IA dans le scoring.
- **Transparent :** Chaque dimension est expliquée, chaque pénalité est justifiée.
- **Indicatif :** Le score ne remplace pas le jugement de l'enseignant.

### 12.2 Seuils de niveau

| Niveau | Score | Signification |
|--------|-------|---------------|
| `NOT_READY` | < 4.0/10 | Document incomplet — ne pas utiliser en classe |
| `NEEDS_REVIEW` | 4.0–6.4 | Document partiel — révision recommandée |
| `READY` | 6.5–8.4 | Document utilisable — quelques améliorations possibles |
| `STRONG` | ≥ 8.5 | Document de haute qualité |

### 12.3 Ce que le score ne mesure pas

- La qualité réelle de l'enseignement (unmeasurable par l'IA)
- L'engagement des élèves
- L'efficacité de l'enseignant
- La pertinence culturelle fine

---

## Section 13 — Provenance et traçabilité des sources

### 13.1 Obligation de provenance

Tout champ dans un document ScorgIA a une provenance explicite. Les champs `AI_GENERATED` doivent être clairement distingués visuellement dans l'interface.

### 13.2 Champs jamais `AI_GENERATED`

| Champ | Pourquoi |
|-------|----------|
| Politiques scolaires | Document légal / administratif |
| Coordonnées de l'enseignant | Information personnelle |
| Désignations officielles d'élèves | Acte professionnel réservé |
| Notes et résultats d'élèves | Jugement évaluatif de l'enseignant |
| Identité des élèves | Protection de la vie privée |

---

## Section 14 — Protection de la vie privée

### 14.1 Données d'élèves

| Principe | Règle technique |
|---------|-----------------|
| Pseudonymisation | `eleve_id` brut jamais dans un prompt IA |
| Minimisation | Seules les données nécessaires sont transmises |
| Confidentialité configurable | `niveau_confidentialite` requis sur tout dossier élève |
| Audit trail | Toute modification tracée |

### 14.2 Données d'enseignants

- Les coordonnées ne sont jamais générées par IA
- Les notes personnelles (réflexions) ne sont transmises à l'IA que si l'enseignant initie explicitement une action IA

---

## Section 15 — Responsabilités IA vs enseignant

### 15.1 Ce que ScorgIA fait

| Action | ScorgIA |
|--------|---------|
| Générer des plans de leçon | Oui — à valider par l'enseignant |
| Suggérer des stratégies de différenciation | Oui — génériques, basées sur UDL |
| Aligner sur le curriculum officiel | Oui — automatique |
| Scorer la qualité pédagogique | Oui — indicatif |
| Tracer la couverture curriculaire | Oui — déterministe |
| Suggérer des structures de groupement | Oui — l'enseignant peuple |
| Générer des activités | Oui — à adapter au contexte réel |

### 15.2 Ce que l'enseignant fait

| Action | Enseignant |
|--------|-----------|
| Valider chaque document avant utilisation | Obligatoire |
| Fournir les informations sur sa classe | Obligatoire |
| Charger ou confirmer le curriculum officiel | Obligatoire |
| Décider des groupements d'élèves | Toujours |
| Évaluer les élèves | Toujours |
| Compléter les politiques scolaires | Toujours |
| Identifier les besoins individuels | Toujours |

---

## Section 16 — Limites de ScorgIA V7.0

| Limite | Description | Planifié pour |
|--------|-------------|---------------|
| Pas de personnalisation élève en temps réel | ScorgIA ne s'adapte pas dynamiquement aux réponses des élèves | V9+ |
| Pas d'intégration FNMI complète | Cadres FNMI partiellement intégrés | V7.1 |
| Pas d'évaluation par compétences graduées | Scoring binaire (couvert/non couvert) | V8 |
| Pas d'historique de progression annuel | Traçabilité par année seulement | V8 |
| Pas d'IA multimodale pour l'évaluation | Évaluation textuelle uniquement | V9+ |
| Pas d'export vers systèmes de gestion scolaire | Pas d'intégration PowerSchool, etc. | V8 |

---

## Section 17 — Versionnement du cadre

| Version | Date | Changements |
|---------|------|-------------|
| V7.0 | 2026-08-17 | Fondation — types, moteur qualité, traçabilité, templates |
| V7.1 | Planifié | FNMI frameworks, PEI alignment Alberta, multi-juridiction |
| V8.0 | Planifié | Smart Classroom éditeur visuel, historique progression, export |

---

*Document maintenu par l'équipe produit KlassIA+. Dernière révision : 2026-08-17.*
