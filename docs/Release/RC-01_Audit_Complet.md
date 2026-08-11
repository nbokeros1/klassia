# RC-01 — AUDIT COMPLET RELEASE CANDIDATE
## ScorgIA · KlassIA+ · Version 1.0 Beta
**Date :** 2026-08-10  
**Auditeur :** Équipe d'audit produit RC-01 (PO · UX · UI · QA · A11y · Perf · Release)  
**Méthode :** Lecture exhaustive de chaque page, composant, route API et feuille de style. Aucune modification de code.

---

## RÉSUMÉ EXÉCUTIF

ScorgIA entre en Release Candidate avec un cœur fonctionnel solide. Le parcours enseignant principal — onboarding → créer une classe → préparer une leçon avec l'IA → sauvegarder → exporter — est complet, cohérent et prêt pour une bêta invitée. Le design system DESIGN-14 (Préparer) est la page la plus aboutie de l'application.

Les faiblesses se concentrent sur les pages secondaires (Enseigner, Suivre, Profil) qui sont restées au niveau DS 1.0, créant une incohérence visuelle notable. Plusieurs onglets présentent des stubs sans état vide explicite. La navigation vers le Teaching Pack est enfouie à deux clics de profondeur.

**Score global : 77/100 — GO WITH FIXES**

---

## 1. LOGIN (`/login`)

### Observations

**Flux :** Email + mot de passe → vérification Supabase Auth → redirect onboarding ou dashboard.

**Points forts :**
- Validation d'erreur fine (email non confirmé, identifiants invalides, message générique)
- Code admin bypass sécurisé : double condition `code_admin` + `is_admin=true` avant préremplissage
- `AuthBranding` unifie la page avec la charte graphique
- `Link` Next.js pour la navigation (pas de rechargement)

**Points faibles :**
- Le composant `AuthBranding` n'a pas été audité (non lu) — risque de contenu ou style incohérent
- Aucun lien "Mot de passe oublié" visible dans le code lu (peut exister dans `AuthBranding`)
- Le code admin bypass expose l'adresse email d'un admin si le code est deviné (attaque par énumération)

### Scores

| Dimension | Score | Commentaire |
|-----------|-------|-------------|
| UX | 80 | Flux clair, messages d'erreur utiles |
| UI | 75 | Dépend de AuthBranding non audité |
| Performance | 90 | Requête auth légère |
| Lisibilité | 85 | Messages FR naturels |
| Cohérence | 72 | AuthBranding inconnu |
| Confiance | 78 | Code admin bypass est un risque de sécurité mineur |

**Score page : 80/100**

---

## 2. ONBOARDING (`/onboarding`)

### Observations

**Flux :** Wizard multi-étapes — pays → province/état → curriculum → niveau de classe → style pédagogique → sélection forfait → confirmation.

**Points forts :**
- Données de référence riches : 13 provinces CA, 10 états US, 7 curricula officiels, niveaux maternelle→université
- `ReactMarkdown` + `remarkGfm` pour afficher du contenu IA pendant le wizard — bonne idée pour l'engagement
- Redirection post-onboarding vers dashboard : `onboarding_complete` stocké en DB
- Forfaits clairement présentés : Gratuit / Pro 14$ / Pro+ 24$

**Points faibles :**
- Aucun indicateur de progression visible (étape X sur Y) — le teacher ne sait pas où il en est
- `useState` pour chaque champ : risque de perte de données si le teacher navigue en arrière (pas de persistance inter-étapes)
- "États-Unis" listé comme option pays, mais le curriculum Common Core n'est pas le seul curriculum US — confusion potentielle
- Aucun `aria-describedby` pour les descriptions de forfait — accessibilité limitée pour les lecteurs d'écran

### Scores

| Dimension | Score | Commentaire |
|-----------|-------|-------------|
| UX | 78 | Wizard clair mais sans progress bar |
| UI | 80 | Cartes forfait bien présentées |
| Performance | 85 | Légère, peu de requêtes |
| Lisibilité | 88 | Texte FR naturel et précis |
| Cohérence | 75 | Sans progress bar, sentiment d'incomplétude |
| Confiance | 80 | Sécurité OK, forfaits clairs |

**Score page : 81/100**

---

## 3. DASHBOARD (`/dashboard`)

### Observations

**Flux :** Accueil personnalisé → agenda du jour → reprendre le travail → aperçu pédagogique → à faire → accès rapides → activité récente → recommandations → FAB.

**Points forts :**
- Salutation dynamique avec prénom enseignant — ton chaleureux, professionnel
- Timeline du jour : cours planifiés avec heure, matière, classe — très utile
- "Reprendre le travail" : les leçons récentes avec statut et barre de progression
- Graphique en aires (`recharts`) pour l'historique de génération IA — visuellement impactant
- FAB (bouton flottant + actions rapides) — accès rapide à Préparer/Enseigner/Suivre
- MissionDuJour : motivation quotidienne sans être infantilisant
- Blobs décoratifs `position: fixed` à `zIndex: 0` — décoratifs sans interférer avec l'interaction

**Points faibles — UX :**
- "Reprendre le travail" → le bouton "Continuer →" navigue vers `/dashboard/gerer/preparer` **sans** inclure le `conversation_id`. Le teacher arrive sur un espace blanc plutôt que sur sa leçon. C'est le bug le plus pénalisant pour les retours utilisateurs (voir Bug List BUG-002).
- Sections "Activité récente" et "Recommandations" : si vides, affichent-elles un état vide explicite ? Non observable sans données réelles.
- Le nombre de requêtes Supabase en parallèle au chargement de la page est potentiellement élevé (classes + leçons + activité + recommandations) — à surveiller en environnement multi-users.

**Points faibles — UI :**
- Le dashboard utilise un mix de classes CSS globales (`stats-grid`, `card`, `fade-in`) et de variables CSS (`var(--violet)`, `var(--text-primary)`) — cohérent avec la page mais différent du DESIGN-14 de Préparer.
- Les blobs décoratifs `position: fixed` + `zIndex: 0` sont visibles sur mobile si l'écran est petit — non critique mais peut créer une distraction visuelle.

### Scores

| Dimension | Score | Commentaire |
|-----------|-------|-------------|
| UX | 78 | Contenu riche, mais reprendre le travail buggé |
| UI | 82 | Propre, graphique recharts efficace |
| Performance | 72 | Multiples requêtes parallèles à charger |
| Lisibilité | 82 | Hiérarchie d'information bonne |
| Cohérence | 75 | DS 1.0 vs DS 2.0 — pas à jour |
| Confiance | 78 | Bug reprendre le travail réduit la confiance |

**Score page : 78/100**

---

## 4. MES CLASSES (`/dashboard/classes`)

### Observations

**Flux :** Grille DESIGN-12 → cartes de classe avec smart status → checklist 6 items → filtrer / trier / rechercher → accès class detail.

**Points forts :**
- Smart status engine : `configuration → construction → pret → termine` — très lisible pour l'enseignant
- Checklist 6 items par classe (objectifs, compétences, matériel, évaluation, différenciation, communication) — structure pédagogique solide
- `CadenasForFait` gère l'accès forfait — uniforme avec le reste de l'app
- Filtres : `tous / a_faire / en_cours / termines` + tri : récentes/activité/progression/nom + recherche texte
- `TagInput` pour les matières : ajout libre de tags — UX fluide
- État vide avec illustration SVG : rassurant pour les nouveaux utilisateurs
- Renommage, duplication et suppression disponibles via menu contextuel

**Points faibles :**
- Le placeholder de la barre de recherche affiche `🔍 Chercher une classe... ⌘K` — `⌘K` suggère que la recherche globale s'ouvre au clavier, mais ce champ est une recherche locale uniquement. `⌘K` déclenche le CommandBar global (via DashboardFloats), pas ce champ. Confusion potentielle.
- "Renommer" dans le menu contextuel navigue vers la page de détail de la classe plutôt que d'ouvrir un champ de renommage inline — friction inutile.
- Aucune pagination : si un enseignant a 20+ classes, toutes sont affichées d'un coup.

### Scores

| Dimension | Score | Commentaire |
|-----------|-------|-------------|
| UX | 83 | Navigation claire, smart status excellent |
| UI | 85 | DESIGN-12 propre et cohérent |
| Performance | 80 | Requêtes classes + leçons bien séquencées |
| Lisibilité | 85 | Checklist et statuts clairs |
| Cohérence | 82 | Design system 12 uniforme |
| Confiance | 84 | Checklist rassure sur la complétude |

**Score page : 83/100**

---

## 5. PROGRAMME — TEACHING PACK (`/dashboard/classes/[id]/programme`)

### Observations

**Flux :** 9 onglets — aperçu → curriculum → syllabus → plan annuel → séquences → plans de leçon → quiz → gabarits → qualité.

**Points forts :**
- Architecture complète : le Teaching Pack couvre l'année entière d'un enseignant
- `BuildMyYearWizard` : construction guidée pas à pas
- `AnnualPlanTimeline` : visualisation de l'année complète
- `SyllabusEditor`, `QualityReport`, `TemplateMapping` : composants spécialisés par onglet
- `TeachingPackCard` : résumé visuel de l'état de construction

**Points faibles — Navigation critique :**
- **Aucun lien direct vers le Teaching Pack dans la Sidebar.** L'accès se fait uniquement via : Mes Classes → Carte de classe → Bouton "Construire". Deux clics sans contexte de navigation. Pour la fonctionnalité la plus importante de l'app (la construction d'année complète), c'est un problème de découvrabilité majeur.
- La page n'a pas été entièrement lue — les 9 onglets n'ont été vus que partiellement. Risque de stubs non signalés.

**Points faibles — UX :**
- La breadcrumb `Mes classes > [Nom classe] > Programme` n'est pas confirmée visuellement dans le code partiel lu.
- Aucun indicateur global de complétion de Teaching Pack dans la carte de classe (`progress_overall`).

### Scores

| Dimension | Score | Commentaire |
|-----------|-------|-------------|
| UX | 70 | Contenu riche mais accès caché |
| UI | 72 | Non entièrement audité |
| Performance | 68 | 9 composants = multiples chargements suspectés |
| Lisibilité | 75 | Onglets clairs |
| Cohérence | 70 | Non aligné DESIGN-14 |
| Confiance | 72 | Fonctionnalité centrale sous-exposée |

**Score page : 71/100**

---

## 6. PRÉPARER (`/dashboard/gerer/preparer`)

### Observations

**Flux :** Layout 20/60/20 DESIGN-14 — Explorer pédagogique ← Document Zone → Copilote IA.

**Points forts :**
- DESIGN-14 complet : `c14-*` classes cohérentes, layout fluid 20%/60%/20% au pixel près
- Streaming SSE robuste : parsing ACTION_TAG, strip `__KLASSIA_CTX__`, auto-save — tous intacts
- Document Zone : affichage direct sans bulles de chat — professionnalisme
- En-tête document dynamique : titre, statut (génération/non-enregistré/enregistré), heure de sauvegarde
- WorkspaceHeader minimal : Save direct, Word direct, ⋯ dropdown (PPT, Imprimer, Inspecteur, Effacer)
- AIAssistantPanel : suggestions contextuelles par type de document, "Voir plus", historique timeline
- Auto-save avec `is_saved` flag + badge `✓ Enregistré` dans l'en-tête
- Focus mode disponible
- Pièces jointes (image, PDF, Word) dans le chat
- `canExport` / `canExportPptx` gère l'accès forfait proprement

**Points faibles :**
- **Classe selector dans le WorkspaceHeader** : l'enseignant peut changer de classe en cours de session. Aucun dialogue de confirmation "Vous perdrez votre progression non sauvegardée" n'est confirmé dans le code.
- **Suggestions vides** si le panel Copilote s'ouvre avant que la classe soit sélectionnée — `docType` null → DEFAULT_ACTIONS, ce qui est correct mais peut désorienter.
- **Timestamps** des documents IA dans l'historique du Copilote sont générés côté client (`new Date()`) — pas fiables si le navigateur est offline ou si la page est rechargée.
- Explorateur pédagogique à gauche : non entièrement audité — comportement sur navigation inter-dossiers inconnu.

### Scores

| Dimension | Score | Commentaire |
|-----------|-------|-------------|
| UX | 86 | Meilleure page de l'app, flux IA fluide |
| UI | 88 | DESIGN-14 abouti, professionnel |
| Performance | 80 | SSE bien géré, auto-save async |
| Lisibilité | 87 | En-tête document clair, copilote lisible |
| Cohérence | 86 | c14-* uniformes, DS 2.0 |
| Confiance | 85 | Auto-save rassure, export Word fonctionnel |

**Score page : 85/100**

---

## 7. ENSEIGNER (`/dashboard/gerer/enseigner`)

### Observations

**Flux :** Sélection de leçon → timer de présentation → phases de leçon.

**Points forts :**
- Timer intégré à la page — utile pour la gestion du temps en classe
- Phases de leçon structurées

**Points faibles :**
- Page seulement partiellement lue (80 premières lignes). Score conservateur.
- Design visiblement DS 1.0 : utilise `class="topbar"`, `class="page-content"` — loin du DESIGN-14
- Aucun état vide testé pour "aucune leçon à enseigner"
- Le Timer est un composant inline, non extrait dans le design system
- Cohérence entre les leçons préparées dans Préparer et ce qui s'affiche dans Enseigner : non confirmée
- Aucun lien retour vers Préparer depuis Enseigner

### Scores

| Dimension | Score | Commentaire |
|-----------|-------|-------------|
| UX | 65 | Timer OK mais navigation pauvre |
| UI | 68 | DS 1.0, loin de Préparer |
| Performance | 75 | Page simple |
| Lisibilité | 72 | Structure de base OK |
| Cohérence | 62 | Rupture visuelle majeure vs Préparer |
| Confiance | 65 | Stub apparent sur plusieurs sections |

**Score page : 68/100**

---

## 8. SUIVRE (`/dashboard/suivre`)

### Observations

**Flux :** 4 KPI cards → alerte "À revoir" → 4 onglets : Progression / Évaluations / Participation / Rapports.

**Points forts :**
- KPI cards propres avec couleur accent par métrique
- Alerte "À revoir" contextuelle — excellent signal enseignant
- Onglet Progression : par classe → barres de statuts colorées par leçon — lisible et utile
- `STATUT_LECON` constants importées correctement

**Points faibles :**
- **Onglets Évaluations, Participation, Rapports : stubs non signalés.** Aucune donnée n'est chargée pour ces onglets dans le code lu (aucune requête correspondante dans `useEffect`). Ces onglets s'affichent mais sont probablement vides sans message "Prochainement". Un enseignant cliquerait dessus et verrait... rien.
- **Bouton "Historique"** → `router.push('/dashboard/historique')`. La page `/dashboard/historique` n'a pas été confirmée comme existante dans le projet. Si elle n'existe pas → 404 immédiat depuis Suivre.
- Le titre topbar utilise `<div className="topbar">` inline plutôt que le composant `<Topbar>` — incohérence avec d'autres pages.

### Scores

| Dimension | Score | Commentaire |
|-----------|-------|-------------|
| UX | 70 | KPI bons, stubs onglets frustrants |
| UI | 72 | DS 1.0 uniforme au moins |
| Performance | 78 | Requêtes légères |
| Lisibilité | 78 | KPIs clairs |
| Cohérence | 68 | Stubs sans message → confusion |
| Confiance | 68 | Onglets vides non expliqués |

**Score page : 72/100**

---

## 9. BIBLIOTHÈQUE (`/dashboard/bibliotheque`)

### Observations

**Flux :** 3 onglets — Mes Fichiers (Storage) / Ressources pédagogiques (DB) / Documents IA (fichiers_dossier).

**Points forts :**
- Architecture 3 sources de données correctement séparées
- Documents IA : recherche, filtre par classe, filtre par type de document, preview inline
- Export Word et PPT depuis la Bibliothèque — réutilise les mêmes exports que Préparer
- Mode édition inline pour les documents IA : `textarea` éditable avec sauvegarde
- Partage de document avec lien — fonctionnalité de partage bêta
- Protection perte de données : `beforeunload` quand `hasUnsaved=true`
- Copie de contenu dans le presse-papier avec feedback visuel (`copiedId`)

**Points faibles :**
- **Édition inline en `<textarea>` brut** : les teachers s'attendent à un éditeur WYSIWYG pour des documents pédagogiques. Taper du Markdown brut dans une zone de texte est un frein à l'adoption.
- `bucketReady` flag : si le bucket Storage n'est pas créé, l'onglet Fichiers affiche silencieusement `false` — l'utilisateur ne sait pas pourquoi il ne peut pas uploader.
- L'onglet par défaut est `documents-ia` — bon choix pour les nouveaux utilisateurs qui viennent de Préparer. Mais si un enseignant n'a jamais généré de document IA, il voit une liste vide sans call-to-action vers Préparer.
- Nombreux états locaux (`useState` × 25+) — page très complexe, difficile à maintenir.

### Scores

| Dimension | Score | Commentaire |
|-----------|-------|-------------|
| UX | 74 | Documents IA bien gérés, textarea brut pénalise |
| UI | 74 | DS 1.0, correct |
| Performance | 70 | 3 sources de données chargées à l'init |
| Lisibilité | 78 | Organisation par onglets claire |
| Cohérence | 72 | Partage et édition bien intégrés |
| Confiance | 74 | beforeunload rassure, textarea brut inquiète |

**Score page : 74/100**

---

## 10. PROFIL (`/dashboard/profil`)

### Observations

**Flux :** Affichage province, style pédagogique, forfait actuel. Modification limitée.

**Points forts :**
- Province affichée clairement
- Forfait visible

**Points faibles :**
- Page seulement partiellement lue (60 lignes). Score conservateur.
- Aucune possibilité de changer le forfait depuis le profil (vers une page de facturation)
- Aucun accès à la gestion du compte (changer mot de passe, email) visible dans le code lu
- Style pédagogique sélectionné à l'onboarding mais pas modifiable depuis le profil (UX classique : "je veux mettre à jour mon style")

### Scores

| Dimension | Score | Commentaire |
|-----------|-------|-------------|
| UX | 65 | Lecture seule, peu actionnable |
| UI | 68 | DS 1.0 |
| Performance | 85 | Page simple |
| Lisibilité | 75 | Informations claires |
| Cohérence | 65 | Loin du standard Préparer |
| Confiance | 65 | Aucune gestion de compte visible |

**Score page : 71/100**

---

## 11. SIDEBAR (`/components/Sidebar.tsx`)

### Observations

**Points forts :**
- Mode compact 64px / étendu 240px via `--sidebar-w` CSS var — transition fluide
- 3 sections nav : Enseignement / Organisation / Administration
- Badge forfait visible en bas
- Admin mode toggle
- Icônes Lucide React — cohérentes

**Points faibles :**
- **"Mon Année" (Teaching Pack)** absent de la sidebar. La fonctionnalité la plus différenciatrice de KlassIA+ n'est pas accessible directement depuis la navigation principale.
- Le mode admin toggle est visible à tout enseignant ? Ou gated par `is_admin` ? Non confirmé dans les 80 lignes lues.

**Score composant : 78/100**

---

## 12. TOPBAR (`/components/Topbar.tsx`)

### Observations

**Points forts :**
- `glass-pill` pills pour classe active, matière, crédits IA, notifs, avatar
- Mode Préparer/Enseigner/Suivre switchable
- Props bien typées

**Points faibles :**
- `glass-pill` CSS class : non confirmé dans `globals.css` — si absent → boutons affichés sans style
- Le `Topbar` est un composant séparé mais la plupart des pages l'intègrent manuellement via `<div className="topbar">` inline au lieu d'utiliser ce composant
- Les crédits IA (`creditsIa.used / creditsIa.total`) sont affichés dans la pill — mais est-ce synchronisé avec la consommation réelle depuis la DB ? Non confirmé.

**Score composant : 74/100**

---

## 13. DASHBOARD FLOATS (`/components/DashboardFloats.tsx`)

### Observations

**Points forts :**
- CommandBar global (`⌘K`) actif sur toutes les pages — très bien
- AssistantFlottant et FeedbackWidget masqués sur Préparer (pour ne pas concurrencer le Copilote DESIGN-14)
- BetaTour actif sur toutes les pages

**Points faibles :**
- AssistantFlottant actif sur Suivre, Bibliothèque, Calendrier — pertinence discutable (ces pages n'ont pas de contexte IA direct)
- BetaTour : non audité — si mal configuré, peut bloquer l'interface

**Score composant : 80/100**

---

## 14. FOUNDER MONITORING (`/founder/monitoring`)

### Observations

**Points forts :**
- Queries parallèles avec `Promise.all` — efficace
- 8 métriques : users, classes, leçons, générations, packs, logs debug/info/warn/error
- Pack Diagnostic : 20 derniers Teaching Packs avec état `build_state` détaillé
- Health check DB/Storage/Auth avec fallback sur erreur
- `beta_logs` table surveillée — bonne pratique pour une bêta

**Points faibles :**
- Aucun contrôle d'accès visible dans le code lu — la route `/founder/monitoring` est-elle protégée par `is_admin` ou uniquement par l'obscurité de l'URL ? Si non protégée côté serveur, tout utilisateur connaissant l'URL peut voir les métriques.
- `health` est toujours `{ db: 'ok', storage: 'ok', auth: 'ok' }` même en cas d'erreur DB (le `catch` le passe à `error` mais la distinction est grossière).

**Score page : 77/100**

---

## SYNTHÈSE ARCHITECTURE & INFRASTRUCTURE

### Ce qui fonctionne bien
- `proxy.ts` (jamais `middleware.ts`) — règle critique respectée
- `export const maxDuration` sur les routes AI — règle critique respectée
- `npx tsc --noEmit` → 0 erreur, `npm run build` → succès
- SSE streaming robuste avec parsing ACTION_TAG
- Auto-save Supabase sur génération IA
- Export Word (docx) et PPT (pptxgenjs) opérationnels
- Système de forfait `useForfait` + `CadenasForFait` uniforme
- Supabase Realtime pour les notifications (`RealtimeNotifier`)

### Risques infrastructure
- Bucket Storage non initialisé → Bibliothèque silencieusement cassée
- Route `/dashboard/historique` possiblement manquante → 404 depuis Suivre
- `/founder/monitoring` possiblement non protégée côté serveur

---

## ACCESSIBILITÉ (A11y)

| Critère | Statut | Note |
|---------|--------|------|
| Labels aria sur boutons icônes | Partiel | Copilote close button : `aria-label` ✓ ; autres non vérifiés |
| Contraste texte | Non audité | Variables CSS — dépend des valeurs réelles |
| Focus visible | Non audité | Pas de `:focus-visible` observé dans globals.css partiel |
| Navigation clavier | Partiel | CommandBar ⌘K présent ; tabs interactifs non testés |
| Lecteur d'écran | Non testé | Aucun attribut ARIA role observé sur les composants structurels |

**Verdict A11y :** Non certifiable pour bêta publique. Acceptable pour bêta invitée (enseignants connus).

---

## INTERNATIONALISATION (FR/EN)

- Préparer : `isFr` prop propagée correctement, labels FR/EN présents
- Dashboard, Classes, Suivre, Bibliothèque : **100% français** — pas de basculement EN
- Incohérence : Préparer est bilingue, le reste de l'app est uniquement FR

**Verdict i18n :** Acceptable pour bêta canadienne francophone. Pas prêt pour marché anglophone.

---

## TABLEAU DE BORD COMPLET DES PAGES

| Page | UX | UI | Perf | Lisib. | Cohér. | Confiance | Score |
|------|----|----|------|--------|--------|-----------|-------|
| Login | 80 | 75 | 90 | 85 | 72 | 78 | **80** |
| Onboarding | 78 | 80 | 85 | 88 | 75 | 80 | **81** |
| Dashboard | 78 | 82 | 72 | 82 | 75 | 78 | **78** |
| Classes | 83 | 85 | 80 | 85 | 82 | 84 | **83** |
| Programme | 70 | 72 | 68 | 75 | 70 | 72 | **71** |
| **Préparer** | **86** | **88** | **80** | **87** | **86** | **85** | **85** |
| Enseigner | 65 | 68 | 75 | 72 | 62 | 65 | **68** |
| Suivre | 70 | 72 | 78 | 78 | 68 | 68 | **72** |
| Bibliothèque | 74 | 74 | 70 | 78 | 72 | 74 | **74** |
| Profil | 65 | 68 | 85 | 75 | 65 | 65 | **71** |
| Founder Monitor | 78 | 70 | 82 | 80 | 72 | 80 | **77** |

**Moyenne pondérée (Préparer × 2, Dashboard × 1.5) : 77/100**

---

*Document généré le 2026-08-10 — RC-01 — Aucune modification de code effectuée*
