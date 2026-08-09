# Plan annuel — Génération et structure

**Statut :** SPIE-BETA-02 · Actif  
**Dernière mise à jour :** 2026-08-04

---

## Rôle du plan annuel

Le plan annuel (`programme_annuel`) est la colonne vertébrale pédagogique d'une classe. Il structure **toute l'année en unités thématiques et en leçons planifiées**, en tenant compte du calendrier scolaire réel de l'enseignant.

Le plan annuel est généré par `build-year` à l'étape 2 (curriculum) et persisté à l'étape 4 (programme_annuel).

---

## Structure du `ContenuProgramme`

```typescript
// src/lib/types/database.ts
type ContenuProgramme = {
  titre: string
  nb_semaines: number
  source_curriculum: string
  unites: Unite[]
}

type Unite = {
  numero: number
  titre: string
  theme?: string
  semaine_debut: number
  semaine_fin: number
  objectifs: string[]
  competences?: string[]
  lecons: LeconProgramme[]
}

type LeconProgramme = {
  numero: number
  titre: string
  sujet: string
  duree_minutes: number
  type: 'introduction' | 'developpement' | 'evaluation' | 'synthese'
  statut?: StatutLecon
  lecon_id?: string        // rempli quand la leçon est développée
}
```

---

## Génération IA

**Appel :** Claude claude-sonnet-4-6  
**Contexte injecté :** curriculum (document téléversé OU texte de référence), calendrier scolaire, nbSemaines calculé  
**Prompt (logique) :**
```
Génère un plan annuel complet pour [matière] [niveau] en [province].
Nombre de semaines : [nbSemaines] (calculé : date_fin - date_debut).
Curriculum de référence : [curriculum_fichier_contenu ou 'Programme officiel [province]'].
Structure : entre 4 et 8 unités, chaque unité contient entre 3 et 8 leçons.
Répartition selon les périodes par semaine et la durée de chaque période.
```

**Fallback :** Si JSON invalide → structure de repli (3 unités génériques de 4 leçons).

---

## Calendrier et calcul des semaines

Le pipeline calcule automatiquement :

```typescript
const ms = new Date(calendrier.date_fin).getTime() - new Date(calendrier.date_debut).getTime()
const nbSemaines = Math.round(ms / (7 * 24 * 3600 * 1000)) - calendrier.semaines_tampon
```

Les **semaines tampon** (défaut : 2) sont déduites pour révisions et examens.

---

## Relation avec les leçons développées

Lorsqu'une leçon du plan annuel est développée (étape `premiere_lecon` du pipeline) :
- Un enregistrement est créé dans `fichiers_dossier`
- Le champ `lecon_id` dans `LeconProgramme` est mis à jour
- `contenu_json.premiere_lecon_id` dans `teaching_packs` est rempli

Ce lien permet à l'interface d'afficher "✅ Leçon développée" vs "📝 Plan seulement".

---

## AnnualPlanTimeline

Le composant `src/components/build-year/AnnualPlanTimeline.tsx` affiche le plan annuel sous forme de timeline visuelle :
- Barre de progression proportionnelle au nombre de leçons par unité
- Dépliants par unité (objectifs + liste des leçons)
- Numéros de leçon colorés par couleur d'unité

---

## Quality Gate (SPIE-BETA-02)

Le plan annuel peut être soumis au Quality Gate via `POST /api/spie/quality-gate { document_type: 'plan_annuel' }`.

Contrôles : titre, ≥3 séquences, ordre sans chevauchement, durée ≤ semaines disponibles, objectifs présents.  
`peut_marquer_pret = erreurs_bloquantes === 0` (DEC-027).

Le résultat est sauvegardé dans `teaching_packs.qualite_json`.

## Export DOCX (SPIE-BETA-02)

`POST /api/spie/pack-export { type: 'plan_annuel' }` — entitlement `export_plan_annuel`.

Le DOCX contient : syllabus + liste des unités avec objectifs + liste des leçons planifiées.  
Footer : mention légale ScorgIA + avertissement Alberta si applicable. "Powered by Claude" absent (DEC-032).

## Gabarit Alberta (SPIE-BETA-02)

Le gabarit `scorgia-alberta-plan-annuel-v1` (7 sections) est disponible si `province === 'alberta'`.  
Voir [Alberta_Annual_Plan_Template.md](Alberta_Annual_Plan_Template.md) pour la structure complète.

---

## Voir aussi

- [Sequence_Plans.md](Sequence_Plans.md) — Plans de séquence
- [Build_My_Year_Workflow.md](Build_My_Year_Workflow.md) — Pipeline complet
- [Pedagogical_Quality_Gate.md](Pedagogical_Quality_Gate.md) — Quality Gate
- [Teaching_Pack_Exports.md](Teaching_Pack_Exports.md) — Exports DOCX
