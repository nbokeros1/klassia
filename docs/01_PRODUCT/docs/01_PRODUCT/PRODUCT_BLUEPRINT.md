# KLASSIA — PRODUCT BLUEPRINT

Document ID : PRD-001  
Version : 1.0  
Statut : Actif  
Propriétaire : Eddy Nwaha  
Type : Plan directeur du produit  
Dernière mise à jour : 2026-07-09  

---

# 1. Objet du document

Ce document constitue le plan directeur fonctionnel de Klassia.

Il définit :

- la mission globale du produit ;
- ses utilisateurs ;
- ses principaux domaines fonctionnels ;
- ses objets métier ;
- les relations entre les modules ;
- les parcours utilisateurs principaux ;
- les règles produit communes ;
- la stratégie d’évolution.

Ce document ne décrit pas :

- les détails visuels de chaque écran ;
- l’implémentation technique ;
- les tables précises de la base de données ;
- les prompts complets de l’intelligence artificielle ;
- les demandes de modification propres à un sprint.

Ces informations sont décrites dans les documents spécialisés.

---

# 2. Définition du produit

Klassia est une plateforme d’intelligence pédagogique conçue pour accompagner les professionnels de l’éducation avant, pendant et après l’enseignement.

Klassia permet notamment de :

- organiser les classes ;
- exploiter les curriculums ;
- préparer les contenus pédagogiques ;
- produire des plans de leçon ;
- créer des évaluations et des ressources ;
- accompagner l’enseignement en classe ;
- suivre les apprentissages ;
- conserver une mémoire pédagogique durable ;
- retrouver rapidement les documents produits.

Klassia ne doit pas être perçu comme un simple chatbot ou un générateur de documents.

Klassia est un environnement de travail pédagogique intelligent.

---

# 3. Mission du produit

La mission de Klassia est de réduire la charge de travail répétitive des enseignants afin qu’ils puissent consacrer davantage de temps :

- à la qualité de leurs cours ;
- à leurs élèves ;
- à l’accompagnement pédagogique ;
- à la créativité ;
- à l’analyse des apprentissages.

Klassia ne remplace pas l’enseignant.

Klassia amplifie son expertise et facilite son travail.

---

# 4. Ambition

Klassia est conçu pour devenir une plateforme pédagogique internationale.

Le produit doit pouvoir s’adapter progressivement :

- à plusieurs pays ;
- à plusieurs langues ;
- à plusieurs curriculums ;
- à plusieurs systèmes scolaires ;
- à plusieurs types d’établissements ;
- à plusieurs profils professionnels.

Le premier marché ou le premier curriculum pris en charge constitue une stratégie de lancement, et non une limitation permanente du produit.

---

# 5. Utilisateur principal

L’utilisateur principal actuel est l’enseignant.

L’enseignant utilise Klassia pour :

- créer ses classes ;
- importer ou consulter ses curriculums ;
- produire ses documents pédagogiques ;
- organiser ses ressources ;
- préparer ses cours ;
- enseigner ;
- évaluer ;
- suivre ses élèves ;
- reprendre un travail précédent ;
- recevoir des recommandations contextuelles.

Les futurs profils pourront inclure :

- direction d’établissement ;
- conseiller pédagogique ;
- coordonnateur ;
- élève ;
- parent ;
- district scolaire ;
- ministère ;
- université ou institution de formation.

Ces profils futurs ne doivent pas compliquer inutilement l’expérience actuelle de l’enseignant.

---

# 6. Principe d’architecture produit

Le produit est centré sur le contexte pédagogique de l’enseignant.

La structure principale est :

Enseignant  
→ Établissement  
→ Classe  
→ Matière  
→ Curriculum  
→ Productions pédagogiques  
→ Élèves  
→ Évaluations  
→ Suivi  
→ Mémoire pédagogique  

La classe constitue le principal espace de contexte.

La production pédagogique constitue le principal résultat du travail effectué dans Klassia.

L’intelligence pédagogique relie les données, les documents, l’historique et les recommandations.

---

# 7. Domaines fonctionnels

Klassia est organisé autour des domaines suivants.

## 7.1 Dashboard

Question principale :

> Que dois-je faire maintenant ?

Le Dashboard présente :

- la situation du jour ;
- les informations essentielles ;
- les rappels ;
- les activités récentes ;
- la prochaine action recommandée ;
- l’accès rapide aux fonctions principales.

Document associé :

`docs/01_PRODUCT/modules/DASHBOARD.md`

---

## 7.2 Mes Classes

Question principale :

> Dans quel espace pédagogique vais-je travailler ?

Le module permet de :

- créer une classe ;
- consulter les classes existantes ;
- identifier leur état ;
- ouvrir une classe ;
- accéder aux dossiers de la classe ;
- reprendre un travail ;
- consulter la progression ;
- accéder à la préparation et à l’enseignement.

Document associé :

`docs/01_PRODUCT/modules/CLASSES.md`

---

## 7.3 Préparer — Atelier IA

Question principale :

> Que dois-je produire ou améliorer aujourd’hui ?

Le module Préparer est le centre de production pédagogique de Klassia.

Il permet de :

- travailler avec l’intelligence artificielle en streaming ;
- produire des contenus pédagogiques ;
- utiliser le contexte de la classe et de la matière ;
- consulter l’historique ;
- modifier ou compléter une production ;
- exporter en Word ;
- imprimer ;
- sauvegarder dans le dossier approprié ;
- alimenter la mémoire pédagogique.

Document associé :

`docs/01_PRODUCT/modules/PREPARER.md`

---

## 7.4 Enseigner

Question principale :

> De quels outils ai-je besoin pendant mon cours ?

Le module pourra regrouper :

- présentation du contenu ;
- mode plein écran ;
- chronomètre ;
- minuteur ;
- tirage aléatoire ;
- création de groupes ;
- sondages ;
- outils interactifs ;
- accès à la préparation du cours ;
- annotations ou observations rapides.

Document associé :

`docs/01_PRODUCT/modules/ENSEIGNER.md`

---

## 7.5 Évaluer

Question principale :

> Comment créer, administrer et analyser une évaluation ?

Le module pourra permettre de :

- créer des évaluations ;
- produire des corrigés ;
- créer des grilles et rubriques ;
- saisir ou importer les résultats ;
- produire des rétroactions ;
- analyser les apprentissages ;
- relier l’évaluation au curriculum et aux leçons.

Document associé :

`docs/01_PRODUCT/modules/EVALUER.md`

---

## 7.6 Suivre

Question principale :

> Comment évoluent les élèves et quelles interventions sont nécessaires ?

Le module pourra regrouper :

- observations ;
- progression ;
- difficultés ;
- objectifs ;
- interventions ;
- résultats ;
- historique pédagogique ;
- recommandations d’accompagnement.

Document associé :

`docs/01_PRODUCT/modules/SUIVRE.md`

---

## 7.7 Bibliothèque

Question principale :

> Comment retrouver rapidement une ressource, peu importe sa classe ou son dossier ?

La Bibliothèque ne remplace pas les dossiers des classes.

Les dossiers servent à organiser les documents dans leur contexte.

La Bibliothèque sert à rechercher et retrouver les documents dans l’ensemble de Klassia.

Elle pourra rechercher dans :

- toutes les classes ;
- tous les dossiers ;
- les plans de leçon ;
- les évaluations ;
- les ressources ;
- les curriculums ;
- les productions IA ;
- les documents importés ;
- les exports disponibles ;
- les métadonnées et contenus pédagogiques.

La Bibliothèque devient progressivement le moteur de recherche interne de Klassia.

Document associé :

`docs/01_PRODUCT/modules/BIBLIOTHEQUE.md`

---

## 7.8 Intelligence pédagogique

Question principale :

> Comment Klassia utilise-t-il le contexte pour aider l’enseignant ?

L’intelligence pédagogique doit pouvoir utiliser :

- le profil de l’enseignant ;
- la classe sélectionnée ;
- la matière sélectionnée ;
- le curriculum ;
- les documents existants ;
- les productions récentes ;
- l’historique ;
- les préférences ;
- les données de progression disponibles.

Elle doit progressivement permettre :

- la génération contextualisée ;
- la continuité entre les productions ;
- les recommandations ;
- la reprise du travail ;
- la classification des documents ;
- les suggestions de dossier ;
- la vérification pédagogique ;
- l’anticipation des besoins.

Document associé :

`docs/01_PRODUCT/modules/IA.md`

---

## 7.9 Paramètres

Question principale :

> Comment adapter Klassia à mon contexte professionnel ?

Le module pourra inclure :

- profil ;
- langue ;
- établissement ;
- préférences pédagogiques ;
- préférences IA ;
- paramètres d’affichage ;
- abonnements et crédits ;
- sécurité ;
- notifications ;
- intégrations.

Document associé :

`docs/01_PRODUCT/modules/PARAMETRES.md`

---

# 8. Objets métier principaux

## 8.1 Enseignant

Représente l’utilisateur professionnel principal.

Il possède :

- un profil ;
- des classes ;
- des préférences ;
- un historique ;
- des productions ;
- une mémoire pédagogique.

---

## 8.2 Établissement

Représente le contexte organisationnel de l’enseignant.

Il peut regrouper :

- les enseignants ;
- les classes ;
- les modèles institutionnels ;
- les documents partagés ;
- les règles internes.

---

## 8.3 Classe

Constitue l’espace de travail pédagogique principal.

Elle regroupe :

- les matières ;
- les élèves ;
- les dossiers ;
- les curriculums ;
- les préparations ;
- les évaluations ;
- les ressources ;
- la mémoire contextuelle.

---

## 8.4 Matière

Une classe peut posséder une ou plusieurs matières.

La matière permet de structurer :

- les curriculums ;
- les dossiers ;
- les plans ;
- les leçons ;
- les évaluations ;
- les ressources.

---

## 8.5 Curriculum

Le curriculum représente la référence pédagogique officielle.

Il alimente notamment :

- les intentions pédagogiques ;
- les résultats d’apprentissage ;
- les compétences ;
- la progression ;
- les recommandations IA ;
- la conformité des productions.

---

## 8.6 Production pédagogique

Une production pédagogique est tout contenu créé, modifié ou organisé dans Klassia.

Exemples :

- curriculum importé ;
- plan annuel ;
- séquence ;
- plan de leçon ;
- activité ;
- exercice ;
- évaluation ;
- corrigé ;
- grille ;
- rubrique ;
- ressource ;
- communication ;
- présentation.

Chaque production doit pouvoir posséder :

- un titre ;
- un type ;
- un contenu ;
- une classe ;
- une matière ;
- un dossier ;
- une date ;
- un auteur ;
- un statut ;
- un historique.

---

## 8.7 Dossier

Le dossier organise les productions dans le contexte d’une classe.

La structure actuelle des dossiers doit être conservée.

Aucune production sauvegardée ne doit rester sans dossier valide.

Le dossier caché `Autre` constitue le filet de sécurité lorsque le classement exact ne peut pas être déterminé.

---

## 8.8 Conversation IA

La conversation représente l’interaction entre l’enseignant et Klassia.

Elle peut contenir :

- les demandes ;
- les réponses ;
- le contexte utilisé ;
- les productions générées ;
- les actions liées aux productions ;
- les références aux documents.

Une conversation ne doit pas être confondue avec la production pédagogique sauvegardée.

---

## 8.9 Mémoire pédagogique

La mémoire pédagogique conserve les informations utiles à la continuité du travail.

Elle peut comprendre :

- les documents récents ;
- le contexte de classe ;
- les préférences ;
- les décisions précédentes ;
- les productions importantes ;
- les éléments nécessaires à une prochaine génération.

La mémoire ne remplace pas la source de vérité documentaire.

---

# 9. Relations principales

Les relations fonctionnelles sont les suivantes :

- un enseignant appartient à un ou plusieurs contextes d’établissement ;
- un enseignant possède plusieurs classes ;
- une classe possède plusieurs matières ;
- chaque matière possède sa structure de dossiers ;
- une matière peut être associée à un curriculum ;
- une production appartient à une classe ;
- une production appartient à un dossier ;
- une production peut appartenir à une matière ;
- une conversation peut générer plusieurs productions ;
- une production peut être retrouvée par la classe, le dossier ou la Bibliothèque ;
- l’intelligence pédagogique utilise le contexte sans remplacer les données officielles.

---

# 10. Parcours utilisateur principal

Le parcours principal actuel est :

1. L’utilisateur se connecte.
2. Il consulte son Dashboard.
3. Il choisit une classe.
4. Il choisit une matière.
5. Il entre dans Préparer.
6. Il formule une demande.
7. Klassia utilise le contexte disponible.
8. La réponse est générée en streaming.
9. La production est affichée.
10. L’utilisateur peut la compléter ou la modifier.
11. Il peut exporter en Word.
12. Il peut imprimer.
13. Il peut sauvegarder.
14. Il choisit ou confirme le dossier.
15. La production rejoint l’arborescence de la classe.
16. Elle devient retrouvable depuis la classe et, à terme, depuis la Bibliothèque.

---

# 11. Règles produit globales

## 11.1 Préserver l’existant

Les modules fonctionnels déjà développés ne doivent pas être reconstruits sans raison confirmée.

Les améliorations doivent être incrémentales.

---

## 11.2 Une source de vérité

Chaque type de donnée doit posséder une source officielle clairement identifiée.

Les caches et mémoires secondaires ne doivent pas devenir silencieusement la source de vérité.

---

## 11.3 Aucun document orphelin

Toute production sauvegardée doit appartenir à un dossier valide.

Le système doit utiliser un dossier de sécurité lorsque le classement exact échoue.

---

## 11.4 Contexte explicite

L’utilisateur doit toujours pouvoir identifier :

- la classe active ;
- la matière active ;
- la production concernée ;
- l’état de sauvegarde ;
- le dossier de destination.

---

## 11.5 Actions liées à la production

Les actions Word, Imprimer et Sauvegarder doivent toujours agir sur la production sélectionnée.

Elles ne doivent pas dépendre d’un état global ambigu.

---

## 11.6 Résilience

Une panne de l’intelligence artificielle ne doit pas empêcher l’utilisateur :

- d’accéder à ses classes ;
- de consulter ses documents ;
- d’utiliser les fonctions non IA ;
- de retrouver ses productions sauvegardées.

---

## 11.7 Simplicité

Une fonctionnalité ne doit pas être ajoutée si elle complique davantage le travail qu’elle ne le simplifie.

---

## 11.8 Protection du travail

Le contenu produit par l’utilisateur doit être protégé contre :

- la perte ;
- l’écrasement involontaire ;
- le mauvais classement ;
- l’action appliquée au mauvais document ;
- les erreurs silencieuses.

---

# 12. Stratégie d’évolution

L’ordre général de priorité est :

## Phase 1 — Stabilisation

- streaming ;
- productions ;
- actions Word, Imprimer et Sauvegarder ;
- classement ;
- export ;
- historique ;
- contexte IA ;
- gestion des erreurs.

## Phase 2 — Continuité

- reprendre le dernier travail ;
- restaurer une conversation ;
- restaurer une production ;
- restaurer le contexte classe/matière ;
- historique exploitable.

## Phase 3 — Assistance proactive

- Assistant quotidien ;
- recommandations de classe ;
- suggestions de production ;
- propositions de dossier ;
- prochaine action recommandée.

## Phase 4 — Recherche et mémoire

- Bibliothèque globale ;
- recherche intelligente ;
- recherche dans le contenu ;
- filtres ;
- réutilisation ;
- continuité entre les leçons.

## Phase 5 — Écosystème

- direction ;
- collaboration ;
- élèves ;
- parents ;
- réseaux scolaires ;
- intégrations institutionnelles.

---

# 13. Critères de qualité du produit

Une évolution de Klassia est acceptable seulement si :

- elle résout un problème clairement identifié ;
- elle préserve les fonctionnalités stables ;
- elle réduit le temps ou les efforts de l’utilisateur ;
- elle ne crée pas de dépendance inutile ;
- elle gère les données absentes ;
- elle produit des erreurs compréhensibles ;
- elle respecte le contexte de la classe ;
- elle ne provoque pas de perte de données ;
- elle peut être testée ;
- elle possède des critères d’acceptation précis.

---

# 14. Références

Documents de fondation :

- `docs/00_FOUNDATION/00_MANIFESTO.md`
- `docs/00_FOUNDATION/01_VISION.md`
- `docs/00_FOUNDATION/02_PRODUCT_PRINCIPLES.md`

Documents produit :

- `docs/01_PRODUCT/modules/DASHBOARD.md`
- `docs/01_PRODUCT/modules/CLASSES.md`
- `docs/01_PRODUCT/modules/PREPARER.md`
- `docs/01_PRODUCT/modules/ENSEIGNER.md`
- `docs/01_PRODUCT/modules/EVALUER.md`
- `docs/01_PRODUCT/modules/SUIVRE.md`
- `docs/01_PRODUCT/modules/BIBLIOTHEQUE.md`
- `docs/01_PRODUCT/modules/IA.md`
- `docs/01_PRODUCT/modules/PARAMETRES.md`

---

# 15. Résumé stratégique

Klassia s’organise autour de trois éléments fondamentaux :

1. La classe fournit le contexte.
2. Préparer produit le contenu.
3. L’intelligence pédagogique assure la continuité et l’assistance.

Les dossiers organisent les productions dans chaque classe.

La Bibliothèque permet de les retrouver dans l’ensemble du produit.

Le Dashboard guide l’utilisateur vers sa prochaine action.

Klassia doit évoluer sans reconstruire inutilement ce qui fonctionne déjà.