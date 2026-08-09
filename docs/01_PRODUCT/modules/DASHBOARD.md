# KLASSIA — DASHBOARD

Document ID: PRD-MOD-001  
Version: 1.0  
Status: Active  
Owner: Eddy Nwaha  
Module: Dashboard  
Current Quality: 8/10  
Strategy: Preserve and enhance. Do not rebuild.

---

# 1. Mission du Dashboard

Le Dashboard est la page d’accueil principale de Klassia.

Son rôle n’est pas seulement d’afficher des statistiques.

Son rôle est de répondre immédiatement à cette question :

> Que dois-je faire maintenant ?

Quand un enseignant ouvre Klassia, il doit comprendre en moins de 5 secondes :

- ce qui est prévu aujourd’hui ;
- ce qui est urgent ;
- ce qui est incomplet ;
- où reprendre son travail ;
- ce que Klassia recommande ;
- quelle action faire ensuite.

Le Dashboard doit donner l’impression que Klassia travaille déjà avec l’enseignant.

---

# 2. État actuel

Le Dashboard actuel est considéré comme stable.

Qualité estimée : 8/10.

Les éléments suivants sont validés :

- sidebar existante ;
- navigation générale ;
- cartes statistiques ;
- raccourcis d’action ;
- agenda ;
- rappel ;
- cohérence visuelle ;
- responsive de base ;
- palette bleu/violet déjà acceptable.

Ces éléments ne doivent pas être supprimés.

Ils peuvent être améliorés, enrichis ou réorganisés légèrement, mais jamais remplacés entièrement sans validation.

---

# 3. Règles de préservation

Claude Code doit respecter les règles suivantes :

1. Ne pas refaire complètement le Dashboard.
2. Ne pas supprimer la sidebar.
3. Ne pas supprimer les cartes statistiques existantes.
4. Ne pas supprimer l’agenda existant.
5. Ne pas changer brutalement la palette de couleurs.
6. Ne pas modifier les routes sans diagnostic préalable.
7. Ne pas casser les données existantes.
8. Ne pas introduire de nouvelle dépendance lourde sans validation.
9. Toute amélioration doit être incrémentale.
10. Le Dashboard doit rester compatible avec l’architecture actuelle.

Objectif :

> Faire évoluer le Dashboard de 8/10 vers 10/10 sans casser l’existant.

---

# 4. Problème actuel

Le Dashboard actuel ressemble encore trop à un tableau de bord administratif.

Il affiche des informations, mais il n’agit pas encore comme un assistant pédagogique intelligent.

Le problème principal n’est pas le design.

Le problème principal est l’absence de présence intelligente.

Aujourd’hui, l’utilisateur voit :

- des chiffres ;
- des cartes ;
- des raccourcis ;
- un agenda.

Demain, il doit sentir :

> Klassia a compris ma journée et me propose quoi faire.

---

# 5. Expérience cible

Quand l’enseignant arrive sur le Dashboard, Klassia doit l’accueillir avec une section intelligente.

Exemple :

> Bonjour Eddy 👋  
> J’ai préparé votre journée.  
> Vous avez 2 cours prévus aujourd’hui, 1 préparation incomplète et 1 document récent à reprendre.  
> Je vous recommande de terminer la préparation de Français 10 avant 8 h 45.

Boutons possibles :

- Continuer mon travail
- Préparer le prochain cours
- Demander à Klassia

Cette section doit devenir la priorité visuelle du haut de page.

---

# 6. Hiérarchie recommandée

Le Dashboard doit suivre cet ordre :

## Niveau 1 — Assistant quotidien

Carte principale en haut.

Elle affiche :

- message personnalisé ;
- prochaine action recommandée ;
- résumé de la journée ;
- bouton d’action principal.

## Niveau 2 — Reprendre le travail

Section permettant de reprendre :

- dernier plan de leçon ;
- dernière évaluation ;
- dernier curriculum ;
- dernière génération IA ;
- dernier document non finalisé.

## Niveau 3 — Statistiques utiles

Conserver les statistiques actuelles, mais les rendre plus pédagogiques.

Exemples :

- classes actives ;
- cours préparés ;
- documents générés ;
- évaluations créées ;
- temps estimé économisé.

## Niveau 4 — Agenda et rappels

Conserver l’agenda.

L’améliorer progressivement pour qu’il affiche :

- événements du jour ;
- cours à venir ;
- tâches incomplètes ;
- préparations urgentes.

## Niveau 5 — Raccourcis

Conserver les raccourcis, mais prioriser les actions les plus fréquentes :

- Préparer une leçon
- Ouvrir mes classes
- Créer une évaluation
- Demander à Klassia

---

# 7. Assistant quotidien

L’Assistant quotidien est la principale amélioration du Dashboard.

Il doit être visible dès l’ouverture.

Il ne doit pas remplacer le Dashboard existant.

Il doit s’ajouter au-dessus ou près du haut de page.

## Objectif

Donner à l’enseignant une prochaine action claire.

## Contenu minimum

- salutation personnalisée ;
- résumé rapide ;
- recommandation principale ;
- bouton d’action.

## Exemple de contenu

Bonjour Eddy 👋

J’ai préparé votre journée.

Vous avez actuellement :

- 5 classes actives ;
- 1 préparation récente ;
- 0 tâche urgente ;
- 4 cours enregistrés.

Recommandation :

Commencer par préparer votre prochaine leçon.

Bouton :

Préparer maintenant

---

# 8. Bouton principal

Le Dashboard doit avoir un bouton principal clair.

Le bouton actuel “Outils enseignant” peut être remplacé ou complété par :

> Demander à Klassia

Ce bouton doit ouvrir l’assistant IA ou rediriger vers l’espace IA existant.

Il doit être visible, simple et cohérent.

---

# 9. États à prévoir

Le Dashboard doit gérer plusieurs états.

## Nouvel utilisateur

Aucune classe créée.

Message :

Bienvenue dans Klassia.  
Commencez par créer votre première classe.

Action principale :

Créer une classe

## Utilisateur avec classes mais sans curriculum

Message :

Vos classes sont créées.  
La prochaine étape est d’importer ou configurer le curriculum.

Action principale :

Charger le curriculum

## Utilisateur actif

Message :

Voici votre journée et vos prochaines actions.

Action principale :

Continuer mon travail

## Aucun événement aujourd’hui

Message :

Aucun cours prévu aujourd’hui.  
Vous pouvez préparer vos prochaines leçons ou organiser vos ressources.

Action principale :

Préparer une leçon

## Travail incomplet

Message :

Vous avez une préparation incomplète.  
Voulez-vous la reprendre ?

Action principale :

Reprendre

---

# 10. Règles UX

Le Dashboard doit respecter ces règles :

1. L’utilisateur doit comprendre quoi faire en moins de 5 secondes.
2. Une seule action principale doit dominer la page.
3. Les cartes ne doivent pas être seulement décoratives.
4. Chaque information affichée doit aider à décider ou agir.
5. Les états vides doivent guider l’utilisateur.
6. L’IA doit être visible sans envahir l’interface.
7. Les messages doivent rester professionnels, courts et utiles.
8. Les emojis peuvent être utilisés avec modération.
9. Le Dashboard ne doit pas devenir une page surchargée.
10. Toute donnée absente doit avoir un fallback propre.

---

# 11. Données utiles pour l’Assistant quotidien

L’Assistant quotidien peut utiliser progressivement :

- prénom ou email de l’utilisateur ;
- nombre de classes ;
- nombre de cours ;
- nombre de leçons ;
- tâches ou rappels ;
- derniers documents créés ;
- documents incomplets ;
- événements du jour ;
- prochaine classe ;
- dernière activité ;
- recommandations IA.

Si certaines données ne sont pas encore disponibles, utiliser un message générique propre.

---

# 12. Priorités d’amélioration

## Priorité 1

Ajouter la carte Assistant quotidien.

Impact : très élevé.  
Risque : faible.  
Type : ajout incrémental.

## Priorité 2

Ajouter “Continuer mon travail”.

Impact : très élevé.  
Risque : moyen.  
Type : dépend des données disponibles.

## Priorité 3

Renommer ou compléter “Outils enseignant” par “Demander à Klassia”.

Impact : élevé.  
Risque : faible.

## Priorité 4

Améliorer les états vides.

Impact : élevé.  
Risque : faible.

## Priorité 5

Ajouter des recommandations IA contextuelles.

Impact : très élevé.  
Risque : moyen à élevé.  
À faire seulement après stabilisation du contexte IA.

---

# 13. Ce qu’il ne faut pas faire maintenant

Ne pas :

- refaire tout le Dashboard ;
- changer toute la navigation ;
- supprimer les statistiques ;
- remplacer l’agenda ;
- ajouter trop de nouvelles cartes ;
- créer une interface complètement différente ;
- introduire des animations complexes ;
- dépendre d’une IA pour afficher toute la page ;
- bloquer le Dashboard si l’IA échoue.

Le Dashboard doit fonctionner même si l’IA est indisponible.

---

# 14. Critères de réussite

Le Dashboard sera considéré amélioré si :

- l’utilisateur voit immédiatement une recommandation claire ;
- l’interface actuelle reste reconnaissable ;
- les éléments existants ne sont pas cassés ;
- l’assistant quotidien s’intègre naturellement ;
- les données manquantes sont bien gérées ;
- la page reste rapide ;
- l’expérience donne davantage l’impression d’un copilote pédagogique.

---

# 15. Résumé stratégique

Le Dashboard ne doit pas devenir une nouvelle page.

Il doit devenir une page plus intelligente.

La mission est simple :

> Conserver la structure actuelle, ajouter une couche d’assistance proactive, et faire sentir que Klassia accompagne réellement l’enseignant.