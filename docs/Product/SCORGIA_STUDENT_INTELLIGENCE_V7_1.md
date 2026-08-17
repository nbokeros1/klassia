# ScorgIA V7.1 — Student Intelligence & Intervention Foundation

**Statut :** Livré  
**Version :** 7.1.0  
**Audience :** Product Owner, Enseignants, Équipe pédagogique  

---

## Vue d'ensemble

ScorgIA V7.1 introduit la fondation du système d'intelligence pédagogique élève.
Ce système permet à ScorgIA de comprendre une classe pédagogiquement tout en
protégeant rigoureusement les données sensibles des élèves.

### Ce que V7.1 fait

- **Profil pédagogique structuré** — forces, besoins, préférences d'apprentissage
  documentés par l'enseignant, sans labels diagnostics
- **Plan de soutien V7.1** — objectifs mesurables, boucle d'intervention traçable,
  révisions périodiques, audit trail complet
- **Validation d'objectifs** — le système signale les objectifs trop vagues ou
  sans critères mesurables (déterministe — aucune IA)
- **Différenciation pédagogique** — recommandations basées sur le profil collectif
  de la classe (jamais sur des données individuelles nominatives)
- **Groupements pédagogiques** — propositions avec noms neutres et justifications
  pédagogiques, toujours à confirmer par l'enseignant
- **Contexte de classe agrégé** — ScorgIA comprend la classe sans exposer d'élèves
- **Privacy enforcement** — pseudonymisation, champs protégés, audit de provenance

### Ce que V7.1 ne fait PAS

ScorgIA ne diagnostique pas. ScorgIA n'invente pas de codes officiels. ScorgIA ne
remplace pas un spécialiste. ScorgIA ne pose pas de jugement définitif sur un élève.

Toute suggestion générée par ScorgIA est clairement identifiée comme
`AI_SUGGESTION` et requiert la confirmation de l'enseignant avant d'être appliquée.

---

## Catégories de données

Les données élève sont organisées en 5 catégories strictement séparées :

| Catégorie | Contenu | Qui peut écrire | L'IA peut écrire ? |
|-----------|---------|-----------------|-------------------|
| A — Identité | Référence à `eleves` (jamais dupliquée) | Système | Non |
| B — Profil pédagogique | Forces, besoins, préférences (observés) | Enseignant | Suggestions seulement |
| C — Données de soutien | Désignations, accommodations, modifications | Enseignant/École | Jamais |
| D — Observations | Notes structurées enseignant | Enseignant uniquement | Jamais |
| E — Suggestions IA | Propositions ScorgIA identifiées | ScorgIA | Oui (AI_SUGGESTION) |

---

## Boucle d'intervention

Chaque intervention suit une chaîne traçable :

```
BESOIN → BASELINE → OBJECTIF → STRATÉGIE → INTERVENTION
      → OBSERVATION → PREUVE → ANALYSE → DÉCISION → AJUSTEMENT
```

L'enseignant peut répondre à 7 questions clés pour chaque intervention :
1. Pourquoi cette intervention ?
2. Pour quel objectif ?
3. Depuis quand ?
4. À quelle fréquence ?
5. Qui est responsable ?
6. Qu'est-ce qu'on observe ?
7. Quelle décision a été prise ?

---

## Niveaux de soutien (UDL)

| Niveau | Population | Description |
|--------|------------|-------------|
| Universel | 100% | Pratiques efficaces pour tous — intégrées à la conception |
| Ciblé | ~15-20% | Interventions supplémentaires pour difficultés spécifiques |
| Individualisé | ~2-5% | Soutien intensif — souvent lié à un plan formel |

Ces niveaux ne sont pas des diagnostics. Ils décrivent l'intensité du soutien,
pas les capacités de l'élève.

---

## Objectifs mesurables (SMART)

Le système valide automatiquement que chaque objectif contient :
- **Comportement** : action observable ciblée
- **Condition** : contexte dans lequel on l'observera
- **Critère** : comment on sait que c'est atteint
- **Échéance** : date cible

Un objectif comme "améliorer sa lecture" sera signalé comme insuffisant.
Un objectif comme "Lors de la lecture à voix haute en classe, l'élève lira
un texte de niveau 3 avec ≤3 erreurs par 100 mots, d'ici le 15 mars 2027"
sera validé comme mesurable.

---

## Ce qui est interdit à ScorgIA

- Créer ou modifier des désignations officielles
- Inventer des codes de financement
- Formuler un diagnostic médical ou pseudo-médical
- Écraser une donnée confirmée par l'enseignant ou une source officielle
- Produire "élèves faibles" ou "élèves forts" dans l'interface
- Prétendre qu'un groupement est "le meilleur"
- Remplacer le jugement professionnel de l'enseignant

---

## Prochaines étapes (V7.2)

- Composants UI pour afficher et éditer les plans de soutien
- Liaison `lecons.contenu_json` avec les données V7.0 (plan de leçon enrichi)
- Export PDF du plan de soutien (format FOIP-conforme)
- Migration progressive de `eleves.profil_type` vers le profil pédagogique V7.1
