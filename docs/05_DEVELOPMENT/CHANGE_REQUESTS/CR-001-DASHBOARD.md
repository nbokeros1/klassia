# CR-001 — Dashboard Assistant Quotidien

Status: Ready for Claude Code  
Priority: High  
Module: Dashboard  
Related document: docs/01_PRODUCT/modules/DASHBOARD.md

---

# Objectif

Améliorer le Dashboard existant sans le reconstruire.

Ajouter une carte “Assistant quotidien” en haut du Dashboard afin que l’utilisateur voie immédiatement :

- un message personnalisé ;
- un résumé de sa situation ;
- une recommandation ;
- une action principale.

---

# Important

Le Dashboard existe déjà et est considéré stable.

Claude Code ne doit pas refaire la page.

Claude Code doit uniquement ajouter une amélioration incrémentale.

---

# À préserver absolument

- sidebar actuelle ;
- layout général ;
- cartes statistiques ;
- agenda ;
- raccourcis existants ;
- couleurs principales ;
- responsive actuel ;
- logique de chargement existante ;
- routes existantes.

---

# À ajouter

Ajouter une carte en haut du Dashboard.

Nom fonctionnel :

Assistant quotidien

Contenu recommandé :

Bonjour [nom utilisateur] 👋

J’ai préparé votre journée.

Résumé :

- [nombre de classes] classes actives
- [nombre de cours] cours enregistrés
- [nombre de leçons] leçons créées
- [nombre de tâches] tâches ou rappels

Recommandation :

Commencer par préparer votre prochain cours.

Bouton principal :

Préparer maintenant

Bouton secondaire :

Demander à Klassia

---

# Fallbacks

Si le prénom n’est pas disponible :

Bonjour 👋

Si aucune donnée n’est disponible :

Bienvenue dans Klassia.  
Commencez par créer votre première classe ou préparer une leçon.

Si aucune classe n’existe :

Action principale : Créer une classe

Si des classes existent :

Action principale : Préparer maintenant

---

# Contraintes techniques

Avant de modifier le code :

1. Identifier le fichier exact du Dashboard.
2. Lire le composant actuel.
3. Identifier les données déjà disponibles.
4. Ne pas modifier les fichiers non nécessaires.
5. Ne pas créer de nouvelle architecture.
6. Ne pas déplacer la sidebar.
7. Ne pas changer les routes.
8. Ajouter des logs seulement si nécessaire.
9. Garder le code simple.
10. Préserver le comportement actuel.

---

# Critères d’acceptation

La tâche est réussie si :

- la carte Assistant quotidien apparaît en haut du Dashboard ;
- les cartes existantes sont toujours visibles ;
- l’agenda est toujours visible ;
- les raccourcis existants fonctionnent encore ;
- la page ne plante pas si certaines données sont nulles ;
- le responsive reste correct ;
- aucune route existante n’est cassée ;
- le design reste cohérent avec Klassia ;
- le bouton principal fonctionne ;
- le bouton secondaire fonctionne ou redirige vers l’outil IA existant.

---

# Instruction pour Claude Code

Tu dois améliorer le Dashboard actuel, pas le reconstruire.

Commence par diagnostiquer :

- le fichier du Dashboard ;
- les composants utilisés ;
- les données disponibles ;
- les dépendances actuelles.

Ensuite propose le plan minimal de modification.

Après validation, applique uniquement les changements nécessaires.