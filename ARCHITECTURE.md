# KlassIA+ — ARCHITECTURE.md
Document de référence — à lire avant toute session de développement

> Avant une session de correction ou de développement, lis la section
> concernée — pas tout le document. Ce document décrit l'état VOULU.
> S'il contredit le code réel, le code réel doit être corrigé pour
> rejoindre ce document, jamais l'inverse sans en discuter d'abord.

## 1. Ce que KlassIA+ est — et n'est pas

**KlassIA+ est :**
- Un assistant de préparation pédagogique pour enseignants canadiens
  (et bientôt américains), qui génère du contenu aligné sur le
  curriculum officiel de leur province.
- Un système d'organisation de fichiers par classe, qui reste utile
  même sans génération IA.
- Un outil qui respecte STRICTEMENT un gabarit de plan de leçon
  fourni par l'enseignant ou son institution.

**KlassIA+ n'est pas :**
- Un générateur de contenu "créatif" sans contrainte.
- Une source de contenu culturel ou autochtone — KlassIA+ structure
  et oriente vers les bonnes ressources, jamais n'invente de savoir
  culturel.
- Un produit qui sacrifie la fiabilité pour la vitesse.

## 2. Règles d'or — non négociables

1. Aucune génération ne doit jamais être incomplète sans que
   l'enseignant ne s'en rende compte. Une troncature se gère
   automatiquement et invisiblement (continuation côté serveur).
2. Aucun bruit conversationnel n'est sauvegardé comme fichier.
3. Un seul mapping type de contenu → dossier existe dans le code,
   réutilisé partout (sauvegarde automatique et manuelle).
4. "KlassIA+" s'écrit toujours en entier, jamais "KlassIA" seul.
5. Toute action qui modifie/remplace du contenu existant passe par
   une confirmation explicite de l'enseignant.
6. Avant de déclarer une correction terminée : test réel dans le
   navigateur, pas seulement tsc --noEmit.

## 3. Architecture des contenus

| Type | Définition | Dossier cible |
|---|---|---|
| Curriculum | Référentiel officiel (RAG, RAS, unités) | Préparation → Curriculum |
| Plan annuel | Vue macro de l'année | Préparation → Plan annuel |
| Plan de leçon | LE SQUELETTE pédagogique. Gabarit 7 blocs, condensé (2-3 pages). Décrit l'intention, le RAS, le minutage — sans développer les exercices en entier. | Préparation → Plans de leçons |
| Leçon | LE DÉPLOIEMENT COMPLET d'un Plan de leçon existant. Développe tout en détail. Livré en Word détaillé ET PowerPoint avec notes, ou Mode TBI. | Leçons |

**Le flux Plan de leçon → Leçon :**
1. Enseignant génère un Plan de leçon (Préparer)
2. Plan sauvegardé dans Préparation/Plans de leçons
3. Bouton « ✨ Développer en leçon complète » visible sur le Plan
4. L'IA lit le Plan existant (plan_lecon_id en référence) et génère
   le déploiement complet
5. Résultat sauvegardé dans Leçons, lié au Plan d'origine

**Une Leçon ne peut JAMAIS être créée sans Plan de leçon d'origine.**

**Ressources — ce qui y va, ce qui n'y va pas :**
- VA dans Ressources : fichiers importés par upload manuel ; contenu
  généré dont le type est explicitement "ressource".
- NE VA PAS dans Ressources : tout contenu généré dont le type est
  identifié (curriculum, plan annuel, plan de leçon, leçon, quiz).
  Un type non reconnu → pas d'auto-sauvegarde, modal manuel.

## 4. Mapping technique type_contenu → dossier

Source unique de vérité (colonne `nom` des dossiers, pas `type`) :
Type absent de ce mapping → PAS d'auto-sauvegarde, modal manuel.

## 5. Numérotation des leçons

- Calculée automatiquement : compter les entrées existantes dans le
  dossier de la classe/matière, +1.
- Préfixe du nom de fichier : "L[n] — [titre généré]"
- Le numéro du Plan de leçon est réutilisé pour la Leçon développée
  correspondante — jamais recalculé séparément.

## 6. Génération complète — zéro bouton « continuer »

- Ligne de défense 1 : contenu condensé par défaut (2-3 pages).
- Ligne de défense 2 : si troncature, continuation AUTOMATIQUE et
  INVISIBLE côté serveur (max 3 relances), concaténée avant de
  répondre au client. Jamais de bouton "continuer" visible.

## 7. Le gabarit officiel de Plan de leçon

7 blocs exacts, à ne jamais étendre :
1. Nom | Niveau scolaire | Matière | Durée | Leçon #
2. Programme d'étude (RAG/RAS narratifs) | Intention pédagogique
3. Intégration de la langue (vocabulaire/oral/écrit/visuel) | Évaluation
4. Perspective autochtone (brève) | Différenciation (universel/ciblé/spécialisé)
5. AVANT — Connexion et connaissances antérieures | Matériaux
6. PENDANT — Modélisation / Pratique guidée / Pratique autonome | Matériaux
7. APRÈS — Retour et clôture | Matériaux

**Garde-fous de contenu :**
- Chaque activité découle d'un RAS déclaré.
- La case Évaluation précise toujours un support concret de trace.
- Le bloc AVANT ne contient aucun contenu d'enseignement nouveau.
- Aucun cadre théorique (Bruner ou autre) n'est nommé explicitement.
- Perspective autochtone : 2-3 puces courtes, jamais un contenu
  culturel inventé.

## 8. Tables clés de la base de données

- `classes` — une classe d'un enseignant, avec ses matières.
- `dossiers_systeme` — arborescence par classe/matière.
- `fichiers_dossier` — un fichier rangé, avec type_fichier, statut
  (brouillon_ia / rangé), et plan_lecon_id pour lier une Leçon à
  son Plan d'origine.
- `conversations_ia` — fil de conversation complet de Préparer.
- `utilisateurs` — profil, province, palier, forfait, is_admin.
- `evenements_calendrier` — cours, jours fériés, calendrier scolaire.
- `studio_ia_memoire` — index des documents générés pour injection dans
  le contexte IA. **Deux schémas coexistent** selon le chemin d'écriture :
  - Via `action/route.ts` (chemin principal) : colonnes plates `titre` + `contenu_texte`
  - Via `nourrirIA()` : colonnes `cle` + `contenu` (JSONB avec `contenu_texte` imbriqué)
  Le SELECT dans `assistant/route.ts` doit demander les deux groupes de
  colonnes pour couvrir les deux chemins. **Ne pas "normaliser" vers un
  seul schéma sans mettre à jour toutes les routes d'écriture et de
  lecture simultanément** (voir Option B — tâche séparée).

**Comportement intentionnel — curriculum vs studio_ia_memoire :**
`curriculum/route.ts` injecte son contenu directement dans le `body` de
la requête (`contenu_curriculum`) sans passer par `studio_ia_memoire`.
C'est voulu : le curriculum est une ressource officielle volumineuse
transmise à la demande, pas indexée. Ne pas "corriger" ce comportement.

## 9. Forfaits — rappel condensé

| | Gratuit | Pro | Pro+ | Institution |
|---|---|---|---|---|
| Générations | 5 à vie | 50-100/mois | Illimité | Illimité |
| Classes max | 1 | 8 | Illimité | Illimité |
| Matières/classe | Primaire: illimité · Secondaire: 1 | Illimité | Illimité | Illimité |

La cascade d'onboarding (1er plan annuel + syllabus + agenda) est
toujours hors-quota, une seule fois par compte.

## 10. Exports — Word, PowerPoint, PDF

- Word et PowerPoint partagent le même moteur de rendu que l'aperçu
  écran — jamais une logique de conversion séparée.
- PDF via impression navigateur : CSS @media print dédié.
- Tout document exporté porte l'en-tête visuel KlassIA+ (logo
  officiel, pas juste du texte).

## 11. Workflow de développement avec Claude Code

Avant chaque session de correction :
1. Identifier la section de ce document concernée.
2. Demander un AUDIT du code réel avant toute correction.
3. Limiter la portée aux fichiers strictement nécessaires.
4. Exiger un test réel dans le navigateur avant de déclarer terminé.
5. Si une session touche des fichiers déjà corrigés précédemment,
   vérifier explicitement que rien n'a été perdu.