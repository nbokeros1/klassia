# Build Recovery — Reprise et anti-doublon
## Smart Resume et protection contre les lancements multiples

**Statut :** SPIE-PERSISTENCE-01 · Actif  
**Dernière mise à jour :** 2026-08-09  
**Fichier route :** `src/app/api/spie/build-year/route.ts`  
**Composant :** `src/components/build-year/BuildMyYearWizard.tsx`  
**Page :** `src/app/dashboard/classes/[id]/programme/page.tsx`

---

## Deux mécanismes

### 1. Anti-doublon (Mission 13)

Empêche deux instances du pipeline de tourner simultanément sur le même
Teaching Pack.

```typescript
// Vérification AVANT d'ouvrir le stream SSE
const { data: existingPack } = await supabase
  .from('teaching_packs')
  .select('id, statut, contenu_json')
  .eq('classe_id', input.classe_id)
  .eq('enseignant_id', profil.id)
  .maybeSingle()

if (existingPack?.statut === 'generation_en_cours') {
  return NextResponse.json(
    { error: 'La construction de cette année est déjà en cours.', code: 'BUILD_IN_PROGRESS' },
    { status: 409 },
  )
}
```

Un `409 Conflict` est retourné immédiatement. Le stream n'est pas ouvert.
Le statut `generation_en_cours` est écrit dès l'ÉTAPE 1 (upsert pack).

---

### 2. Smart Resume — reprendre: true (Mission 12)

Permet de reprendre un build interrompu en sautant les étapes déjà réussies.

**Déclenchement côté client :**

```typescript
// Dans programme/page.tsx
const handleReprendre = () => {
  setReprendreMode(true)
  setShowWizard(true)
}

// Dans BuildMyYearWizard.tsx
const response = await fetch('/api/spie/build-year', {
  method: 'POST',
  body: JSON.stringify({
    ...wizardInput,
    reprendre: reprendre ?? false,  // ← passé au pipeline
  }),
})
```

**Comportement côté serveur :**

```typescript
// Chargement du BuildState précédent
const prevState = (existingPack?.contenu_json as { build_state?: BuildState } | null)?.build_state
const buildState: BuildState = (input.reprendre && prevState)
  ? { ...prevState, startedAt: new Date().toISOString(), finalized: false }
  : initBuildState()
```

---

## Logique de skip par étape

Chaque étape vérifie si elle peut être sautée avant de lancer la génération IA :

| Étape | Condition de skip |
|-------|------------------|
| Curriculum + Programme annuel | `reprendre && curriculum.status==='success' && programme_annuel.status==='success' && objectId` |
| Syllabus | `reprendre && syllabus.status==='success'` |
| Plans de leçon | jamais skipé (vérification DB rapide) |
| Première leçon | `reprendre && premiere_lecon.status==='success' && objectId` |
| Quiz | `reprendre && quiz.status==='success' && objectId` |

Si une étape est skipée, le pipeline **vérifie quand même que l'objet existe
en DB** (ex: leçon avec `objectId` donné). Si l'objet a été supprimé entre
deux sessions, l'étape passe en erreur et est régénérée.

---

## Expérience utilisateur

### CTA adaptatif dans programme/page.tsx

```typescript
const buildState = pack?.contenu_json?.build_state
const missing = {
  syllabus:       !buildState?.syllabus?.objectId && !pack?.programme_annuel_id,
  plan_annuel:    buildState?.programme_annuel?.status !== 'success',
  premiere_lecon: buildState?.premiere_lecon?.status !== 'success',
  quiz:           buildState?.quiz?.status !== 'success',
}
const hasPartialBuild = pack && (missing.syllabus || missing.plan_annuel || ...)
```

| État | CTA principal | CTA secondaire |
|------|--------------|----------------|
| Pas de pack | "Construire mon année scolaire" | — |
| Pack partiel | "Reprendre la génération" | "Reconstruire" |
| Pack complet | "Reconstruire l'année" | — |

### EmptyState précis pour chaque onglet manquant

L'onglet Syllabus affiche :

```
Syllabus non généré

Une erreur s'est produite lors de la génération du syllabus.
[Reprendre la génération]  [Reconstruire]
```

Au lieu du message générique "Syllabus non disponible".

### Modal de confirmation Reconstruire

Si un pack existe déjà, cliquer "Reconstruire" affiche une modal de
confirmation avec :
- Alerte rouge : "Cette action remplacera votre plan annuel existant."
- Bouton "Reprendre la génération" (smart resume — préservé)
- Bouton "Reconstruire depuis zéro" (reset complet — destructif)

---

## Cas de reprise classiques

| Scénario | Comportement |
|----------|-------------|
| Connexion perdue après syllabus | Skip curriculum + syllabus → regénère leçon + quiz |
| Timeout sur la leçon | Skip curriculum + syllabus + programme → tente leçon + quiz |
| Leçon générée mais quiz oublié | Skip tout sauf quiz |
| Build complet mais pack marqué partiel | `verify-pack` puis mise à jour statut sans rebuild |

---

## Voir aussi

- [Build_Checkpoints.md](Build_Checkpoints.md) — structure BuildState
- [Persistence_Pipeline.md](Persistence_Pipeline.md) — pattern GENERATE→VERIFY
- [Teaching_Pack_Completeness.md](Teaching_Pack_Completeness.md) — vérification finale
- [Build_Debugging_Guide.md](Build_Debugging_Guide.md) — diagnostic d'un pack bloqué
- [SPIE-DIAGNOSTIC-01_Report.md](SPIE-DIAGNOSTIC-01_Report.md) — corrections P0 appliquées
