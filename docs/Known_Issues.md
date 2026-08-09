# Problèmes connus — Scorgia
**Version :** SC-03K | **Mise à jour :** 2026-07-28

---

## Légende

| Sévérité | Description |
|----------|-------------|
| 🔴 HAUTE | Bloque l'usage en production ou cause une perte de données |
| 🟡 MOYENNE | Dégrade l'expérience, contournable manuellement |
| 🟢 FAIBLE | Cosmétique ou marginal |

---

## R-01 — Pas de récupération de session après rechargement

**Sévérité :** 🔴 HAUTE  
**Module :** Enseigner  
**Description :** Si l'enseignant recharge la page pendant une session active (Enseigner), l'état de la session n'est pas restauré. La session en cours est perdue (activités, timeline, temps écoulé).  
**Impact :** Perte de progression en classe — critique en production.  
**Contournement :** Éviter de recharger la page pendant un cours. Notifier les utilisateurs bêta.  
**Fix prévu :** V1.1 — persistance de la session active dans Supabase et restauration au rechargement.

---

## R-02 — Timeout réseau du copilot en classe

**Sévérité :** 🟡 MOYENNE  
**Module :** Enseigner → Copilot (panneau droit)  
**Description :** Sur une connexion lente ou dans un réseau scolaire restrictif, les requêtes streaming vers `/api/ia/teaching-copilot` peuvent timeout avant la première réponse. L'UI n'affiche pas d'erreur claire dans ce cas.  
**Impact :** Aucune suggestion du copilot pendant le cours.  
**Contournement :** Relancer la question manuellement. Vérifier la connexion réseau.  
**Fix prévu :** V1.1 — meilleure gestion d'erreur avec message explicite + bouton de reprise.

---

## R-03 — Lacunes d'accessibilité (ARIA, navigation clavier)

**Sévérité :** 🟡 MOYENNE  
**Module :** Global  
**Description :** Plusieurs composants manquent de rôles ARIA appropriés, de gestion du focus keyboard-only, et de contrastes suffisants pour les utilisateurs malvoyants. Score axe-core : 72/100.  
**Impact :** Application non utilisable par les enseignants en situation de handicap visuel ou moteur.  
**Fix prévu :** V1.2 — audit accessibilité WCAG 2.1 AA complet.

---

## R-04 — Migration 032_enseigner.sql non déployée en production

**Sévérité :** 🟢 FAIBLE  
**Module :** Enseigner (base de données)  
**Description :** La migration SQL liée aux tables du module Enseigner n'est pas encore confirmée comme déployée dans l'environnement de production Supabase.  
**Impact :** Potentielle erreur 500 si les tables sont absentes lors de la première utilisation d'Enseigner.  
**Fix :** Déployer manuellement avant la bêta.

---

## R-05 — Incohérences de branding « ScorgIA » vs « Scorgia »

**Sévérité :** 🟢 FAIBLE  
**Module :** Onboarding (chat IA), page d'accueil (page.tsx)  
**Description :** Certaines parties de l'application référencent encore l'ancien nom « ScorgIA » :
- Chat d'onboarding Chemin B : persona « ScorgIA »
- Page d'accueil : logo `ScorgiaLogo`, mentions textuelles « ScorgIA »
- Sidebar : import `ScorgiaLogo`
**Fix prévu :** V1.1 — renommage systématique. Partiellement corrigé : layout.tsx et admin/page.tsx.

---

## R-06 — Statistiques gonflées sur la page d'accueil

**Sévérité :** 🟢 FAIBLE  
**Module :** Page d'accueil (`src/app/page.tsx`)  
**Description :** Les stats affichées (+847 enseignants, +12 430 leçons, +2 140 classes) sont des valeurs de seed fictives qui s'additionnent aux vraies données.  
**Impact :** Trompeur pour les utilisateurs beta et futurs clients.  
**Fix prévu :** Retirer les valeurs de seed ou les remplacer par des données réelles.

---

## R-07 — Code mort dans useTimeIntelligence.ts

**Sévérité :** 🟢 FAIBLE (technique)  
**Fichier :** `src/hooks/enseigner/useTimeIntelligence.ts`, ligne 38  
**Description :** Le calcul `elapsed_ms` contient `(a.etat === 'en_cours' && state.sessionState === 'paused' ? 0 : 0)` — les deux branches retournent `0`, rendant la soustraction sans effet.  
**Impact :** Aucun impact fonctionnel. Code confus pour les futurs développeurs.  
**Fix prévu :** Nettoyage V1.1.

---

## R-08 — Warning potentiel unmount dans CourseEndDialog

**Sévérité :** 🟢 FAIBLE (technique)  
**Fichier :** `src/components/enseigner/course-end/CourseEndDialog.tsx`  
**Description :** `handleConfirm()` utilise `setTimeout(router.push, 1200)`. Si le composant se démonte avant les 1200ms, React peut émettre un warning de mise à jour sur un composant démonté.  
**Impact :** Aucun impact utilisateur visible. Warning dans la console de développement.  
**Fix prévu :** Utiliser un `useRef` pour annuler le timeout au démontage.
