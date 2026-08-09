# Guide de monitoring bêta
> **Mission** : DEPLOY-BETA-01 · M13  
> **Date** : 2026-08-05  
> **Statut** : Guide opérationnel — à consulter pendant la période bêta

---

## Sources de monitoring disponibles

| Source | Accès | Ce qu'elle couvre |
|--------|-------|------------------|
| Vercel Dashboard | vercel.com → scorgia-beta | Déploiements, fonction invocations, erreurs runtime, temps de réponse |
| Supabase Dashboard | supabase.com → projet | Requêtes DB, auth events, storage, RLS errors |
| `spie_access_log` | Supabase → Table Editor | Toutes les actions SPIE par enseignant |
| `beta_logs` | Supabase → Table Editor | Events bêta custom (feedback, erreurs front) |
| Anthropic Console | console.anthropic.com | Usage API, coûts, latence Claude |

---

## 1. Vercel — Logs de fonctions

### Accès
Vercel Dashboard → scorgia-beta → Functions → View logs

### Signaux d'alarme à surveiller

| Signal | Seuil d'alerte | Action |
|--------|----------------|--------|
| Erreur 500 sur `/api/spie/lesson-engine` | > 2 erreurs / 30 min | Voir logs Supabase, vérifier clé Anthropic |
| Erreur 504 (timeout) sur routes SSE | Toute occurrence | Vérifier que `maxDuration = 300` est configuré |
| Erreur 401 sur routes protégées | > 5 / heure | Vérifier proxy middleware actif |
| Build failure | Toute occurrence | Rollback immédiat (voir `BETA_ROLLBACK_PLAN.md`) |

---

## 2. Supabase — Auth et DB

### Auth events
Supabase Dashboard → Authentication → Logs

Surveiller :
- `signup` : nouveaux comptes (ne doit pas dépasser les 5 invitations)
- `login_failed` : tentatives de connexion échouées (> 10/heure = suspect)

### Requêtes de monitoring DB (à exécuter périodiquement)

```sql
-- Activité SPIE des dernières 24h
SELECT action, COUNT(*), MIN(created_at), MAX(created_at)
FROM spie_access_log
WHERE created_at > now() - interval '24 hours'
GROUP BY action
ORDER BY COUNT(*) DESC;

-- Enseignants actifs
SELECT COUNT(DISTINCT enseignant_id) as actifs
FROM spie_access_log
WHERE created_at > now() - interval '7 days';

-- Leçons générées
SELECT COUNT(*) as lecons_generees
FROM spie_access_log
WHERE action = 'lesson-engine-complete'
AND created_at > now() - interval '7 days';

-- Erreurs récentes
SELECT *
FROM spie_access_log
WHERE statut = 'refuse' OR statut = 'erreur'
ORDER BY created_at DESC
LIMIT 20;
```

---

## 3. Anthropic Console — Coûts

### Accès
console.anthropic.com → Usage

### Points de surveillance

| Modèle | Usage attendu | Budget alerte |
|--------|--------------|---------------|
| claude-3-5-sonnet | Génération leçons, assistant | > $10/jour = investiguer |
| claude-3-haiku | Extraction curriculum | > $2/jour = investiguer |

### Formule d'estimation par génération de leçon
- 13 étapes × ~2 000 tokens input + ~3 000 tokens output = ~65 000 tokens/leçon
- À $3/MTok input + $15/MTok output ≈ $0.05/leçon
- 5 enseignants × 3 leçons/jour = **$0.75/jour** en usage normal

---

## 4. `spie_access_log` — Observabilité SPIE

Toutes les actions SPIE sont maintenant journalisées (fix SPIE-BETA-04). Colonnes :

| Colonne | Description |
|---------|-------------|
| `enseignant_id` | UUID de l'enseignant |
| `action` | Nom de l'action (ex: `lesson-engine-step-3`) |
| `teaching_pack_id` | UUID du pack (si applicable) |
| `fichier_id` | UUID du fichier (si applicable) |
| `statut` | `ok` \| `refuse` \| `erreur` |
| `details_json` | Détails supplémentaires (forfait, source, etc.) |
| `created_at` | Timestamp |

---

## 5. Alertes manuelles bêta

Pendant la période bêta (≤5 enseignants), le monitoring manuel suffit :
- Vérifier les logs Vercel une fois par jour
- Vérifier `spie_access_log` une fois par jour
- Vérifier le budget Anthropic en début de semaine

Aucun outil d'alerting automatique n'est requis pour Palier 2.

---

*Document créé : DEPLOY-BETA-01 · M13 · 2026-08-05*
