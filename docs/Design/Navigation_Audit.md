# Navigation_Audit.md
## Inventaire complet de la navigation ScorgIA — DESIGN-03

**Date :** 2026-08-09  
**Périmètre :** Sidebar + Topbar + breadcrumb + CTRL+K

---

## 1. Sidebar — Inventaire routes

### Avant (Sidebar 2.x)

| Emoji | Label | Route | Section |
|-------|-------|-------|---------|
| 🏠 | Accueil | `/dashboard` | (aucune) |
| 🎓 | Mes classes | `/dashboard/classes` | (aucune) |
| 📚 | Bibliothèque | `/dashboard/bibliotheque` | (aucune) |
| ✨ | Studio IA | `/dashboard/studio-ia` | (aucune) |
| 🖥️ | Enseigner | `/dashboard/gerer/enseigner` | (aucune) |
| 🗓️ | Calendrier | `/dashboard/calendrier` | (aucune) |
| 🛠️ | Outils | `/dashboard/outils` | (aucune) |
| 📈 | Suivre | `/dashboard/suivre` | (aucune) |
| ⚙️ | Paramètres | `/dashboard/profil` | Settings |
| 🛡️ | Founder | `/founder` | Admin uniquement |

**Problèmes identifiés :**
- Aucune hiérarchie → tout au même niveau
- 10 emoji différents → bruit visuel maximal
- Studio IA absent de la sidebar principale (lien direct manquant après restructuration)
- Préparer absent (accès uniquement via mode switch)

### Après (Sidebar 3.0)

| Icône Lucide | Label | Route | Section |
|-------------|-------|-------|---------|
| `LayoutDashboard` | Tableau de bord | `/dashboard` | ENSEIGNEMENT |
| `GraduationCap` | Mes classes | `/dashboard/classes` | ENSEIGNEMENT |
| `PenLine` | Préparer | `/dashboard/gerer/preparer` | ENSEIGNEMENT |
| `Monitor` | Enseigner | `/dashboard/gerer/enseigner` | ENSEIGNEMENT |
| `Library` | Bibliothèque | `/dashboard/bibliotheque` | ENSEIGNEMENT |
| `TrendingUp` | Suivi | `/dashboard/suivre` | ORGANISATION |
| `Calendar` | Calendrier | `/dashboard/calendrier` | ORGANISATION |
| `Wrench` | Outils | `/dashboard/outils` | ORGANISATION |
| `Globe` | Communauté | `/dashboard/communaute` | ORGANISATION (feature flag) |
| `Settings` | Paramètres | `/dashboard/profil` | ADMINISTRATION |
| `Shield` | Founder | `/founder` | ADMINISTRATION (admin only) |

---

## 2. Topbar — Inventaire composants

### Avant

| Composant | Statut | Notes |
|-----------|--------|-------|
| Classe active pill | Conservé | Conditionnel |
| Matière active pill | Conservé | Conditionnel |
| Mode switch (Préparer/Enseigner/Suivre) | Conservé | Conditionnel |
| Ring crédits IA "Générations restantes" | **Supprimé** | Donnée fictive (toujours 0/10) |
| Notifications bell | Conservé | Badge rouge si > 0 |
| Avatar profil | Conservé | → /dashboard/profil |

### Après

| Composant | Statut |
|-----------|--------|
| Classe active pill | Conservé |
| Matière active pill | Conservé |
| Mode switch | Conservé |
| Notifications bell | Conservé |
| Avatar profil | Conservé |

---

## 3. Topbar — Pages consommatrices

Pages qui importent `Topbar` :

| Page | Props utilisées |
|------|----------------|
| `/dashboard/calendrier` | notifCount, initiales, isFr |
| `/dashboard/classes` | notifCount, initiales, isFr |
| `/dashboard/gerer/enseigner` | classeActive, matiereActive, modeActuel, onModeChange, ... |
| `/dashboard/outils` | notifCount, initiales, isFr |
| `/dashboard/outils/nuage-de-mots` | notifCount, initiales, isFr |
| `/dashboard/bibliotheque` | notifCount, initiales, isFr |
| `/dashboard/suivre` | notifCount, initiales, isFr |

La prop `creditsIa` reste dans l'interface — aucune page ne nécessite de mise à jour.

---

## 4. Breadcrumb — Couverture pages

Le composant `Breadcrumb` (`src/components/ui/Breadcrumb.tsx`) est disponible. Intégration page par page prévue en Phase 4.

| Page | Breadcrumb attendu |
|------|-------------------|
| `/dashboard/classes/[id]` | Mes classes > [Nom classe] |
| `/dashboard/classes/[id]/lecons/[leconId]` | Mes classes > [Nom classe] > Leçons > [Titre] |
| `/dashboard/gerer/preparer` | Préparer |
| `/dashboard/gerer/enseigner` | Enseigner |
| `/dashboard/bibliotheque` | Bibliothèque |

---

## 5. Command Palette — Routes indexées

Le CommandBar (CTRL+K) indexe dynamiquement les classes depuis Supabase. Routes statiques disponibles dans l'index :

| Label | Route |
|-------|-------|
| Tableau de bord | `/dashboard` |
| Mes classes | `/dashboard/classes` |
| Préparer | `/dashboard/gerer/preparer` |
| Enseigner | `/dashboard/gerer/enseigner` |
| Bibliothèque | `/dashboard/bibliotheque` |
| Paramètres | `/dashboard/profil` |
| Calendrier | `/dashboard/calendrier` |
| Outils | `/dashboard/outils` |

---

## 6. Problèmes résolus par DESIGN-03

| Problème | Résolution |
|----------|-----------|
| Emoji = bruit visuel | → Lucide React (SVG, 15px, strokeWidth 1.75) |
| Navigation plate sans hiérarchie | → 3 sections avec labels |
| Credits ring fictif (0/10) | → Supprimé de Topbar ET WorkspaceHeader |
| Sidebar trop large (260px) | → 240px |
| `Préparer` inaccessible depuis sidebar | → Ajouté section ENSEIGNEMENT |
| État actif trop fort (0.22 opacity) | → 0.14 (plus subtil, moins gênant) |

---

## 7. Routes non liées à la sidebar (ne pas confondre)

Ces routes existent mais n'apparaissent pas dans la sidebar (accès contextuel uniquement) :

- `/dashboard/classes/[id]` — accès via "Mes classes"
- `/dashboard/classes/[id]/lecons/[leconId]` — accès via classe
- `/dashboard/outils/quiz/[id]/lancer` — accès via Outils
- `/dashboard/sondage/[code]` — accès public
- `/quiz/[code]` — accès public
- `/dashboard/forfaits` — accès via Paramètres
- `/dashboard/ecole` — accès via Paramètres
