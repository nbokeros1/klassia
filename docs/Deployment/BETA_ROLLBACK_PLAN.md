# Plan de rollback bêta
> **Mission** : DEPLOY-BETA-01 · M14  
> **Date** : 2026-08-05  
> **Statut** : Procédures de rollback officielles — à suivre en cas d'incident

---

## Niveaux d'incident

| Niveau | Description | Délai de réponse |
|--------|-------------|-----------------|
| P0 | Plateforme inaccessible, perte de données, fuite de sécurité | Immédiat |
| P1 | Fonctionnalité critique cassée (SPIE, auth, exports) | < 2 heures |
| P2 | Fonctionnalité secondaire dégradée | < 24 heures |

---

## Rollback Vercel (code)

### Quand ?
- Build échoué sur `main`
- Erreur 500 généralisée après un déploiement

### Procédure

1. Ouvrir Vercel Dashboard → scorgia-beta → Deployments
2. Trouver le dernier déploiement stable (icône verte)
3. Cliquer sur les `...` → **Redeploy** (sans rebuild)
4. Attendre 2–3 minutes
5. Vérifier que la plateforme répond avec les smoke tests critiques (Blocs 1 et 3)

> Le rollback Vercel est instantané et sans risque — il ne touche pas la base de données.

---

## Rollback base de données Supabase

### ⚠ Attention

Les rollbacks DB sont destructifs si des données ont été créées entre la migration et l'incident. Toujours évaluer si le rollback est nécessaire.

### Quand ?
- Migration corrompue la structure de la base
- Données incohérentes après une migration

### Procédure

1. **Ne pas paniquer** — la plupart des erreurs sont dans le code, pas la DB
2. Ouvrir Supabase Dashboard → Settings → Database → Backups
3. Identifier le backup juste avant l'incident
4. Cliquer **Restore** (attention : écrase toutes les données depuis le backup)
5. Après restauration, réexécuter les migrations depuis le point de restauration

> Backup automatique Supabase : toutes les 24h (plan Pro). Backup manuel disponible à tout moment.

---

## Rollback des variables d'environnement Vercel

### Quand ?
- Changement de clé API causant des erreurs auth ou IA

### Procédure

1. Vercel Dashboard → scorgia-beta → Settings → Environment Variables
2. Modifier la variable concernée
3. Redéployer (le changement de var d'env nécessite un redéploiement)

---

## Désactivation d'urgence de la bêta

Si la situation requiert une mise hors ligne immédiate (incident sécurité, fuite de données) :

1. Vercel Dashboard → scorgia-beta → Settings → General → **Disable Deployment Protection Bypass**
2. Ou ajouter une page de maintenance dans `src/app/maintenance/page.tsx` et rediriger via le proxy
3. Informer les enseignants bêta par email direct

---

## Checklist post-incident

- [ ] Incident documenté (date, heure, symptômes, cause, actions prises)
- [ ] Rollback effectué et plateforme vérifiée
- [ ] Smoke tests Blocs 1+3+4 passés
- [ ] Enseignants bêta informés si impact > 30 min
- [ ] Cause racine identifiée et créée dans le backlog

---

## Contact d'urgence

PO / Founder : enwaha22@gmail.com

---

*Document créé : DEPLOY-BETA-01 · M14 · 2026-08-05*
