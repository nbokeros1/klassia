# MON-ANNEE-V3 — Smart Syllabus Engine

**Statut :** Livré — en attente de validation Product Owner  
**Date :** 2026-08-15  
**Build :** tsc 0 erreurs · `npm run build` exit code 0 · Compiled in 48s  
**Dépend de :** MON-ANNEE-V2.1 (class folder binding)

---

## 1. Résumé

MON-ANNEE-V3 transforme le syllabus compact (V1, 9 champs) en un document pédagogique professionnel, riche et modifiable section par section. La génération passe à une stratégie 2 phases (IA + déterministe), le score de complétude est calculé de façon déterministe (0–100), et les modifications humaines sont protégées via `edited_sections[]`.

---

## 2. Périmètre — ce qui a changé

| Zone | Ce qui change |
|------|--------------|
| `PackSyllabus` (type) | 20+ nouveaux champs V3, tous optionnels (backward compat V1) |
| ÉTAPE 3 (route.ts) | 2 phases : IA pédagogique (max_tokens 2500) + déterministe (politiques + calendrier) |
| `SyllabusViewer.tsx` | Remplace `SyllabusEditor` — read mode par défaut, édition section par section |
| `syllabus-v3.ts` | `getSyllabusCompleteness()`, `normalizeSyllabus()`, `buildAperçuCalendrier()` |
| Mon Année | Carte de complétude + tâche prioritaire si score < 80 % |

---

## 3. Type `PackSyllabus` V3

### Champs V1 (tous maintenus — aucune suppression)

| Champ | Rôle |
|-------|------|
| `titre_cours`, `niveau`, `matiere` | Identifiants du cours |
| `grandes_idees[]`, `resultats_apprentissage[]` | Contenu pédagogique core |
| `methodes_pedagogiques[]`, `methodes_evaluation[]` | Méthodologie |
| `description?`, `attentes?`, `ressources_suggeres?` | Champs V1 optionnels (alias V3) |
| `version`, `created_at` | Versionnement |

### Champs V3 ajoutés (tous optionnels)

| Champ | Origine | Rôle |
|-------|---------|------|
| `description_cours` | IA Phase 1 | Description riche du cours |
| `mission_cours` | IA Phase 1 | Pourquoi ce cours est essentiel |
| `objectifs_generaux[]` | IA Phase 1 | 3–5 objectifs généraux |
| `competences_developpees[]` | IA Phase 1 | Compétences transversales |
| `attentes_classe[]` | IA Phase 1 | Attentes comportementales |
| `politique_presence` | Déterministe | Placeholder "À compléter" |
| `politique_retards` | Déterministe | Placeholder "À compléter" |
| `politique_remise_travaux` | Déterministe | Placeholder "À compléter" |
| `politique_travaux_retard` | Déterministe | Placeholder "À compléter" |
| `integrite_academique` | Déterministe | Déclaration générique |
| `communication` | Déterministe | `{courriel, disponibilites, plateforme}` — À préciser |
| `apercu_calendrier[]` | Déterministe | Dérivé des `programme.unites` (NO AI) |
| `genere_par_ia`, `generated_at` | Route | Traçabilité IA |
| `edited_sections[]` | SyllabusViewer | Sections modifiées par l'enseignant |

---

## 4. Génération 2 phases (ÉTAPE 3 route.ts)

### Phase 1 — IA (max_tokens 2500)
Champs générés : `description_cours`, `mission_cours`, `objectifs_generaux` (3–5), `grandes_idees` (3–5), `resultats_apprentissage` (5+), `methodes_pedagogiques` (3–5), `methodes_evaluation` (3–5), `competences_developpees` (2–4), `attentes_classe` (4–6).

Retry sur troncature : max_tokens 1200 (V3 champs préservés).

### Phase 2 — Déterministe (0 appel IA)
- Politiques : placeholders `"À compléter par l'enseignant…"` (jamais inventées)
- `integrite_academique` : déclaration générique modifiable
- `communication` : `{ courriel: '', disponibilites: 'À préciser', plateforme: 'À préciser' }`
- `apercu_calendrier` : dérivé de `programme.unites` → `[{ semaines: 'S1–S3', titre, description }]`

---

## 5. `getSyllabusCompleteness()` — score déterministe

```
Score total : 100 points

Présentation  : titre_cours(5) + niveau(3) + matiere(3) + description_cours(5) + mission_cours(5) = 21
Objectifs     : objectifs_generaux(10) + grandes_idees(5) + resultats_apprentissage(10) = 25
Méthodologie  : methodes_pedagogiques(5) + methodes_evaluation(5) = 10
Évaluation    : evaluation.categories(5) = 5
Attentes      : attentes_classe(5) = 5
Politiques    : politique_presence(5) + politique_retards(3) + politique_remise_travaux(3) + integrite_academique(4) = 15
Communication : communication(4) = 4
Calendrier    : apercu_calendrier(5) = 5
```

Règle `isFilled()` : le champ compte comme vide si vide, null, ou commence par `"À compléter"` / `"À préciser"`.

---

## 6. `SyllabusViewer.tsx` — document professionnel

### Mode lecture (défaut)
Document formaté avec sections claires, listes à puces ou numérotées, champs texte. Bouton **Modifier** par section.

### Mode édition (par section)
- Chaque section s'ouvre indépendamment (une à la fois)
- Formulaires adaptés au contenu (textarea liste, input texte)
- **Annuler** : restaure l'état avant édition (snapshot)
- **Sauvegarder** : POST `/api/spie/syllabus-save` + `edited_sections[]` mis à jour

### Sections éditables
| Section | Champs |
|---------|--------|
| Présentation | titre_cours, description_cours, mission_cours |
| Objectifs | objectifs_generaux, grandes_idees, resultats_apprentissage |
| Méthodologie | methodes_pedagogiques, methodes_evaluation, competences_developpees |
| Attentes | attentes_classe |
| Politiques | politique_presence, politique_retards, politique_remise_travaux, integrite_academique |
| Communication | courriel, disponibilites, plateforme |

### Section lecture seule
- **Aperçu calendrier** : tableau synchronisé depuis le plan annuel (no edit)

### Protection des modifications
Toute section sauvegardée est ajoutée à `edited_sections[]`. Badge "Modifié" affiché. L'IA ne peut pas écraser une section en mode reprise (skipSyllabus=true).

### Callouts "À compléter"
Les politiques et champs communication non remplis affichent un callout ambré plutôt qu'un faux contenu.

---

## 7. Intégration Mon Année

### Carte de complétude (SchoolYearDashboard)
Affichée si `syllabusCompleteness !== undefined` (pack avec syllabus). Montre :
- Score % avec barre de progression colorée (rouge < 50, ambré 50–80, vert ≥ 80)
- Lien vers `programme?tab=syllabus`

### Tâche prioritaire
Si score < 80 %, une tâche "Compléter le syllabus" est injectée en tête de `priorityTasks` (type `planifier`).

---

## 8. Fichiers créés / modifiés

| Fichier | Action |
|---------|--------|
| `src/lib/types/teaching-pack.ts` | **Modifié** — PackSyllabus V3 + EvalCategorie, EvalPolitique, AperçuCalendrierItem |
| `src/lib/spie/syllabus-v3.ts` | **Créé** — getSyllabusCompleteness, normalizeSyllabus, buildAperçuCalendrier |
| `src/app/api/spie/build-year/route.ts` | **Modifié** — import buildAperçuCalendrier + ÉTAPE 3 refactorisée |
| `src/components/build-year/SyllabusViewer.tsx` | **Créé** — remplace SyllabusEditor |
| `src/app/dashboard/classes/[id]/programme/page.tsx` | **Modifié** — SyllabusEditor → SyllabusViewer |
| `src/lib/types/school-year-dashboard.ts` | **Modifié** — syllabusCompleteness? ajouté |
| `src/app/dashboard/mon-annee/page.tsx` | **Modifié** — import + dérivation syllabusCompleteness + tâche prioritaire |
| `src/components/mon-annee/SchoolYearDashboard.tsx` | **Modifié** — SyllabusProgressCard + prop syllabusCompleteness |

---

## 9. Ce qui N'a PAS changé

- `SyllabusEditor.tsx` — fichier conservé intact (non supprimé)
- `src/app/api/spie/syllabus-save/route.ts` — aucune modification (edited_sections est dans le payload syllabus)
- Curriculum V2, plan annuel, séquences, leçons — non touchés
- Branding, auth, paiement, Quiz — non touchés
- Aucune migration DB exécutée
- Aucun push

---

## 10. Quality gate

```
npx tsc --noEmit → 0 erreurs
npm run build    → exit code 0 · Compiled successfully in 48s
```

---

*Ne pas push avant validation Product Owner*
