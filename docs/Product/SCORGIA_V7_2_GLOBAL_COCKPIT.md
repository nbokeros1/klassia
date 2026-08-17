# ScorgIA V7.2 — Global Teacher Cockpit

**Statut :** Livré  
**Version :** 7.2.0  
**Audience :** PO, Développeurs, Équipe Design  

---

## Vue d'ensemble

Le cockpit global (`/dashboard/mon-annee`) remplace l'ancien `SchoolYearHub` (grille de cartes)
par un vrai tableau de bord professionnel multi-classes. L'enseignant dispose d'une vue
unifiée de toutes ses classes, avec métriques réelles, panneau d'attention, table de classe,
et accès direct aux élèves et plans de soutien.

---

## Composant principal

**`src/components/mon-annee/global/GlobalTeacherCockpit.tsx`**

### Props

```typescript
{
  profil:       { prenom: string; nom: string } | null
  classes:      Classe[]
  packs:        Record<string, TeachingPack>      // classId → pack
  programmes:   Record<string, ProgrammeAnnuel>   // classId → programme
  eventCounts:  Record<string, number>            // packId → nb leçons enseignées
  eleves:       Eleve[]                           // tous les élèves (toutes classes)
  supportPlans: StudentSupportPlanRow[]           // vide si migration 042 non exécutée
}
```

### Architecture interne

```
GlobalTeacherCockpit
├── Header sticky (nom enseignant, année scolaire, ClassSelectorGlobal)
├── Mini-nav : [Aperçu global | Élèves & Soutien]
│
├── Tab APERÇU GLOBAL
│   ├── Métriques : Classes | Élèves | Leçons enseignées | Couverture | Plans | À réviser
│   ├── AttentionPanel (items calculés depuis données réelles)
│   └── ClassTable (table cliquable de toutes les classes)
│
└── Tab ÉLÈVES & SOUTIEN
    └── StudentSupportList (toutes classes, avec colonne Classe visible)
```

---

## Métriques globales

Toutes les métriques utilisent uniquement des données réelles :

| Métrique | Source | Notes |
|----------|--------|-------|
| Classes | `classes.length` | Direct |
| Élèves | `eleves.length` ou `SUM(classes.nombre_eleves)` | Préfère le vrai count |
| Leçons enseignées | `SUM(eventCounts)` vs total leçons dans `programme.contenu_json` | |
| Couverture curriculum | leçons enseignées / total leçons × 100 | |
| Plans actifs | `supportPlans.filter(statut='actif').length` | 0 si migration 042 non exécutée |
| À réviser | plans avec `date_revision < now()` | 0 si migration 042 non exécutée |

---

## Panel d'attention

Calcule automatiquement les items à signaler :

1. **Plans à réviser** — révision dépassée → priorité haute
2. **Classe sans pack** — Teaching Pack absent → priorité modérée  
3. **Classe en retard** — progression < (rythme année - 30%) → priorité modérée (seulement après >10% de l'année écoulée)

Maximum 6 items affichés. Aucun item fictif.

---

## Table des classes

Colonnes : Classe · Élèves · Leçons · Progression (barre + %) · Rythme · Séquence · Ouvrir

**Rythme** est calculé dynamiquement :
- `delta = progressionPct - (fractionAnnéeÉcoulée × 100)`
- `delta ≥ -10` → Dans le rythme (vert)
- `delta ≥ -25` → À surveiller (amber)
- `delta < -25` → En retard (rouge)

Cliquer sur une ligne navigue vers `/dashboard/mon-annee/[classeId]`.

---

## ClassSelectorGlobal

Dropdown "Toutes mes classes" → liste de toutes les classes, clic → workspace de la classe.

---

## Données exclues (conformité)

| Donnée | Raison d'exclusion |
|--------|-------------------|
| `sexe` / `genre` sur élèves | Colonne inexistante en base de données |
| `eleves.profil_type` | Dépréciée — jamais lue dans V7.2 |
| `inscriptions` | Table inexistante |
| Diagnostic individuel | Ne jamais afficher dans le cockpit global |

---

## Page de données

**`src/app/dashboard/mon-annee/page.tsx`**

Requêtes Supabase en parallèle (Promise.all) :
1. `teaching_packs` — toutes les classes
2. `programme_annuel` — toutes les classes  
3. `teaching_events` — toutes les classes
4. `eleves` — tous les élèves de l'enseignant

Puis requête graceful (non bloquante) :
5. `student_support_plans` — si table existe, sinon `[]`

---

## Design

- Thème sombre, CSS vars, inline styles
- Dense et professionnel, pas d'emojis, pas de grands icônes
- Header sticky avec mini-nav (position: sticky, zIndex: 30)
- Métriques en `flex wrap` → responsive automatique
- Table avec `overflowX: auto` sur container
- Couleurs sémantiques : vert=stable, violet=ScorgIA, amber=attention, rouge=problème
