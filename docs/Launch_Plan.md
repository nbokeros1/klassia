# Plan de lancement bêta — Scorgia
**Version :** SC-03K | **Mise à jour :** 2026-07-28

---

## Vue d'ensemble

```
Semaine 0     : Préparation & déploiement (aujourd'hui)
Semaine 1–2   : Bêta fermée — 5 enseignants internes
Semaine 3–4   : Bêta privée — 10–20 enseignants sélectionnés
Semaine 5–8   : Bêta étendue — 50 enseignants
Semaine 9+    : Décision production / lancement public
```

---

## Phase 0 — Préparation (S0)

| Tâche | Responsable | Statut |
|-------|-------------|--------|
| Déployer migrations 031 + 032 | Dev | ☐ |
| Build + déploiement production | Dev | ☐ |
| Vérifier checklist Beta_Checklist.md | Dev | ☐ |
| Configurer domaine beta.klassia.app | Dev | ☐ |
| Rédiger email de bienvenue | Fondateur | ☐ |
| Identifier les 5 enseignants pilotes | Fondateur | ☐ |

---

## Phase 1 — Bêta fermée : 5 enseignants (S1–S2)

**Objectif :** Valider le parcours de bout en bout avec des profils réels.

**Profil cible :**
- Enseignants proches (connaissance directe)
- Variété de niveaux scolaires (primaire, secondaire)
- Variété de matières (sciences, lettres, maths)

**Actions :**
1. Créer les comptes manuellement via Supabase Auth
2. Envoyer l'email de bienvenue (voir Beta_Playbook.md)
3. Surveiller /admin → onglet Bêta quotidiennement
4. Call vidéo individuel avec chaque enseignant (semaine 2)
5. Compiler un rapport de retours à la fin de S2

**Critères de passage à la Phase 2 :**
- [ ] Pas de bug bloquant non résolu
- [ ] Au moins 3/5 enseignants ont généré ≥1 leçon complète
- [ ] Au moins 3/5 enseignants ont utilisé Enseigner
- [ ] Score satisfaction moyen ≥ 3.5 / 5

---

## Phase 2 — Bêta privée : 10–20 enseignants (S3–S4)

**Objectif :** Valider la scalabilité et la diversité des cas d'usage.

**Actions :**
1. Ouvrir un formulaire d'inscription bêta (liste_attente Supabase)
2. Sélectionner 10–20 candidats depuis la liste d'attente
3. Créer les comptes par vague de 5
4. Surveiller les métriques (sessions enseignées, générations IA, feedback)
5. Enquête de satisfaction en fin de S4

**Critères de passage à la Phase 3 :**
- [ ] Pas de bug critique non résolu
- [ ] Score satisfaction ≥ 4 / 5
- [ ] Taux d'utilisation hebdomadaire ≥ 60%

---

## Phase 3 — Bêta étendue : 50 enseignants (S5–S8)

**Objectif :** Stress test de l'infrastructure et validation du modèle économique.

**Actions :**
1. Activer le formulaire d'inscription publique
2. Communication sur les réseaux sociaux (LinkedIn, Facebook enseignants QC)
3. Monitorer MRR, rétention J7 et J30
4. Tests de charge Supabase
5. Décision : forfait bêta gratuit → payant

---

## Phase 4 — Lancement production (S9+)

**Objectif :** Lancement public officiel.

**Prérequis :**
- [ ] R-01 résolu (récupération de session)
- [ ] R-03 résolu (accessibilité WCAG AA)
- [ ] Migration vers domaine klassia.app
- [ ] Page d'accueil mise à jour (sans stats fictives)
- [ ] Système de paiement Stripe/PayPal intégré
- [ ] Support client minimal (email + FAQ)

---

## Procédure de rollback

En cas de bug critique bloquant le déploiement :

1. Revert la dernière PR sur `main`
2. Vercel redéploie automatiquement la version précédente
3. Envoyer un email aux utilisateurs affectés
4. Documenter l'incident dans Known_Issues.md
5. Ne pas relancer la phase tant que le bug n'est pas résolu et validé
