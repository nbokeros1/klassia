# RC-04 — BUG LIST FINALE
## ScorgIA · KlassIA+ · Version 1.0 Beta
**Date :** 2026-08-11
**Source :** Audit RC-04 (code review + analyse statique)

---

## BUGS P0 — BLOQUANTS (lancement impossible)

```
AUCUN
```

---

## BUGS P1 — À CORRIGER AVANT INVITATION ENSEIGNANTS

### NEW-001 — Bouton notification → route inexistante dans Préparer
**Status : ✅ CORRIGÉ en RC-04**

| Champ | Valeur |
|-------|--------|
| Fichier | `src/components/preparer/workspace/WorkspaceHeader.tsx` |
| Ligne | 275 |
| Description | Le bouton cloche 🔔 dans le header Préparer naviguait vers `/dashboard/notifications` (route inexistante). `notifCount` est chargé depuis la vraie table `notifications` — si un badge rouge s'affiche, le teacher clique et obtient une 404 depuis la page principale. |
| Fix appliqué | `router.push('/dashboard/notifications')` → `router.push('/dashboard')` |
| Impact | 1 ligne dans WorkspaceHeader |

---

## BUGS P2 — PEUVENT ATTENDRE BÊTA 0.9.2

### NEW-002 — Sondage QR : faux QR code dans Enseigner
| Champ | Valeur |
|-------|--------|
| Fichier | `src/app/dashboard/gerer/enseigner/page.tsx` |
| Ligne | ~474-480 |
| Description | Après saisie d'une question sondage, un emoji 🔲 s'affiche avec "QR code généré — projetez-le". Aucun vrai QR code n'est généré. Si un enseignant projette cet écran et demande aux élèves de scanner, aucun scan ne fonctionnera. |
| Risque | Confusion en classe, perte de confiance outil |
| Fix suggéré | Ajouter un label "Prochainement" ou désactiver le bouton "Créer sondage →" pour la bêta |
| Priorité bêta | P2 — fonctionnalité non critique pour le parcours principal |

### NEW-003 — Nuage de mots : bouton sans action dans Enseigner
| Champ | Valeur |
|-------|--------|
| Fichier | `src/app/dashboard/gerer/enseigner/page.tsx` |
| Ligne | ~508-515 |
| Description | Le bouton "☁️ Générer le nuage" dans l'outil Nuage de mots n'a pas de `onClick`. Cliquer dessus n'a aucun effet. |
| Risque | Fonctionnalité annoncée non fonctionnelle |
| Fix suggéré | Désactiver visuellement avec `disabled` + texte "Prochainement" |
| Priorité bêta | P2 — outil secondaire, pas dans le parcours principal |

### ANCIEN-P2-001 — Lint 798 erreurs (pre-existing)
| Champ | Valeur |
|-------|--------|
| Fichier | Multiple (principalement `workflow-runtime`, pages legacy) |
| Description | 798 erreurs ESLint pré-existantes (`@typescript-eslint/no-explicit-any`, `no-unused-vars`). Aucune n'affecte le build ou le TSC. |
| Fix suggéré | Campagne de nettoyage `any` → types explicites (sprint dédié) |
| Priorité bêta | P2 — qualité code, aucun impact fonctionnel |

### ANCIEN-P2-002 — Séquences init séquentielles (session → profil → données)
| Champ | Valeur |
|-------|--------|
| Fichier | Multiple pages (Suivre, Enseigner, Historique) |
| Description | Plusieurs pages font 3 awaits séquentiels avant d'afficher le contenu. Sur connexion lente, chargement visible. |
| Fix suggéré | Paralléliser via `Promise.all` quand possible |
| Priorité bêta | P2 — impact performance, acceptable pour bêta invitée |

---

## BUGS P3 — COSMÉTIQUE / BACKLOG

### P3-001 — Protection founder client-side uniquement
| Champ | Valeur |
|-------|--------|
| Description | `founder/layout.tsx` fait le check auth dans `useEffect` (client-side). La page HTML de "Vérification des droits…" est servie à tous avant validation. Vrai server-side redirect nécessiterait conversion layout en server component. |
| Impact | Théorique — pas de fuite de données (content non rendu) |
| Fix | Post-bêta : convertir layout founder en server component |

### P3-002 — PDF route expose `exec soffice` (non disponible sur Vercel)
| Champ | Valeur |
|-------|--------|
| Description | `/api/export/pdf` utilise `exec('soffice --headless …')`. LibreOffice n'est pas disponible sur Vercel serverless. La route n'est pas exposée dans l'UI pour la bêta (bouton Imprimer désactivé), mais existe. |
| Impact | Aucun sur la bêta si le bouton reste masqué |
| Fix | Post-bêta : utiliser une API de conversion PDF cloud (Cloudmersive, PDFco, etc.) |

### P3-003 — Responsive Préparer sur < 1024px
| Champ | Valeur |
|-------|--------|
| Description | Le workspace 3 colonnes de Préparer est optimisé pour 1440px. Sur 768px, le layout risque d'être comprimé. |
| Impact | Faible pour bêta — les enseignants utilisent laptop/desktop |
| Fix | Post-bêta : breakpoints pour tablet |

### P3-004 — Console.error patterns silencieux dans les routes API
| Champ | Valeur |
|-------|--------|
| Description | Plusieurs `catch {}` silencieux (ex: audit_trail insert dans founder). En cas d'erreur, aucun log. |
| Fix | Post-bêta : logger vers `beta_logs` |

### P3-005 — Cache absent côté client
| Champ | Valeur |
|-------|--------|
| Description | Aucun cache observable (SWR, React Query, local storage) pour les données dashboard. Rechargement complet à chaque visite. |
| Impact | Expérience de navigation légèrement plus lente |
| Fix | Post-bêta : SWR ou React Query pour les données statiques |

---

## RÉCAPITULATIF

| Priorité | Nombre | Status |
|----------|--------|--------|
| P0 | 0 | — |
| P1 | 1 | ✅ 1/1 corrigé (NEW-001) |
| P2 | 4 | ⏳ Report bêta 0.9.2 |
| P3 | 5 | ⏳ Backlog post-bêta |

**Total P0+P1 restants après RC-04 : 0**

---

*RC-04 — 2026-08-11 — Aucun commit, aucun push*
