# Alignement normes professionnelles — Alberta Teaching Quality Standard

**Statut :** SPIE-BETA-02 · Actif  
**Fichier :** `src/lib/professional-standards-alberta.ts`

---

## Avertissement légal (affiché dans l'interface)

> **Alignement indicatif — ne constitue pas une certification officielle.**  
> Ces normes sont présentées à titre de référence pédagogique seulement.  
> Pour l'évaluation professionnelle officielle, référez-vous à Alberta Education.

---

## Source

Teaching Quality Standard (Alberta Education, 2019)  
URL : https://www.alberta.ca/teaching-quality-standard.aspx  
Statut : **Référence ScorgIA en validation** — pas un document officiel

---

## Usage autorisé

Le TQS est utilisé pour :
- Proposer des points de réflexion à l'enseignant
- Montrer les dimensions soutenues par la planification
- Identifier les informations manquantes dans le Teaching Pack
- Guider l'amélioration professionnelle

Il n'est **jamais** utilisé pour :
- Évaluer ou noter l'enseignant
- Certifier la conformité pédagogique
- Remplacer l'évaluation officielle de l'école ou du conseil scolaire

---

## Normes couvertes (SPIE-BETA-02)

| Norme TQS | Dimension | Éléments du plan liés |
|-----------|-----------|----------------------|
| Standard 1 | Fostering Effective Relationships | objectifs_lecon, mise_en_situation |
| Standard 2 | Career-Long Learning | reflexion_post, evaluation_formative |
| Standard 3a | Subject Matter Knowledge | references_curriculaires, RAG, RAS |
| Standard 3b | Differentiated Instruction | diff_universelle, diff_ciblee, diff_specialisee |
| Standard 3c | Assessment Practices | eval_formative, eval_sommative, criteres |
| Standard 4 | Inclusive Learning Environments | differentiation, perspective_autochtone |
| Standard 5 | FNMI Perspectives | perspective_autochtone, ressources |

---

## Calcul d'alignement

```typescript
calculerAlignementTQS(champsPlan: string[]): AlignementTQS[]
```

- `fort` : ≥70% des éléments présents
- `partiel` : 40%–70%
- `faible` : <40%

Ces niveaux sont indicatifs. L'affichage dans l'interface inclut toujours l'avertissement légal.
