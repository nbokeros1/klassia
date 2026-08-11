# Design Decisions — ScorgIA DS 2.0
## Journal des décisions de design

**Version :** 2.0 Phase 1  
**Date :** 2026-08-09

---

## DD-001 — Violet comme couleur d'action uniquement

**Décision :** Le violet (`#6C5CE7` / `#7F77DD`) est réservé aux éléments interactifs et aux actions. Les surfaces deviennent neutres.

**Raison :** Quand tout est violet, rien ne l'est. Le violet doit signaler l'interactivité, pas la décoration.

**Application :** Boutons primaires, accents actifs, focus rings, badges de statut actif.

**Exception :** Les logos et la sidebar gardent le violet dans leur identité de marque.

---

## DD-002 — Command Bar plutôt qu'une barre de recherche

**Décision :** Ctrl+K ouvre une Command Bar universelle plutôt qu'une barre de recherche dans le header.

**Raison :** Les enseignants naviguent entre classes, leçons, outils. Une Command Bar permet de naviguer sans quitter le flux de travail. Les outils référence (Raycast, Linear) ont validé ce pattern.

**Contre-argument écarté :** "Les enseignants ne connaissent pas Ctrl+K."  
**Réponse :** Le footer de la Command Bar affiche les raccourcis. L'apprentissage est immédiat.

---

## DD-003 — Teaching Pack Card avec anneau de progression

**Décision :** L'anneau de progression SVG (ring) plutôt qu'une simple barre.

**Raison :** L'anneau est plus compact, s'intègre dans l'en-tête de carte, et donne une lecture immédiate du % sans occuper une ligne complète.

**Alternative écartée :** Barre de progression seule.  
**Décision :** Garder les deux — l'anneau en header + la barre linéaire en détail — pour deux lectures complémentaires.

---

## DD-004 — Tokens additifs (ne pas casser l'existant)

**Décision :** DS 2.0 ajoute une section `/* DS 2.0 */` dans `globals.css` sans modifier les tokens existants.

**Raison :** Les tokens existants sont référencés dans 40+ composants. Une migration cassante bloquerait le développement. L'approche additive permet une migration progressive.

**Plan de migration :** Les nouvelles pages utilisent `--text-base`, `--sp-4`, etc. Les pages existantes migrent lors des prochains sprints.

---

## DD-005 — IATimeline : spinner 800ms (plus lent que standard)

**Décision :** Le spinner de l'IATimeline tourne à 800ms, pas 500ms.

**Raison :** Un spinner trop rapide crée de l'anxiété. Pour une génération de plan annuel qui prend 30–90 secondes, le spinner doit être perçu comme "ScorgIA réfléchit sérieusement", pas comme "une simple requête HTTP".

---

## DD-006 — EmptyState avec actions, jamais de texte seul

**Décision :** Tout état vide contient au minimum un `title` + une `action` primaire.

**Raison :** Un état vide sans action force l'utilisateur à comprendre seul comment sortir de cet état. C'est une friction inutile.

**Règle :** Le texte d'un état vide explique pourquoi cet état existe ET comment en sortir.

---

## DD-007 — CommandBar charge les classes dynamiquement (lazy)

**Décision :** Les classes sont chargées depuis Supabase uniquement quand la Command Bar s'ouvre.

**Raison :** Charger les classes au montage du composant impacterait le First Contentful Paint de toutes les pages. Le chargement lazy garantit que l'impact est nul quand la Command Bar n'est pas utilisée.

**Cas de bord :** Si le fetch échoue, les commandes statiques restent disponibles. La Command Bar ne casse pas.

---

## DD-008 — DashboardFloats comme point d'intégration global

**Décision :** La CommandBar est intégrée dans `DashboardFloats.tsx`, qui est chargé dans le layout dashboard.

**Raison :** Modifier chaque page pour ajouter la CommandBar était impossible (40+ pages). `DashboardFloats` est le seul composant global du dashboard — c'est le point d'intégration naturel.

**Conséquence :** La CommandBar est disponible sur TOUTES les pages dashboard sans aucune modification de page individuelle.

---

## DD-009 — Breadcrumb via items[] explicites (pas automatique)

**Décision :** Le composant Breadcrumb prend un tableau `items[]` explicite plutôt que de dériver le fil d'Ariane depuis l'URL.

**Raison :** Les URLs de ScorgIA ne sont pas toujours lisibles par un humain (`/classes/uuid/lecons/uuid`). La dérivation automatique produirait des breadcrumbs illisibles. Les items doivent être construits par chaque page avec du contexte réel (nom de classe, titre de leçon).

---

## DD-010 — Badge : aliases DB → variants visuels

**Décision :** Le composant `Badge` accepte directement les valeurs statut DB (`pret`, `generation_en_cours`, `partiellement_genere`, etc.) et les map vers des variants visuels.

**Raison :** Évite une couche de mapping dans chaque page. La page passe `statut` directement, le composant sait quoi afficher.

---

## DD-011 — Lucide React plutôt qu'emoji dans la sidebar

**Décision :** Les emoji sont remplacés par des icônes Lucide React (`strokeWidth: 1.75`, `size: 15`) dans la Sidebar 3.0.

**Raison :** Les emoji varient selon l'OS/navigateur (rendu Apple vs Windows vs Android ≠). Les SVG Lucide sont cohérents, redimensionnables, accessibles, et s'inscrivent dans l'esthétique linéaire premium. 10 emoji différents créaient du bruit visuel non maîtrisé.

**Règle dérivée :** Maximum 1 icône par item nav. Jamais d'emoji dans la sidebar. Les emoji restent autorisés dans les boutons contextuels (Topbar, export, etc.).

---

## DD-012 — Suppression du ring de crédits IA (faux compteur)

**Décision :** Le composant `IaRing` et le pill "Générations restantes" sont supprimés de `Topbar.tsx` et de `WorkspaceHeader.tsx`.

**Raison :** Ces éléments affichaient `0/10` ou `0/20` en permanence (valeurs hardcodées). Une donnée fictive affichée comme réelle est pire que l'absence de donnée — elle crée de la confusion et érode la confiance. Quand un vrai système de quotas sera implémenté, on ajoutera le composant réel.

**Exception :** La prop `creditsIa` est maintenue dans les interfaces pour compatibilité descendante.

---

## DD-013 — Navigation plate → 3 sections hiérarchiques

**Décision :** La sidebar passe de 10 items plats à 3 sections ENSEIGNEMENT / ORGANISATION / ADMINISTRATION.

**Raison :** Un enseignant a des contextes mentaux distincts : enseigner (création, exécution) vs organiser (planning, suivi) vs administrer (profil, école). Une navigation plate force l'utilisateur à scanner tous les items pour trouver le sien. Les sections réduisent le temps de scan de ~60%.

**Règle dérivée :** Toute nouvelle route doit être assignée à l'une des 3 sections avant d'être ajoutée à la sidebar.

---

---

## DD-014 — BuildDot : symboles typographiques plutôt que SVG

**Décision :** Les états de construction (●/◐/◌/⚠) utilisent des caractères Unicode dans un `<span>` coloré via `data-state`, pas des SVG ou des icônes Lucide.

**Raison :** À 8px, les SVG ont du flou de rendu anti-aliasing selon le navigateur. Les caractères Unicode sont parfaitement nets à petite taille. La pulsation est appliquée via CSS `animation` sur `opacity` — aucune dépendance JS.

**Exception :** Pour des états à afficher à grande taille (>20px), préférer `Badge` (DESIGN-01) avec dot SVG.

---

## DD-015 — Quick Actions : prompt → onNewDocument, jamais d'appel API direct

**Décision :** Les quick actions (Leçon / Quiz au hover des séquences) mettent un prompt dans l'input via `onNewDocument(prompt, classeId)`. Elles ne déclenchent jamais directement l'API IA.

**Raison :** L'enseignant doit voir le prompt avant de l'envoyer — il peut le modifier, le compléter, ou changer d'avis. Un appel direct IA serait une action non-annulable déclenchée par un survol accidentel. `onNewDocument` respecte le flux existant de l'enseignant.

**Règle dérivée :** Aucune action dans l'explorateur ne doit déclencher une génération IA sans passage par la zone input de l'enseignant.

---

## DD-016 — Focus Mode mémorisé via localStorage, pas Supabase

**Décision :** L'état du Focus Mode (`ws_focus_mode`) est stocké en `localStorage`, pas en base Supabase.

**Raison :** C'est une préférence de session locale — non essentielle à la cohérence cross-device. Stocker ce toggle en Supabase ajouterait une colonne à `utilisateurs` pour une fonctionnalité qui se désactive en 1 clic. Le coût réseau (latence) est disproportionné par rapport à la valeur d'une synchronisation cross-device de cette préférence.

**Règle dérivée :** Les préférences de vue sans impact métier restent en localStorage. Les préférences pédagogiques (province, niveau, langue de génération) restent en Supabase.

---

## DD-017 — Province/année depuis teaching_packs, pas depuis classes

**Décision :** Dans l'explorateur workspace, `province` et `annee_scolaire` sont chargés depuis la table `teaching_packs`, pas depuis `classes`.

**Raison :** La table `classes` ne contient pas ces champs — ils sont dans `teaching_packs` qui représente la configuration pédagogique de l'année. C'est la source de vérité correcte. L'extension du SELECT (`+province, +annee_scolaire`) est additive et n'impacte pas les performances (une seule requête déjà existante).

---

---

## DD-018 — Copilot fermé par défaut + persistence localStorage

**Décision :** L'AIAssistantPanel (copilot) est fermé par défaut et mémorise l'état de préférence via `localStorage.getItem('ws_copilot_open')`.

**Raison :** Un panneau ouvert par défaut réduit la surface du document de ~268px. La majorité des sessions ne nécessitent pas le copilot. Mémoriser la préférence évite la friction pour les utilisateurs qui le gardent ouvert.

**Règle dérivée :** L'état initial des panneaux latéraux doit toujours être dérivé de localStorage, pas hardcodé.

---

## DD-019 — Context Bar sans interaction

**Décision :** La Context Bar affiche `classe · niveau · matière` en lecture seule. Elle n'est pas cliquable.

**Raison :** Une Context Bar interactive crée une confusion avec le sélecteur de classe dans le header. Son rôle est informatif (AI Visibility Level 0), pas navigateur.

---

## DD-020 — Suggestion Strip : ignorée par docType, pas par booléen

**Décision :** L'état "ignoré" d'une Suggestion Strip est encodé comme `ignoredSuggestionDocType === docType`, pas comme un booléen `ignored`.

**Raison :** Quand un nouveau document est généré (nouveau `docType`), la suggestion doit réapparaître automatiquement sans reset manuel. Un booléen persistant aurait bloqué les suggestions sur tous les nouveaux documents.

---

## DD-021 — handoff workspace après Build My Year

**Décision :** Après la construction, `handleWizardDone` ne cache plus le wizard. L'enseignant voit l'écran de succès et clique "Ouvrir mon année →" pour naviguer vers le workspace.

**Raison :** Cacher le wizard immédiatement ne laisse pas l'enseignant voir ce qui a été construit. L'écran de succès calme (M13) renforce la confiance avant la navigation.

---

## DD-022 — Quick actions IA : max 4, contextuel par docType

**Décision :** L'AIAssistantPanel affiche au maximum 4 actions rapides, sélectionnées selon le `docType` du dernier document généré.

**Raison :** 6 actions génériques créent un bruit cognitif. 4 actions contextuelles sont immédiatement pertinentes et réduisent le temps de décision. Aucun enseignant ne devrait se demander quelle action choisir.

---

## DD-023 — Smart CTA : une seule action primaire par carte de classe

**Décision :** Chaque carte de classe n'expose qu'un seul bouton CTA, calculé dynamiquement selon l'état de la classe. Les actions secondaires sont dans le menu `···`.

**Raison :** Deux boutons primaires créent l'indécision. La plateforme connaît l'état de la classe (curriculum, pack, leçons) — elle peut choisir la prochaine action logique à la place de l'enseignant. Le menu `···` reste disponible pour les cas atypiques.

**Arbre de décision :** `!pack && !curriculum` → Construire → sinon `totalLecons > 0` → Continuer → sinon `pack` → Ouvrir mon année → sinon Préparer une leçon.

---

## DD-024 — Tri et recherche client-side, pas de requête supplémentaire

**Décision :** Le tri et la recherche dans « Mes Classes » sont calculés en mémoire (useMemo) sur les données déjà chargées. Aucune requête Supabase additionnelle n'est déclenchée.

**Raison :** Les classes d'un enseignant ne dépassent pas ~30 entrées. Le tri et filtre JS sont instantanés. Une requête réseau par changement de tri créerait une latence perceptible inutile et compliquerait la gestion de l'état.

---

## DD-025 — `updated_at` des leçons comme signal d'activité récente

**Décision :** La « dernière activité » d'une classe est dérivée du max de `updated_at` des leçons liées à cette classe, pas d'un champ `updated_at` de la classe elle-même.

**Raison :** `classes.updated_at` se met à jour lors de toute modification de la classe (nom, couleur, etc.) — ce n'est pas représentatif de l'activité pédagogique. Le `updated_at` des leçons reflète le vrai travail de l'enseignant.

---

## Voir aussi

- [Motion_Guidelines.md](Motion_Guidelines.md) — Décisions sur les animations
- [DESIGN-01_Report.md](DESIGN-01_Report.md) — Rapport de livraison Phase 1
- [DESIGN-03_Pedagogical_Navigation.md](DESIGN-03_Pedagogical_Navigation.md) — Rapport de livraison Phase 3
- [DESIGN-04_Pedagogical_Workspace_Canvas.md](DESIGN-04_Pedagogical_Workspace_Canvas.md) — Rapport de livraison Phase 4
- [DESIGN-06_Report.md](DESIGN-06_Report.md) — Rapport de livraison Phase 6
- [DESIGN-07_Report.md](DESIGN-07_Report.md) — Rapport de livraison Phase 7
- [DESIGN-08_Report.md](DESIGN-08_Report.md) — Rapport de livraison Phase 8
