# Plans de séquence — Structure et affichage

**Statut :** SPIE-BETA-02 · Actif  
**Dernière mise à jour :** 2026-08-04

---

## Définition

Un **plan de séquence** correspond à une unité thématique dans le plan annuel. Il contient :
- Titre de l'unité et thème
- Semaines allouées (début / fin)
- Objectifs pédagogiques de l'unité
- Compétences visées
- Liste des leçons planifiées (structure, pas encore développées)

---

## Source des données

Les plans de séquence sont **extraits directement du `ContenuProgramme`** — ils ne nécessitent pas d'appel IA distinct. Chaque `Unite` dans le plan annuel est un plan de séquence.

L'étape `plans_lecon` du pipeline est donc instantanée : elle lit `programme.unites[0].lecons` pour la 1re séquence et envoie un événement SSE informatif.

---

## Entitlements

| Forfait | Accès |
|---------|-------|
| Tous (bêta) | Toutes les séquences structurées (squelette) |
| Pro / Pro+ / Institution | Plans de leçon développés pour toutes les séquences |

---

## Export DOCX (SPIE-BETA-02)

`POST /api/spie/pack-export { type: 'sequence', sequence_index: n }` — entitlement `export_sequence`.

Le DOCX contient : titre de l'unité, objectifs, compétences, liste des leçons (titre + durée + type).

## Quality Gate pour séquences

`POST /api/spie/quality-gate { document_type: 'sequence', sequence_index: n }`.

Contrôles : titre, durée valide, ≥1 objectif curriculaire, ≥2 leçons, leçon évaluation/synthèse.  
Voir [Pedagogical_Quality_Gate.md](Pedagogical_Quality_Gate.md).

## Gabarits (SPIE-BETA-02)

| ID | Disponibilité |
|----|---------------|
| `generique` | Tous (bêta) |
| `scorgia-alberta-plan-sequence-v1` | Si `province === 'alberta'` |
| Gabarit personnalisé | Via `TemplateMapping` — [Template_Mapping.md](Template_Mapping.md) |

Voir [Alberta_Sequence_Template.md](Alberta_Sequence_Template.md) pour la structure complète.

---

## Voir aussi

- [Annual_Plan.md](Annual_Plan.md) — Plan annuel complet
- [Lesson_Plans.md](Lesson_Plans.md) — Développement des leçons
- [Teaching_Pack_Exports.md](Teaching_Pack_Exports.md) — Exports DOCX
