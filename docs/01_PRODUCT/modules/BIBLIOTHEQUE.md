# KLASSIA — BIBLIOTHÈQUE

Document ID : PRD-MOD-007  
Version : 1.0  
Statut : Actif  
Propriétaire : Eddy Nwaha  
Stratégie : Construire au-dessus de l’architecture documentaire existante  
Principe central : Rechercher sans déplacer ni dupliquer les documents  

---

# 1. Mission

La Bibliothèque est le moteur de recherche documentaire global de Klassia.

Elle permet à l’enseignant de retrouver rapidement une ressource sans devoir se souvenir :

- de la classe concernée ;
- de la matière ;
- du dossier ;
- de la date de création ;
- du type exact de document.

La Bibliothèque ne devient pas une deuxième arborescence.

Elle fournit une vue transversale sur tous les contenus déjà organisés dans les dossiers des classes.

---

# 2. Question principale

La Bibliothèque répond à cette question :

> Comment retrouver rapidement n’importe quelle ressource pédagogique dans Klassia ?

Exemples :

- retrouver une leçon sur les fractions ;
- retrouver une évaluation créée l’année précédente ;
- retrouver toutes les ressources liées à un résultat d’apprentissage ;
- retrouver un fichier Word importé ;
- retrouver les documents produits pour une matière ;
- retrouver une production sans connaître son dossier.

---

# 3. Principe d’architecture

Les dossiers restent la source officielle d’organisation documentaire.

La Bibliothèque lit les données existantes sans les déplacer.

Le fonctionnement attendu est :

Classe  
→ Matière  
→ Dossier  
→ Document  

La Bibliothèque fournit une autre manière d’accéder à ce même document :

Recherche  
→ Résultats  
→ Document original  

Une ressource affichée dans la Bibliothèque reste toujours liée à :

- sa classe ;
- sa matière lorsqu’elle est pédagogique ;
- son dossier ;
- son type ;
- son fichier ou contenu original.

---

# 4. Source de vérité

La source de vérité documentaire est :

`fichiers_dossier`

La Bibliothèque ne doit pas créer une deuxième copie des documents dans une autre table uniquement pour les afficher.

Elle peut utiliser des index, métadonnées ou caches de recherche, mais ceux-ci ne remplacent jamais la source de vérité.

Chaque résultat doit pouvoir retrouver le document original.

---

# 5. Contenus concernés

La Bibliothèque doit pouvoir afficher progressivement :

- plans de leçons ;
- curriculums ;
- plans annuels ;
- séquences ;
- leçons ;
- évaluations ;
- corrigés ;
- grilles ;
- rubriques ;
- exercices ;
- activités ;
- ressources ;
- documents administratifs ;
- communications aux parents ;
- fichiers Word ;
- PDF ;
- présentations ;
- feuilles de calcul ;
- images ;
- liens pédagogiques ;
- fichiers importés ;
- productions générées avec Klassia.

Tous les formats ne seront pas nécessairement indexés de la même manière dès la première version.

---

# 6. Distinction avec Mes Classes

## Mes Classes

Permet de travailler dans un contexte précis.

Exemple :

5e année A  
→ Mathématiques  
→ Ressources  
→ Fractions.pdf  

## Bibliothèque

Permet de chercher dans tous les contextes.

Exemple :

Recherche : `fractions`

Résultats :

- Plan de leçon — Mathématiques — 5e année A
- Évaluation — Mathématiques — 6e année
- Ressource PDF — Mathématiques — 5e année A
- Activité — Mathématiques — 4e année

Les deux expériences sont complémentaires.

---

# 7. Expérience utilisateur

La Bibliothèque doit être simple.

L’écran principal contient :

1. une grande barre de recherche ;
2. des filtres ;
3. une liste ou grille de résultats ;
4. un aperçu rapide ;
5. les informations de contexte ;
6. les actions principales.

L’utilisateur doit pouvoir commencer à chercher immédiatement.

Il ne doit pas être obligé de sélectionner une classe avant la recherche.

---

# 8. Barre de recherche

La barre de recherche constitue l’action principale de la page.

Texte recommandé :

> Rechercher dans toutes vos classes, matières et ressources…

La recherche peut porter sur :

- le titre ;
- le contenu textuel ;
- le type ;
- la matière ;
- la classe ;
- le dossier ;
- les mots-clés ;
- les métadonnées ;
- le curriculum associé ;
- la date.

Exemples de recherches :

- fractions ;
- évaluation diagnostique ;
- texte argumentatif ;
- sciences 5e ;
- plan de leçon novembre ;
- documents pour français 10 ;
- ressources différenciation.

---

# 9. Filtres

Les filtres permettent de réduire les résultats.

Filtres recommandés :

- classe ;
- matière ;
- type de contenu ;
- dossier ;
- format de fichier ;
- date ;
- auteur ;
- document généré ou importé ;
- favori ;
- récent.

La recherche doit fonctionner sans filtre.

Les filtres servent uniquement à affiner.

---

# 10. Résultats de recherche

Chaque résultat doit afficher au minimum :

- titre ;
- type de document ;
- classe ;
- matière, lorsqu’elle existe ;
- dossier ;
- date de modification ;
- extrait ou aperçu ;
- icône ou format.

Actions possibles :

- Ouvrir ;
- Prévisualiser ;
- Télécharger ou exporter si disponible ;
- Déplacer ;
- Renommer ;
- Ajouter aux favoris ;
- Utiliser dans Préparer ;
- Voir dans sa classe.

L’action « Voir dans sa classe » doit ouvrir l’emplacement original du document.

---

# 11. Recherche multi-matières

La Bibliothèque doit tenir compte du modèle multi-matières.

Une même classe peut contenir plusieurs matières.

La recherche doit donc distinguer clairement :

- la classe ;
- la matière ;
- le dossier.

Exemple :

`Évaluation — 5e année A — Mathématiques`

et non seulement :

`Évaluation — 5e année A`

Cette précision évite les ambiguïtés dans les classes du primaire et du secondaire.

---

# 12. Recherche intelligente

À terme, la Bibliothèque ne doit pas dépendre uniquement d’une correspondance exacte de mots.

Exemple :

Recherche :

> activité pour travailler la compréhension d’un texte

La Bibliothèque peut retrouver :

- lecture guidée ;
- questions de compréhension ;
- texte narratif ;
- activité d’inférence ;
- fiche de lecture.

La recherche intelligente peut utiliser :

- les mots-clés ;
- les synonymes ;
- les métadonnées ;
- le contenu ;
- les objectifs pédagogiques ;
- les résultats d’apprentissage ;
- la similarité sémantique.

Cette évolution doit être progressive.

La première version peut commencer avec une recherche textuelle fiable.

---

# 13. Intégration avec Préparer

Un document trouvé dans la Bibliothèque doit pouvoir être utilisé dans l’Atelier IA.

Action recommandée :

> Utiliser dans Préparer

Cette action doit transmettre :

- le document ;
- sa classe ;
- sa matière ;
- son type ;
- son contenu disponible ;
- son emplacement d’origine.

Exemples :

- adapter une ancienne leçon ;
- créer une nouvelle évaluation à partir d’une ressource ;
- améliorer un document ;
- utiliser un curriculum comme contexte ;
- reprendre une production existante.

Le document original ne doit pas être modifié automatiquement.

---

# 14. Intégration avec les dossiers

La Bibliothèque doit toujours afficher l’emplacement du document.

Exemple :

5e année A  
→ Mathématiques  
→ Préparation  
→ Plans de leçons  

L’utilisateur doit pouvoir cliquer sur cet emplacement pour ouvrir directement le dossier original.

La Bibliothèque ne doit jamais masquer l’organisation réelle du document.

---

# 15. États de la page

## Aucun document

Message :

> Votre Bibliothèque est encore vide.

Actions :

- Créer une classe ;
- Préparer un document ;
- Importer une ressource.

## Aucun résultat

Message :

> Aucun document ne correspond à cette recherche.

Actions :

- Modifier les mots-clés ;
- Retirer certains filtres ;
- Rechercher dans toutes les classes.

## Résultats disponibles

Afficher les résultats classés par pertinence.

## Erreur de chargement

Message clair :

> Impossible de charger la Bibliothèque pour le moment.

L’utilisateur doit pouvoir réessayer.

---

# 16. Classement des résultats

Par défaut, les résultats peuvent être classés selon :

1. pertinence ;
2. date de modification ;
3. date de création.

Autres options possibles :

- titre ;
- classe ;
- matière ;
- type ;
- plus utilisé ;
- récent.

La pertinence doit rester le classement principal pour une recherche textuelle.

---

# 17. Documents importés

Les documents importés doivent apparaître dans la Bibliothèque s’ils sont enregistrés dans `fichiers_dossier`.

La Bibliothèque doit distinguer :

- document généré par Klassia ;
- document importé ;
- document créé manuellement ;
- lien externe.

Si le contenu textuel n’est pas disponible, la recherche peut utiliser au minimum :

- le titre ;
- le nom du fichier ;
- le type ;
- la classe ;
- la matière ;
- le dossier ;
- les métadonnées.

---

# 18. Permissions et sécurité

La Bibliothèque ne doit afficher que les documents que l’utilisateur est autorisé à consulter.

Elle doit respecter :

- l’utilisateur connecté ;
- l’établissement ;
- les classes accessibles ;
- les éventuels documents partagés ;
- les permissions futures.

Une recherche globale ne signifie pas un accès global à toutes les données de la plateforme.

---

# 19. Performance

La Bibliothèque doit rester rapide même lorsque le nombre de documents augmente.

La première liste ne doit pas charger tout le contenu complet de tous les documents.

Elle doit utiliser :

- pagination ;
- limite de résultats ;
- chargement progressif ;
- requêtes filtrées ;
- index adaptés ;
- aperçus légers.

Le contenu complet peut être chargé au moment de l’ouverture.

---

# 20. Éléments à ne pas faire

Ne pas :

- remplacer les dossiers ;
- déplacer automatiquement les documents ;
- dupliquer tous les contenus ;
- afficher des documents sans emplacement identifiable ;
- mélanger les données de plusieurs utilisateurs ;
- envoyer tous les documents à l’IA à chaque recherche ;
- construire une recherche intelligente complexe avant une recherche textuelle fiable ;
- rendre l’accès aux classes inutile.

---

# 21. Première version recommandée

La première version de la Bibliothèque doit rester maîtrisée.

Elle doit permettre :

- d’afficher les documents de `fichiers_dossier` ;
- de rechercher par titre ;
- de filtrer par classe ;
- de filtrer par matière ;
- de filtrer par type ;
- d’ouvrir le document ;
- de voir son dossier d’origine ;
- de l’utiliser dans Préparer.

La recherche dans le contenu complet et la recherche sémantique viendront ensuite.

---

# 22. Évolutions futures

Les évolutions possibles comprennent :

- recherche dans le contenu ;
- recherche sémantique ;
- suggestions automatiques ;
- documents similaires ;
- favoris ;
- collections personnelles ;
- ressources partagées par l’école ;
- bibliothèque institutionnelle ;
- recherche par résultat d’apprentissage ;
- détection de doublons ;
- recommandations de réutilisation ;
- historique d’utilisation ;
- partage entre enseignants.

---

# 23. Critères d’acceptation

La Bibliothèque sera conforme lorsque :

- elle utilise les documents existants ;
- elle ne remplace pas les dossiers ;
- chaque résultat indique sa classe ;
- chaque résultat indique sa matière lorsque nécessaire ;
- chaque résultat indique son dossier ;
- la recherche fonctionne sans sélectionner une classe ;
- les filtres fonctionnent ;
- un résultat peut être ouvert ;
- son emplacement original peut être retrouvé ;
- il peut être transmis à Préparer ;
- les permissions sont respectées ;
- les données absentes sont gérées proprement ;
- aucune duplication documentaire inutile n’est créée.

---

# 24. Résumé stratégique

Les Classes organisent les ressources selon leur contexte.

Les dossiers définissent leur emplacement officiel.

La Bibliothèque permet de les retrouver globalement.

Préparer permet de les créer, les modifier et les réutiliser.

Ces quatre éléments forment le cycle documentaire principal de Klassia :

Créer  
→ Sauvegarder  
→ Classer  
→ Retrouver  
→ Réutiliser  