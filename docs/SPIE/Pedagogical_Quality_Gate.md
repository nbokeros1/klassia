# Pedagogical Quality Gate

**Statut :** SPIE-BETA-02 · Actif  
**Fichier :** `src/lib/teaching-quality-gate.ts`  
**API :** `POST /api/spie/quality-gate`  
**Composant :** `src/components/build-year/QualityReport.tsx`

---

## Principe fondamental

> Pas de score arbitraire. Pas de pourcentage non documenté.  
> Un document peut être marqué "Prêt" si et seulement si ses **erreurs bloquantes = 0**.

Si un score est demandé, sa méthode de calcul est :
```
score = valides / (valides + erreurs×3 + avertissements×1.5 + recommandations×0.5)
```
Cette formule est documentée ici et dans le code source.

---

## Niveaux de qualité

| Niveau | Icon | Signification | Bloque le statut "Prêt" |
|--------|------|--------------|:-----------------------:|
| `erreur_bloquante` | 🔴 | Problème fondamental — document non utilisable | ✅ Oui |
| `avertissement` | 🟡 | Problème important à corriger — pas bloquant | Non |
| `recommandation` | 🔵 | Amélioration suggérée | Non |
| `valide` | ✅ | Élément conforme | — |

---

## Contrôles par type de document

### Plan annuel (`verifierPlanAnnuel`)

| Code | Niveau | Règle |
|------|--------|-------|
| PA-001 | Erreur | Titre présent |
| PA-002 | Erreur/Avertissement | 3+ séquences |
| PA-003 | Erreur | Séquences ordonnées sans chevauchement |
| PA-004 | Erreur | Durée ≤ semaines disponibles |
| PA-005 | Erreur | Chaque séquence a ≥1 objectif |
| PA-006 | Avertissement | Chaque séquence a des leçons |
| PA-007 | Recommandation | Nombre de leçons réaliste |
| PA-008 | Recommandation | Semaines tampons configurées |

### Séquence (`verifierSequence`)

| Code | Niveau | Règle |
|------|--------|-------|
| SEQ-001 | Erreur | Titre présent |
| SEQ-002 | Erreur | Durée valide |
| SEQ-003 | Erreur | ≥1 objectif curriculaire |
| SEQ-004 | Avertissement | ≥2 leçons |
| SEQ-005 | Recommandation | Sujets des leçons précis |
| SEQ-006 | Avertissement | Présence d'une leçon évaluation/synthèse |

### Plan de leçon (`verifierPlanLecon`)

| Code | Niveau | Règle |
|------|--------|-------|
| LEC-001 | Erreur | Titre présent |
| LEC-002 | Erreur | Durée 10–200 min |
| LEC-003 | Erreur | Sujet/objectif défini |
| LEC-004 | Erreur | Contenu ≥200 caractères |
| LEC-005 | Erreur | Objectifs observables dans le contenu |
| LEC-006 | Avertissement | Critères de réussite explicites |
| LEC-007 | Avertissement | Différenciation prévue |
| LEC-008 | Avertissement | Évaluation formative présente |
| LEC-009 | Recommandation | Activités de pratique présentes |

### Syllabus (`verifierSyllabus`)

Vérifie les 7 champs obligatoires de `PackSyllabus` : titre, niveau, matière, grandes_idées, résultats_apprentissage, méthodes_pédagogiques, méthodes_évaluation.

---

## API

```typescript
POST /api/spie/quality-gate
{
  teaching_pack_id: string,
  document_type: 'plan_annuel' | 'syllabus' | 'sequence' | 'plan_lecon',
  sequence_index?: number,   // pour document_type = 'sequence'
  document_id?: string,      // pour document_type = 'plan_lecon'
}
```

Le rapport est automatiquement sauvegardé dans `teaching_packs.qualite_json` pour le plan annuel.

---

## Sources utilisées

Le rapport liste les sources de données utilisées pour le contrôle (ex. `ContenuProgramme (plan annuel généré)`). Cela permet à l'enseignant de comprendre l'origine des données vérifiées.
