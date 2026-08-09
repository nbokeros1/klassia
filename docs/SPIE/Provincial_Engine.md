# PPE — Provincial Pedagogy Engine
## Règles et vocabulaire pédagogiques par province

> Référence : [Architecture.md](Architecture.md)  
> TypeScript : `src/lib/spie/engines/ppe/`  
> Version : SPIE-01

---

## 1. Pourquoi un moteur provincial ?

Chaque province canadienne a son propre :
- **Vocabulaire** : RAG/RAS en Alberta, Expectations en Ontario, Compétences en Québec
- **Structure de leçon** : AVANT/PENDANT/APRÈS ≠ Minds On/Action/Consolidation
- **Modèle de différenciation** : Universel/Ciblé/Spécialisé (Alberta) ≠ PEI/accommodements (Ontario)
- **Perspective autochtone** : obligatoire en Alberta, recommandée en Ontario, variable ailleurs
- **Gabarit officiel** : chaque province a son propre format

Le PPE encode ces différences de façon systématique, pour que le contenu généré soit immédiatement reconnaissable par un enseignant de cette province.

---

## 2. Provinces supportées — SPIE-01

| Province | Gabarit | Vocabulaire | Statut |
|----------|---------|-------------|--------|
| Alberta | Complet | RAG/RAS | ✅ Actif |
| Ontario | Complet | Overall/Specific Expectations | ✅ Actif |
| Québec | Complet | Compétences disciplinaires/transversales | ✅ Actif |
| Colombie-Britannique | Complet | Big Ideas / Curricular Competencies | ✅ Actif |
| Saskatchewan | Complet | RAG/RAS/RAT + Indicateurs de rendement | ✅ Actif |
| Manitoba | Partiel (gabarit Alberta) | RAG/RAS | ⚠️ À compléter |
| Nouveau-Brunswick | Partiel (gabarit Alberta) | RAG/RAS | ⚠️ À compléter |
| IB | Adapté (gabarit Ontario) | ATL / Learner Profile | ✅ Actif |
| France | Adapté (gabarit Québec) | Compétences / Socle commun | ⚠️ À compléter |
| Common Core | Adapté (gabarit BC) | Standards | ⚠️ À compléter |

---

## 3. Vocabulaire provincial comparé

| SPIE (neutre) | Alberta | Ontario | Québec | CB |
|---------------|---------|---------|--------|-----|
| `outcomeGeneral` | RAG | Overall Expectation | Compétence disciplinaire | Big Idea |
| `outcomeSpecific` | RAS | Specific Expectation | Indicateur | Curricular Competency |
| `phaseAvant` | Connexion / Amorce | Mise en situation (Minds On) | Préparation / Activation | Hook |
| `phasePendant` | Réalisation | Déroulement (Action) | Réalisation | Apprentissage actif |
| `phaseApres` | Intégration / Évaluation | Objectivation (Consolidation) | Intégration | Consolidation |
| `differentiation_u` | Universel | Accommodements généraux | Différenciation | Universal Design |
| `differentiation_c` | Ciblé | Accommodements | Différenciation ciblée | Targeted Support |
| `differentiation_s` | Spécialisé | Modifications / PEI | Différenciation spécialisée | IEP |

---

## 4. Règles provinciales clés

### Alberta
- Différenciation 3 niveaux (U/C/S) obligatoire
- Intégration de la perspective autochtone recommandée, souvent attendue
- Intégration de la langue (vocabulaire/oral/écrit/visuel) pour les classes d'immersion
- Gabarit officiel : `TEMPLATES_PROVINCIAUX['alberta']`

### Ontario
- "Intentions d'apprentissage" et "Critères de succès" obligatoires
- PSAC (pédagogie culturellement adaptée) pour les classes autochtones
- 3 types d'évaluation : pour / en / de l'apprentissage
- Accommodements et modifications bien distincts

### Québec
- Compétences disciplinaires ET transversales à mobiliser
- SAÉ (Situation d'apprentissage et d'évaluation) comme format préféré
- Réinvestissement / transfert attendu dans la phase APRÈS
- Domaines généraux de formation comme contexte

### Colombie-Britannique
- Big Ideas comme fil conducteur obligatoire
- Core Competencies (Communication / Thinking / Social) à intégrer
- First Peoples Principles of Learning comme cadre de référence
- Gabarit bilingue par défaut (EN/FR selon contexte)

---

## 5. Structure de l'adaptation du prompt

Quand PPE prépare une génération pour l'Alberta, il injecte dans le prompt :

```
PROVINCE : Alberta — Program of Studies
GABARIT : Plan de leçon AVANT/PENDANT/APRÈS (U/C/S)
VOCABULAIRE : RAG, RAS, Différenciation Universel/Ciblé/Spécialisé
SECTIONS OBLIGATOIRES : rag, ras, intention, évaluation, AVANT (amorce), PENDANT (modélisation + pratique guidée), APRÈS (retour)
SECTIONS RECOMMANDÉES : intégration_langue, perspective_autochtone, differentiation
CONTEXTE : Alberta Program of Studies (Alberta Education). Learning outcomes, key concepts, essential questions, competencies.
```

---

## 6. Normes professionnelles (structure)

ScorgIA prépare l'architecture pour associer des normes professionnelles aux leçons générées.

### Teaching Quality Standard — Alberta (structure)
La TQS Alberta définit 6 normes de qualité professionnelle :
1. Fostering Effective Relationships
2. Engaging in Career-Long Learning
3. Demonstrating a Professional Body of Knowledge
4. Establishing Inclusive Learning Environments
5. Applying Foundational Knowledge about First Nations, Métis, and Inuit
6. Adhering to Legal Frameworks and Policies

**Note SPIE-01** : La structure `ProfessionalStandard` est définie dans `src/lib/spie/types/resources.ts`. Le contenu officiel de la TQS sera ajouté dans SPIE-05 (TQE).

### Extensions futures
- Ontario : Teacher Performance Appraisal (TPA)
- Québec : Référentiel de compétences professionnelles
- BC : Professional Standards for BC Educators
- Autres provinces et pays

---

## 7. Architecture d'extension

Pour ajouter une nouvelle province, créer :

1. Un `ProvinceEducation` dans le registre `src/lib/spie/engines/ppe/province-registry.ts` (SPIE-03)
2. Un gabarit dans `src/lib/constants/templates-provinciaux.ts` (ou l'étendre)
3. Un `CURRICULA_CONTEXT` dans `src/lib/constants/curricula.ts`
4. Optionnellement un `ProfessionalStandard` dans la DB

Aucun code central n'est modifié — tout passe par le registre.
