# RC-01 — GO / NO GO
## ScorgIA · KlassIA+ · Version 1.0 Beta
**Date :** 2026-08-10  
**Décision finale :** Release Manager + Product Owner  
**Type de lancement visé :** Bêta invitée (10–30 enseignants sélectionnés, sans accès public)

---

## VERDICT

```
╔══════════════════════════════════════════════════════════════════╗
║                                                                  ║
║   VERDICT RC-01 :  ✅  GO WITH FIXES                            ║
║                                                                  ║
║   Score : 77/100                                                 ║
║   P0 bloquants : 0                                               ║
║   P1 à corriger : 5 (avant lancement)                            ║
║                                                                  ║
║   Conditions : les 5 P1 doivent être corrigés ou                ║
║   explicitement communiqués aux enseignants bêta                 ║
║   avant le premier accès.                                        ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
```

---

## JUSTIFICATION DU VERDICT

### Pourquoi GO (et non NO GO)

**1. Le parcours enseignant principal est complet et fonctionnel.**  
Login → Onboarding → Créer une classe → Préparer une leçon avec l'IA → Sauvegarder → Exporter en Word/PPT. Ce parcours end-to-end fonctionne, est visuellement professionnel (DESIGN-14), et est rassurant grâce à l'auto-save. Un enseignant bêta peut utiliser ScorgIA de manière productive dès le premier jour pour sa préparation de cours.

**2. Aucun bug P0 identifié.**  
Pas de perte de données confirmée, pas de route cassée, pas d'erreur de build, pas de crash observable dans les 11 pages auditées.

**3. Le design Préparer est à niveau professionnel.**  
DESIGN-14 positionne ScorgIA au niveau d'un outil SaaS mature. C'est la page que les enseignants bêta passeront le plus de temps sur — et elle est excellente.

**4. La base technique est saine.**  
TypeScript propre, Supabase bien intégré, SSE robuste, exports fonctionnels. Pas de dette critique qui menace la stabilité.

### Pourquoi WITH FIXES (et non GO immédiat)

**5 problèmes P1 doivent être résolus ou compensés avant le premier accès enseignant :**

| # | Bug | Risque si non corrigé |
|---|-----|----------------------|
| BUG-001 | Teaching Pack invisible en sidebar | Fonctionnalité principale ignorée |
| BUG-002 | "Reprendre le travail" ne restaure pas | Enseignant pense avoir perdu son travail |
| BUG-003 | Onglets Suivre vides sans message | Enseignant pense que l'app est cassée |
| BUG-004 | Lien "Historique" → route possiblement 404 | 404 depuis la page Suivre |
| BUG-005 | Monitoring non protégé côté serveur | Données plateforme accessibles à tous |

---

## PLAN D'ACTION AVANT LANCEMENT

### Option A — Correction complète (recommandée, 3–5 jours)

Corriger les 5 P1 avant d'inviter les enseignants bêta. Priorité d'exécution :

1. **BUG-005** — Sécuriser `/founder/monitoring` avec vérification `is_admin` *(30 min)*
2. **BUG-004** — Vérifier `/dashboard/historique` ; si absent, retirer le bouton *(15 min)*
3. **BUG-003** — Ajouter `EmptyState` "Prochainement" sur les 3 onglets Suivre *(2h)*
4. **BUG-001** — Ajouter "Mon Année" dans la sidebar *(1h)*
5. **BUG-002** — Passer `classeId` + `leconId` dans le lien "Continuer" du Dashboard et charger la conversation dans Préparer *(4–6h — la plus complexe)*

### Option B — Communication compensatoire (lancement en 24h possible)

Si le calendrier impose un lancement immédiat, les P1 peuvent être compensés par communication directe aux enseignants bêta :

- Envoyer un guide "Premiers pas avec ScorgIA" précisant :
  - *"Pour accéder à votre programme annuel : Mes Classes → Votre classe → Construire"*
  - *"Pour reprendre une leçon : allez dans Préparer et sélectionnez votre classe"*
  - *"Les sections Évaluations, Participation et Rapports sont en cours de développement — disponibles prochainement"*
- Désactiver ou masquer manuellement le bouton "Historique" dans Suivre
- Protéger `/founder/monitoring` en urgence (ne peut pas être compensé par communication)

**Option B est acceptable uniquement pour une bêta très invitée (< 5 enseignants de confiance).** Au-delà, l'Option A est obligatoire.

---

## CONDITIONS DE SUCCÈS DE LA BÊTA

### Critères de succès (mesurables à J+30)

| Métrique | Seuil de succès |
|----------|----------------|
| Taux de retour J7 | ≥ 60% des enseignants bêta reviennent |
| Documents IA générés | ≥ 3 par enseignant bêta |
| Exports Word/PPT | ≥ 1 par enseignant bêta |
| Tickets support P0/P1 | 0 nouveau P0, < 3 nouveaux P1 |
| Score NPS bêta | ≥ 7/10 |
| Teaching Pack utilisé | ≥ 40% des enseignants bêta créent un plan annuel |

### Critères d'arrêt d'urgence (stop bêta si)

- Perte de données enseignant (documents générés disparus)
- Bug de facturation (forfait appliqué incorrectement)
- Fuite de données entre enseignants (voir les leçons d'un autre)
- Crash systématique sur la page Préparer

---

## FEATURES CONFIRMÉES PRÊTES POUR BÊTA

| Feature | Status |
|---------|--------|
| Génération IA de plans de leçon | ✅ Prêt |
| Génération IA de leçons complètes | ✅ Prêt |
| Génération IA de quiz formatifs | ✅ Prêt |
| Génération IA d'évaluations | ✅ Prêt |
| Export Word (.docx) | ✅ Prêt |
| Export PowerPoint (.pptx) | ✅ Prêt (forfait Pro+) |
| Sauvegarde automatique | ✅ Prêt |
| Bibliothèque de documents IA | ✅ Prêt |
| Gestion de classes (DESIGN-12) | ✅ Prêt |
| Teaching Pack — construction guidée | ✅ Prêt (mais découvrabilité P1) |
| CommandBar global (⌘K) | ✅ Prêt |
| BetaTour | ✅ Présent |
| FeedbackWidget | ✅ Présent |
| Pièces jointes dans le chat | ✅ Prêt |
| Mode Focus Préparer | ✅ Prêt |

## FEATURES EN STUB — À COMMUNIQUER AUX ENSEIGNANTS BÊTA

| Feature | Status | Message à communiquer |
|---------|--------|----------------------|
| Onglet Évaluations (Suivre) | ⏳ Stub | "En développement — disponible post-bêta" |
| Onglet Participation (Suivre) | ⏳ Stub | "En développement — disponible post-bêta" |
| Onglet Rapports (Suivre) | ⏳ Stub | "En développement — disponible post-bêta" |
| Versioning documents | ⏳ Stub POST-BÊTA | Badge "POST-BÊTA" visible dans le Copilote ✓ |
| Gestion de compte (changement email/MDP) | ⚠️ Non confirmé | À vérifier dans profil complet |
| Modification style pédagogique post-onboarding | ⚠️ Non confirmé | À communiquer si absent |

---

## RECOMMANDATION FINALE

**Lancer la bêta invitée après correction des 5 P1.**

Le produit est à 77/100 — suffisamment solide pour une bêta contrôlée avec des enseignants de confiance. La page Préparer (cœur du produit) est à 85/100 et donnera une excellente première impression. Les faiblesses sont concentrées sur les pages secondaires (Suivre, Enseigner) qui ne seront pas au centre de l'usage bêta.

L'objectif de la bêta n'est pas la perfection — c'est de valider que les enseignants utilisent Préparer, génèrent des documents, les exportent et reviennent. Ce parcours est fonctionnel et prêt.

**Prochaine milestone :** RC-02 à 82/100 — cibler la correction des P2 (éditeur inline, pagination, cohérence design system sur Suivre/Enseigner).

---

*Document généré le 2026-08-10 — RC-01 — Aucune modification de code effectuée*
*Auditeur : Équipe produit RC-01 (PO · UX · UI · QA · A11y · Perf · Release)*
