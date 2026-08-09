# WORKSPACE-2.0 — Blueprint
**ScorgIA · Bodingo AI Tech Inc. · 2026-08-08**

---

## Vision

ScorgIA n'est plus un générateur de documents.

ScorgIA est un **système d'exploitation pédagogique**.

Le centre de l'expérience n'est plus la conversation IA.

Le centre est **Mon Année Scolaire**.

---

## Principe fondamental

> "Est-ce qu'un enseignant a réellement l'impression de gérer toute son année scolaire depuis cet espace ?"

Toute décision UX doit répondre affirmativement à cette question.

---

## Les 3 zones

```
┌─────────────────┬───────────────────────────────┬──────────────────┐
│                 │                               │                  │
│  ZONE 1         │  ZONE 2                       │  ZONE 3          │
│  Explorateur    │  Document actif               │  Assistant IA    │
│  pédagogique    │                               │  (Copilote)      │
│                 │                               │                  │
│  260px          │  flex: 1                      │  300px           │
│  (collapsible)  │  (toujours visible)           │  (masquable)     │
│                 │                               │                  │
└─────────────────┴───────────────────────────────┴──────────────────┘
```

### Zone 1 — Explorateur pédagogique
- Navigation arborescente : Classe → Mon Année Scolaire → Curriculum/Plan/Séquences/Leçons/Quiz
- Sources de données réelles (Teaching Pack, programme_annuel, fichiers_dossier) + conversations IA (Anciens contenus)
- Collapsible (bouton ◁/▷)
- État mémorisé (localStorage)
- Barre de recherche (filtre conversations, Teaching Pack toujours visible)
- CTA "Construire mon année" (pre-remplit le chat)
- Empty states fiables : basés sur les données DB, pas sur les conversations
- Clic document Teaching Pack → navigation vers l'onglet programme correspondant
- Clic conversation → ouverture dans le workspace Préparer
- **Mis à jour RELEASE-P0.2** : données réelles de 4 tables

### Zone 2 — Document actif
- Toujours visible, jamais vide
- Le streaming IA enrichit le document — jamais de remplacement brutal
- PreparationCanvas pour les plans pédagogiques générés
- DocumentEditor pour les leçons en mode édition directe

### Zone 3 — Assistant IA (Copilote)
- Actions rapides contextuelles
- Historique IA du document actif
- Suggestions d'amélioration
- Différenciation / adaptation provinciale
- Masquable (bouton toggle dans le header)

---

## Architecture des documents

Tout contenu devient un **document nommé**.

Les types de documents reconnus :

| Type              | Emoji | Couleur  | Dossier destination      |
|-------------------|-------|----------|--------------------------|
| `curriculum`      | 📘    | #60A5FA  | Curriculum               |
| `plan_annuel`     | 📅    | #A78BFA  | Plan annuel              |
| `plan_lecon`      | 📝    | #34D399  | Plans de leçon           |
| `fiche_lecon`     | 📄    | #34D399  | Plans de leçon           |
| `lecon_complete`  | 📖    | #FBC34A  | Leçons                   |
| `quiz`            | 🎮    | #FB923C  | Quiz                     |
| `evaluation`      | 📊    | #F87171  | Évaluations              |
| `email_parents`   | 📧    | #F472B6  | Emails parents           |
| `autre`           | 💬    | —        | Brouillons               |

---

## Entrée principale : Construire mon année

Le bouton **"Construire mon année"** déclenche un assistant en 10 étapes :

1. Importer le curriculum OU choisir le curriculum officiel de la province
2. Choisir le modèle pédagogique (défaut : ScorgIA Alberta)
3. Construire le Teaching Pack
4. Créer le Plan annuel
5. Créer toutes les Séquences
6. Créer tous les Plans de leçon
7. Créer les Quiz
8. Créer les Évaluations
9. Validation
10. Année prête

À la fin, l'enseignant navigue dans son Explorateur entièrement peuplé.

---

## Stack technique

- Next.js 16.2.6 App Router, React 19, TypeScript 5
- Supabase (BDD + auth + storage)
- Claude (Anthropic) pour la génération
- composants en inline styles (pas de Tailwind dans les nouveaux composants)
- localStorage pour les états d'expand/collapse de l'explorateur

---

## Contraintes absolues

- Ne pas modifier SPIE
- Ne pas modifier les migrations existantes sauf nécessité démontrée
- Ne jamais afficher "Powered by Claude"
- Ne jamais inventer un résultat d'apprentissage / une norme provinciale
- Ne jamais présenter un gabarit ScorgIA comme un formulaire ministériel officiel
- Ne pas ajouter : nouvelle province ; Stripe ; nouveaux forfaits ; marketplace ; collaboration ; application mobile ; nouvelles couches d'architecture ; nouveaux moteurs SPIE

---

## Statut d'implémentation (2026-08-09 — après RELEASE-P0.2)

| Composant                          | Statut         |
|------------------------------------|----------------|
| PedagogiqueExplorer                | ✅ Implémenté  |
| PedagogiqueExplorer — 4 sources DB | ✅ RELEASE-P0.2 |
| Arbre "Mon Année Scolaire"         | ✅ RELEASE-P0.2 |
| Clic nœud → navigation onglet      | ✅ RELEASE-P0.2 |
| WorkspaceLayout 3 zones            | ✅ Implémenté  |
| WorkspaceLayout collapse/expand    | ✅ Implémenté  |
| Bouton "Construire mon année"      | ✅ Implémenté (prompt IA) |
| CTA adaptatif Construire/Reprendre | ✅ RELEASE-P0.2 |
| Modal confirmation Reconstruire    | ✅ RELEASE-P0.2 |
| Empty states avec CTA              | ✅ Implémenté  |
| AIAssistantPanel (Zone 3)          | ✅ Existant    |
| PreparationCanvas (Zone 2)         | ✅ Existant    |
| Mon Année Scolaire (wizard 10 étapes) | 🔄 Roadmap  |
| Versioning par document            | 🔄 Roadmap     |
| Historique IA par document         | 🔄 Roadmap     |
| Vue arborescente séquences         | 🔄 Roadmap     |
