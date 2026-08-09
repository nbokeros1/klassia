# Entitlements bêta — Teaching Pack

**Statut :** SPIE-BETA-03 · Actif  
**Dernière mise à jour :** 2026-08-05

---

## Principes

Le système d'entitlements bêta est **indépendant** de `useForfait` et de `CadenasForFait`. Il existe pour :
1. Permettre à tous les forfaits d'accéder au Teaching Pack pendant la bêta (promesse ScorgIA)
2. Différencier ce qui est généré selon le forfait de l'enseignant
3. Évoluer indépendamment du reste du système de forfaits

**Fichier :** `src/lib/entitlements.ts`

---

## Matrice des droits

| Entitlement | Gratuit | Pro | Pro+ | Institution |
|-------------|:-------:|:---:|:----:|:-----------:|
| `build_year_access` — accès au wizard | ✅ | ✅ | ✅ | ✅ |
| `syllabus` — syllabus généré | ✅ | ✅ | ✅ | ✅ |
| `annual_plan` — plan annuel complet | ✅ | ✅ | ✅ | ✅ |
| `all_sequences_structured` — toutes les séquences (squelette) | ✅ | ✅ | ✅ | ✅ |
| `first_sequence_lesson_plans` — plans leçon 1re séquence | ✅ | ✅ | ✅ | ✅ |
| `first_lesson_complete` — 1re leçon développée | ✅ | ✅ | ✅ | ✅ |
| `first_lesson_quiz` — quiz de la 1re leçon | ✅ | ✅ | ✅ | ✅ |
| `all_lessons_complete` — toutes les leçons développées | 🔒 | ✅ | ✅ | ✅ |
| `additional_quizzes` — quiz supplémentaires | 🔒 | ✅ | ✅ | ✅ |
| `full_evaluations` — évaluations sommatives | 🔒 | ✅ | ✅ | ✅ |
| `unlimited_adaptation` — adaptation dynamique illimitée | 🔒 | ✅ | ✅ | ✅ |

---

## API

```typescript
import { getBetaEntitlement, getEntitlementSummary } from '@/lib/entitlements'

// Dans une route API (vérification côté serveur)
const ent = getBetaEntitlement(profil.forfait)
if (!ent.build_year_access) return 403

// Dans un composant (résumé pour l'UI)
const { inclus, verrouille } = getEntitlementSummary(forfait)
```

---

## Comment modifier

Pour ajuster les droits bêta :
1. Modifier `BETA_ENTITLEMENTS` dans `src/lib/entitlements.ts`
2. Ne pas modifier les types `BetaEntitlement` sans mettre à jour le pipeline

**Ne pas** utiliser ce système pour d'autres fonctionnalités que le Teaching Pack — les autres fonctionnalités continuent d'utiliser `useForfait`.

---

## Entitlements SPIE-BETA-02 — Actions granulaires (DEC-029)

**Fichier :** `src/lib/spie-access.ts`

Ce fichier est distinct de `entitlements.ts` et gère les actions SPIE-BETA-02 à granularité plus fine :

| Action | Gratuit | Pro | Pro+ | Institution | Founder |
|--------|:-------:|:---:|:----:|:-----------:|:-------:|
| `build_year` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `read_pack` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `edit_syllabus` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `edit_plan_annuel` | 🔒 | ✅ | ✅ | ✅ | ✅ |
| `export_syllabus` | 🔒 | ✅ | ✅ | ✅ | ✅ |
| `export_plan_annuel` | 🔒 | ✅ | ✅ | ✅ | ✅ |
| `export_sequence` | 🔒 | ✅ | ✅ | ✅ | ✅ |
| `view_full_lessons` | 🔒 | ✅ | ✅ | ✅ | ✅ |
| `run_quality_gate` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `preview_offer` | ✅ | ✅ | ✅ | ✅ | ✅ |

**API serveur :**
```typescript
import { requireEntitlement } from '@/lib/spie-access'
const blocked = requireEntitlement('export_syllabus', profil.forfait, isFounder)
if (blocked) return blocked  // NextResponse 403 pré-construit
```

---

## Évolution post-bêta

Lorsque le forfait payant sera lancé :
1. Les droits `all_lessons_complete`, `additional_quizzes`, `full_evaluations` seront déplacés dans `CadenasForFait`
2. `BETA_ENTITLEMENTS.gratuit` restera inchangé pour les comptes créés pendant la bêta (grandfathering à décider par le Product Owner)
3. Ne pas intégrer Stripe avant validation du Product Owner.

> **Attendre la validation du Product Owner avant toute modification post-bêta.**

---

## Actions SPIE-BETA-03 (leçon détaillée)

| `SpieAction` | Entitlement requis | Notes |
|-------------|-------------------|-------|
| `generate_detailed_lesson` | `first_lesson_complete` | Gratuit pendant la bêta |
| `view_detailed_lesson` | `first_lesson_complete` | Gratuit pendant la bêta |
| `export_detailed_lesson` | `all_lessons_complete` | Pro+ / Institution uniquement |
| `regenerate_lesson_section` | `first_lesson_complete` | Gratuit pendant la bêta |
| `send_to_enseigner` | `first_lesson_complete` | Gratuit pendant la bêta |
| `create_quiz_from_lesson` | `first_lesson_quiz` | Gratuit pendant la bêta |

Voir [Lesson_Entitlements.md](Lesson_Entitlements.md) pour la documentation complète.
