# SCORGIA V7.7 — Beta Teacher Fast Track

## Objective

An invited beta teacher must reach useful ScorgIA functionality in **< 3 minutes** from first login.

## User Flow

```
signup / login
    │
    ▼
onboarding (new fast-track flow)
    ├── bienvenue step (beta only, dark welcome screen)
    │       Primary CTA : Configurer rapidement
    │       Secondary CTA : Aller directement à mon tableau de bord
    │
    ├── profil step (all fields optional for beta)
    │       Fields: pays, province, palier_scolaire
    │       Beta: forfait selector removed
    │       Navigation: ← Précédent | Passer pour l'instant | Continuer | Aller à mon tableau de bord
    │
    ├── chemin step (A vs B selection)
    │       Navigation: ← Précédent | Aller à mon tableau de bord
    │
    ├── chemin_a (manual class creation)
    │       Fields: nom, niveau, matière, nb_elèves
    │       Navigation: ← Précédent | Créer et générer | Aller à mon tableau de bord
    │
    └── chemin_b_emploi / curriculum / generation / complete (chat-based)
            Navigation: ← Précédent | Créer manuellement à la place | Tableau de bord →
```

## PO Decisions (V7.7)

| Ref | Decision |
|-----|----------|
| W1  | Curriculum removed from onboarding entirely. JIT when features need it. |
| W2  | Save to DB on Continue only. Never overwrite DB values with empty strings. |
| W3  | Every applicable step gets Previous / Continuer / Passer pour l'instant / Aller à mon tableau de bord. |
| W4  | ONE centralized entitlement resolver. No `is_admin=true`. No `forfait='pro_plus'` for beta in DB. |
| W5  | Both paths kept. Path B gets ← Précédent, Créer manuellement à la place, Passer pour l'instant. |
| W6  | `onboarding_complete=true` = "permitted to use ScorgIA". Set on Go to Dashboard. |

## `onboarding_complete` Semantics (V7.7)

- `onboarding_complete = true` → teacher is permitted to enter ScorgIA. Set whenever the teacher clicks "Aller à mon tableau de bord" or completes the cascade.
- `onboarding_cascade_complete = false` → advanced cascade not yet completed (separate flag, unchanged semantics).

## Beta Entitlement

Beta teachers have `utilisateurs.role = 'beta'` and `utilisateurs.forfait = 'gratuit'` (unchanged).

The `resolveEffectiveForfait()` function maps `role='beta'` to an effective `pro_plus` access level at runtime — **the DB value is never changed**.

## Initial Step Logic

| Condition | Starting step |
|-----------|---------------|
| `role='beta'` AND `palier_scolaire IS NULL` | `bienvenue` |
| `role='beta'` AND `palier_scolaire` set | `profil` |
| `role != 'beta'` | `profil` |
| `onboarding_complete=true` OR `onboarding_cascade_complete=true` | redirect to `/dashboard` |
