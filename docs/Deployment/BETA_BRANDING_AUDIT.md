# Audit branding bêta — ScorgIA / Bodingo AI Tech Inc.
> **Mission** : DEPLOY-BETA-01 · M11  
> **Date** : 2026-08-05  
> **Statut** : Audit complet — 2 corrections appliquées, 0 bloquant restant

---

## Résumé

| Catégorie | Statut | Corrections |
|-----------|--------|------------|
| "Powered by Claude" / Anthropic (UI) | ✅ Propre | Retiré dans SPIE-BETA-04 |
| "KlassIA" visible dans l'interface | ✅ Corrigé | 2 corrections appliquées |
| "KlassIA" dans le code interne | ✅ Acceptable | Commentaires/localStorage uniquement |
| "ScorgIA" — présence correcte | ✅ OK | Utilisé partout dans l'UI |
| "Bodingo AI Tech Inc." — placement | ✅ OK | Templates exports + pages Founder |

---

## Corrections appliquées (DEPLOY-BETA-01)

### 1. Watermark "KlassIA" dans la présentation sondage
- **Fichier** : `src/app/dashboard/sondage/page.tsx:174`
- **Avant** : `Klass<span>IA</span>`
- **Après** : `Scorg<span>IA</span>`

### 2. "KlassIA Copilot" dans le panel copilot enseignant
- **Fichier** : `src/components/enseigner/copilot/CopilotPanel.tsx:83`
- **Avant** : `KlassIA Copilot`
- **Après** : `ScorgIA Copilot`

---

## "Powered by Claude" / Anthropic

### Déjà corrigé (SPIE-BETA-04)

| Fichier | Ligne | Correction |
|---------|-------|-----------|
| `src/app/api/ia/assistant/route.ts` | 435 | Retiré "Tu es propulsé par Claude d'Anthropic." |
| `src/app/api/ia/assistant/route.ts` | 478 | Retiré "Powered by Claude by Anthropic." |

### Références Anthropic légitimes (pas de correction requise)

Ces références sont dans des pages internes Founder uniquement — jamais visibles par les enseignants bêta :

| Fichier | Contexte |
|---------|---------|
| `src/app/founder/company/page.tsx` | Label "Anthropic (Claude)" dans les settings Founder |
| `src/app/founder/ia/page.tsx` | Note sur les coûts Anthropic (Founder only) |
| `src/lib/spie/curriculum/services/curriculum-extractor.service.ts` | Commentaire de code |

---

## "KlassIA" dans le code interne (non-visible)

Ces occurrences sont dans le code interne seulement et ne sont pas visibles par les utilisateurs. Aucune correction n'est requise pour la bêta :

| Type | Exemples |
|------|---------|
| Clés localStorage | `klassia_admin_mode`, `klassia_active_classe` |
| Custom events | `klassia:class-created`, `klassia:lecon-ready` |
| Noms de composants | `LogoKlassIA`, `FichierKlassiaRef` |
| Commentaires code | `// ─── KlassIA+ — ...` |
| Noms CSS | `.klassia-print-moment` |

> **Note** : Ces identifiants internes ne posent pas de problème bêta. La migration post-bêta vers `ScorgIA` dans le code est une tâche de housekeeping à planifier.

---

## Emails transactionnels Supabase

À vérifier manuellement dans Supabase Dashboard → Authentication → Email Templates :

- [ ] Expéditeur : `noreply@scorgia.ca` ou `team@scorgia.ca` (pas "Supabase")
- [ ] Objet : "Bienvenue sur ScorgIA" (pas "KlassIA")
- [ ] Corps : Pas de "Powered by Claude" ni de mention Anthropic
- [ ] Pied de page : "Bodingo AI Tech Inc."

---

## Landing page (`/`)

La page d'accueil utilise correctement :
- "ScorgIA" partout dans les titres et descriptions
- "curriculum officiel" comme terme générique (pas de nom provincial spécifique)
- Aucune mention de "Powered by Claude"

---

## Templates d'exports (DOCX, PPTX, PDF)

Les gabarits Alberta définissent correctement :
```typescript
auteur: 'ScorgIA / Bodingo AI Tech Inc.'
```

Clause légale présente dans les gabarits :
> "par ScorgIA (Bodingo AI Tech Inc.). Il ne constitue pas un document officiel..."

---

## Checklist branding finale

- [x] "Powered by Claude" retiré des prompts IA
- [x] "KlassIA" corrigé dans la présentation sondage
- [x] "KlassIA Copilot" corrigé en "ScorgIA Copilot"
- [x] "ScorgIA / Bodingo AI Tech Inc." dans tous les exports
- [ ] Emails Supabase à personnaliser manuellement (Supabase Dashboard)
- [ ] Favicon/titre navigateur : vérifier `<title>ScorgIA</title>` dans `src/app/layout.tsx`

---

*Document créé : DEPLOY-BETA-01 · M11 · 2026-08-05*
