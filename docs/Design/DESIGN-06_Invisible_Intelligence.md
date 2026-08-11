# DESIGN-06 — Invisible Intelligence
## L'Intelligence doit se Ressentir, pas se Montrer

**Date :** 2026-08-10
**Référence :** DS 2.0 Phase 1 — après DESIGN-05

---

## Philosophie

> L'utilisateur ne doit pas penser : « Cette plateforme utilise beaucoup d'IA. »
> Il doit penser : « Cette plateforme comprend ce dont j'ai besoin. »

L'IA n'est jamais le personnage principal. Elle travaille en silence et n'émerge que lorsqu'elle apporte une valeur réelle.

---

## Règles cardinales

1. L'IA n'est jamais le personnage principal.
2. Ne jamais afficher une recommandation si elle n'apporte aucune valeur.
3. Maximum 1 recommandation principale visible.
4. Maximum 2 actions secondaires.
5. Ne jamais bloquer le travail de l'enseignant.
6. Ne jamais ouvrir automatiquement une modal IA.
7. Ne jamais utiliser de notification décorative.
8. Une recommandation doit toujours pouvoir être ignorée.
9. Suggestion ≠ exécution.

---

## Missions implémentées

| Mission | Titre | Statut |
|---------|-------|--------|
| M1  | Context Bar | ✅ |
| M3  | Suggestion Strip | ✅ |
| M6  | Copilot Collapsed by Default | ✅ |
| M8  | Quick Prompts Contextuels | ✅ |
| M11 | Smart Empty States | ✅ (CSS) |
| M14 | Quiet Success Toast | ✅ (CSS) |
| M20 | Audit du Bruit IA | ✅ |
| M21 | Design Language — AI Visibility Levels | ✅ |

---

## Fichiers modifiés

| Fichier | Changement |
|---------|------------|
| `src/app/globals.css` | Ajout section DESIGN-06 — ~60 lignes CSS |
| `src/components/preparer/workspace/WorkspaceHeader.tsx` | Suppression `IaRing` + `creditsIa`, ajout Context Bar + Suggestion Strip |
| `src/components/preparer/assistant/AIAssistantPanel.tsx` | Ajout `docType`, actions contextuelles (max 4) |
| `src/app/dashboard/gerer/preparer/page.tsx` | localStorage `ws_copilot_open`, `contextBar`, `docType`, suggestion |
| `src/app/dashboard/page.tsx` | Suppression `✨` décoratif du CTA |

---

## Voir aussi

- [AI_Visibility_Levels.md](AI_Visibility_Levels.md)
- [Context_Bar.md](Context_Bar.md)
- [Contextual_AI_System.md](Contextual_AI_System.md)
- [DESIGN-06_Report.md](DESIGN-06_Report.md)
