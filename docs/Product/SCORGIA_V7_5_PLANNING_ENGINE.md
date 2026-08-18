# SCORGIA V7.5 — Moteur de Planification Pédagogique
**Pour : Product Owner / Équipe Produit**  
**Date :** 2026-08-18

---

## Qu'est-ce que V7.5 ?

V7.5 connecte un moteur de planification pédagogique existant (AYDTE — *Academic Year Digital Twin Engine*) qui était écrit mais jamais utilisé à la pipeline de génération de programme annuel.

**Avant V7.5 :**  
SPIE-02 extrayait les résultats d'apprentissage du curriculum → Claude générait un programme annuel sans structure pédagogique calculée → titres génériques possibles.

**Après V7.5 :**  
SPIE-02 extrait → AYDTE calcule l'ossature pédagogique (quelles RAG/RAS vont ensemble, combien de semaines par séquence) → Claude génère un programme thématique *ancré dans cette ossature* → résultat : programme cohérent avec le curriculum réel, semaines distribuées proportionnellement.

---

## Ce que voit l'enseignant

Rien de nouveau dans l'interface. V7.5 est entièrement dans le moteur de génération.

L'enseignant qui utilise *Construire mon année* avec un curriculum téléversé obtient :
- Le même wizard, les mêmes étapes
- Un programme généré légèrement plus structuré (séquences alignées sur les regroupements RAG → RAS)
- Chaque séquence porte maintenant un identifiant stable interne (invisible dans l'UI)

---

## Décisions PO requises

### 1. Approuver le push de V7.5 (code sans migration)

Le code est prêt, testé (tsc 0 erreur, build success), backward-compatible. Aucune migration DB. Le risque est minimal.

**Impact si approuvé :** les prochaines générations de programme téléversé produisent des V3 (avec `sequence_id` sur les séquences). L'UI Mon Année fonctionne sans changement.

### 2. GO/NO-GO sur la migration 044

La migration `044_pedagogical_structures_V75_PROPOSED.sql` crée deux tables :
- `pedagogical_sequences` — une ligne par séquence pédagogique
- `pedagogical_lessons` — une ligne par leçon dans le plan annuel

**Sans migration :** tout fonctionne en mode blob JSON. Les `sequence_id` sont dans le JSON mais pas en DB relationnelle.

**Avec migration :** on peut faire des requêtes SQL directes sur les séquences, tracer l'enseignement au niveau leçon avec UUID stable, construire des analytics fine-grained.

**Recommandation :** attendre V8 pour la migration — V7.5 valide l'architecture en prod d'abord.

### 3. Table ghost `unites`

Une table `unites` existe dans le schéma DB (créée en migration 038) mais n'a jamais été peuplée. Elle doit être gérée avant d'appliquer migration 044.

Options :
- `DROP TABLE unites` — nettoyer
- La réutiliser comme `pedagogical_sequences` (renommer + ajouter colonnes)

---

## Architecture en une image

```
Curriculum PDF de l'enseignant
      ↓
[SPIE-02] Extraction AI → NormalizedOutcome[]
      ↓
[AYDTE] Calcul pédagogique pur (< 5ms, sans API)
      → Grouper RAG → RAS par parentId
      → Allouer semaines proportionnellement
      → Retourner SequenceBlock[] avec UUID stables
      ↓
[Claude] Génération thématique sur l'ossature AYDTE
      → Titres réels, leçons, justifications
      ↓
[Validator] Bloquer tout placeholder
      ↓
[Stamping] sequence_id sur chaque séquence
      ↓
programme_annuel.contenu_json schema_version: 'v3'
```

---

## Compatibilité

Tous les programmes existants (V1, V2) continuent de fonctionner sans modification.  
L'adapter `getCanonicalPedagogicalYear()` normalise les 3 générations de façon transparente pour les composants UI.

---

## Prochaines étapes suggérées

1. **PO approuve push V7.5** → merge sur main
2. **Validation en prod** → quelques enseignants testent le wizard avec curriculum téléversé
3. **V8 décision migration 044** → si les analytics en montrent le besoin
4. **V8 PGE** → génération de leçons détaillées (moteur PGE actuellement stub)
5. **V8 SPIE-05** → extraction de contraintes curriculaires (ConstraintSet actuellement vide)
