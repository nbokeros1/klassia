# DESIGN-14 — Rapport : Workspace V4 "The Pedagogical Studio"

> Référence fichier livrable : `DESIGN-12_Report.md` (selon nomenclature PO)
> Date : 2026-08-10
> Statut : **Planning — En attente de validation PO**

---

## État actuel (DESIGN-13 livré)

DESIGN-13 "The Teacher Workspace" a été livré avec succès :

| Acquis | Détail |
|---|---|
| Explorateur in-flow | `position: fixed` supprimé, 300px, dark sidebar |
| Zone document | IA écrit directement, plus de bulles de chat |
| Phase streaming | Analyse → Construction → Rédaction → Finalisation |
| Copilote 340px | Boutons d'actions primaires + révision |
| WorkspaceHeader | Document-centrique, toolbar discrète |
| TypeScript | 0 erreur |
| Build | Succès |

---

## Delta DESIGN-14 vs DESIGN-13

### Nouveautés

| Feature | DESIGN-13 | DESIGN-14 |
|---|---|---|
| Layout | 300px fixe \| flex \| 340px fixe | 20% \| 60% \| 20% (fluide) |
| Background outer | `#FFFFFF` | `#F8FAFC` |
| Document header | Absent | Titre + Statut (Brouillon/Validé) + Dernière sauvegarde |
| Arborescence explorer | Teaching Pack + Séquences + Leçons | + Ressources + Archives |
| Actions copilote | 7 actions | 10 actions (+ EHDAA + Devoir + Projet + Grille) |
| Historique | Absent | Timeline discrète dérivée des messages |
| Versioning | Absent | Sélecteur Version 1/2/3 + Restaurer (display-only) |
| Streaming cursor | Phase pill | Barre pulsante en bas du texte actif |
| Mode Focus | Prévu (non finalisé) | Toggle + transition 180ms |
| Toolbar | Standard | Minimal : Sauvegarder + Valider + Word + ⋯ |

### Aucun changement

- Logique métier SSE streaming : **inchangée**
- Auto-save Supabase : **inchangé**
- Conversation persistence : **inchangée**
- Teacher Memory Engine : **inchangé**
- Routes API : **inchangées**
- Modales (sauvegarde, inspecteur) : **inchangées**

---

## Estimation d'implémentation

| Composant | Complexité | Durée estimée |
|---|---|---|
| CSS c14-* (tokens + règles) | Faible | 1h |
| WorkspaceLayout 20/60/20% | Faible | 30min |
| WorkspaceHeader toolbar minimal | Faible | 45min |
| AIAssistantPanel 10 actions + historique + versions | Moyenne | 2h |
| PedagogiqueExplorer + Ressources + Archives | Faible | 45min |
| Document header (titre + statut) | Faible | 30min |
| Streaming cursor pulsant | Faible | 20min |
| Mode Focus finalisé | Faible | 30min |
| Versioning display-only state | Moyenne | 1h |
| tsc --noEmit + build | — | 10min |

**Total estimé : ~7h d'implémentation**

---

## Risques identifiés

| Risque | Probabilité | Mitigation |
|---|---|---|
| Layout 20% trop étroit sur petits écrans | Moyenne | Ajouter `min-width: 200px` + `overflow: hidden` |
| Versioning "Restaurer" peut sembler modifier le document | Faible | Display-only : charger la version en local state, non sauvegardé |
| Historique timeline : timestamps non disponibles sans messages | Faible | Afficher uniquement si messages.length > 0 |
| 10 actions dans copilote : overflow vertical | Faible | Section scrollable + groupes collapsibles |

---

## Questions pour le Product Owner

1. **Statut "Validé"** — Quel event déclenche le passage de "Brouillon" à "Validé" ? Un bouton, une sauvegarde, ou manuel ?
2. **Versioning "Restaurer"** — Doit-il sauvegarder automatiquement la version restaurée, ou juste l'afficher ?
3. **Arborescence Archives** — Les conversations archivées (`est_archivee = true`) ou autre chose ?
4. **Ressources** — Fichiers dans `fichiers_dossier` avec `type_fichier = 'ressource'` ?
5. **Layout 20/60/20%** — Sur écran 1280px, donne 256px / 768px / 256px. Acceptable ?

---

## Décision requise

**Valider ou réviser le spec avant implémentation.**

En cas de validation :
- Implémentation déclenchée immédiatement
- Prefix CSS : `c14-*`
- 0 modification logique métier
- Livraison : `npx tsc --noEmit` → 0 erreur + `npm run build` → succès

---

*Document de planification — aucun code modifié.*
