# ScorgIA Alberta Teaching Pack

**Statut :** SPIE-BETA-02 · Actif  
**Version :** 1.0.0-beta  
**Dernière mise à jour :** 2026-08-04

---

## Définition

Le **ScorgIA Alberta Teaching Pack** est le premier pack provincial de KlassIA+. Il n'est PAS un produit officiel d'Alberta Education ni du gouvernement de l'Alberta.

Il s'agit d'un ensemble de :
- 3 gabarits pédagogiques structurés (plan annuel, séquence, leçon)
- Règles de structuration adaptées au contexte albertain
- Contrôles qualité alignés sur le Teaching Quality Standard (2019)
- Références aux sources publiques d'Alberta Education (non validées officiellement)

**Avertissement légal intégral :**  
ScorgIA Alberta Teaching Pack est un outil d'aide à la planification conçu par ScorgIA (Bodingo AI Tech Inc.). Il ne constitue pas un document officiel du gouvernement de l'Alberta ni d'Alberta Education. L'enseignant demeure responsable du contenu enseigné et de sa conformité avec les exigences curriculaires officielles.

---

## Métadonnées

| Champ | Valeur |
|-------|--------|
| ID | `scorgia-alberta-v1-beta` |
| Auteur | ScorgIA / Bodingo AI Tech Inc. |
| Province | Alberta |
| Langue | Français (traduction anglaise à venir) |
| Statut | Beta |
| Date publication | 2026-08-04 |

---

## Niveaux compatibles

Maternelle à 12e année (toutes matières principales).

---

## Sources de référence

| Source | Organisme | Statut |
|--------|-----------|--------|
| Program of Studies | Alberta Education | Référence ScorgIA en validation |
| Teaching Quality Standard (2019) | Alberta Education | Référence ScorgIA en validation |

**Ces sources sont des références indicatives. Elles n'ont pas été officiellement validées par Alberta Education pour ce produit.**

---

## Limites explicites

1. Ce pack n'est pas approuvé par Alberta Education
2. Les résultats d'apprentissage sont indicatifs — vérifier avec le Programme d'études officiel
3. Le contenu généré par IA doit être révisé avant utilisation
4. Les calendriers scolaires varient selon le conseil scolaire
5. Version bêta — peut contenir des erreurs

---

## Implémentation

- **Définition :** `src/lib/alberta-teaching-pack.ts`
- **Gabarits :** `src/lib/alberta-templates.ts`
- **Normes professionnelles :** `src/lib/professional-standards-alberta.ts`
- **Quality Gate :** `src/lib/teaching-quality-gate.ts`

---

## Voir aussi

- [Alberta_Annual_Plan_Template.md](Alberta_Annual_Plan_Template.md)
- [Alberta_Sequence_Template.md](Alberta_Sequence_Template.md)
- [Alberta_Lesson_Template.md](Alberta_Lesson_Template.md)
- [Professional_Standards_Alignment.md](Professional_Standards_Alignment.md)
