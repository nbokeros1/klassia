# Build My Year — Workflow de génération

**Statut :** SPIE-BETA-01 · Actif  
**Dernière mise à jour :** 2026-08-04

---

## Vue d'ensemble

"Construire mon année scolaire" est un **pipeline SSE (Server-Sent Events)** qui orchestre la génération complète d'un Teaching Pack en une seule passe. L'enseignant voit la progression en temps réel.

```
Enseignant                      Browser                       API /spie/build-year
    │                               │                               │
    │   [Wizard 5 étapes]           │                               │
    │ ─────────────────────────────>│                               │
    │                               │  POST {BuildYearWizardInput}  │
    │                               │ ─────────────────────────────>│
    │                               │                               │ validation
    │                               │◄── SSE: validation/en_cours ──│
    │                               │                               │ curriculum (Claude)
    │                               │◄── SSE: curriculum/en_cours ──│
    │                               │                               │ syllabus (Claude)
    │                               │◄── SSE: syllabus/en_cours ────│
    │                               │                               │ programme_annuel (DB)
    │                               │◄── SSE: programme_annuel/ok ──│
    │                               │                               │ premiere_lecon (Claude)
    │                               │◄── SSE: premiere_lecon/ok ────│
    │                               │                               │ quiz (Claude)
    │                               │◄── SSE: quiz/ok ──────────────│
    │                               │                               │ sauvegarde (DB)
    │                               │◄── SSE: termine ──────────────│
    │   [TeachingPackCard affichée] │                               │
```

---

## Étapes du pipeline

### 1. `validation`
- Vérifie les champs obligatoires (classe_id, niveau, matière, province, dates calendrier)
- Vérifie que la classe appartient bien à l'enseignant authentifié
- Vérifie l'entitlement `build_year_access`
- **Upsert du Teaching Pack** avec statut `generation_en_cours` (conflict: classe_id)

### 2. `curriculum`
- Calcule `nbSemaines` à partir des dates du calendrier
- Appel Claude claude-sonnet-4-6 pour générer un `ContenuProgramme` JSON (unités + leçons)
- Si `curriculum_fichier_contenu` fourni : transmis au prompt comme contexte
- Si parsing JSON échoue : structure de repli générique (3 unités)
- **Pas de modification de `build-system-prompt.ts` (DEC-005)**

### 3. `syllabus`
- Appel Claude claude-sonnet-4-6 pour générer un `PackSyllabus` JSON
- Prompt basé sur : niveau, matière, province, résultats d'apprentissage extraits du curriculum
- max_tokens : 1500

### 4. `programme_annuel`
- Insert dans la table `programme_annuel` avec :
  - `contenu_json` = ContenuProgramme généré
  - `calendrier_json` = SchoolCalendar du wizard
  - `syllabus_json` = PackSyllabus généré
  - `teaching_pack_id` = ID du Teaching Pack
- Met à jour `classes.curriculum_charge = true`

### 5. `plans_lecon`
- Aucun appel IA supplémentaire
- Les plans de leçon de la 1re séquence sont déjà dans `programme.unites[0].lecons`
- Événement informatif (étape instantanée)

### 6. `premiere_lecon` *(si entitlement `first_lesson_complete`)*
- Appel Claude claude-sonnet-4-6 (max_tokens : 3000)
- Génère un document Markdown complet (7 sections : objectifs, matériel, mise en contexte, enseignement direct, pratique guidée, pratique autonome, différenciation, évaluation formative)
- Sauvegardé dans `fichiers_dossier` (dossier `plans_lecons` de la classe)

### 7. `quiz` *(si entitlement `first_lesson_quiz`)*
- Appel Claude claude-sonnet-4-6 (max_tokens : 1200)
- Génère 6 questions (2 QCM, 2 questions ouvertes courtes, 1 vrai/faux, 1 mise en situation)
- Sauvegardé dans `fichiers_dossier`

### 8. `sauvegarde`
- Construit `TeachingPackContenu` (métriques : nb_unites, nb_lecons_planifiees, etc.)
- Met à jour `teaching_packs` avec statut final (`pret` ou `partiellement_genere`)
- Upsert dans `studio_ia_memoire` pour alimenter le contexte PCE (DEC-025)

### 9. `termine`
- Envoie `{ teaching_pack_id, programme_annuel_id }` au client
- Ferme le stream SSE

---

## Gestion des erreurs

Si une étape lève une exception :
1. Le pack passe à `statut = 'erreur'` avec le message
2. Un événement SSE `{ step: 'erreur', statut: 'erreur', message }` est envoyé
3. Le stream est fermé proprement

L'enseignant peut relancer la génération depuis `TeachingPackCard` (bouton "Relancer").

---

## Entrypoints

| Fichier | Rôle |
|---------|------|
| `src/components/build-year/BuildMyYearWizard.tsx` | Wizard 5 étapes + lecture SSE |
| `src/components/build-year/BuildPipelineProgress` | Vue live dans `PipelineProgressView` (intégré au wizard) |
| `src/app/api/spie/build-year/route.ts` | Pipeline côté serveur |
| `src/app/dashboard/classes/[id]/programme/page.tsx` | Page "Mon année scolaire" |

---

## Contraintes absolues

- **Ne jamais modifier `build-system-prompt.ts`** (DEC-005) — le prompt leçon est généré directement
- **Ne jamais afficher un faux curriculum officiel** — `OFFICIAL_CURRICULA = []` jusqu'à validation réelle
- **RLS activé** — le service role est utilisé uniquement côté serveur, jamais côté client
- **Un seul Teaching Pack par classe** — contrainte UNIQUE sur `teaching_packs.classe_id`
