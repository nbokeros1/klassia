# Matrice de smoke tests bêta
> **Mission** : DEPLOY-BETA-01 · M12  
> **Date** : 2026-08-05  
> **Statut** : Référence officielle — exécuter après chaque déploiement

---

## Instructions

1. Exécuter ces tests **dans l'ordre** après le premier déploiement Vercel
2. Utiliser le compte Founder (`enwaha22@gmail.com`) pour les tests auth
3. Créer un compte test enseignant séparé pour les tests utilisateur
4. Marquer ✅/❌/⚠ pour chaque test
5. Un ❌ bloque le lancement bêta. Un ⚠ doit être documenté.

---

## Bloc 1 — Auth et Onboarding

| # | Test | Chemin | Résultat attendu |
|---|------|--------|-----------------|
| 1.1 | Inscription nouvel enseignant | `/signup` | Compte créé, email de confirmation reçu |
| 1.2 | Confirmation email | Lien email | Redirection vers `/onboarding` |
| 1.3 | Onboarding complet | `/onboarding` | Profil IA créé, redirection vers `/dashboard` |
| 1.4 | Connexion | `/login` | Session établie, redirection `/dashboard` |
| 1.5 | Déconnexion | Header → Déconnecter | Session terminée, redirection `/login` |
| 1.6 | Accès `/dashboard` sans session | URL directe | Redirection vers `/login` |
| 1.7 | Accès `/admin` sans session | URL directe | Redirection vers `/login` |
| 1.8 | Accès `/founder` avec compte enseignant | URL directe | Redirection vers `/dashboard` |

---

## Bloc 2 — Dashboard et Navigation

| # | Test | Chemin | Résultat attendu |
|---|------|--------|-----------------|
| 2.1 | Dashboard charge | `/dashboard` | Page chargée < 3 s, données visibles |
| 2.2 | Mes classes | `/dashboard/classes` | Liste des classes (vide OK si nouvelle inscription) |
| 2.3 | Créer une classe | `/dashboard/classes` → + | Classe créée, visible dans la liste |
| 2.4 | Navigation sidebar | Tous les liens principaux | Aucune erreur 404 ou 500 |
| 2.5 | Thème dark/light | Bouton thème | Basculement visible, persisté |

---

## Bloc 3 — Parcours "Construire mon année" (SPIE)

| # | Test | Chemin | Résultat attendu |
|---|------|--------|-----------------|
| 3.1 | Accès wizard | `/dashboard/classes` → Construire mon année | Wizard s'ouvre |
| 3.2 | Étape 1 — Contexte | Wizard | Formulaire province/niveau/matière fonctionnel |
| 3.3 | Étape 2 — Curriculum upload | Wizard → Téléverser | Upload PDF ou DOCX accepté (< 3 Mo) |
| 3.4 | Génération plan annuel | Wizard → Générer | SSE démarre, étapes visibles, < 120 s |
| 3.5 | Plan annuel persisté | Après génération | Données visibles dans la classe |
| 3.6 | Option "curriculum officiel" | Wizard → Étape 2 → Officiel | Message "Aucun curriculum disponible" + bouton retour |

---

## Bloc 4 — Génération de leçon (Lesson Engine)

| # | Test | Chemin | Résultat attendu |
|---|------|--------|-----------------|
| 4.1 | Accès Teaching Pack | Classe → Teaching Pack | Page chargée, sections visibles |
| 4.2 | Lancer lesson-engine | Générer première leçon | SSE 13 étapes, < 180 s, leçon générée |
| 4.3 | Leçon persistée | Après génération | Leçon visible dans le dossier |
| 4.4 | Pas de "Powered by Claude" | Contenu généré | Aucune mention Claude/Anthropic visible |
| 4.5 | Quality Gate | Après leçon | Score qualité calculé et affiché |

---

## Bloc 5 — Exports

| # | Test | Chemin | Résultat attendu |
|---|------|--------|-----------------|
| 5.1 | Export DOCX | Leçon → Exporter → DOCX | Fichier téléchargé, contenu lisible |
| 5.2 | Export PDF | Leçon → Exporter → PDF | Fichier téléchargé, contenu lisible |
| 5.3 | Export PPTX | Leçon → Exporter → PPTX | Fichier téléchargé, slides lisibles |

---

## Bloc 6 — Assistant IA et Préparer

| # | Test | Chemin | Résultat attendu |
|---|------|--------|-----------------|
| 6.1 | Assistant flottant | Dashboard → icône IA | Chat s'ouvre, réponse reçue |
| 6.2 | Page Préparer | `/dashboard/gerer/preparer` | Conversation démarre |
| 6.3 | Streaming réponse | Poser une question | Réponse apparaît token par token |
| 6.4 | Pas de "Claude/Anthropic" | Demander "qui t'a créé" | Réponse ne mentionne pas Claude |

---

## Bloc 7 — Outils (Quiz, Sondage)

| # | Test | Chemin | Résultat attendu |
|---|------|--------|-----------------|
| 7.1 | Créer un quiz | `/dashboard/outils/quiz` | Quiz créé, questions générées |
| 7.2 | Lancer sondage | `/dashboard/sondage` | Présentation plein écran, watermark "ScorgIA" |
| 7.3 | QR code quiz | Quiz → Partager | QR code affiché, code fonctionnel |

---

## Bloc 8 — Founder

| # | Test | Chemin | Résultat attendu |
|---|------|--------|-----------------|
| 8.1 | Accès `/founder` (compte Founder) | `/founder` | Dashboard Founder visible |
| 8.2 | Accès `/founder` (compte enseignant) | `/founder` | Redirection vers `/dashboard` |
| 8.3 | Données Founder | `/founder/utilisateurs` | Liste utilisateurs visible |

---

## Résultats à documenter

| Date | Testeur | Environnement | Résultat global | Blocants |
|------|---------|--------------|----------------|---------|
| | | | | |

---

*Document créé : DEPLOY-BETA-01 · M12 · 2026-08-05*
