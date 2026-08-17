# ScorgIA — Modèle de soutien aux élèves V7.0

> **Statut :** Document produit — V7.0 fondation  
> **Date :** 2026-08-17  
> **Périmètre :** Définit ce que ScorgIA PEUT et NE PEUT PAS faire en matière de soutien aux élèves

---

## 1. Philosophie fondamentale

ScorgIA n'est pas un outil de diagnostic ni un substitut à l'équipe-école. Son rôle dans le soutien aux élèves est strictement limité à :

1. **Documenter** les observations pédagogiques que l'enseignant fournit
2. **Suggérer** des stratégies pédagogiques générales, non nominatives
3. **Protéger** la confidentialité des données élèves
4. **Rappeler** à l'enseignant les limites de ce que l'IA peut faire

---

## 2. Ce que ScorgIA NE fait JAMAIS

| Interdit | Explication | Alternative ScorgIA |
|---------|-------------|---------------------|
| Poser un diagnostic (TDAH, dyslexie, TSA, etc.) | Acte réservé aux professionnels de la santé | Documenter les observations de l'enseignant sans étiquette |
| Recommander un code de financement spécial Alberta | Décision administrative hors périmètre | Référer à l'équipe de soutien de l'école |
| Nommer un élève dans un plan collectif | Violation de confidentialité | Plans collectifs = approches universelles et ciblées uniquement |
| Transmettre l'identité réelle d'un élève à l'IA | Violation FOIP | Pseudonymisation systématique avant tout prompt |
| Inventer un PEI / Plan d'enseignement individualisé | Document légal officiel | Documenter les stratégies confirmées par l'enseignant |

---

## 3. Modèle de données — StudentSupportPlanV7

```
StudentSupportPlanV7
├── eleve_id                   : string (pseudonymisé, jamais transmis brut à l'IA)
├── classe_id                  : string
├── enseignant_id              : string
├── annee_scolaire             : string
├── statut                     : 'actif' | 'en_revue' | 'archive' | 'referral'
├── date_creation              : string (ISO)
├── date_mise_a_jour           : string (ISO)
├── niveau_confidentialite     : 'equipe_enseignement' | 'equipe_ecole' | 'confidentiel'  [REQUIS]
│
├── [Données observées par l'enseignant — jamais générées par IA]
│   ├── besoins_observes       : string[]  (provenance: TEACHER_INPUT)
│   ├── forces                 : string[]  (provenance: TEACHER_INPUT)
│   └── contexte_supplementaire: string?  (provenance: TEACHER_INPUT)
│
├── [Données officielles — jamais générées par IA]
│   ├── designation_officielle : string?  (provenance: OFFICIAL_STANDARD)
│   └── referral_date          : string?  (provenance: TEACHER_INPUT)
│
├── [Objectif pédagogique — peut être assisté par IA, validé par l'enseignant]
│   ├── objectif_annuel        : string?  (provenance: TEACHER_INPUT)
│   └── criteres_progres       : string[]
│
├── [Stratégies — IA peut suggérer, enseignant valide et modifie]
│   ├── strategies             : SupportStrategy[]
│   └── accommodations_validees: string[]
│
└── provenance                 : PedagogicalProvenance
```

### SupportStrategy

```
SupportStrategy
├── id              : string
├── titre           : string
├── description     : string
├── niveau_udl      : 'universel' | 'cible' | 'specialise'
├── frequence       : string?
├── responsable     : string?   (rôle, jamais l'enseignant nommément)
├── materiel_requis : string[]
├── date_debut      : string?
├── date_revue      : string?
├── efficacite_notee: 1 | 2 | 3 | 4 | 5 | null
└── provenance      : PedagogicalProvenance
```

---

## 4. Niveaux de confidentialité

| Niveau | Qui peut voir | Usage ScorgIA |
|--------|---------------|---------------|
| `equipe_enseignement` | Enseignants de la classe uniquement | Stratégies de différenciation en classe |
| `equipe_ecole` | Direction, orthopédagogue, psychologue scolaire | Plans de soutien avec désignations officielles |
| `confidentiel` | Enseignant + direction uniquement | Situations médicales ou légales sensibles |

**Règle :** Le niveau de confidentialité est requis à la création — ScorgIA ne peut pas inférer le niveau approprié.

---

## 5. Pseudonymisation pour l'IA

Lorsqu'un plan de soutien ou des données d'élève sont transmis à un modèle IA (ex. : suggestion de stratégies), ScorgIA doit :

1. Remplacer `eleve_id` par un code temporaire de session (`ELEVE-[hash_court]`)
2. Ne jamais inclure le prénom, le nom, la photo ou tout identifiant direct
3. Remplacer les détails médicaux nominatifs par des descriptions fonctionnelles anonymisées
4. Ne jamais logger le prompt contenant des données élèves

Exemple de transformation :

```
AVANT (non acceptable) :
"Marie L., 9 ans, a un diagnostic de TDAH confirmé par le Dr Smith..."

APRÈS (acceptable) :
"ELEVE-7f3a, niveau 4, présente des difficultés d'attention soutenue en lecture..."
```

---

## 6. Flux de création d'un plan de soutien

```
1. Enseignant initie le plan
   └── Choisit: eleve_id (depuis sa liste de classe)
   └── Définit: niveau_confidentialite (obligatoire avant toute autre étape)

2. Enseignant documente les observations
   └── Champs: besoins_observes, forces, contexte
   └── Provenance: TEACHER_INPUT — jamais pré-rempli par IA

3. Enseignant définit l'objectif pédagogique
   └── ScorgIA peut suggérer un objectif SMART basé sur les besoins déclarés
   └── L'enseignant doit valider explicitement avant que le champ soit sauvegardé

4. ScorgIA suggère des stratégies (niveau UDL identifié)
   └── Basées sur les besoins déclarés (pseudonymisés)
   └── L'enseignant sélectionne, modifie, rejette

5. Plan sauvegardé avec audit trail complet
   └── Chaque modification enregistrée (qui, quand, quoi)
```

---

## 7. Intégration avec les plans de leçon

Les plans de soutien **ne doivent pas apparaître nominativement** dans les plans de leçon collectifs. Le lien est indirect :

```
StudentSupportPlanV7
      ↓ (agrégation anonyme, niveau de classe)
LessonPlanV7.differentiation.supports_universels  ← pour toute la classe
LessonPlanV7.differentiation.supports_cibles      ← pour sous-groupes non nominatifs
```

Un plan de leçon peut référencer "élèves nécessitant du soutien en lecture" sans jamais nommer un élève spécifique.

---

## 8. V7.1 — Travaux prévus

| Fonctionnalité | Priorité |
|----------------|----------|
| Intégration avec les formulaires officiels IPP Alberta | Haute |
| Tableau de bord de progression par plan de soutien | Moyenne |
| Notifications de révision périodique | Basse |
| Export sécurisé pour partage avec l'équipe-école | V8 |

---

*Document maintenu par l'équipe produit KlassIA+. Dernière révision : 2026-08-17.*
