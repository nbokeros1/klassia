# WORKSPACE-2.0 — Information Architecture
**ScorgIA · 2026-08-08**

---

## Hiérarchie de navigation

```
Mes Classes
└── [Classe] — ex. "5e Année B"
      ├── [Matière] — ex. "Mathématiques" (affiché en sous-titre du nœud classe)
      │     └── Mon Année Scolaire
      │           ├── 📘 Curriculum               (type_contenu: curriculum)
      │           ├── 📅 Plan annuel              (type_contenu: plan_annuel)
      │           ├── 📝 Plans de leçon           (type_contenu: plan_lecon, fiche_lecon)
      │           ├── 📖 Leçons                   (type_contenu: lecon_complete)
      │           ├── 🎮 Quiz                     (type_contenu: quiz)
      │           ├── 📊 Évaluations              (type_contenu: evaluation)
      │           ├── 📧 Emails parents           (type_contenu: email_parents)
      │           └── 💬 Brouillons               (type_contenu: autre)
      └── [Autre matière]
```

---

## Structure actuelle des données (sans migration)

La table `conversations_ia` stocke tous les documents générés :

```sql
conversations_ia (
  id             uuid PRIMARY KEY,
  enseignant_id  uuid REFERENCES utilisateurs,
  classe_id      uuid REFERENCES classes,
  type_contenu   text,   -- 'curriculum' | 'plan_annuel' | 'plan_lecon' | ...
  titre          text,
  messages       jsonb,  -- historique des échanges IA
  updated_at     timestamptz,
  est_archivee   boolean
)
```

Le `PedagogiqueExplorer` lit cette table et groupe les documents par :
1. `classe_id` → nœud classe
2. `type_contenu` → dossier (via `TYPE_TO_FOLDER` mapping)

---

## Mapping type_contenu → dossier explorateur

| `type_contenu`   | Dossier explorateur |
|------------------|---------------------|
| curriculum       | Curriculum          |
| plan_annuel      | Plan annuel         |
| plan_lecon       | Plans de leçon      |
| fiche_lecon      | Plans de leçon      |
| lecon_complete   | Leçons              |
| quiz             | Quiz                |
| evaluation       | Évaluations         |
| email_parents    | Emails parents      |
| autre            | Brouillons          |

---

## États d'un document

Les documents héritent des statuts de la table `lecons` (pour les leçons créées via l'éditeur de leçon) :

```
brouillon  →  valide  →  prete  →  en_cours  →  enseignee  →  archivee
                                                              ↓
                                                           a_revoir
```

Pour les `conversations_ia`, le statut est implicite (`est_archivee` = archivé, sinon actif).

---

## Nœuds de l'arbre et clés localStorage

Chaque nœud de l'arbre possède une clé d'expansion unique :

| Nœud                     | Clé localStorage                    |
|--------------------------|-------------------------------------|
| Classe                   | `classe:{classeId}`                 |
| Dossier type             | `folder:{classeId}:{folderId}`      |

Toutes les clés sont stockées dans `scorgia_explorer_expanded` (JSON array).

---

## Recherche

La recherche dans l'explorateur filtre simultanément par :

1. **Titre** du document
2. **Label du type** (ex. "Plan de leçon")
3. **Nom de la classe**

En mode recherche :
- Les dossiers vides sont masqués
- Le label de section affiche le nombre de résultats
- La croix (×) efface la recherche

---

## Flux "Nouveau document"

1. L'utilisateur clique "+ Nouveau document" (au niveau classe) ou l'icône "+ Créer" (au niveau dossier vide)
2. Le callback `onNewDocument(prompt, classeId?)` est appelé
3. La page Préparer :
   - Change de classe si `classeId` est fourni et différent de la classe active
   - Pre-remplit l'input de chat avec le `prompt`
   - Focus sur le textarea
4. L'utilisateur ajuste le prompt et envoie → génération IA → document créé

---

## Futur : Séquences

La v2 de l'information architecture introduira les séquences entre le nœud Classe et les documents :

```
Classe
└── Matière
      └── Mon Année Scolaire
            ├── Plan annuel
            └── Séquence 1
                  ├── Vue générale
                  ├── Leçon 1
                  ├── Leçon 2
                  └── Quiz
```

Ceci nécessite une nouvelle table `sequences` (uuid, enseignant_id, classe_id, titre, ordre, created_at) et un champ `sequence_id` sur `conversations_ia` et `lecons`.
