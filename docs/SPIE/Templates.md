# Templates ScorgIA
## Gabarits officiels de planification pédagogique

> Référence : [Provincial_Engine.md](Provincial_Engine.md)  
> TypeScript : `src/lib/spie/types/resources.ts`, `src/lib/constants/templates-provinciaux.ts`  
> Version : SPIE-01

---

## 1. Philosophie des gabarits

Un gabarit ScorgIA est :
- **Versionné** : chaque mise à jour a un numéro de version avec changelog
- **Modifiable** : l'enseignant peut personnaliser les champs
- **Remplaçable** : l'enseignant peut importer son propre gabarit
- **Compatible** : tous les gabarits produisent le même `LessonPlan` SPIE

Un gabarit n'est **pas** une reproduction officielle d'un document ministériel. C'est une structure inspirée des pratiques provinciales, que l'enseignant adapte.

---

## 2. Gabarits officiels ScorgIA — Alberta

### 2a. Plan de leçon (Alberta)

**Sections de l'en-tête**
- Nom de l'enseignant
- Niveau scolaire
- Matière
- Durée
- Numéro/Titre de la leçon

**Sections du cadre pédagogique**
- RAG : Résultat d'apprentissage général
- RAS : Résultat d'apprentissage spécifique
- Intention pédagogique
- Intégration de la langue (vocabulaire / oral / écrit / visuel)
- Évaluation (formative + sommative)
- Perspective autochtone (optionnel)
- Différenciation (Universel / Ciblé / Spécialisé)

**AVANT — Préparation / Amorce**
- Temps prévu
- Connexion et connaissances antérieures
- Matériaux / Ressources

**PENDANT — Réalisation**
- Temps prévu
- Modélisation (l'enseignant démontre)
- Pratique guidée (en groupe / binôme)
- Pratique autonome (travail individuel)
- Matériaux / Ressources

**APRÈS — Intégration / Évaluation**
- Temps prévu
- Retour sur les apprentissages
- Matériaux / Ressources

**Fichier TypeScript** : `TEMPLATES_PROVINCIAUX['alberta']` dans `src/lib/constants/templates-provinciaux.ts`

---

### 2b. Plan de séquence (Alberta)

**En-tête**
- Titre de la séquence
- Niveau / Matière
- Durée (en semaines)
- Dates prévues

**Cadre**
- RAG(s) couverts
- Fil conducteur (big question)
- Nombre de leçons prévues
- Évaluation sommative prévue

**Leçons incluses**
- Liste ordonnée avec numéro, titre, durée, RAS ciblés

**Fichier TypeScript** : à créer dans `src/lib/spie/templates/alberta/` (SPIE-03)

---

### 2c. Plan annuel (Alberta)

**En-tête**
- Enseignant / Classe / Niveau / Matière
- Année scolaire
- Curriculum de référence

**Séquences**
- Liste chronologique de séquences avec durée, RAG couverts, dates

**Couverture curriculaire**
- Tableau RAG × couverture (planifié / enseigné / évalué)

**Calendrier**
- Semaines disponibles avec événements

**Fichier TypeScript** : à créer dans `src/lib/spie/templates/alberta/` (SPIE-03)

---

## 3. Gabarits des autres provinces

Les gabarits pour Ontario, Québec, CB, Saskatchewan sont définis dans `TEMPLATES_PROVINCIAUX` (fichier `src/lib/constants/templates-provinciaux.ts`).

Ils existent comme gabarits de champs de formulaire. Leur extension en `Template` SPIE (avec versionnement) se fait dans SPIE-03.

---

## 4. Gabarits personnalisés

L'enseignant peut :
1. **Importer son gabarit** : upload d'un fichier Word → `src/app/api/ia/analyser-gabarit` l'analyse et extrait la structure
2. **Modifier un gabarit existant** : ajouter/supprimer des champs, changer les labels
3. **Partager un gabarit** : exporter son gabarit pour un collègue

**Contrainte** : Un gabarit personnalisé doit inclure au minimum :
- Un champ `titre`
- Un champ `niveau`
- Un champ `matiere`
- Au moins une phase (AVANT, PENDANT ou APRÈS)

---

## 5. Versionnement des gabarits

Exemple de cycle de vie d'un gabarit officiel :

```
Template v1.0 (2024-09-01)
  └─ Gabarit Alberta initial

Template v1.1 (2025-01-15)
  └─ Ajout du champ "Ressources numériques"
  └─ Migration optionnelle pour les leçons existantes

Template v2.0 (2026-08-03)
  └─ Refonte complète selon SPIE-01
  └─ Migration automatique avec mappage des anciens champs
  └─ Rétrocompatibilité : les anciennes leçons restent lisibles
```

---

## 6. Relation avec build-system-prompt.ts

Le fichier `src/lib/ia/build-system-prompt.ts` contient les gabarits Markdown intégrés dans le prompt de génération. Ces gabarits sont différents des `Template` SPIE :

| `build-system-prompt.ts` gabarits | `Template` SPIE |
|-----------------------------------|-----------------|
| Format Markdown pour l'IA | Formulaire pour l'enseignant |
| Contient les règles absolues de formatage | Contient les champs et labels |
| Détermine la sortie brute de l'IA | Détermine l'affichage dans l'UI |
| Modifié très rarement (règle absolue) | Modifiable par l'enseignant |

Les deux doivent rester synchronisés. SPIE-03 formalisera ce lien.
