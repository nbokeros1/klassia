# WORKSPACE-2.0 — Document Model
**ScorgIA · 2026-08-08**

---

## Philosophie

> Tout est un document. Jamais une conversation.

Les échanges IA sont invisibles pour l'utilisateur. Ce qu'il voit, manipule et exporte, c'est toujours un **document nommé**.

---

## Document = ConversationIA (état actuel)

La table `conversations_ia` est la source de vérité pour tous les documents générés via l'assistant IA.

```sql
conversations_ia {
  id             : uuid        -- identifiant unique du document
  enseignant_id  : uuid        -- propriétaire
  classe_id      : uuid        -- classe associée
  type_contenu   : text        -- type de document (voir taxonomie)
  titre          : text        -- titre du document (affiché dans l'explorateur)
  messages       : jsonb[]     -- historique IA interne (non exposé à l'UI)
  contenu_json   : jsonb       -- contenu structuré du document
  fichier_dossier_id : uuid    -- lien vers le dossier de classe
  est_archivee   : boolean     -- soft delete
  created_at     : timestamptz
  updated_at     : timestamptz
}
```

---

## Métadonnées d'un document

Chaque document possède les métadonnées suivantes accessibles dans l'UI :

| Champ         | Source                    | Affiché dans              |
|---------------|---------------------------|---------------------------|
| Titre         | `conversations_ia.titre`  | Explorateur + header doc  |
| Type          | `type_contenu`            | Explorateur (label + emoji)|
| Classe        | `classe_id` → `classes`   | Header document           |
| Matière       | `classes.matiere`         | Header document           |
| Auteur        | `enseignant_id` → `utilisateurs` | Inspector panel    |
| Créé le       | `created_at`              | Inspector panel           |
| Modifié le    | `updated_at`              | Explorateur (date relative)|
| Statut        | `est_archivee`            | Badge (Actif / Archivé)   |

---

## Document = Leçon (éditeur structuré)

Les leçons créées via l'éditeur de leçon (`/dashboard/classes/[id]/lecons/[leconId]`) utilisent la table `lecons` :

```sql
lecons {
  id           : uuid
  classe_id    : uuid
  dossier_id   : uuid
  titre        : text
  type_doc     : text        -- 'plan_lecon' | 'lecon_complete' | 'plan_sequence'
  statut       : text        -- brouillon | prete | en_cours | ...
  contenu_json : jsonb       -- contenu structuré (3 moments pédagogiques)
  updated_at   : timestamptz
}
```

---

## Taxonomie des types de documents

| ID                | Nom français          | Niveau de structure |
|-------------------|-----------------------|---------------------|
| `curriculum`      | Curriculum officiel   | Annuel              |
| `plan_annuel`     | Plan annuel           | Annuel              |
| `plan_lecon`      | Plan de leçon         | Leçon               |
| `fiche_lecon`     | Fiche de leçon        | Leçon               |
| `lecon_complete`  | Leçon complète        | Leçon               |
| `quiz`            | Quiz                  | Activité            |
| `evaluation`      | Évaluation            | Activité            |
| `email_parents`   | Email parents         | Communication       |
| `autre`           | Conversation          | Brouillon           |

---

## Futur : Versioning

Chaque sauvegarde créera une entrée dans une nouvelle table `document_versions` :

```sql
document_versions {
  id              : uuid
  conversation_id : uuid REFERENCES conversations_ia
  version_number  : integer
  titre_version   : text    -- ex. "Version 1", "Après révision"
  contenu_json    : jsonb   -- snapshot du contenu à ce moment
  created_at      : timestamptz
  created_by      : uuid
}
```

L'interface permettra de :
- **Voir** une version antérieure
- **Comparer** deux versions (diff textuel)
- **Restaurer** une version précédente
- **Dupliquer** une version comme nouveau document

---

## Futur : Historique IA par document

Chaque document aura son propre fil d'actions IA visibles dans le panneau assistant :

```
Leçon 4 — Fractions
─────────────────────
Historique IA
  09:12  Créer la leçon
  09:25  Développer les activités
  09:31  Ajouter un quiz
  09:42  Adapter pour Alberta
```

Techniquement : filtrer `messages` de `conversations_ia` par `conversation_id` et afficher les messages de rôle `user` avec timestamp.
