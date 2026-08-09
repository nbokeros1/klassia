# WORKSPACE-2.0 — Roadmap
**ScorgIA · 2026-08-08**

---

## Phase 1 — Fondation (actuelle) ✅

**Livré dans WORKSPACE-2.0 initial**

- [x] Explorateur pédagogique (`PedagogiqueExplorer`) — remplace `HistoriquePreparer`
- [x] Structure : Classe → Dossiers type → Documents
- [x] Barre de recherche (titre, type, classe)
- [x] Empty states avec CTA par dossier
- [x] Bouton "Construire mon année" (pre-fill prompt IA)
- [x] Collapse / expand explorateur avec animation CSS
- [x] Bouton ▷ pour rouvrir l'explorateur depuis le workspace
- [x] Persistance état d'expansion (localStorage)
- [x] WorkspaceLayout 3 zones : Explorer + Document + AI Copilote
- [x] Transitions fluides collapse/expand

---

## Phase 2 — Documents enrichis

**Dépendances : aucune migration DB obligatoire**

- [ ] Renommer un document (double-clic inline)
- [ ] Trier les documents par date / titre dans chaque dossier
- [ ] Archiver un document (soft delete → dossier "Archivés")
- [ ] Dupliquer un document
- [ ] Compteurs fiables (lecture depuis `conversations_ia` count)
- [ ] Indicateur de statut par document dans l'explorateur

---

## Phase 3 — Séquences et arborescence profonde

**Dépendances : nouvelle table `sequences` (migration DB)**

- [ ] Nœud "Séquence" entre Classe et les dossiers de type
- [ ] Créer / renommer / réordonner une séquence
- [ ] Rattacher un document à une séquence
- [ ] Vue arborescente : Année → Séquences → Leçons
- [ ] Compteur de leçons par séquence

---

## Phase 4 — Mon Année Scolaire (wizard)

**Dépendances : SPIE, curriculum engine**

- [ ] Wizard 10 étapes "Construire mon année"
  - Étape 1 : Importer ou choisir le curriculum officiel
  - Étape 2 : Choisir le modèle pédagogique (défaut ScorgIA Alberta)
  - Étape 3 : Teaching Pack
  - Étape 4 : Plan annuel
  - Étape 5 : Créer toutes les séquences
  - Étape 6 : Créer tous les plans de leçon
  - Étape 7 : Quiz
  - Étape 8 : Évaluations
  - Étape 9 : Validation
  - Étape 10 : Année prête → Explorateur peuplé
- [ ] Indicateur de progression de l'année (% complété)
- [ ] Alerte quand une leçon est manquante ou en brouillon

---

## Phase 5 — Versioning

**Dépendances : nouvelle table `document_versions` (migration DB)**

- [ ] Chaque sauvegarde crée automatiquement une version
- [ ] Panneau "Historique des versions" dans l'inspecteur
- [ ] Comparer deux versions (diff textuel)
- [ ] Restaurer une version antérieure
- [ ] Renommer une version ("Version finale", "Avant correction")
- [ ] Dupliquer une version comme nouveau document

---

## Phase 6 — Historique IA par document

- [ ] Tab "Historique IA" dans le panneau copilote
- [ ] Chronologie des actions IA par document
- [ ] Voir / Comparer / Restaurer à partir d'une action passée

---

## Phase 7 — Responsive et mobile

- [ ] Desktop (≥1280px) : 3 colonnes fixes
- [ ] Laptop (≥1024px) : explorateur collapsible automatiquement
- [ ] Tablette (768–1023px) : explorateur en drawer
- [ ] Mobile (<768px) : priorité lecture, IA en sheet inférieur

---

## Principes de la roadmap

1. Chaque phase est indépendante et livrable
2. L'enseignant doit bénéficier de chaque phase sans attendre les suivantes
3. Aucune phase ne casse les données existantes
4. Les phases 3+ nécessitent validation Product Owner avant migration DB
