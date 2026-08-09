# DOCUMENT CONTEXT ENGINE (DCE)

Version : 1.0

---

# Objectif

Le Document Context Engine (DCE) est le moteur qui prépare automatiquement les documents envoyés à l'IA.

Son rôle est d'éviter que l'enseignant doive réimporter des fichiers déjà présents dans KlassIA.

Le DCE ne remplace pas la Bibliothèque.

Le DCE ne remplace pas les dossiers.

Le DCE exploite les documents existants.

---

# Sources de contexte

Le DCE peut utiliser :

- Classe active
- Matière active
- Curriculum
- Plan annuel
- Plans de leçons
- Évaluations
- Ressources
- Documents importés
- Bibliothèque
- Historique de la conversation

---

# Priorité des documents

Lorsqu'un utilisateur demande :

"Prépare la prochaine leçon"

Le DCE tente automatiquement de charger :

1. Curriculum
2. Plan annuel
3. Deux dernières leçons
4. Dernière évaluation
5. Ressources liées

Si un document est absent il est ignoré.

---

# Contextes automatiques

Le DCE doit pouvoir construire automatiquement un contexte selon le type de demande.

Exemples :

Créer une leçon

↓

Curriculum
+
Plan annuel
+
Deux dernières leçons

Créer une évaluation

↓

Curriculum
+
Leçon courante
+
Dernière évaluation

Créer une communication aux parents

↓

Leçon
+
Évaluation
+
Commentaires

---

# Contextes manuels

L'utilisateur peut ajouter des documents.

Le bouton 📎 ne signifie plus uniquement "Téléverser".

Il signifie :

Ajouter un contexte.

Une fenêtre doit proposer :

• Mes fichiers KlassIA

• Bibliothèque

• Mon ordinateur

---

# Mes fichiers KlassIA

L'utilisateur peut parcourir :

Classe

↓

Matière

↓

Dossier

↓

Document

Puis sélectionner plusieurs documents.

---

# Documents chargés

Avant chaque génération l'utilisateur voit :

Documents utilisés

✓ Curriculum

✓ Plan annuel

✓ Leçon précédente

✓ Évaluation

Il peut retirer un document.

---

# IA

Le DCE prépare le contexte.

Claude ne lit jamais directement les dossiers.

Claude reçoit uniquement le contexte préparé.

---

# Règles

Le DCE :

✔ ne modifie jamais les documents

✔ ne déplace jamais les fichiers

✔ respecte les permissions

✔ limite le nombre de documents envoyés

✔ privilégie les documents de la classe active

---

# Evolutions futures

Version 1

Choix manuel

Version 2

Suggestions automatiques

Version 3

Recherche sémantique

Version 4

Contexte entièrement intelligent