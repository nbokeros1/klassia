# KLASSIA

# PREPARER MODULE SPECIFICATION

Document ID : PRD-MOD-003

Version : 1.0

Status : Active

Owner : Eddy Nwaha

Current Implementation : Stable

Current Quality : 9/10

Strategy : Preserve & Enhance

Related Documents :

- PRODUCT_BLUEPRINT.md
- DASHBOARD.md
- CLASSES.md

---

# 1. Mission

Le module **Préparer** constitue le centre de production pédagogique de KlassIA.

C'est dans ce module que l'enseignant crée, améliore, organise et finalise toutes ses ressources pédagogiques.

L'objectif n'est pas de fournir un simple chatbot.

L'objectif est de mettre à disposition un véritable atelier de travail assisté par l'intelligence artificielle.

L'enseignant reste le concepteur pédagogique.

KlassIA devient son copilote.

---

# 2. Objectifs

Le module doit permettre de :

- produire rapidement des documents pédagogiques de qualité ;
- maintenir la cohérence avec le curriculum ;
- retrouver facilement les productions existantes ;
- conserver le contexte pédagogique ;
- assister l'enseignant pendant toute la création.

---

# 3. Etat actuel

Le module est déjà développé.

Les éléments suivants sont considérés comme stables.

## A préserver

✓ Chat IA en streaming

✓ Génération progressive

✓ Sauvegarde

✓ Export Word

✓ Impression

✓ Historique

✓ Contexte classe / matière

✓ Mémoire IA

✓ Choix du dossier

✓ Architecture actuelle

Ces éléments ne doivent jamais être reconstruits.

Ils doivent uniquement être enrichis.

---

# 4. Le rôle du module

Le module Préparer est l'atelier pédagogique de KlassIA.

Toutes les productions passent par lui.

Exemples :

• Curriculum

• Plan annuel

• Séquence

• Plan de leçon

• Activité

• Exercice

• Evaluation

• Corrigé

• Rubrique

• Lettre aux parents

• Ressource pédagogique

• Présentation

• Document administratif

Le module ne limite pas l'utilisateur.

Il l'accompagne.

---

# 5. Architecture fonctionnelle

Le module est composé de plusieurs zones.

## Contexte

Classe sélectionnée

Matière sélectionnée

Curriculum associé

Mémoire disponible

Historique

Le contexte est utilisé automatiquement par l'IA.

L'utilisateur ne doit pas avoir à le répéter.

---

## Atelier IA

Le chat constitue le cœur de l'atelier.

Il fonctionne en streaming.

Il doit rester conversationnel.

L'enseignant peut :

- poser une question ;
- demander une création ;
- modifier une production ;
- demander une amélioration ;
- poursuivre une conversation existante.

---

## Document vivant

Pendant la génération, le document se construit progressivement.

Une fois terminé, il devient la version de travail officielle.

Il pourra être enrichi, corrigé ou complété sans repartir de zéro.

---

## Historique

Toutes les conversations importantes sont conservées.

L'utilisateur peut reprendre exactement son travail précédent.

---

## Sauvegarde

Le document peut être enregistré dans un dossier choisi par l'utilisateur.

La structure actuelle est conservée.

---

# 6. Flux de travail

Le fonctionnement recommandé est le suivant.

Choisir une classe.

↓

Choisir une matière.

↓

Lancer une demande.

↓

Production en streaming.

↓

Révision.

↓

Export Word.

↓

Impression.

↓

Sauvegarde.

↓

Historique.

↓

Mémoire IA.

Ce flux ne doit pas être interrompu.

---

# 7. Fonctionnalités actuelles

Le module prend déjà en charge :

- génération IA ;
- conversation continue ;
- export Word ;
- impression ;
- sauvegarde ;
- classement par dossiers ;
- mémoire IA ;
- contexte pédagogique.

Ces fonctionnalités constituent la base du produit.

---

# 8. Evolutions prévues

Les évolutions devront respecter la structure actuelle.

Exemples :

- recommandations intelligentes ;
- reprise automatique du dernier travail ;
- compréhension du curriculum ;
- propositions de production ;
- vérification pédagogique ;
- génération contextualisée.

Ces fonctionnalités devront être ajoutées progressivement.

---

# 9. Règles UX

Le module doit respecter les règles suivantes.

L'utilisateur doit toujours savoir :

- où il travaille ;
- ce qu'il est en train de produire ;
- ce qui est enregistré ;
- ce qui reste à faire.

Le chat doit rester simple.

Le document doit rester lisible.

Les actions principales doivent rester accessibles.

---

# 10. Ce qu'il ne faut pas faire

Ne pas remplacer le chat actuel.

Ne pas supprimer le streaming.

Ne pas modifier la logique de sauvegarde.

Ne pas supprimer l'export Word.

Ne pas supprimer l'impression.

Ne pas reconstruire l'architecture.

Ne pas casser le contexte.

Toute amélioration doit être incrémentale.

---

# 11. Vision

A terme, le module Préparer devra être perçu comme un véritable atelier pédagogique.

L'enseignant n'utilisera plus KlassIA pour "générer un document".

Il utilisera KlassIA pour préparer tout son enseignement.

Le succès du module sera atteint lorsque l'utilisateur pourra dire :

"Tout ce que je prépare passe naturellement par KlassIA."

---

# 12. Critères d'acceptation

Le module est considéré conforme lorsque :

✓ le streaming fonctionne toujours ;

✓ le contexte est conservé ;

✓ les exports fonctionnent ;

✓ la sauvegarde fonctionne ;

✓ le classement reste cohérent ;

✓ la mémoire IA reste disponible ;

✓ aucune régression n'est introduite ;

✓ les nouvelles fonctionnalités enrichissent l'expérience sans casser les habitudes de l'utilisateur.