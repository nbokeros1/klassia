# Student Data Privacy Architecture — V7.1

**Statut :** Livré  
**Version :** 7.1.0  
**Audience :** Architecte, Développeurs, PO (conformité FOIP)  

---

## Principes fondateurs

### 1. Pseudonymisation, pas anonymisation

Les données élève sont pseudonymisées avant toute transmission à un modèle IA.
Les vrais identifiants (`eleves.id`) restent en base de données — nécessaires pour
les lookups. La pseudonymisation se produit exclusivement à la couche application.

```
eleves.id (UUID) → ELEVE-XXXXX (hash déterministe, 5 chars hex)
```

La fonction `generateStudentPseudonym` produit le même code pour le même UUID,
permettant la traçabilité de session sans exposer l'identité réelle.

### 2. Champs protégés — jamais d'écriture IA

Certains champs ne peuvent jamais être générés ou modifiés par ScorgIA :

| Catégorie | Champs protégés |
|-----------|----------------|
| Identification | `designation`, `code`, `diagnostic`, `trouble` |
| Institutionnel | `pei_status`, `institutional_decision`, `official_accommodation` |
| Politique scolaire | `school_policy`, `politique_notation`, `integrite_academique` |
| Données personnelles | `parent_consent`, `contact_parent`, `coordonnees` |
| Conclusions professionnelles | `specialist_conclusion`, `rapport_psychologue` |

La fonction `canAIWriteStudentField` applique ce guard à chaque tentative d'écriture IA.

### 3. Provenance immuable

Une donnée confirmée par l'enseignant ou une source officielle ne peut jamais
être rétrogradée en suggestion IA :

```
TEACHER_CONFIRMED → ne peut pas redevenir AI_SUGGESTION
OFFICIAL_SOURCE   → ne peut pas redevenir AI_SUGGESTION
```

La fonction `canAIOverwriteExistingData` applique cette règle.

### 4. Séparation des catégories A-E

Les 5 catégories de données sont strictement séparées dans la structure TypeScript
et dans le JSONB de la base de données. ScorgIA ne mélange jamais les catégories.

---

## Contexte IA — données transmises

### Contexte individuel (pseudonymisé)

`buildSafeStudentAIContext` construit le contexte transmis au modèle :

**Inclus (pseudonymisé) :**
- Pseudonyme `ELEVE-XXXXX`
- Niveau scolaire (approximatif)
- Forces et besoins pédagogiques (formulés pédagogiquement)
- Accommodations actives (type uniquement, pas de désignation)
- Objectifs actifs (sans données nominatives)

**Exclu (jamais transmis) :**
- Vrai nom ou prénom
- UUID réel (`eleves.id`)
- Codes de désignation officiels
- Diagnostics médicaux ou pseudo-médicaux (remplacés par formulations pédagogiques)
- Dates précises (remplacées par plages approximatives)
- Coordonnées parentales
- Informations d'identification scolaire

### Remplacement du langage médical

Avant transmission IA, le langage médical est remplacé :

| Terme original | Remplacement transmis |
|---------------|----------------------|
| TDAH | "difficulté d'attention déclarée" |
| Dyslexie | "difficulté en lecture déclarée" |
| TSA | "besoin particulier déclaré" |
| Dysphasie | "difficulté de langage déclarée" |

### Contexte collectif — agrégats de classe

`buildSafeClassAIContext` / `getClassPedagogicalContext` transmettent uniquement :
- Effectif total
- Nombre d'élèves par niveau de soutien (jamais de noms)
- Besoins agrégés par domaine (ex. "3 élèves — lecture")
- Accommodations fréquentes (type + nombre)
- Indicateurs de planification (booléens)

**Aucune donnée individuelle nominative dans le contexte collectif.**

---

## Base de données — conformité FOIP

### Row Level Security

Pattern RLS canonique (toujours utiliser) :
```sql
enseignant_id IN (SELECT id FROM utilisateurs WHERE user_id = auth.uid())
```

**À ne jamais utiliser :**
```sql
-- FAUX : auth.uid() ≠ utilisateurs.id
enseignant_id = auth.uid()

-- FAUX : table profiles n'existe pas
REFERENCES profiles(id)
```

### Pas de suppression physique

Les plans de soutien ne sont jamais supprimés — seulement archivés (FOIP).
La politique DELETE n'est pas accordée sur `student_support_plans`.

### Confidentialité multi-niveaux

Chaque plan a un `niveau_confidentialite` :
- `enseignant` — visible uniquement par l'enseignant créateur
- `equipe_ecole` — visible par l'équipe-école (orthopédagogue, direction)
- `direction` — visible par la direction

Ce champ est requis et vérifié par le Quality Scorer.

---

## Audit Trail

Chaque modification d'un plan de soutien est enregistrée dans `changes_log` :

```typescript
{
  id:         string
  timestamp:  string
  actor_type: 'TEACHER' | 'SYSTEM' | 'AI' | 'AUTHORIZED_STAFF'
  action:     'created' | 'updated' | 'reviewed' | 'ai_suggested' | 'confirmed' | 'rejected'
  field?:     string
  previous?:  string   // valeur sérialisée
  current?:   string   // valeur sérialisée
  note?:      string
}
```

Les suggestions IA génèrent systématiquement une entrée `actor_type: 'AI', action: 'ai_suggested'`.
La confirmation enseignant génère `actor_type: 'TEACHER', action: 'confirmed'`.

---

## Fichiers clés

| Fichier | Rôle |
|---------|------|
| `src/lib/pedagogy/privacy/student-ai-context.ts` | Pseudonymisation + contexte IA |
| `src/lib/pedagogy/privacy/ai-field-guards.ts` | Guards champs protégés |
| `src/lib/pedagogy/student/audit-trail.ts` | Mutations traçables du plan |
| `supabase/migrations/042_student_support_foundation_PROPOSED.sql` | Schéma DB + RLS |
