# Founder Operating Center — v1.0
**Bodingo AI Tech Inc. · ScorgIA · 2026-08-07**

---

## 1. Philosophie

Le Founder Operating Center (FOC) est le cockpit de pilotage de la plateforme ScorgIA pour les deux fondateurs de Bodingo AI Tech Inc. Il remplace l'ancien dashboard Founder amber/terminal par une interface premium inspirée de Stripe, Linear, Vercel et GitHub.

**Principes fondamentaux :**
- **Vérité uniquement** — Aucune donnée inventée. Si une métrique est indisponible, le composant affiche explicitement "Aucune donnée disponible".
- **Temps réel là où c'est utile** — La page Overview utilise Supabase Realtime pour les insertions `utilisateurs` et `generations_ia`. Les autres pages rechargent à la demande.
- **Zéro nouvelle fonctionnalité métier** — Le FOC visualise et supervise. Il ne crée pas de logique SPIE, de nouvelles routes, ni de nouveaux modèles de données.
- **Séparation claire des espaces** — 8 espaces distincts, chacun avec un périmètre fonctionnel non-chevauchant.

---

## 2. Système de design

### 2.1 Couleurs

| Token               | Valeur      | Usage                               |
|---------------------|-------------|-------------------------------------|
| Background          | `#0B1120`   | Fond du layout (FounderLayout)      |
| Surface             | `#111827`   | Cartes, tableaux, panneaux          |
| Surface raised      | `#1C2537`   | Inputs, cards imbriquées, modèles   |
| Accent primary      | `#6366F1`   | Boutons CTA, active state, barres   |
| Accent light        | `#A5B4FC`   | Texte accent, liens actifs          |
| Accent muted        | `#818CF8`   | Badges, valeurs secondaires         |
| Success             | `#10B981`   | États OK, taux succès, actif        |
| Warning             | `#F59E0B`   | Avertissements, liste d'attente     |
| Error               | `#EF4444`   | Erreurs, suspendus, expirés         |
| Text primary        | `#F1F5F9`   | Titres, valeurs importantes         |
| Text secondary      | `rgba(255,255,255,0.5)` | Labels, descriptions    |
| Text muted          | `rgba(255,255,255,0.25)` | Métadonnées, dates       |
| Border default      | `rgba(255,255,255,0.08)` | Contours de cartes       |
| Border subtle       | `rgba(255,255,255,0.04)` | Séparateurs de tableau   |

### 2.2 Typographie

- **Eyebrow / section label** : `fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)'`
- **Titre de page** : `fontSize: 22, fontWeight: 700, color: '#F1F5F9', letterSpacing: '-0.3px'`
- **Description** : `fontSize: 13, color: 'rgba(255,255,255,0.35)'`
- **KPI valeur** : `fontSize: 28, fontWeight: 700, fontVariantNumeric: 'tabular-nums'`
- **Header tableau** : `fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase'`
- **Contenu tableau** : `fontSize: 12`
- **Code / monospace** : `fontFamily: 'monospace', background: 'rgba(99,102,241,0.1)', color: '#A5B4FC'`

### 2.3 Composants récurrents

**KPICard** : Valeur numérique large + label + sous-texte. Background `#111827`, border `rgba(255,255,255,0.08)`, border-radius 12px, padding 16×18.

**Section card** : Même surface que KPICard. Titre `fontSize: 13, fontWeight: 600, color: '#F1F5F9'`, padding interne 18×20.

**Table** : Header `rgba(255,255,255,0.03)`, séparateurs `rgba(255,255,255,0.04)`, overflow-x auto.

**Dot status** : `width: 7, height: 7, borderRadius: '50%'` — vert `#10B981` / amber `#F59E0B` / rouge `#EF4444` / gris `rgba(255,255,255,0.15)`.

**Button primary** : `background: '#6366F1', border: '1px solid rgba(99,102,241,0.4)', color: '#fff'`

**Button secondary** : `background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', color: '#A5B4FC'`

---

## 3. Architecture et navigation

### 3.1 Layout

`src/app/founder/layout.tsx` — Vérifie l'autorisation Founder via `getUser()` côté serveur. Affiche `FounderSidebar` à gauche (largeur 200px) + contenu à droite. Background `#0B1120`.

### 3.2 Sidebar

`src/components/founder/FounderSidebar.tsx` — Navigation fixe à gauche. Logo "S" en gradient indigo. Indicateur d'espace actif : `borderLeft: '2px solid #6366F1'`, `color: '#A5B4FC'`. 8 items de navigation.

### 3.3 Routes

| Espace          | Route                        | Fichier                                    |
|-----------------|------------------------------|--------------------------------------------|
| Overview        | `/founder`                   | `src/app/founder/page.tsx`                 |
| Utilisateurs    | `/founder/utilisateurs`      | `src/app/founder/utilisateurs/page.tsx`    |
| Contenu         | `/founder/contenu`           | `src/app/founder/contenu/page.tsx`         |
| IA              | `/founder/ia`                | `src/app/founder/ia/page.tsx`              |
| Bêta            | `/founder/beta`              | `src/app/founder/beta/page.tsx`            |
| Finances        | `/founder/finances`          | `src/app/founder/finances/page.tsx`        |
| Infrastructure  | `/founder/infrastructure`    | `src/app/founder/infrastructure/page.tsx`  |
| Paramètres      | `/founder/parametres`        | `src/app/founder/parametres/page.tsx`      |

---

## 4. Espaces — détail fonctionnel

### 4.1 Overview (`/founder`)

**But** : Vue d'ensemble en temps réel de la santé de la plateforme.

**Données** : `utilisateurs`, `classes`, `lecons`, `teaching_packs`, `programme_annuel`, `questions_quiz`, `generations_ia` (aujourd'hui), `beta_logs` (erreurs aujourd'hui), dernières générations (12).

**Composants** :
- `HealthRow` : santé de 6 services (dot coloré + label + statut)
- `KPICard` : métriques par groupe (Enseignants, Contenu produit, IA & Finances)
- Flux d'activité : 12 dernières générations avec type et statut

**Temps réel** : Canal Supabase Realtime sur `utilisateurs` (INSERT) + `generations_ia` (INSERT). Re-fetch complet à chaque événement.

**Calculs** :
- MRR = somme(forfait × PRIX_CAD) avec `PRIX_CAD = { gratuit: 0, pro: 14.99, pro_plus: 24.99, institution: 9.99 }`
- Coût IA estimé = générations × 0,03 USD

---

### 4.2 Utilisateurs (`/founder/utilisateurs`)

**But** : Supervision et administration des comptes enseignants.

**Données** : Table `utilisateurs` — tous les champs.

**Fonctionnalités** :
- Recherche en temps réel (prénom, nom, email)
- Filtres : rôle, forfait, statut actif/inactif
- Modification inline : rôle, forfait, statut (actif/suspendu)
- Impersonation : appel `/api/admin/impersonation` → redirect `/dashboard`
- Suppression : appel `/api/founder/users?id=…` DELETE + confirmation native
- Export CSV avec BOM UTF-8

**Contraintes de sécurité** :
- Les utilisateurs avec `role = 'founder'` ne peuvent pas être modifiés ni supprimés (boutons désactivés, opacity 0.25)
- Toute modification est auditée via `/api/founder/audit`

---

### 4.3 Contenu (`/founder/contenu`)

**But** : Inventaire de tout le contenu pédagogique produit.

**Données** : `teaching_packs`, `programme_annuel`, `lecons`, `fichiers_dossier`, `quiz`, `questions_quiz`, `pack_versions`.

**Affichage** :
- 8 cartes de statistiques globales
- Distribution Teaching Packs par statut (5 états : configuration, analyse, génération, complet, erreur)
- Distribution Leçons par statut (7 états)
- Table des 10 Teaching Packs les plus récents

---

### 4.4 IA (`/founder/ia`)

**But** : Supervision de l'utilisation et des coûts IA.

**Données** : `generations_ia` (2000 dernières), `beta_logs` (erreurs tag `%IA%`).

**Affichage** :
- 4 KPIs : générations aujourd'hui, 7 jours, total, taux succès
- Graphique en barres : activité sur 14 jours (barres indigo)
- Panel coûts estimés : ce mois, total, coût/génération ($0,03 USD)
- 2 modèles configurés : Claude Haiku 4.5 + Claude Sonnet 4.6 (tarifs In/Out en $/Mtok)
- Répartition par type de contenu (barres de progression)
- Erreurs IA récentes (8 dernières, fond rouge subtil)

**Note** : Les coûts sont des estimations à $0,03/génération. Les coûts réels sont disponibles dans la Console Anthropic.

---

### 4.5 Bêta (`/founder/beta`)

**But** : Gestion du programme d'accès bêta fermé.

**Données** : `beta_invitations`, `liste_attente`.

**Fonctionnalités** :
- 4 KPIs : invitations totales, envoyées, activées, liste d'attente
- Formulaire inline : créer une invitation (email, notes, durée d'expiration 7/14/30/90 jours) via `/api/founder/beta` POST
- Table invitations : modification de statut inline (en_attente, envoyée, acceptée, expirée, annulée) via PATCH
- Copie du code d'invitation au presse-papier
- Table liste d'attente : pré-remplissage du formulaire d'invitation depuis la waitlist
- Onglets : Invitations | Liste d'attente

---

### 4.6 Finances (`/founder/finances`)

**But** : Métriques financières basées sur les forfaits actifs.

**Données** : Table `utilisateurs` → champ `forfait`.

**Affichage** :
- Bannière explicite : Stripe non intégré
- 3 KPIs calculés : MRR, ARR (MRR×12), enseignants payants
- Distribution forfaits avec barres de progression + revenus par tranche
- Section "À venir (Stripe requis)" : liste des métriques indisponibles sans fausse valeur
- Composant `EmptyStripe` : "Aucune donnée disponible / Disponible après intégration Stripe"

**Contrainte** : Aucun chiffre de revenu réel ou de paiement ne doit jamais être inventé. Uniquement des calculs déterministes depuis la DB.

---

### 4.7 Infrastructure (`/founder/infrastructure`)

**But** : Santé des services, volumétrie DB, logs et accès SPIE.

**Données** : Comptes de 6 tables, `beta_logs` (2000 derniers), `spie_access_log` (20 derniers).

**Affichage** :
- État de 6 services (PostgreSQL vérifié, Auth/Storage/Realtime supposés OK, Vercel/Anthropic = externe)
- Volumétrie : utilisateurs, classes, leçons, générations IA, fichiers, packs
- 4 compteurs de logs par niveau (debug, info, warn, error)
- 30 dernières erreurs (fond rouge subtil)
- Table des 20 derniers accès SPIE : route, statut, durée ms, date

---

### 4.8 Paramètres (`/founder/parametres`)

**But** : Référence statique de la configuration de l'entreprise.

**Contenu** :
- Informations entreprise (Bodingo AI Tech Inc., ScorgIA, fondateurs)
- 6 liens externes (Supabase, Vercel, Anthropic, Claude.ai, GitHub, Stripe)
- 8 feature flags avec statut (on/off) et note explicative
- Table des 6 variables d'environnement (type, requis, description)
- Avertissement : ne jamais committer `.env.local`

**Note** : Page statique — aucune requête Supabase. Les feature flags sont codés en dur et reflètent l'état réel de la bêta.

---

## 5. Sécurité

Toutes les routes API utilisées par le FOC passent par `verifyFounder()` :

```typescript
// src/lib/founder-auth.ts
async function verifyFounder() {
  const { user } = await getUser()
  if (!user) throw new Error('Non authentifié')
  const { data } = await supabase.from('utilisateurs').select('role, is_admin').eq('user_id', user.id).single()
  if (data?.role !== 'founder' && !data?.is_admin) throw new Error('Accès refusé')
}
```

Routes protégées : `/api/founder/users`, `/api/founder/beta`, `/api/founder/audit`, `/api/founder/impersonation`.

Le layout `src/app/founder/layout.tsx` vérifie également l'accès côté serveur avant de rendre la sidebar.

---

## 6. Données et état

### 6.1 Sources de données réelles

Toutes les pages du FOC interrogent directement Supabase via `createClient()` (client-side, avec RLS actif pour le rôle `founder`). Aucune couche intermédiaire d'API pour les lectures.

### 6.2 États vides

Chaque section qui peut être vide affiche un message explicite :
- `"Aucune donnée disponible"` pour les métriques indisponibles
- `"Aucun utilisateur ne correspond aux filtres"` pour les filtres sans résultat
- `"Aucune invitation créée"` pour les tables vides

### 6.3 Temps réel

La page Overview est la seule page avec Supabase Realtime actif. Les autres pages proposent un bouton "↻ Actualiser" pour un rechargement manuel.

---

## 7. Contraintes préservées

Ces règles s'appliquent à tout le FOC et ne peuvent pas être contournées :

1. **Pas de nouvelles fonctionnalités métier** — Le FOC ne crée pas de classes, de leçons, de Teaching Packs, ou de plans annuels.
2. **Pas de modification SPIE** — Aucune logique SPIE n'est touchée ou dupliquée.
3. **Pas de Stripe** — Les revenus réels ne sont jamais affichés. Uniquement MRR/ARR calculés depuis les forfaits DB.
4. **Pas de multi-province** — Alberta uniquement en bêta.
5. **Pas de données inventées** — Zéro fausse métrique, zéro placeholder numérique.

---

## 8. Évolution future (hors périmètre bêta)

### v1.1 (post-bêta)
- Intégration Stripe : revenus réels, paiements, churn rate
- Graphiques d'activité utilisateurs (DAU/WAU/MAU)
- Alertes configurables (seuil d'erreurs, coût IA)

### v1.2
- Export PDF des rapports Overview
- Annotations sur les logs d'erreurs
- Historique des modifications de rôles/forfaits

### v2.0
- Multi-fondateurs avec permissions granulaires
- Dashboard analytics pédagogiques (engagement, complétion, satisfaction)
- Intégration monitoring externe (Sentry, Datadog)

---

*Document généré lors de FOUNDER-02 — refonte complète du Founder Dashboard.*
*Maintenu en parallèle de `docs/SPIE/SPIE_Blueprint.md` et `docs/Deployment/SCORGIA_BETA_CERTIFICATION.md`.*
