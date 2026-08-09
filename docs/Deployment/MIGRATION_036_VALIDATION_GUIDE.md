# Guide de validation — Migration 036 (Product Owner)
> **Date** : 2026-08-05  
> **Public** : Product Owner, sans expertise PostgreSQL requise  
> **Objectif** : Confirmer que la migration 036 est entièrement appliquée dans Supabase

---

## Pourquoi ce guide existe

La migration 036 a échoué une première fois à cause d'une syntaxe PostgreSQL invalide (`ADD CONSTRAINT IF NOT EXISTS`). Elle a été corrigée. Ce guide vous permet de vérifier qu'elle est bien appliquée — complètement — avant d'utiliser les fonctionnalités Teaching Pack.

---

## Étape 1 — Ouvrir le SQL Editor Supabase

1. Aller sur **supabase.com** → Se connecter
2. Sélectionner le projet ScorgIA
3. Dans le menu de gauche → **SQL Editor**
4. Cliquer **New query** (ou utiliser la zone de texte existante)

---

## Étape 2 — Exécuter le script de vérification

1. Ouvrir le fichier `supabase/verification/verify_migration_036.sql` dans votre éditeur de code
2. **Copier l'intégralité du fichier** (Ctrl+A, Ctrl+C)
3. **Coller** dans la zone SQL Editor de Supabase
4. Cliquer **Run** (ou Ctrl+Entrée)

> Le script ne modifie rien. Il lit uniquement l'état actuel de la base.

---

## Étape 3 — Lire le résumé final

La dernière section du script produit un résumé en tableau avec ✅ ou ❌ pour chaque objet.

### Résultat attendu (migration complète) :

| Objet | État attendu |
|-------|-------------|
| `teaching_packs` (table) | ✅ OK |
| `teaching_packs` (20 colonnes) | ✅ OK |
| `programme_annuel.teaching_pack_id` | ✅ OK |
| `programme_annuel.calendrier_json` | ✅ OK |
| `programme_annuel.syllabus_json` | ✅ OK |
| FK `fk_teaching_packs_programme_annuel` | ✅ OK |
| FK `enseignant_id → utilisateurs` | ✅ OK |
| FK `classe_id → classes` | ✅ OK |
| Index `idx_teaching_packs_enseignant` | ✅ OK |
| Index `idx_teaching_packs_classe` | ✅ OK |
| Index `idx_prog_annuel_teaching_pack` | ✅ OK |
| RLS activé sur `teaching_packs` | ✅ OK |
| Policy `teaching_packs_own` | ✅ OK |
| Policy `teaching_packs_admin` | ✅ OK |
| Trigger `trg_teaching_packs_updated_at` | ✅ OK |
| Fonction `update_teaching_pack_updated_at` | ✅ OK |

**Si tous les lignes affichent ✅ OK → Migration 036 complète.**

---

## Étape 4 — Reconnaître un objet absent

Un ❌ signifie que cet objet n'a pas été créé lors de la migration.

### Scénarios fréquents après une exécution partielle

**Seule la FK est ❌ :**
→ La table et les colonnes ont été créées, mais l'erreur `ADD CONSTRAINT IF NOT EXISTS` a stoppé l'exécution avant les index et le RLS. Relancer la migration corrigée.

**Table ❌ :**
→ La migration n'a pas du tout été exécutée. Exécuter la migration 036 complète.

**Index ❌, RLS ❌, mais table ✅ et FK ✅ :**
→ L'exécution s'est arrêtée après la FK. Les index et le RLS sont manquants. Relancer la migration.

---

## Étape 5 — Reconnaître une policy incorrecte

Une policy est incorrecte si elle utilise un pattern obsolète.

**Pattern CORRECT** (doit être présent) :
```
enseignant_id = (SELECT id FROM utilisateurs WHERE user_id = auth.uid() LIMIT 1)
```

**Pattern INCORRECT** (ne doit PAS apparaître) :
```
utilisateurs.id = auth.uid()
-- ou --
u.id = auth.uid()
```

Le script vérifie automatiquement cela dans la Section 9. Si une ligne retourne un résultat dans la requête anti-pattern, contacter le développeur.

---

## Étape 6 — Si une erreur apparaît lors de l'exécution

### Erreur de syntaxe SQL
→ Vérifier que vous avez copié **tout le fichier** depuis le début jusqu'à la fin.

### Erreur "relation does not exist"
→ La table `teaching_packs` n'existe pas encore. La migration n'a pas été exécutée. Exécuter la migration 036 d'abord.

### Résultats vides (aucune ligne)
→ La table ou l'objet demandé n'existe pas. Vérifier le résumé final pour identifier ce qui manque.

---

## Étape 7 — Relancer la migration 036 si nécessaire

1. Ouvrir `supabase/migrations/036_teaching_packs.sql` (fichier corrigé)
2. Copier tout le contenu
3. Coller dans SQL Editor → **Run**
4. Si succès → ré-exécuter `verify_migration_036.sql` pour confirmer
5. Ensuite exécuter migration 037, puis 038

> La migration corrigée est **idempotente** : elle peut être relancée sans risque même si des objets existent déjà.

---

## Quand considérer 036 comme validée

La migration 036 est validée quand :
1. ✅ Le script de vérification retourne **16/16 objets** avec ✅ OK
2. ✅ La section FK retourne exactement **1 ligne** (pas 0, pas > 1)
3. ✅ La section anti-pattern retourne **0 lignes**

Seulement alors, passer aux migrations 037 et 038.

---

*Document créé : DEPLOY-BETA-02B · M8 · 2026-08-05*
