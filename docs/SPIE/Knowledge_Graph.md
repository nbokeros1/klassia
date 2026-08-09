# CKG — Curriculum Knowledge Graph
## Modèle du graphe de connaissances pédagogiques

> Référence : [Architecture.md](Architecture.md)  
> Version : SPIE-01

---

## 1. Pourquoi un graphe ?

Un curriculum n'est pas une liste plate. C'est un réseau de relations :
- Un RAG **contient** plusieurs RAS
- Un RAS **mobilise** des compétences
- Une compétence **suppose** des concepts
- Un concept **utilise** un vocabulaire précis
- Une leçon **couvre** des RAS
- Une séquence **progresse** vers des objectifs

Le graphe permet de naviguer ces relations dans les deux sens : "quels RAS pour ce niveau ?" ou "quelle leçon couvre ce RAS ?"

---

## 2. Structure du graphe

### Nœuds

| Type | Description | Exemple |
|------|-------------|---------|
| `Province` | Province ou pays | Alberta |
| `Programme` | Programme d'études officiel | Program of Studies (Alberta) |
| `Niveau` | Niveau scolaire | Grade 4, Secondaire 1, 20-1 |
| `Matière` | Discipline scolaire | Mathématiques, Sciences, Français |
| `OutcomeGeneral` | Résultat d'apprentissage général (RAG / Overall Expectation) | "Décrire et interpréter l'espace 3D" |
| `OutcomeSpecific` | Résultat d'apprentissage spécifique (RAS / Specific Expectation) | "Tracer et identifier des polygones réguliers" |
| `Competency` | Compétence disciplinaire ou transversale | Résoudre des problèmes, Communication |
| `BigIdea` | Grande idée (BC / IB) | "Les objets 3D peuvent être analysés et comparés" |
| `Concept` | Concept disciplinaire clé | Polygone, Aire, Probabilité |
| `Vocabulary` | Terme du vocabulaire disciplinaire | polygone régulier, parallélogramme |
| `Leçon` | Plan de leçon (couvre des RAS) | Leçon 3 : Polygones réguliers |
| `Séquence` | Groupe de leçons | Séquence 2 : Géométrie plane |
| `PlanAnnuel` | Plan annuel | Math 4 — 2026-2027 |
| `Activité` | Activité pédagogique | Jeu de tangrams |
| `Évaluation` | Quiz ou évaluation sommative | Quiz ch.3 |

### Relations

| Relation | De | Vers | Description |
|----------|-----|------|-------------|
| `CONTAINS` | OutcomeGeneral | OutcomeSpecific | Un RAG contient des RAS |
| `BELONGS_TO` | OutcomeGeneral | Matière | Un RAG appartient à une matière |
| `REQUIRES` | OutcomeSpecific | Competency | Un RAS mobilise des compétences |
| `INVOLVES` | OutcomeSpecific | Concept | Un RAS fait appel à des concepts |
| `USES` | Concept | Vocabulary | Un concept utilise un vocabulaire |
| `EXPRESSES` | BigIdea | OutcomeGeneral | Une grande idée exprime un RAG |
| `COVERS` | Leçon | OutcomeSpecific | Une leçon couvre des RAS |
| `BELONGS_TO` | Leçon | Séquence | Une leçon fait partie d'une séquence |
| `PRECEDES` | Leçon | Leçon | Une leçon prépare la suivante |
| `GROUPED_IN` | Séquence | PlanAnnuel | Une séquence fait partie du plan annuel |
| `TARGETS` | Activité | OutcomeSpecific | Une activité vise des RAS précis |
| `ASSESSES` | Évaluation | OutcomeSpecific | Une évaluation mesure des RAS |
| `PREREQUISITE` | OutcomeSpecific | OutcomeSpecific | Un RAS est prérequis d'un autre |
| `ALIGNED_WITH` | OutcomeSpecific | OutcomeSpecific | Alignement entre provinces |

---

## 3. Exemple — Alberta Mathématiques Grade 4

```
Programme (Alberta Program of Studies - Math)
  └─ Niveau (Grade 4)
       ├─ OutcomeGeneral [A] "Développer le sens du nombre"
       │   ├─ OutcomeSpecific [A1] "Représenter et décrire les nombres entiers de 0 à 10 000"
       │   │   ├─ Competency: "Raisonnement"
       │   │   ├─ Concept: "Valeur de position"
       │   │   └─ Vocabulary: "millier", "centaine", "dizaine", "unité"
       │   └─ OutcomeSpecific [A2] "Comparer et ordonner les nombres entiers jusqu'à 10 000"
       │       ├─ Competency: "Communication"
       │       └─ Concept: "Droite numérique"
       │
       └─ OutcomeGeneral [B] "Utiliser les opérations arithmétiques sur les entiers"
           └─ OutcomeSpecific [B1] "Appliquer la multiplication 1 à 9"
               ├─ Competency: "Résolution de problèmes"
               ├─ Concept: "Multiplication", "Tables"
               └─ Prerequisite → OutcomeSpecific [A1]
```

---

## 4. Traversées utiles du graphe

### Pour PGE (génération)
- "Quels RAG dois-je couvrir ce semestre ?" → Province → Programme → Niveau → OutcomeGeneral
- "Quels concepts dois-je enseigner pour ce RAS ?" → OutcomeSpecific → Concept
- "Quels prérequis avant cette leçon ?" → Leçon → OutcomeSpecific → PREREQUISITE → OutcomeSpecific → Leçon

### Pour TQE (validation)
- "Cette leçon couvre-t-elle les bons RAS ?" → Leçon.covers ∩ SequencePlan.targets
- "Tous les concepts nécessaires sont-ils dans le vocabulaire de la leçon ?" → OutcomeSpecific → Concept → Vocabulary

### Pour LCE (continuité)
- "Y a-t-il des RAS non couverts dans le plan annuel ?" → PlanAnnuel → Séquence → Leçon → OutcomeSpecific vs. Programme → OutcomeSpecific
- "Les prérequis de la prochaine leçon ont-ils été enseignés ?" → Leçon (prochaine) → PREREQUISITE → Leçon (précédente)

### Pour PAE (analytics)
- "Quels RAG ont été enseignés à plus de X% ?" → Leçon (statut=complete) → OutcomeSpecific → OutcomeGeneral
- "Quelles compétences n'ont pas été mobilisées ce trimestre ?" → Séquence → Leçon → OutcomeSpecific → Competency

---

## 5. Modèle de données TypeScript

Voir `src/lib/spie/types/outcomes.ts` pour les interfaces complètes.

---

## 6. Extraction depuis un document

Le processus CKG suit ces étapes :

```
Document (PDF/DOCX)
  ↓ extraire-texte.ts (extraction texte brut)
  ↓ CKG Extraction Prompt (IA — structured output JSON)
  ↓ CurriculumExtraction (validation + nettoyage)
  ↓ Graph Builder (création des nœuds et relations)
  ↓ Knowledge Graph (persisté dans Supabase)
```

Le prompt d'extraction demande à l'IA de produire un JSON structuré contenant tous les nœuds et relations du graphe. Ce JSON est validé avant insertion.

---

## 7. Versionnement

Quand un curriculum est mis à jour par la province :
1. Une nouvelle `CurriculumVersion` est créée
2. L'ancienne extraction est archivée (pas supprimée)
3. Une nouvelle extraction est lancée sur les nouveaux documents
4. Les plans annuels existants sont marqués "à réviser" si des RAS ont changé
5. Les leçons concernées reçoivent un flag `curriculum_mis_a_jour`

---

## 8. Alignement inter-provinces (futur)

À terme, CKG pourra aligner les outcomes entre provinces :
- Alberta `OutcomeSpecific [A1]` ↔ Ontario `Specific Expectation [B1.2]`
- Cela permettra à un enseignant qui déménage de ne pas tout recommencer
- Et à ScorgIA de proposer des ressources cross-provinciales

Cette fonctionnalité est planifiée pour SPIE-06+.
