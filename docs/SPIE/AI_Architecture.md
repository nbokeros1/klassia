# SPIE-X — Architecture IA
## Qui décide, génère, valide, mémorise ?

**Date** : 2026-08-04

---

## Vue d'ensemble

ScorgIA dispose de **deux couches IA** :

1. **SPIE (déterministe)** — intelligence pédagogique structurée, 0 appel Claude, traceable
2. **Couche génération (stochastique)** — appels Claude pour le contenu textuel

Ces deux couches doivent rester **strictement séparées**. Le SPIE prépare le contexte ; la couche génération produit le contenu.

---

## Qui décide ?

### Décisions déterministes (SPIE — zéro appels IA)

| Qui | Ce qu'il décide | Moteur |
|-----|----------------|--------|
| PCE DecisionEngine | Peut-on générer maintenant ? Quelle leçon vient après ? Est-on en retard critique ? | SPIE-03 |
| PPS PlanningSimulator | La planification est-elle faisable ? Quels risques ? Quel statut ? | SPIE-05 |
| PSE StrategyValidator | La stratégie passe-t-elle les 7 dimensions ? `validePourGeneration` ? | SPIE-07 |
| PTE RecalculationEngine | La déviation dépasse-t-elle le seuil 30 min ? Recalcul en cascade ? | SPIE-06 |
| AYDTE ImpactEngine | Quel est l'impact d'un changement de séquence ou de calendrier ? | SPIE-04 |

**Règle absolue** : Aucune de ces décisions n'appelle Claude. Elles sont déterministes, auditables, reproductibles.

### Décisions stochastiques (Claude)

| Qui | Ce qu'il décide | API |
|-----|----------------|-----|
| Claude (extraction) | Quels sont les RAG/RAS dans ce document curriculaire ? | `/api/ia/curriculum` |
| Claude (génération) | Quel est le contenu de cette leçon ? | `/api/ia/generer` |
| Claude (assistant) | Que répondre à la question de cet enseignant ? | `/api/ia/assistant` |
| Claude (copilote) | Que suggérer pendant la session d'enseignement ? | `/api/ia/teaching-copilot` |

---

## Qui génère ?

### Pipeline de génération de contenu

```
1. teacher-reasoning-engine.ts
   └── Décide : type de contenu optimal, niveau de détail, skills à activer

2. build-auto-context.ts
   ├── Charge ProfilIA (province, style, préférences)
   ├── Charge classe + leçon courante
   └── Intègre le PedagogicalContext de PCE

3. skills-pedagogiques.ts
   └── Bibliothèque de compétences pédagogiques sélectionnées par le reasoning engine

4. build-system-prompt.ts (SACRED 🔒 — DEC-005)
   ├── Gabarit officiel de génération (7 blocs)
   ├── Injecte le contexte pédagogique
   └── Construit le prompt final pour Claude

5. Anthropic Claude (claude-opus-4-5)
   └── Génère le contenu pédagogique
```

### Types de contenu générable

| Type | Route | Gabarit |
|------|-------|---------|
| Leçon complète (7 blocs) | `/api/ia/generer` | SYSTEM_PROMPT_LECON |
| Séquence d'apprentissage | `/api/ia/generer` | (template séquence) |
| Quiz formatif | `/api/ia/quiz` | (template quiz) |
| Activité | `/api/ia/activite` | (template activité) |
| Kit de leçon | `/api/ia/kit` | (template kit) |
| Image pédagogique | `/api/ia/generer-image` | DALL-E / équivalent |
| Plan annuel complet | `/api/ia/regenerer-plan-annuel` | (template programme) |

---

## Qui valide ?

### Validation avant génération (SPIE)

```
PCE ContextScore ≥ 30 ──────────────────────────────► Contexte valide ?
     │                                                        │
     └─ Non → Génération possible mais qualité réduite       │
                                                              │
PPS statut ≠ 'irrealisable' ────────────────────────► Plan faisable ?
     │                                                        │
     └─ irrealisable → BLOQUE la génération                  │
                                                              │
PSE validePourGeneration = true ─────────────────────► Stratégie prête ?
     │                                                        │
     └─ false → BLOQUE la génération du plan annuel           │
                                                              ▼
                                                      Génération autorisée
```

### Validation de qualité (post-génération)

| Validateur | État |
|------------|------|
| TQE (Teaching Quality Engine) | Stub SPIE-01 — à implémenter |
| Validation structure JSON | En place (parsing + types) |
| Validation UI | Via DocumentEditor (enseignant peut corriger) |

---

## Qui mémorise ?

### Mémoire à court terme (session)

| Composant | Ce qu'il mémorise | Durée |
|-----------|-------------------|-------|
| `teacher-memory-engine.ts` | Contexte de la session de génération en cours | Session |
| `teacher-brain` | Mémoire IA des préférences et style detecté | Session → DB |

### Mémoire à long terme (persistante)

| Composant | Ce qu'il mémorise | Durée |
|-----------|-------------------|-------|
| `PCE ContextMemory` | Couverture du programme (enseigne/saute/en_retard…) | Année scolaire |
| `ProgrammeAnnuel` (DB) | Plan annuel complet | Permanent |
| `AcademicYearTwin` (SPIE-04) | Jumeau numérique (domain model) | [⚠️ non persisté] |
| `PedagogicalStrategy` (SPIE-07) | Stratégie annuelle | [⚠️ non persistée] |
| `GenerationIA` (DB) | Journal de toutes les générations | Permanent |
| `ProfilIA` (DB/Utilisateur) | Préférences IA enseignant | Permanent |

**[DETTE CRITIQUE]** : `AcademicYearTwin`, `PedagogicalSimulation`, `PedagogicalStrategy` ne sont pas persistés en DB. Ils sont recalculés à chaque requête. Ceci est acceptable pour le prototype mais devient une contrainte de performance pour la production.

---

## Qui améliore ?

| Composant | Rôle d'amélioration |
|-----------|---------------------|
| `insight-engine` | Détecte les tendances et génère des insights actionnables |
| `predictive-engine` | Prédit la progression future de la classe |
| `recommendation-engine` | Recommande les prochaines actions pour l'enseignant |
| `mission-engine` | Maintient l'engagement via la gamification |
| AYDTE versioning | Historise chaque version du plan annuel (avant/après événements) |
| PTE clock historique | Trace l'évolution du retard/avance au fil du temps |

---

## Règles absolues de l'architecture IA

| Règle | Source |
|-------|--------|
| `build-system-prompt.ts` ne peut PAS être modifié via SPIE | DEC-005 |
| PSE, PPS, PTE, AYDTE : 0 appels Claude | DEC-018, PSE brief |
| `autoApplicable: false` sur toutes les recommandations | DEC-017 |
| L'enseignant valide TOUJOURS avant l'application d'une stratégie | PSE brief |
| Le prompt de génération de leçon (SYSTEM_PROMPT_LECON) est sacré | DEC-005 |
| PCE est l'entrée obligatoire pour toute génération | DEC-013 |

---

## Flux de décision IA complet

```
Enseignant demande une génération
            │
            ▼
    [SPIE — déterministe, 0 IA]
    PCE: Contexte valide ?
    PPS: Plan faisable ?
    PSE: Stratégie validée ?
            │
    [Tous verts]
            │
            ▼
    [Couche IA — stochastique]
    teacher-reasoning-engine → strategy
    build-auto-context → context
    skills-pedagogiques → skills selected
    build-system-prompt → final prompt (SACRED)
            │
            ▼
    Anthropic Claude claude-opus-4-5
            │
            ▼
    Résultat → ValidationStructure → DB → UI
```
