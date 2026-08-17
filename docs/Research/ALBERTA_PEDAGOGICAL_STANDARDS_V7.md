# Alberta Pedagogical Standards — ScorgIA V7.0 Research Document

> **Date de compilation :** 2026-08-17  
> **Juridiction :** Alberta, Canada  
> **Public cible :** Équipe produit ScorgIA + équipe technique  
> **Statut :** Référence interne — à mettre à jour si Alberta Education publie de nouvelles directives

---

## Légende des catégories

| Catégorie | Signification |
|-----------|---------------|
| **A** | Exigence officielle — prescrite par Alberta Education ou un texte légal albertan |
| **B** | Recommandation professionnelle — émise par des organismes reconnus (ATA, ARPDC, etc.) |
| **C** | Décision produit ScorgIA — choix de l'équipe, non imposé par une norme externe |

---

## 1. Teaching Quality Standard (TQS) 2023

**SOURCE :** Alberta Education, *Teaching Quality Standard* (2018, mise à jour 2023)  
**URL de référence :** https://open.alberta.ca/publications/teaching-quality-standard

### TQS-1 — Apprentissage tout au long de la carrière

| # | Principe | Catégorie | Implication pour ScorgIA | Documents concernés | Règle de validation |
|---|----------|-----------|--------------------------|---------------------|---------------------|
| 1.1 | L'enseignant utilise la recherche pédagogique actuelle pour améliorer sa pratique | **B** | ScorgIA cite ses sources — jamais de conseil pédagogique sans ancrage dans un cadre reconnu | Réflexions, Plans de leçon | `provenance` doit être `OFFICIAL_CURRICULUM` ou `OFFICIAL_STANDARD` pour tout claim pédagogique |
| 1.2 | L'enseignant participe à des communautés d'apprentissage professionnelles | **B** | Hors du périmètre ScorgIA V7 | — | — |

### TQS-2 — Planification et instruction efficaces

| # | Principe | Catégorie | Implication pour ScorgIA | Documents concernés | Règle de validation |
|---|----------|-----------|--------------------------|---------------------|---------------------|
| 2.1 | Toute leçon est ancrée dans les résultats d'apprentissage officiels | **A** | `curriculum_outcome_ids` est un champ requis pour les plans de leçon | Plans de leçon | Au moins 1 RA lié — score `CURRICULUM_ALIGNMENT` < 0.5 si absent |
| 2.2 | L'enseignant différencie l'instruction selon les besoins des élèves | **A** | Section différenciation obligatoire (peut être minimale) | Plans de leçon | `differentiation` doit être présent — peut être `MISSING` avec alerte |
| 2.3 | L'enseignant utilise des stratégies d'évaluation pour informer l'instruction | **A** | Section évaluation formative requise dans les plans | Plans de leçon | `evaluation.formative` requis pour score ≥ READY |
| 2.4 | L'enseignant contextualise l'apprentissage à la communauté et au milieu | **B** | Champ `contexte_classe` suggéré — non bloquant si absent | Plans de leçon, Séquences | Avertissement si contexte manquant (non bloquant) |

### TQS-3 — Environnement d'apprentissage positif et inclusif

| # | Principe | Catégorie | Implication pour ScorgIA | Documents concernés | Règle de validation |
|---|----------|-----------|--------------------------|---------------------|---------------------|
| 3.1 | L'enseignant promeut un environnement respectueux de la diversité | **A** | ScorgIA ne génère PAS de regroupements d'élèves basés sur des diagnostics ou des identités protégées | Plans de soutien, Tableau de bord | **Blocage dur** : aucun diagnostic dans le plan collectif |
| 3.2 | L'enseignant applique les principes de l'UDL | **B** | Les supports UDL (universels, ciblés, spécialisés) sont structurés dans les plans de leçon | Plans de leçon | Score `INCLUSION` pénalisé si aucun support universel identifié |

### TQS-4 — Connaissances fondamentales des PNMI

| # | Principe | Catégorie | Implication pour ScorgIA | Documents concernés | Règle de validation |
|---|----------|-----------|--------------------------|---------------------|---------------------|
| 4.1 | L'enseignant intègre les perspectives des Premières Nations, Métis et Inuit | **A** | ScorgIA V7 inclut `perspectives_autochtones` dans les plans de leçon (champ optionnel) | Plans de leçon, Séquences | Suggestion si absent — non bloquant V7, prévu V8 |
| 4.2 | L'enseignant connaît et respecte les Traités | **B** | Hors périmètre de génération V7 — section référence uniquement | — | — |

### TQS-5 — Application de cadres légaux et réglementaires

| # | Principe | Catégorie | Implication pour ScorgIA | Documents concernés | Règle de validation |
|---|----------|-----------|--------------------------|---------------------|---------------------|
| 5.1 | L'enseignant applique les politiques scolaires et de district | **A** | ScorgIA NE GÉNÈRE JAMAIS les politiques (absences, notation, discipline, IA) — affiche `MISSING` | Syllabus | **Blocage dur** : champs `politique_*` ne peuvent pas avoir `provenance.type = AI_GENERATED` |
| 5.2 | L'enseignant respecte la FOIP (Freedom of Information and Protection of Privacy) | **A** | Données élèves pseudonymisées avant transmission à l'IA | Plans de soutien | **Blocage dur** : `eleve_id` brut jamais dans le prompt IA |

### TQS-6 — Collaboration et leadership

| # | Principe | Catégorie | Implication pour ScorgIA | Documents concernés | Règle de validation |
|---|----------|-----------|--------------------------|---------------------|---------------------|
| 6.1 | L'enseignant collabore avec les familles et la communauté | **B** | ScorgIA peut suggérer des communications mais ne les envoie pas | — | — |

---

## 2. Structure du curriculum Alberta Education (K-12)

**SOURCE :** Alberta Education, *Curriculum Implementation Framework* (2023)  
**Applicable aux matières repensées :** mathématiques, sciences, sciences sociales, arts du langage

### Éléments structurants officiels

| Élément | Définition officielle | Niveau dans ScorgIA | Provenance attendue |
|---------|-----------------------|---------------------|---------------------|
| Grandes idées (Big Ideas) | Compréhensions durables que les élèves emportent au-delà de l'école | `grandes_idees` dans UnitPlanV7 | `OFFICIAL_CURRICULUM` |
| Résultats d'apprentissage spécifiques (RA/SLO) | Connaissances et habiletés mesurables | `CurriculumOutcomeV7.type = 'SPECIFIC'` | `OFFICIAL_CURRICULUM` |
| Compétences (Competencies) | Six compétences transversales albertaines | `TransversalCompetencyId` dans les plans | `OFFICIAL_CURRICULUM` |
| Questions directrices (Guiding Questions) | Questions qui orientent l'unité | `question_directrice` dans CurriculumOutcomeV7 | `CURRICULUM_DERIVED` |
| Connaissances conceptuelles | Concepts à comprendre | `connaissances` dans CurriculumOutcomeV7 | `CURRICULUM_DERIVED` |
| Connaissances procédurales | Compétences à maîtriser | `habiletes` dans CurriculumOutcomeV7 | `CURRICULUM_DERIVED` |
| Littératie et numératie | Intégrées dans toutes les matières | Champ `literacy_numeracy` dans séquences | `OFFICIAL_CURRICULUM` |

### Six compétences transversales officielles Alberta

| ID ScorgIA | Compétence officielle | Source |
|------------|----------------------|--------|
| `pensee_critique` | Critical Thinking | TQS 2023 + Curriculum Framework |
| `resolution_problemes` | Problem Solving | TQS 2023 + Curriculum Framework |
| `communication` | Communication | TQS 2023 + Curriculum Framework |
| `collaboration` | Collaboration | TQS 2023 + Curriculum Framework |
| `gestion_information` | Managing Information | TQS 2023 + Curriculum Framework |
| `creativite_innovation` | Creative and Critical Thinking | TQS 2023 + Curriculum Framework |
| `citoyennete` | Citizenship | TQS 2023 + Curriculum Framework |
| `developpement_personnel` | Personal Growth and Well-Being | TQS 2023 + Curriculum Framework |

**Règle de validation :** Les compétences déclarées dans un plan doivent avoir un champ `justification` non vide — ScorgIA ne doit pas cocher des cases sans expliciter la connexion observable.

---

## 3. Éducation inclusive — Alberta (FOIP + PUB 4.2)

**SOURCE :** Alberta Education, *Standards for Special Education* + *Human Rights Act* (Alberta)  
**SOURCE 2 :** Alberta Education, *Guidelines for Special Education Coding*

### Principes d'inclusion applicables à ScorgIA

| # | Principe | Catégorie | Implication | Règle |
|---|----------|-----------|-------------|-------|
| INC-1 | Environnement le moins restrictif | **A** | Aucun plan ScorgIA ne doit suggérer l'exclusion d'un élève d'une activité | Plan de leçon — différenciation |
| INC-2 | Plans d'enseignement individualisés (PEI/IPP) génèrent des obligations légales | **A** | ScorgIA ne génère PAS de PEI — elle peut aider à documenter des stratégies si l'enseignant les fournit | Plan de soutien | `designation_officielle` provenance = `OFFICIAL_STANDARD` uniquement |
| INC-3 | Aucune information identifiable ne circule sans consentement | **A** | Pseudonymisation obligatoire, `niveau_confidentialite` requis | Tous plans de soutien | **Blocage dur** |
| INC-4 | Besoins individuels ne figurent pas dans le plan collectif | **C** | Décision produit — les plans de leçon proposent des supports universels et ciblés, pas des accommodations nominatives | Plans de leçon | Vérification par audit humain |

### Niveaux UDL (Universal Design for Learning)

| Niveau | Définition | Public cible | Exemple dans ScorgIA |
|--------|-----------|--------------|----------------------|
| **Universel** | Pour tous les élèves, intégré par défaut | 100 % de la classe | Supports visuels, choix de représentation |
| **Ciblé** | Pour les élèves présentant des difficultés spécifiques, temporaires | ~15–20 % | Textes simplifiés, scaffolding supplémentaire |
| **Spécialisé** | Pour les élèves avec des besoins complexes persistants | ~2–5 % | Adapté selon PEI — NON généré par ScorgIA |

---

## 4. Règles absolues ScorgIA — Alberta V7.0

Ces règles ne sont pas des recommandations. Elles reflètent des contraintes légales (FOIP, Human Rights Act, Standards for Special Education) ou des décisions produit non négociables.

| Code | Règle | Catégorie | Conséquence si violée |
|------|-------|-----------|----------------------|
| **ABS-01** | ScorgIA ne génère JAMAIS les politiques scolaires | **A** | Afficher `[À compléter par l'enseignant — politique du district]` |
| **ABS-02** | ScorgIA ne génère JAMAIS les coordonnées d'un enseignant | **A** | Champ vide + instruction claire |
| **ABS-03** | ScorgIA ne pose JAMAIS de diagnostic sur un élève | **A** | Bug critique — à corriger immédiatement |
| **ABS-04** | ScorgIA ne nomme JAMAIS un élève dans un plan collectif | **A** | Bug critique — à corriger immédiatement |
| **ABS-05** | ScorgIA ne prétend JAMAIS connaître "le meilleur groupe" | **C** | Toujours fournir la justification + laisser l'enseignant modifier |
| **ABS-06** | ScorgIA ne prétend JAMAIS qu'un score de qualité "prouve" la qualité réelle | **C** | Afficher "Score indicatif — jugement de l'enseignant requis" |
| **ABS-07** | L'identifiant brut d'un élève ne circule jamais dans un prompt IA | **A** | Pseudonymisation systématique, vérification en CI |

---

## 5. V7.1 — Travaux prévus (hors périmètre V7.0)

| Thème | Référence | Priorité estimée |
|-------|-----------|-----------------|
| Intégration FNMI frameworks officiels | Alberta Education FNMI Curriculum | Haute |
| Multilittératie dans les plans | Alberta Curriculum Competencies | Moyenne |
| Alignement PEI / Plan de soutien V7 avec formulaires officiels Alberta | Standards for Special Education | Haute |
| Validation externe TQS par partenaire pédagogique | ATA / ARPDC | V8 |

---

*Document maintenu par l'équipe produit KlassIA+. Dernière révision : 2026-08-17.*
