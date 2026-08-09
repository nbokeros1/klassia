# Teacher Tools Inventory — Inventaire des outils enseignant

> Vérifié après SC-03M. Aucun outil enseignant supprimé, masqué ou cassé lors du développement du Founder Business Center.

---

## Navigation principale (Sidebar enseignant)

| Outil | Route | Statut | Rôles autorisés | Données utilisées |
|-------|-------|--------|-----------------|-------------------|
| Tableau de bord | `/dashboard` | ✅ Opérationnel | Tous | `utilisateurs`, `classes`, `lecons`, `generations_ia` |
| Mes classes | `/dashboard/classes` | ✅ Opérationnel | Tous | `classes`, `lecons`, `utilisateurs` |
| Bibliothèque | `/dashboard/bibliotheque` | ✅ Opérationnel | Tous | `lecons`, `fichiers_klassia` |
| Préparer | `/dashboard/gerer/preparer` | ✅ Opérationnel | Tous | `lecons`, IA Claude, `generations_ia` |
| Enseigner | `/dashboard/gerer/enseigner` | ✅ Opérationnel | Tous | `lecons`, `classes`, IA Claude |
| Agenda intelligent | `/dashboard/calendrier` | ✅ Opérationnel | Tous | `evenements_calendrier` |
| Outils enseignant | `/dashboard/outils` | ✅ Opérationnel | Tous | — |
| Suivi | `/dashboard/suivre` | ✅ Opérationnel | Tous | `beta_feedback`, notifications |
| Paramètres | `/dashboard/profil` | ✅ Opérationnel | Tous | `utilisateurs` |
| Communauté | `/dashboard/communaute` | ⚠️ Feature flagged | Tous (si activé) | — |

---

## Outils secondaires (via Outils enseignant)

| Outil | Route | Statut |
|-------|-------|--------|
| Quiz | `/dashboard/outils/quiz` | ✅ Opérationnel |
| Quiz — Lancer | `/dashboard/outils/quiz/[id]/lancer` | ✅ Opérationnel |
| Quiz — Résultats | `/dashboard/outils/quiz/[id]/resultats` | ✅ Opérationnel |
| Sondage | `/dashboard/sondage` | ✅ Opérationnel |
| Studio IA | `/dashboard/studio-ia` | ✅ Opérationnel |

---

## Outils liés aux classes

| Outil | Route | Statut |
|-------|-------|--------|
| Classe — Vue détail | `/dashboard/classes/[id]` | ✅ Opérationnel |
| Classe — Leçon | `/dashboard/classes/[id]/lecons/[leconId]` | ✅ Opérationnel |
| Classe — Présenter | `/dashboard/classes/[id]/lecons/[leconId]/presenter` | ✅ Opérationnel |
| Classe — Salle | `/dashboard/classes/[id]/salle` | ✅ Opérationnel |
| Leçon — Tableau | `/dashboard/classes/[id]/lecons/[leconId]/tableau` | ✅ Opérationnel |

---

## Mode Administration (réservé aux is_admin)

| Outil | Route | Statut |
|-------|-------|--------|
| Vue d'ensemble école | `/dashboard/ecole` | ✅ Opérationnel |
| Utilisateurs | `/dashboard/admin/utilisateurs` | ✅ Opérationnel |
| Inscriptions | `/dashboard/admin/inscriptions` | ✅ Opérationnel |
| Analytics | `/dashboard/admin/analytics` | ✅ Opérationnel |

---

## Pages liées au compte

| Page | Route | Statut |
|------|-------|--------|
| Profil IA | `/dashboard/profil-ia` | ✅ Opérationnel |
| Forfaits | `/dashboard/forfaits` | ✅ Opérationnel |

---

## Impact du développement Founder

Le Founder Business Center (SC-03M) a créé uniquement des fichiers sous :
- `src/app/founder/**` — espace séparé
- `src/app/api/founder/**` — routes API séparées
- `src/components/founder/**` — composants séparés
- `supabase/migrations/033_*.sql` — tables nouvelles

**Aucune modification** des fichiers enseignant existants. Aucune régression détectée.
