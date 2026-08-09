# Entitlements — Leçon détaillée

**Mission M15 | Statut : ✅ Implémenté**

## Actions SPIE-BETA-03

Toutes les vérifications sont effectuées **côté serveur** dans `src/lib/spie-access.ts`. Ne jamais se contenter de masquer un bouton côté client.

| Action | `SpieAction` | Entitlement requis | Forfait minimum |
|--------|-------------|-------------------|-----------------|
| Générer la 1re leçon | `generate_detailed_lesson` | `first_lesson_complete` | Gratuit (bêta) |
| Voir la leçon détaillée | `view_detailed_lesson` | `first_lesson_complete` | Gratuit (bêta) |
| Exporter en DOCX | `export_detailed_lesson` | `all_lessons_complete` | Pro+ / Institution |
| Régénérer une section | `regenerate_lesson_section` | `first_lesson_complete` | Gratuit (bêta) |
| Envoyer vers Enseigner | `send_to_enseigner` | `first_lesson_complete` | Gratuit (bêta) |
| Créer un quiz interactif | `create_quiz_from_lesson` | `first_lesson_quiz` | Gratuit (bêta) |

## Correspondance entitlements ↔ forfaits

| Entitlement | Gratuit | Pro | Pro+ | Institution |
|------------|---------|-----|------|-------------|
| `first_lesson_complete` | ✅ | ✅ | ✅ | ✅ |
| `first_lesson_quiz` | ✅ | ✅ | ✅ | ✅ |
| `all_lessons_complete` | ❌ | ❌ | ✅ | ✅ |

*Tableau valide pour la période bêta. À réviser lors de la validation du Product Owner avant SPIE-BETA-04.*

## Mode Founder

Les utilisateurs avec `is_admin = true` ou `role ∈ {founder, super_admin, admin}` contournent toutes les vérifications d'entitlement. Ce mode est journalisé dans `spie_access_log`.

## Vérification dans les routes

```typescript
// Pattern standard dans toutes les routes SPIE-BETA-03
const denied = requireEntitlement('generate_detailed_lesson', profil.forfait, isFounderPreview(profil))
if (denied) return denied  // NextResponse 403
```

## Journalisation (`spie_access_log`)

Table créée en migration 038. RLS : chaque enseignant ne voit que ses propres logs.

```sql
CREATE TABLE spie_access_log (
  id UUID PRIMARY KEY,
  enseignant_id UUID NOT NULL,
  action TEXT NOT NULL,
  teaching_pack_id UUID, fichier_id UUID,
  statut TEXT NOT NULL DEFAULT 'ok',
  details_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)
```

## Contraintes de déploiement

- Ne pas intégrer Stripe avant validation du Product Owner (DEC-029)
- Ne pas modifier les prix des forfaits sans validation
- Ne pas ajouter de nouvelles provinces sans brief dédié

---

*Voir aussi : [Entitlements.md](Entitlements.md) · [Decision_Log.md](Decision_Log.md)*
