# Real vs Mock Data Audit — Données réelles vs placeholders

> Toute donnée simulée ou estimée est clairement étiquetée. Les données AWS, financières et infrastructure sont signalées explicitement dans l'interface.

---

## /founder — Dashboard Exécutif

| Élément | Source | Type |
|---------|--------|------|
| Nombre d'utilisateurs | `utilisateurs` Supabase | ✅ RÉEL |
| Actifs aujourd'hui | `utilisateurs.derniere_connexion` | ✅ RÉEL |
| Nouveaux 7j | `utilisateurs.created_at` | ✅ RÉEL |
| Générations IA (today/month/total) | `generations_ia` Supabase | ✅ RÉEL |
| Classes, Leçons, Sessions | `classes`, `lecons` Supabase | ✅ RÉEL |
| Feedbacks, note moyenne | `beta_feedback` Supabase | ✅ RÉEL |
| Bugs/Erreurs | `beta_logs` level=error | ✅ RÉEL |
| Dernier déploiement | `founder_deployments` | ✅ RÉEL (seeded) |
| MRR / ARR | Calculé : `forfait` × prix table | ⚠️ ESTIMÉ (0 Stripe) |
| Coût IA today/month | `genCount × $0.03` | ⚠️ ESTIMÉ (non Anthropic API) |
| Disponibilité 99.9% | Valeur codée en dur | 🔴 STATIQUE |
| Latences (18ms, 12ms, 34ms) | Valeurs codées en dur | 🔴 STATIQUE |
| AWS : N/A | Affiché clairement comme N/A | ✅ HONNÊTE |
| Status Supabase OK | Inféré (si fetch réussit) | ⚠️ PARTIEL |

---

## /founder/bi — Business Intelligence

| Élément | Source | Type |
|---------|--------|------|
| Croissance hebdomadaire (8 semaines) | `utilisateurs.created_at` | ✅ RÉEL |
| DAU / WAU / MAU | `utilisateurs.derniere_connexion` | ✅ RÉEL |
| Rétention semaine | `derniere_connexion >= 7j` | ✅ RÉEL |
| Activation | Utilisateurs avec ≥1 génération | ✅ RÉEL |
| Conversion gratuit→payant | `forfait != 'gratuit'` | ✅ RÉEL |
| Top fonctionnalités | `generations_ia.type_contenu` | ✅ RÉEL |
| Inactifs 14j / 30j | `derniere_connexion` calcul | ✅ RÉEL |
| Stickiness DAU/MAU | Calcul à partir du réel | ✅ RÉEL (si données suffisantes) |

---

## /founder/analytics — Founder Analytics

| Élément | Source | Type |
|---------|--------|------|
| Top 10 utilisateurs (générations) | `generations_ia` groupé | ✅ RÉEL |
| Coût IA par utilisateur | `count × $0.03` | ⚠️ ESTIMÉ |
| At-risk users (7–14j inactifs) | `derniere_connexion` | ✅ RÉEL |
| Time-to-first-lecon | `lecons.created_at - utilisateurs.created_at` | ✅ RÉEL |
| Never-logged users | `derniere_connexion IS NULL` | ✅ RÉEL |

---

## /founder/produits — Gestion Produits

| Élément | Source | Type |
|---------|--------|------|
| Produits (Scorgia, MboaSchool) | `founder_products` Supabase | ✅ RÉEL (seeded 033) |
| Roadmap counts par produit | `founder_roadmap` Supabase | ✅ RÉEL (seeded 033) |

---

## /founder/company — Company Center

| Élément | Source | Type |
|---------|--------|------|
| Informations Bodingo AI Tech Inc. | `company_info` Supabase | ✅ RÉEL (seeded 033) |
| Comptes cloud (AWS, Supabase, etc.) | `company_info` colonnes | ✅ RÉEL (champs configurés) |
| Clés API | **Non affichées** — note explicite | ✅ SÉCURISÉ |
| Équipe | Hardcodé (Eddy Nwaha) | 🔵 STATIQUE INTENTIONNEL |

---

## /founder/roadmap — Roadmap Center

| Élément | Source | Type |
|---------|--------|------|
| Tous les items kanban | `founder_roadmap` Supabase | ✅ RÉEL (seeded 033) |
| Filtres produits | `founder_products` | ✅ RÉEL |

---

## /founder/deployment — Deployment Center

| Élément | Source | Type |
|---------|--------|------|
| Historique déploiements | `founder_deployments` Supabase | ✅ RÉEL (seeded 033) |
| Version actuelle | `founder_products.version` + `founder_deployments` | ✅ RÉEL |
| Architecture AWS (Region, Compute, Storage) | Valeurs codées en dur | 🔴 CIBLE (pas encore migré) |
| Statut GitHub (branche, org) | Valeurs codées en dur | 🔴 STATIQUE (informatif) |
| CI/CD status | "À configurer" affiché | ✅ HONNÊTE |

---

## /founder/notifications — Centre de notifications

| Élément | Source | Type |
|---------|--------|------|
| Notifications | `founder_notifications` Supabase | ✅ RÉEL (seeded 033) |
| Comptages | Calculés | ✅ RÉEL |

---

## /founder/vision — Vision Center

| Élément | Source | Type |
|---------|--------|------|
| Mission | Constante hardcodée | 🔵 STATIQUE INTENTIONNEL |
| Vision 2035 | Constante hardcodée | 🔵 STATIQUE INTENTIONNEL |
| OKR 2026 | Constante hardcodée | 🔵 STATIQUE INTENTIONNEL |
| Roadmap 2035 | Constante hardcodée | 🔵 STATIQUE INTENTIONNEL |
| Innovation | Constante hardcodée | 🔵 STATIQUE INTENTIONNEL |
| Portefeuille produits | Constante hardcodée | 🔵 STATIQUE INTENTIONNEL |

> Vision Center est un document stratégique — les données statiques sont normales et attendues.

---

## /founder/utilisateurs

| Élément | Source | Type |
|---------|--------|------|
| Liste utilisateurs | `/api/founder/users` → `utilisateurs` service_role | ✅ RÉEL |
| Rôle / forfait inline | `PATCH /api/founder/users` | ✅ RÉEL |

---

## /founder/beta

| Élément | Source | Type |
|---------|--------|------|
| Invitations | `beta_invitations` (RLS policy) | ✅ RÉEL |
| Codes | Générés via `md5(gen_random_uuid())` | ✅ RÉEL |

---

## /founder/ia — Centre IA

| Élément | Source | Type |
|---------|--------|------|
| Générations (today/7j/total) | `generations_ia` Supabase | ✅ RÉEL |
| Graphique 14j | `generations_ia.created_at` | ✅ RÉEL |
| Répartition par type | `type_contenu` groupé | ✅ RÉEL |
| Erreurs IA | `beta_logs` where tag ILIKE '%IA%' | ✅ RÉEL |
| Coût estimé | `count × $0.03` | ⚠️ ESTIMÉ (pas l'API Anthropic) |
| Tarifs Haiku / Sonnet | Hardcodés | ⚠️ ESTIMÉS (pas temps réel) |

---

## /founder/monitoring

| Élément | Source | Type |
|---------|--------|------|
| Volumes (users/classes/lecons/gens) | COUNT Supabase direct | ✅ RÉEL |
| Logs par niveau | `beta_logs` Supabase | ✅ RÉEL |
| Erreurs récentes (20) | `beta_logs` level=error | ✅ RÉEL |
| Santé DB / Auth / Storage | Déduit du succès des requêtes | ⚠️ PARTIEL (pas de ping dédié) |

---

## /founder/audit

| Élément | Source | Type |
|---------|--------|------|
| Piste d'audit | `audit_trail` (anon client + RLS) | ⚠️ BUG RLS (voir 034_fix_rls) |
| Impersonations | `sessions_impersonation` | ✅ RÉEL (table migration 017) |

> **BUG CONNU** : Le layout client de la page audit lit `audit_trail` via le client anon avec RLS. La policy 032 utilisait `u.id = auth.uid()` — corrigée dans `034_fix_rls_policies.sql`. Sans cette migration, la page affiche 0 événements.

---

## Légende

| Icône | Signification |
|-------|---------------|
| ✅ RÉEL | Données lues en temps réel depuis Supabase |
| ⚠️ ESTIMÉ | Calculé, approximatif, pas de source externe |
| 🔴 STATIQUE | Valeur codée en dur (pas de données réelles) |
| 🔵 STATIQUE INTENTIONNEL | Statique par conception (document stratégique) |
| ✅ HONNÊTE | Placeholder affiché explicitement comme tel dans l'UI |
