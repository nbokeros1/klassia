# KLASSIA

# CLASSES MODULE SPECIFICATION

Document ID : PRD-MOD-002

Version : 1.0

Status : Active

Owner : Eddy Nwaha

Current Implementation : Stable

Current Quality : 8.5/10

Strategy : Preserve & Enhance

---

# 1. Mission

Le module **Mes Classes** constitue le point d'entrée du travail pédagogique.

Chaque classe représente un espace de travail intelligent contenant toutes les informations, ressources et productions liées à un même groupe d'élèves.

L'objectif de cette page n'est pas simplement d'afficher une liste de classes.

Son objectif est de permettre à l'enseignant de comprendre immédiatement où il en est et quelle est la prochaine action à effectuer.

---

# 2. Objectifs

Le module doit permettre de :

- créer une nouvelle classe ;
- retrouver rapidement une classe ;
- ouvrir son espace de travail ;
- connaître son état de progression ;
- reprendre le travail précédent ;
- accéder rapidement aux outils de préparation, d'enseignement et d'évaluation.

---

# 3. État actuel

Le module existe déjà.

Les éléments suivants sont considérés comme stables.

## À préserver

✓ Affichage par cartes

✓ Création d'une classe

✓ Informations générales

✓ Matières

✓ Statistiques

✓ Boutons existants

✓ Navigation

✓ Responsive

✓ Design général

Ces éléments doivent être conservés.

Les améliorations devront rester incrémentales.

---

# 4. Une classe dans KlassIA

Une classe n'est pas simplement une fiche.

Une classe constitue le contexte principal de tout le travail pédagogique.

Elle regroupe notamment :

- les informations générales ;
- les matières ;
- les élèves ;
- les curriculums ;
- les dossiers ;
- les plans de leçons ;
- les évaluations ;
- les ressources ;
- les événements ;
- les productions IA ;
- la mémoire pédagogique.

Toutes les productions doivent être reliées à une classe.

---

# 4.1 Modèle multi-matières

Une classe peut contenir une ou plusieurs matières.

Cette règle s’applique aussi bien au primaire qu’au secondaire.

## Exemple primaire

Une même classe peut contenir :

- Français
- Mathématiques
- Sciences
- Études sociales
- Arts
- Santé
- Éducation physique

## Exemple secondaire

Un enseignant peut enseigner plusieurs matières dans une même classe, par exemple :

- Mathématiques
- Informatique
- Sciences

Chaque matière possède son propre contexte pédagogique et sa propre structure documentaire.

La structure attendue est :

Classe
├── Matière 1
│   ├── Préparation
│   │   ├── Curriculum
│   │   ├── Plan annuel
│   │   └── Plans de leçons
│   ├── Leçons
│   ├── Évaluations sommatives
│   └── Ressources
├── Matière 2
│   ├── Préparation
│   ├── Leçons
│   ├── Évaluations sommatives
│   └── Ressources
├── Élèves
├── Administration
├── Parents
├── Événements
└── Autre

Les dossiers Élèves, Administration, Parents, Événements et Autre sont communs à la classe.

Les dossiers pédagogiques sont propres à chaque matière.

Lorsqu’un enseignant prépare, importe ou sauvegarde un document, KlassIA doit toujours conserver les deux niveaux de contexte :

- la classe ;
- la matière.

Une production pédagogique ne doit jamais être classée uniquement par classe si elle concerne une matière précise.

# 5. La page Mes Classes

La page Mes Classes répond à une seule question.

> Dans quel espace pédagogique vais-je travailler ?

L'utilisateur doit comprendre en quelques secondes :

- quelles classes existent ;
- lesquelles nécessitent une action ;
- lesquelles sont déjà prêtes ;
- lesquelles demandent encore du travail.

---

# 6. Les cartes

Chaque carte représente une classe.

Elle doit afficher uniquement les informations réellement utiles.

## Informations obligatoires

- Nom de la classe
- Niveau scolaire
- Matières
- Progression générale

## Informations recommandées

- Nombre d'élèves
- Nombre de leçons
- Nombre d'évaluations
- Dernière activité

Ces informations doivent rester simples.

---

# 7. Ouverture d'une classe

Lorsqu'un enseignant ouvre une classe, il entre dans son espace de travail.

Cet espace permet d'accéder notamment à :

- Curriculum
- Préparation
- Plans de leçons
- Évaluations
- Ressources
- Élèves
- Administration
- Parents
- Événements

La structure actuelle des dossiers est conservée.

---

# 8. Les dossiers

Les dossiers constituent le système officiel d'organisation documentaire.

Ils permettent de classer toutes les productions pédagogiques.

Ils ne doivent pas être remplacés par la Bibliothèque.

Chaque production sauvegardée doit appartenir à un dossier valide.

Le dossier "Autre" reste le dossier de sécurité.

---

# 9. Reprendre le travail

Chaque classe doit permettre de reprendre rapidement le dernier travail effectué.

Exemples :

- dernière préparation ;
- dernière évaluation ;
- dernière ressource créée ;
- dernière conversation IA.

L'objectif est d'éviter à l'enseignant de rechercher où il s'était arrêté.

---

# 10. Actions principales

Les actions principales d'une classe sont :

- Ouvrir
- Préparer
- Enseigner
- Évaluer

Ces actions utilisent automatiquement le contexte de la classe.

L'utilisateur ne doit pas avoir à reconfigurer ce contexte.

---

# 11. États d'une classe

Une classe peut être dans différents états.

## Nouvelle

Classe créée.

Curriculum absent.

Action recommandée :

Importer le curriculum.

---

## En préparation

Curriculum importé.

Préparations en cours.

Action recommandée :

Continuer la préparation.

---

## Active

Préparations disponibles.

Évaluations disponibles.

Action recommandée :

Enseigner.

---

## Archivée

Année terminée.

Consultation uniquement.

---

# 12. Évolutions futures

Les évolutions prévues comprennent notamment :

- recommandations intelligentes ;
- résumé de la classe ;
- indicateurs de progression ;
- calendrier de la classe ;
- alertes pédagogiques ;
- collaboration entre enseignants.

Ces évolutions devront enrichir la page sans modifier son organisation générale.

---

# 13. Ce qu'il ne faut pas faire

Ne pas :

- reconstruire la page ;
- remplacer les cartes ;
- supprimer les dossiers ;
- transformer la page en tableau complexe ;
- mélanger les rôles de la Bibliothèque et des dossiers.

---

# 14. Critères d'acceptation

Le module est conforme lorsque :

✓ les cartes existantes sont conservées ;

✓ l'ouverture d'une classe fonctionne ;

✓ les dossiers restent accessibles ;

✓ le contexte de la classe est conservé ;

✓ les actions principales restent disponibles ;

✓ les améliorations ne provoquent aucune régression.

---

# 15. Vision

Une classe représente le contexte principal de tout le travail pédagogique.

Le Dashboard répond :

"Que dois-je faire ?"

Les Classes répondent :

"Où vais-je travailler ?"

Le module Préparer répond :

"Que vais-je produire ?"

Ces trois modules constituent le cœur de l'expérience KlassIA.