# Workspace 2.0 — Data Binding
**ScorgIA · RELEASE-P0.2 · 2026-08-09**

---

## Architecture du binding

Le `PedagogiqueExplorer` est le composant central du Workspace 2.0.
Depuis RELEASE-P0.2, il charge ses données depuis 4 tables distinctes.

---

## Sources de données

```
PedagogiqueExplorer
  ├── teaching_packs        → pack par classe (statut, IDs)
  ├── programme_annuel      → plan annuel + syllabus + séquences
  ├── fichiers_dossier      → leçons et quiz générés par build-year
  └── conversations_ia      → préparations IA historiques (brouillons)
```

### Chargement parallèle

```ts
const [{ data: packs }, { data: fichiers }, { data: convs }] = await Promise.all([
  supabase.from('teaching_packs').select(...)  .in('classe_id', classIds),
  supabase.from('fichiers_dossier').select(...).in('classe_id', classIds),
  supabase.from('conversations_ia').select(...).eq('enseignant_id', uid),
])
// Puis séquentiellement : programme_annuel via packProgIds
```

---

## Structure de l'arbre

```
📁 Classe [nom · matière · niveau]
├── 📚 Mon Année Scolaire      (visible si teaching_pack existe)
│     ├── 📘 Curriculum        → /classes/{id}/programme?tab=curriculum
│     ├── 📋 Syllabus          → /classes/{id}/programme?tab=syllabus
│     ├── 📅 Plan annuel       → /classes/{id}/programme?tab=plan_annuel
│     ├── 🗂️ Séquences [N]    → /classes/{id}/programme?tab=sequences
│     │     ├── 1. Titre seq.  → /classes/{id}/programme?tab=sequences
│     │     └── 2. Titre seq.  → /classes/{id}/programme?tab=sequences
│     ├── 📖 Leçons développées [N]
│     │     └── [nom fichier]  → /classes/{id}/programme?tab=plans_lecon
│     └── 🎮 Quiz [N]
│           └── [nom quiz]     → /classes/{id}/programme?tab=quiz
├── 💬 Anciens contenus / Préparations IA
│     ├── 📘 Curriculum (convs)
│     ├── 📝 Plans de leçon (convs)
│     └── 💬 Brouillons (convs)
│           → onSelectConversation(conv) [ouvre dans workspace]
└── + Nouveau document
```

---

## Comportement des clics

| Nœud | Action |
|------|--------|
| Curriculum | `router.push(.../programme?tab=curriculum)` |
| Syllabus | `router.push(.../programme?tab=syllabus)` |
| Plan annuel | `router.push(.../programme?tab=plan_annuel)` |
| Séquence | `router.push(.../programme?tab=sequences)` |
| Leçon développée | `router.push(.../programme?tab=plans_lecon)` |
| Quiz | `router.push(.../programme?tab=quiz)` |
| Conversation IA | `onSelectConversation(conv)` (charge dans workspace) |

> Les documents du Teaching Pack naviguent vers la page dédiée.
> Les conversations IA restent dans le workspace Préparer.
> **Aucune conversation IA n'est créée pour ouvrir un document métier.**

---

## Refresh

Le composant accepte un prop `refreshKey: number`. À chaque incrément de `refreshKey` (géré dans `preparer/page.tsx`), le `useEffect` relance `loadAllData`. Le mécanisme de refresh existant est donc préservé.

---

## Compatibilité contenu historique

Les conversations `conversations_ia` antérieures au Teaching Pack sont conservées.
Elles apparaissent dans :
- **"Anciens contenus"** si la classe a un Teaching Pack
- **"Préparations IA"** si la classe n'a pas de Teaching Pack

Aucune donnée supprimée, aucune migration requise.

---

## Limites

| Limitation | Niveau | Mitigaton |
|-----------|--------|-----------|
| Séquences non cliquables individuellement | Fonctionnel | Naviguent vers l'onglet Séquences global |
| Leçons (outline) non navigables | Fonctionnel | Seules les leçons développées (fichiers_dossier) ont un lien |
| Pas de preview inline dans l'explorateur | UX | Prévu Phase 2 Workspace |
| `fichiers_dossier` non dédupliqués après Reconstruire | Data | Tous les fichiers sont affichés |
