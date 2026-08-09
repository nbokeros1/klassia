# CLAUDE_CONTEXT — KlassIA+

> Ce fichier est à coller en début de conversation avec Claude (claude.ai)
> avant de poser toute question sur ce projet.
> Il remplace le briefing verbal — lis-le une fois, garde-le ouvert.

---

## C'est quoi ce projet

KlassIA+ est un SaaS pédagogique pour enseignants francophones canadiens.
L'idée centrale : un enseignant arrive sur la plateforme, sélectionne sa classe,
et génère un plan de leçon complet en quelques minutes — conforme au curriculum
provincial, structuré selon le gabarit institutionnel Campus Saint-Jean,
exportable en Word directement utilisable.

Le produit est en développement actif depuis plusieurs mois. Il y a une base
fonctionnelle solide, mais aussi de la dette technique documentée et des bugs
identifiés. La priorité de la sprint actuelle est la stabilisation, pas
l'ajout de fonctionnalités.

**Fondateur :** Eddy Nwaha (enwaha22@gmail.com)
**Développeur sprint :** Tobie
**Référent technique IA :** Claude (Anthropic) — c'est moi

---

## Stack technique

| Composant | Technologie |
|---|---|
| Frontend | Next.js 16, App Router, TypeScript, Tailwind CSS |
| Backend | Next.js Route Handlers (pas de serveur séparé) |
| Base de données | Supabase (PostgreSQL + Auth + Storage + Realtime) |
| IA / LLM | Anthropic API — Claude Sonnet 4.6 (claude-sonnet-4-6) |
| Export Word | docxtemplater + PizZip (remplissage gabarit .docx réel) |
| Déploiement | Vercel (frontend + API) + Supabase Canada East |

**Port local :** 3002 (3000 souvent occupé)
**Projet Supabase :** qacdbcycjzgjygeaujqk (Canada East)
**Repo GitHub :** nbokeros1

---

## Fichiers critiques — ne pas toucher sans diagnostic préalable

Ces fichiers sont au cœur de la logique IA et de la sauvegarde.
Un changement non tracé ici casse des choses ailleurs silencieusement.

```
src/app/api/ia/assistant/route.ts     → génération IA, streaming SSE, contexte mémoire
src/app/api/ia/action/route.ts        → auto-save, détection du type de contenu
src/app/dashboard/gerer/preparer/page.tsx → interface chat principale
src/lib/ia/build-system-prompt.ts     → prompt système envoyé à Anthropic
src/lib/constants/mapping-dossiers.ts → correspondance type_contenu → dossier
```

**Règle absolue :** lire ARCHITECTURE.md à la racine du projet avant
chaque session Claude Code. Ce fichier existe précisément pour éviter
que des corrections validées soient silencieusement écrasées.

---

## Architecture — décisions prises, non à remettre en question

**Sources de données :**
- `fichiers_dossier` = source de vérité. Contient le Markdown complet dans `contenu_html`.
- `studio_ia_memoire` = cache secondaire pour imports Studio IA uniquement.
  Colonnes réelles : `id, enseignant_id, classe_id, cle, contenu (JSONB), type, created_at, updated_at`.
  Il n'y a pas de colonne `titre`, `contenu_texte`, ni `est_actif` — les corrections
  qui référencent ces colonnes sont fausses et doivent être corrigées.

**Dossiers de classe :**
- Le trigger `creer_dossiers_classe` itère sur `NEW.matieres[]` avec `unnest()`.
  Pas sur `NEW.matiere` (texte, une seule valeur) — ce bug a été corrigé.
- Un dossier `Autre` caché (`est_visible_utilisateur = false`) existe par classe
  comme filet de sécurité. Jamais de `dossier_id = null` en base.
- Le mapping de dossiers utilise `dossiers_systeme.nom` (pas `.type`).

**Pipeline de contexte IA :**
- La requête vers `studio_ia_memoire` filtre par `classe_id` avec `.or()`.
  Il n'y a pas de filtre `est_actif` — cette colonne n'existe pas.
- Limite : 12 documents maximum, triés par `created_at DESC`.

**Migrations Supabase :**
- Le tableau Migrations dans le dashboard Supabase est vide.
- Tout a été appliqué manuellement via SQL Editor.
- Ne pas utiliser `supabase db push` sans vérifier l'état réel de la base d'abord.

---

## Structure des dossiers par classe

Chaque matière d'une classe crée ce bloc :

```
[matière] (type: matiere)
├── Préparation (type: preparation)
│   ├── Curriculum (type: curriculum)
│   ├── Plan annuel (type: plan_annuel)
│   └── Plans de leçons (type: plans_lecons)
├── Leçons (type: lecons)
├── Évaluations sommatives (type: evaluations_sommatives)
└── Ressources (type: ressources)
```

Dossiers communs à la classe (une seule fois, `est_commun = true`) :
`Élèves, Administration, Parents, Événements, Autre (caché)`

---

## Gabarit pédagogique — structure non négociable

Tout plan de leçon généré doit suivre le gabarit Campus Saint-Jean :

```
EN-TÊTE (Nom, Niveau scolaire, Matière, Durée, Leçon #)
PROGRAMME D'ÉTUDE / INTENTION PÉDAGOGIQUE
INTÉGRATION DE LA LANGUE / ÉVALUATION
PERSPECTIVE AUTOCHTONE / DIFFÉRENCIATION
AVANT — préparation/amorce (Temps prévu | Connexion | Matériaux)
PENDANT — réalisation (Modélisation | Pratique guidée | Pratique autonome | Matériaux)
APRÈS — intégration/évaluation (Temps prévu | Contenu | Matériaux)
```

Règles strictes dans `build-system-prompt.ts` :
- Pas de blocs numérotés (BLOC 1, BLOC 2...)
- Pas d'emojis de section
- Pas de sections inventées ("Compétences transversales", "Cadre des 4C")
- Pas de SVG inline — tableaux Markdown à la place
- Bruner (Énactif/Iconique/Symbolique) : jamais comme titres explicites, seulement comme inspiration implicite

---

## Bugs documentés au démarrage de la sprint

| Bug | Fichier probable | Priorité |
|---|---|---|
| Export Word corrompu — Word refuse d'ouvrir le .docx | docx/route.ts | S1 Mar |
| Boutons Sauvegarder/Word/Imprimer liés à un état global, disparaissent | ApercuGeneration.tsx | S1 Jeu |
| SVG inline avec attributs kebab-case (stroke-width, font-size) | composants SVG + renderer Markdown | S1 Mer |
| Gabarit régressif — blocs numérotés réapparaissent | build-system-prompt.ts | S2 Lun |
| Prompt générique — l'IA dit "je ne peux pas sauvegarder" | build-system-prompt.ts | S1 Ven |
| Contexte IA — l'IA ne voit pas les documents existants | assistant/route.ts | S2 Mar |

---

## Règles de travail avec Claude

1. **Diagnostiquer avant de corriger.** Jamais de patch sans avoir la cause
   exacte — fichier et ligne. Si Claude Code propose une correction sans
   avoir montré le code problématique, demander le diagnostic d'abord.

2. **Restore before iterate.** Si une correction casse quelque chose,
   revenir à l'état stable avant d'itérer. Ne pas empiler des corrections
   sur un état cassé.

3. **Un prompt, une tâche.** Pas de demandes multiples dans le même message.
   Claude Code traite mieux une chose à la fois.

4. **Rien de silencieux.** Tout comportement inattendu doit être loggé.
   Les `.catch(() => {})` vides sont interdits — remplacer par
   `console.error(...)` avec un préfixe clair.

5. **Pull avant de pousser.** Eddy travaille aussi sur ce repo.
   Toujours synchroniser avant de démarrer une session.

6. **Complet ou rien.** Eddy préfère les remplacements de fichiers complets
   aux snippets partiels — moins de risques de merge erroné.

---

## Contact et comptes

- **Eddy (superviseur) :** enwaha22@gmail.com
- **Compte Supabase :** projet qacdbcycjzgjygeaujqk, région Canada East
- **Compte test Eddy dans l'app :** École Jean Bosco, admin (enwaha22@gmail.com)
- **RLS :** désactivé sur toutes les tables en développement