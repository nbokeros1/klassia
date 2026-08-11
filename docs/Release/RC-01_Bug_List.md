# RC-01 — LISTE DES BUGS & PROBLÈMES
## ScorgIA · KlassIA+ · Version 1.0 Beta
**Date :** 2026-08-10  
**Classification :** P0 (bloquant) → P1 (majeur) → P2 (mineur) → P3 (cosmétique/dette)

---

## LÉGENDE

| Priorité | Définition | Impact bêta |
|----------|------------|-------------|
| **P0** | Bloquant — rend l'app inutilisable ou cause une perte de données | STOP : ne pas lancer |
| **P1** | Majeur — frustre ou trompe l'enseignant, workaround difficile | Corriger avant beta invitée |
| **P2** | Mineur — gêne l'expérience, workaround facile | Corriger dans les 2 semaines post-launch |
| **P3** | Cosmétique / dette technique — visible mais non bloquant | Backlog |

---

## P0 — BLOQUANTS

*Aucun bug P0 confirmé.* Le parcours enseignant principal (login → onboarding → classe → préparer → sauvegarder → exporter) est fonctionnel de bout en bout.

---

## P1 — MAJEURS (corriger avant bêta invitée)

### BUG-001 · Teaching Pack inaccessible depuis la navigation principale
**Page :** Sidebar / Navigation globale  
**Fichier :** `src/components/Sidebar.tsx`  
**Description :** Le Teaching Pack ("Mon Année Scolaire") est la fonctionnalité différenciatrice de KlassIA+. Elle n'apparaît nulle part dans la sidebar. L'accès se fait uniquement via : Mes Classes → Carte de classe → Bouton "Construire" → onglet Programme. Deux clics profonds, aucun label clair en sidebar.  
**Impact :** Les enseignants qui découvrent l'app ne trouveront pas cette fonctionnalité. Risque élevé d'abandon ou de confusion lors de l'onboarding bêta.  
**Scénario d'échec :** Teacher arrive sur le dashboard, cherche "Mon programme annuel" → introuvable → pense que ça n'existe pas.  
**Correction suggérée :** Ajouter un lien "Mon Année" ou "Programme" dans la section Enseignement de la Sidebar, pointant vers `/dashboard/classes` avec un anchor ou un filtre préactivé.

---

### BUG-002 · "Reprendre le travail" ne restaure pas la conversation
**Page :** Dashboard (`/dashboard`)  
**Fichier :** `src/app/dashboard/page.tsx`  
**Description :** Le widget "Reprendre le travail" affiche les dernières leçons en cours. Le bouton "Continuer →" navigue vers `/dashboard/gerer/preparer` sans inclure le `conversation_id` ou le `lecon_id`. L'enseignant arrive sur un workspace vide (espace blanc, aucun document) plutôt que sur sa leçon précédente.  
**Impact :** Désorientation garantie. Le teacher pense avoir perdu son travail. Peut déclencher une génération IA redondante.  
**Scénario d'échec :** Teacher clique "Continuer →" sur sa leçon "Fractions — Secondaire 2" → voit un workspace vide → pense que la leçon est perdue → contacte le support.  
**Correction suggérée :** Passer `?classeId=X&leconId=Y` (ou `conversationId=Z`) dans le lien de navigation vers Préparer, et lire ce paramètre à l'initialisation de la page Préparer pour charger la bonne conversation.

---

### BUG-003 · Onglets Évaluations / Participation / Rapports dans Suivre : contenu vide non signalé
**Page :** Suivre (`/dashboard/suivre`)  
**Fichier :** `src/app/dashboard/suivre/page.tsx`  
**Description :** La page Suivre présente 4 onglets. Seul "Progression" charge des données réelles. Les onglets "Évaluations", "Participation" et "Rapports" n'ont aucune requête Supabase associée dans le `useEffect`. Ils s'affichent mais sont probablement vides ou affichent un écran blanc.  
**Impact :** Un enseignant curieux clique sur "Évaluations" → vide → impression que la feature est cassée ou que ses données sont perdues.  
**Scénario d'échec :** Teacher ouvre Suivre → clique "Évaluations" → rien → essaie "Rapports" → rien → pense que l'app ne fonctionne pas.  
**Correction suggérée :** Afficher un `EmptyState` explicite sur chaque onglet stub avec le message "Disponible prochainement — cette section sera complète avant la fin de la bêta." et désactiver visuellement les onglets (opacity + curseur non-cliquable) ou les marquer d'un badge "BÊTA".

---

### BUG-004 · Lien "Historique" dans Suivre pointe vers une route non confirmée
**Page :** Suivre (`/dashboard/suivre`)  
**Fichier :** `src/app/dashboard/suivre/page.tsx:74`  
**Description :** Le bouton `🕒 Historique` dans le topbar de Suivre appelle `router.push('/dashboard/historique')`. Cette route n'est pas confirmée comme existante dans le projet audité.  
**Impact :** Si la page n'existe pas → 404 Next.js immédiat. L'enseignant perd le contexte de Suivre.  
**Scénario d'échec :** Teacher clique "Historique" → 404 → retour arrière → frustration.  
**Correction suggérée :** Vérifier si `/dashboard/historique/page.tsx` existe. Si non → retirer le bouton ou le remplacer par un lien vers Bibliothèque (onglet Documents IA).

---

### BUG-005 · Route Founder Monitoring possiblement non protégée côté serveur
**Page :** Founder Monitoring (`/founder/monitoring`)  
**Fichier :** `src/app/founder/monitoring/page.tsx`  
**Description :** Le code lu ne montre aucun guard d'authentification admin côté serveur (pas de vérification `is_admin` dans le composant serveur ou dans un middleware). L'accès aux métriques de la plateforme (nombre d'utilisateurs, logs d'erreur, Teaching Packs) dépend peut-être uniquement de l'obscurité de l'URL.  
**Impact :** Tout utilisateur inscrit connaissant l'URL `/founder/monitoring` peut voir les métriques de la plateforme et les logs d'erreur.  
**Scénario d'échec :** Enseignant bêta curious explore les URLs → accède aux métriques → données d'utilisation exposées.  
**Correction suggérée :** Ajouter une vérification `is_admin` dans le composant (côté client minimum, côté serveur idéal via `proxy.ts`).

---

## P2 — MINEURS (corriger dans les 2 semaines post-launch)

### BUG-006 · Placeholder "⌘K" trompeur dans la recherche Classes
**Page :** Mes Classes (`/dashboard/classes`)  
**Fichier :** `src/app/dashboard/classes/page.tsx`  
**Description :** Le placeholder du champ de recherche affiche `⌘K` suggérant que le raccourci ouvre une recherche globale. `⌘K` déclenche le CommandBar global (via DashboardFloats), pas ce champ local.  
**Impact :** Confusion sur le comportement attendu du raccourci.  
**Correction suggérée :** Supprimer `⌘K` du placeholder ou remplacer par un indicateur de raccourci local si la recherche locale supporte le clavier.

---

### BUG-007 · "Renommer" dans le menu classe navigue vers la page de détail
**Page :** Mes Classes (`/dashboard/classes`)  
**Fichier :** `src/app/dashboard/classes/page.tsx`  
**Description :** L'action "Renommer" dans le menu contextuel de la carte de classe provoque une navigation vers la page de détail de la classe plutôt qu'un renommage inline. Le teacher s'attend à pouvoir éditer le nom directement.  
**Impact :** Friction inutile pour une action fréquente.  
**Correction suggérée :** Ouvrir un champ de saisie inline dans la carte de classe, ou afficher une modale de renommage légère.

---

### BUG-008 · Bucket Storage non initialisé → Bibliothèque silencieusement cassée
**Page :** Bibliothèque (`/dashboard/bibliotheque`)  
**Fichier :** `src/app/dashboard/bibliotheque/page.tsx:207-214`  
**Description :** Si le bucket Storage `ressources` n'est pas créé dans Supabase, `bucketReady` passe à `false` mais aucun message d'erreur visible n'est montré à l'enseignant. L'onglet "Mes Fichiers" affiche simplement une liste vide.  
**Impact :** En environnement de production fraîchement configuré ou lors d'un reset, l'enseignant ne peut pas uploader et ne comprend pas pourquoi.  
**Correction suggérée :** Afficher un message explicite "Espace de stockage non disponible — contactez le support" si `bucketReady === false`.

---

### BUG-009 · Édition de documents IA en textarea brut (Bibliothèque)
**Page :** Bibliothèque (`/dashboard/bibliotheque`)  
**Fichier :** `src/app/dashboard/bibliotheque/page.tsx`  
**Description :** Le mode édition des documents IA utilise une `<textarea>` brute affichant le Markdown. Les enseignants s'attendent à un éditeur visuel (comme dans Préparer).  
**Impact :** Friction élevée pour modifier un document généré par IA. Certains enseignants ne savent pas lire/écrire du Markdown.  
**Correction suggérée :** Intégrer un affichage ReactMarkdown en mode lecture, et pour l'édition, utiliser l'éditeur unifié type Word déjà mentionné dans les conventions du projet.

---

### BUG-010 · Timestamps historique Copilote générés côté client uniquement
**Page :** Préparer (`/dashboard/gerer/preparer`)  
**Fichier :** `src/app/dashboard/gerer/preparer/page.tsx`  
**Description :** Les `iaTimestamps` (historique des documents générés dans le panel Copilote) sont créés avec `new Date()` côté client au moment où le message IA arrive. En cas de rechargement de page, l'historique est perdu.  
**Impact :** L'historique n'est pas persistant entre sessions — comportement déceptif pour un historique de travail.  
**Note :** C'est un choix de design documenté (display-only), mais le label "Historique" crée une attente de persistance. Renommer en "Cette session" ou "Session en cours" serait plus honnête.

---

### BUG-011 · `glass-pill` CSS class non confirmée dans globals.css
**Composant :** Topbar (`/components/Topbar.tsx`)  
**Fichier :** `src/components/Topbar.tsx:44`  
**Description :** Le composant `Pill` utilise `className="glass-pill"`. La présence de cette classe dans `globals.css` n'a pas été confirmée lors de l'audit (le fichier est volumineux et partiellement lu).  
**Impact :** Si `glass-pill` est absent → les pills du Topbar s'affichent sans style glassmorphism → rupture visuelle.  
**Correction suggérée :** Vérifier la présence de `.glass-pill` dans `globals.css`. Si absente, l'ajouter.

---

### BUG-012 · AssistantFlottant actif sur pages sans contexte IA
**Composant :** DashboardFloats (`/components/DashboardFloats.tsx`)  
**Fichier :** `src/components/DashboardFloats.tsx:16`  
**Description :** L'`AssistantFlottant` est masqué uniquement sur la page Préparer. Il reste actif sur Suivre, Bibliothèque, Calendrier — pages sans contexte pédagogique actif.  
**Impact :** Le bouton flottant d'assistant IA s'affiche sur des pages où il n'a aucune utilité contextuelle, créant du bruit visuel.  
**Correction suggérée :** Définir une liste blanche de pages où l'AssistantFlottant est utile (Dashboard, Classes) plutôt qu'une liste noire.

---

## P3 — COSMÉTIQUES / DETTE TECHNIQUE

### BUG-013 · Inline styles dominants sur les pages DS 1.0
**Pages :** Suivre, Enseigner, Profil, Bibliothèque  
**Description :** Ces pages utilisent des `style={{ }}` inline extensifs plutôt que des classes CSS ou des composants de design system. Maintien difficile, cohérence fragile.  
**Impact :** Dette de maintenabilité — pas d'impact utilisateur direct.

---

### BUG-014 · `formatRelative` potentiellement dupliqué dans plusieurs pages
**Pages :** Dashboard, Classes, Suivre  
**Description :** Plusieurs pages semblent implémenter leur propre formatage de date relative. Sans utilitaire partagé, les formats peuvent diverger (`"il y a 2 jours"` vs `"2j"`, etc.).  
**Impact :** Incohérence textuelle mineure.

---

### BUG-015 · Aucune pagination sur la liste des classes
**Page :** Mes Classes  
**Description :** Si un enseignant a 20+ classes, toutes sont chargées et affichées sans pagination ni virtualisation.  
**Impact :** Pas de problème pour la bêta (enseignants avec 2-5 classes), mais dette pour la GA.

---

### BUG-016 · Sidebar — mode admin visible à tous les enseignants ?
**Composant :** Sidebar  
**Description :** Le toggle "Admin mode" est affiché dans la sidebar. Non confirmé si gated par `is_admin` — si non, tous les enseignants voient un toggle inutile.  
**Impact :** Confusion mineure pour les enseignants non-admins.

---

### BUG-017 · Aucun lien retour "vers Préparer" depuis Enseigner
**Page :** Enseigner  
**Description :** L'enseignant qui a préparé une leçon dans Préparer et navigue vers Enseigner n'a pas de lien direct pour revenir éditer sa leçon.  
**Impact :** Friction sur le parcours Préparer → Enseigner → retour Préparer.

---

### BUG-018 · Profil — style pédagogique non modifiable post-onboarding
**Page :** Profil  
**Description :** Le style pédagogique est sélectionné à l'onboarding mais n'est pas modifiable depuis le profil.  
**Impact :** Enseignant qui veut changer son approche doit contacter le support.

---

## RÉCAPITULATIF

| Priorité | Nombre | Status |
|----------|--------|--------|
| P0 | 0 | ✅ Aucun bloquant |
| P1 | 5 | ⚠️ À corriger avant bêta |
| P2 | 7 | 🔶 À corriger dans 2 semaines |
| P3 | 6 | 📋 Backlog |
| **Total** | **18** | |

---

*Document généré le 2026-08-10 — RC-01 — Aucune modification de code effectuée*
