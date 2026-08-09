# Founder API Test Matrix — Tests des routes API

> Analyse statique du code. Les routes utilisent `createServerClient()` (cookie session) + `serviceClient()` (service_role pour les opérations).

---

## /api/founder/users

| Test | Méthode | Input | Résultat attendu | Code HTTP |
|------|---------|-------|-----------------|-----------|
| Founder authentifié — liste tous | GET | Session founder | JSON array utilisateurs | 200 |
| Founder — filtre par rôle | GET | `?role=teacher` | Utilisateurs filtrés | 200 |
| Teacher — accès interdit | GET | Session teacher | `{error: 'Non autorisé'}` | 403 |
| Non connecté | GET | Pas de session | `{error: 'Non autorisé'}` | 403 |
| PATCH — modifier rôle | PATCH | `{id, role: 'admin'}` | `{ok: true}` | 200 |
| PATCH — champ non autorisé | PATCH | `{id, password: 'x'}` | Ignoré (liste blanche) | 200 |
| PATCH — sans id | PATCH | `{role: 'admin'}` | `{error: 'id requis'}` | 400 |
| DELETE — utilisateur normal | DELETE | `?id=<uuid>` | `{ok: true}` + audit log | 200 |
| DELETE — protège le Founder | DELETE | `?id=<founder_uuid>` | `{error: 'Impossible...'}` | 403 |
| DELETE — sans id | DELETE | — | `{error: 'id requis'}` | 400 |
| Audit trail — PATCH journalisé | PATCH | Modification valide | Entrée dans `audit_trail` | — |
| Audit trail — DELETE journalisé | DELETE | Suppression valide | Entrée dans `audit_trail` | — |

---

## /api/founder/audit

| Test | Méthode | Input | Résultat attendu | Code HTTP |
|------|---------|-------|-----------------|-----------|
| Founder — liste événements | GET | Session founder | JSON array | 200 |
| Founder — filtre catégorie | GET | `?categorie=user` | Événements filtrés | 200 |
| Founder — filtre action | GET | `?action=delete` | Événements ILIKE | 200 |
| super_admin — accès | GET | Session super_admin | JSON array | 200 |
| admin — accès | GET | Session admin | JSON array | 200 |
| teacher — interdit | GET | Session teacher | `{error: 'Non autorisé'}` | 403 |
| POST — événement valide | POST | `{action, categorie}` | `{ok: true}` | 200 |
| POST — catégorie invalide | POST | `{action, categorie: 'x'}` | `{error: 'categorie invalide'}` | 400 |
| POST — sans action | POST | `{categorie: 'user'}` | `{error: 'action et categorie...'}` | 400 |

---

## /api/founder/beta

| Test | Méthode | Input | Résultat attendu | Code HTTP |
|------|---------|-------|-----------------|-----------|
| Founder — liste invitations | GET | Session founder | JSON array | 200 |
| beta_manager — accès GET | GET | Session beta_manager | JSON array | 200 |
| teacher — interdit | GET | Session teacher | 403 | 403 |
| POST — créer invitation | POST | `{email, notes}` | Invitation créée | 201 |
| POST — sans email | POST | `{notes: 'x'}` | Erreur validation | 400 |
| PATCH — changer statut | PATCH | `{id, statut: 'envoyee'}` | Mise à jour + `sent_at` | 200 |
| PATCH — statut invalide | PATCH | `{id, statut: 'xyz'}` | Erreur validation | 400 |

---

## /api/founder/company

| Test | Méthode | Input | Résultat attendu | Code HTTP |
|------|---------|-------|-----------------|-----------|
| Founder — GET | GET | Session founder | Objet company_info | 200 |
| super_admin — GET | GET | Session super_admin | Objet company_info | 200 |
| admin — interdit | GET | Session admin | 403 | 403 |
| teacher — interdit | GET | Session teacher | 403 | 403 |
| Non connecté | GET | Pas de session | 403 | 403 |
| PATCH — champs valides | PATCH | `{nom, ville}` | company_info mis à jour | 200 |
| PATCH — champ service_role | PATCH | `{id: 'x'}` | Ignoré (liste blanche) | 200 |
| PATCH — aucun champ | PATCH | `{}` | `{error: 'Aucun champ valide'}` | 400 |

---

## /api/founder/products

| Test | Méthode | Input | Résultat attendu | Code HTTP |
|------|---------|-------|-----------------|-----------|
| Founder — liste produits | GET | Session founder | JSON array | 200 |
| admin — interdit | GET | Session admin | 403 | 403 |
| POST — créer produit | POST | `{nom, slug}` | Produit créé | 201 |
| POST — slug dupliqué | POST | `{nom, slug: 'scorgia'}` | Erreur UNIQUE | 500 |
| POST — sans nom/slug | POST | `{}` | `{error: 'nom et slug requis'}` | 400 |

---

## /api/founder/roadmap

| Test | Méthode | Input | Résultat attendu | Code HTTP |
|------|---------|-------|-----------------|-----------|
| Founder — liste items | GET | Session founder | JSON array | 200 |
| admin — accès GET | GET | Session admin | JSON array | 200 |
| teacher — interdit | GET | Session teacher | 403 | 403 |
| POST — créer item | POST | `{titre}` | Item créé | 201 |
| POST — sans titre | POST | `{}` | `{error: 'titre requis'}` | 400 |
| PATCH — changer statut | PATCH | `{id, statut: 'dev'}` | Item mis à jour | 200 |
| PATCH — sans id | PATCH | `{statut: 'dev'}` | `{error: 'id requis'}` | 400 |
| DELETE — item existant | DELETE | `?id=<uuid>` | `{ok: true}` | 200 |
| DELETE — id inexistant | DELETE | `?id=<bad>` | Supabase no-op, ok:true | 200 |
| DELETE — sans id | DELETE | — | `{error: 'id requis'}` | 400 |

---

## /api/founder/notifications

| Test | Méthode | Input | Résultat attendu | Code HTTP |
|------|---------|-------|-----------------|-----------|
| Founder — liste notifs | GET | Session founder | JSON array | 200 |
| Founder — unread only | GET | `?unread_only=true` | Non lues seulement | 200 |
| teacher — interdit | GET | Session teacher | 403 | 403 |
| PATCH — marquer lu | PATCH | `{id}` | `{lu: true}` | 200 |
| POST — notif valide | POST | `{titre, type: 'bug'}` | Notif créée | 201 |
| POST — type invalide | POST | `{titre, type: 'xyz'}` | `{error: 'type invalide'}` | 400 |
| POST — priorité invalide | POST | `{titre, type:'bug', priorite:'x'}` | `{error: 'priorite invalide'}` | 400 |

---

## /api/founder/deployment

| Test | Méthode | Input | Résultat attendu | Code HTTP |
|------|---------|-------|-----------------|-----------|
| Founder — historique | GET | Session founder | JSON array | 200 |
| Founder — filtre produit | GET | `?produit_slug=scorgia` | Filtrés | 200 |
| admin — interdit | GET | Session admin | 403 | 403 |
| POST — déploiement valide | POST | `{version, produit_slug}` | Déploiement créé | 201 |
| POST — statut invalide | POST | `{version, produit_slug, statut: 'x'}` | `{error: 'statut invalide'}` | 400 |
| POST — sans version | POST | `{produit_slug: 'scorgia'}` | `{error: 'version et produit_slug...'}` | 400 |
