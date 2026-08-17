# Smart Classroom V1 — Modèle de données et architecture

> **Statut :** Document produit — V7.0 fondation (modèle uniquement)  
> **Date :** 2026-08-17  
> **CONTRAINTE :** L'éditeur visuel complet n'est PAS construit en V7. Ce document définit le modèle de données uniquement.

---

## 1. Définition

Le **Smart Classroom** est un modèle structuré de la composition pédagogique de la classe, utilisé par ScorgIA pour contextualiser ses suggestions. Ce n'est pas un plan de salle physique — c'est un modèle pédagogique.

### Composantes

| Composante | Description | Construit en V7 |
|-----------|-------------|-----------------|
| `ClassroomLayout` | Disposition physique symbolique | Modèle uniquement |
| `GroupWorkModel` | Groupes de travail + justification pédagogique | Modèle uniquement |
| `ClassroomToolkitTemplate` | Outils et ressources disponibles | Modèle uniquement |
| `SmartClassroomModel` | Agrégation complète | Modèle uniquement |

**L'interface visuelle d'édition est planifiée pour V8+.**

---

## 2. Modèle de données — SmartClassroomModel

```typescript
SmartClassroomModel {
  id              : string
  classe_id       : string
  enseignant_id   : string
  annee_scolaire  : string
  version         : number       // incrément à chaque modification
  
  layout          : ClassroomLayout
  groups          : GroupWorkModel[]
  toolkit         : ClassroomToolkitTemplate
  
  metadata {
    created_at    : string
    updated_at    : string
    provenance    : PedagogicalProvenance
  }
}
```

---

## 3. ClassroomLayout — Disposition de classe

```typescript
ClassroomLayout {
  configuration : 'rangees' | 'ilots' | 'fer_a_cheval' | 'cercle' | 'laboratoire' | 'hybride' | 'custom'
  description   : string?     // description libre si 'custom'
  
  nb_places_totales   : number
  nb_places_adaptees  : number   // sièges adaptés, hauteur ajustable, etc.
  
  zones : ClassroomZone[]
}

ClassroomZone {
  id    : string
  nom   : string     // ex. "Zone de travail silencieux", "Coin bibliothèque"
  usage : 'instruction_collective' | 'travail_individuel' | 'travail_cooperatif' 
        | 'coin_calme' | 'ressources' | 'presentation'
  capacite : number?
}
```

**Note :** ScorgIA peut suggérer une configuration basée sur les styles pédagogiques déclarés — l'enseignant valide toujours.

---

## 4. GroupWorkModel — Groupes de travail

```typescript
GroupWorkModel {
  id            : string
  nom           : string      // ex. "Groupes de lecture - S4"
  date_debut    : string
  date_fin      : string?     // null = permanent jusqu'à prochaine révision
  
  type_groupement : 'homogene' | 'heterogene' | 'interet' | 'aleatoire' | 'enseignant_choix'
  
  justification_pedagogique : string   // OBLIGATOIRE — pourquoi ce groupement ?
  objectif_groupement       : string?  // quel apprentissage ce groupement favorise-t-il ?
  
  groupes : Groupe[]
  
  avertissement_scorgia : string?
  // Ex. : "ScorgIA ne peut pas déterminer le 'meilleur' groupement. 
  //        Cette suggestion est basée sur [critères]. L'enseignant doit valider."
}

Groupe {
  id           : string
  nom          : string        // ex. "Groupe A", "Les Explorateurs"
  nb_membres   : number        // jamais les noms des élèves dans ce modèle collectif
  
  role_principal    : string?  // ex. "lecteur fort", "support pair" — optionnel
  activite_assignee : string?
  ressources        : string[]
}
```

**Règle absolue :** Un `Groupe` ne contient **jamais** les noms ou identifiants d'élèves — seulement le nombre de membres et des rôles génériques. Les associations élève↔groupe sont gérées séparément avec les protections de confidentialité appropriées.

**Règle ScorgIA :** Quand ScorgIA suggère un groupement, elle doit :
1. Expliquer la justification pédagogique (pas juste "groupement homogène")
2. Préciser les critères utilisés
3. Afficher un avertissement que l'algorithme ne "sait pas" qui regrouper — il propose une structure que l'enseignant peuple

---

## 5. ClassroomToolkitTemplate — Boîte à outils

```typescript
ClassroomToolkitTemplate {
  outils_disponibles : OutilClasse[]
  
  acces_numerique {
    nb_ordinateurs   : number
    nb_tablettes     : number
    tni_disponible   : boolean
    ratio_eleves_appareils : string?   // ex. "1:2"
    plateforme_principale  : string?  // ex. "Google Workspace", "Office 365"
  }
  
  bibliotheque_classe : {
    livres_disponibles  : boolean
    dictionnaires       : boolean
    manipulatifs_math   : string[]
    materiel_sciences   : string[]
    autre               : string[]
  }
}

OutilClasse {
  nom               : string
  type              : 'numerique' | 'physique' | 'humain' | 'environnement'
  disponibilite     : 'toujours' | 'reserve' | 'partage' | 'exterieur'
  description       : string?
  acces_eleves      : boolean
}
```

---

## 6. Utilisation par ScorgIA

Le modèle Smart Classroom est utilisé dans :

| Fonctionnalité | Usage |
|---------------|-------|
| Génération de plans de leçon | Adapter les activités aux ressources disponibles |
| Suggestion de différenciation | Proposer des stations selon les zones disponibles |
| Suggestion de groupements | Proposer une structure (pas les membres) |
| Génération d'activités | Éviter de proposer du matériel non disponible |

**Règle de cohérence :** Si `acces_numerique.nb_tablettes = 0`, ScorgIA ne propose pas d'activité requérant une tablette par élève.

---

## 7. Contraintes de confidentialité

| Donnée | Stockage | Transmission IA |
|--------|----------|-----------------|
| Configuration de salle | DB chiffrée | Oui — données anonymes |
| Nombre de groupes | DB | Oui |
| Noms des élèves par groupe | JAMAIS dans ce modèle | Jamais |
| Besoins spécifiques nominatifs | Jamais dans ce modèle | Jamais |

---

## 8. Architecture DB (proposée — MIGRATION NON DÉPLOYÉE V7)

```sql
-- PROPOSÉE UNIQUEMENT — ne pas exécuter en V7
CREATE TABLE smart_classroom_models (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classe_id       UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  enseignant_id   UUID NOT NULL REFERENCES profiles(id),
  annee_scolaire  TEXT NOT NULL,
  version         INTEGER NOT NULL DEFAULT 1,
  layout_json     JSONB,
  groups_json     JSONB,
  toolkit_json    JSONB,
  provenance_json JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(classe_id, annee_scolaire)
);
```

> **Note :** Cette migration sera proposée en V8 après validation du modèle avec l'équipe pédagogique.

---

## 9. V8 — Travaux prévus (éditeur visuel)

| Fonctionnalité | Description |
|----------------|-------------|
| Interface drag-and-drop | Disposition visuelle de la salle |
| Gestionnaire de groupes | Créer/modifier des groupes depuis l'interface |
| Intégration avec liste de classe | Association sécurisée élève↔groupe (avec confidentialité) |
| Exportation plan de salle | PDF de la disposition pour affichage en classe |

---

*Document maintenu par l'équipe produit KlassIA+. Dernière révision : 2026-08-17.*
