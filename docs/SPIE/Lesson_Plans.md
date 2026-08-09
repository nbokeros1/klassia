# Plans de leçon — Développement complet

**Statut :** SPIE-BETA-03 · Actif  
**Dernière mise à jour :** 2026-08-05

---

## Trois niveaux de "plan de leçon"

| Niveau | Source | Contenu | Entitlement |
|--------|--------|---------|-------------|
| **Plan structuré** | `programme_annuel.contenu_json.unites[].lecons[]` | Titre, sujet, durée, type | Tous (bêta) |
| **Leçon développée** (SPIE-BETA-02) | `fichiers_dossier` type `lecon_complete` | Markdown 7 sections | `first_lesson_complete` |
| **Leçon détaillée** (SPIE-BETA-03) | `fichiers_dossier` type `lecon_detaillee` | 8 sections structurées + quiz + corrigé | `first_lesson_complete` |

---

## Structure d'une leçon développée

La 1re leçon développée est un document Markdown avec les sections suivantes :

```markdown
# [Titre de la leçon]

## Objectifs d'apprentissage
## Matériel requis
## Mise en contexte (amorce)
## Enseignement direct
## Pratique guidée
## Pratique autonome
## Différenciation
  ### Universel
  ### Ciblé
  ### Spécialisé
## Évaluation formative
## Prolongement (si applicable)
## Critères de succès
```

---

## Génération IA

**Appel :** Claude claude-sonnet-4-6, max_tokens = 3000  
**Contexte :** titre + objectif de la 1re leçon, matière, niveau, province, gabarit sélectionné  
**RÈGLE ABSOLUE :** Ne jamais modifier `build-system-prompt.ts` (DEC-005) pour générer cette leçon. La leçon du Teaching Pack utilise un prompt direct Anthropic, séparé du moteur de génération de leçons standard.

---

## Persistance

La leçon développée est sauvegardée dans `fichiers_dossier` :

```typescript
{
  classe_id: input.classe_id,
  dossier_id: plansDossier.id,   // dossier 'plans_lecons' de la classe
  nom: `Leçon 1 — ${lecon.titre}`,
  type: 'lecon_complete',
  contenu: leconMarkdown,
  genere_par_ia: true,
}
```

Elle apparaît dans la Bibliothèque de la classe, dossier "Plans de leçon".

---

## Lien avec le plan annuel

Après sauvegarde de la leçon :
- `teaching_packs.contenu_json.premiere_lecon_id` = ID du fichier
- `teaching_packs.contenu_json.premiere_lecon_titre` = titre
- `teaching_packs.contenu_json.premiere_lecon_complete` = true

Le composant `AnnualPlanTimeline` peut afficher "✅ Développée" pour cette leçon.

---

## Gabarit Alberta (SPIE-BETA-02)

Le gabarit `scorgia-alberta-plan-lecon-v1` est disponible si `province === 'alberta'` :
- 9 sections principales, 5 sous-sections pour le déroulement (mise en situation, modélisation, pratique guidée, pratique autonome, synthèse)
- Champs spécifiques : RAG/RAS curriculaires, différenciation universelle/ciblée/spécialisée, perspective FNMI
- **Notes privées exclues de tous les exports** (DEC-032)

Voir [Alberta_Lesson_Template.md](Alberta_Lesson_Template.md) pour la structure complète.

## Quality Gate pour plans de leçon (SPIE-BETA-02)

`POST /api/spie/quality-gate { document_type: 'plan_lecon', document_id: '...' }`.

Contrôles : titre, durée 10–200 min, contenu ≥200 caractères, objectifs observables, critères de réussite, évaluation formative.  
Voir [Pedagogical_Quality_Gate.md](Pedagogical_Quality_Gate.md).

---

## Leçon détaillée SPIE-BETA-03

La **leçon détaillée** (`DetailedLesson`) est générée via `POST /api/spie/lesson-engine` (pipeline SSE 13 étapes). Elle contient :

- 3 objectifs observables (taxonomie de Bloom)
- Déroulement 3 phases (avant/pendant/après) avec éléments et durées
- 3 activités prêtes à utiliser (consignes complètes enseignant + élèves)
- Contenu pédagogique structuré (explication, définitions, exemples, erreurs fréquentes)
- Quiz (QCM/VF/RC) + corrigé enseignant (protégé)
- Évaluation formative + différenciation (soutien/adaptation/enrichissement)
- Vérification du temps + Quality Gate (DL-001→DL-013)

Elle est accessible dans l'onglet **"Plans de leçon"** de `programme/page.tsx` et peut être :
- Envoyée vers Enseigner (`/api/spie/lesson-to-enseigner`)
- Convertie en quiz interactif (`/api/spie/lesson-to-quiz`)
- Exportée en DOCX (`/api/spie/pack-export?type=lecon_detaillee`)
- Régénérée section par section (`/api/spie/lesson-regenerate`)

## Voir aussi

- [Detailed_Lesson.md](Detailed_Lesson.md) — Modèle de données complet
- [Lesson_Generation_Pipeline.md](Lesson_Generation_Pipeline.md) — Pipeline SSE 13 étapes
- [Lesson_Quality_Gate.md](Lesson_Quality_Gate.md) — Vérifications DL-001→DL-013
- [Lesson_To_Teaching_Adapter.md](Lesson_To_Teaching_Adapter.md) — Adaptateurs Enseigner/Quiz
- [Sequence_Plans.md](Sequence_Plans.md) — Plans de séquence
- [Build_My_Year_Workflow.md](Build_My_Year_Workflow.md) — Étape `premiere_lecon`
- [Alberta_Lesson_Template.md](Alberta_Lesson_Template.md) — Gabarit Alberta complet
- [Decision_Log.md](Decision_Log.md) — DEC-005, DEC-032, DEC-034→DEC-038
