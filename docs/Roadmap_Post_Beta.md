# Feuille de route post-bêta — Scorgia
**Version :** SC-03K | **Mise à jour :** 2026-07-28

---

## Principes directeurs

- **Stabilité avant fonctionnalités** : résoudre les risques résiduels avant d'ajouter.
- **Retours bêta en priorité** : les demandes des enseignants bêta priment sur la roadmap initiale.
- **Pas de dette technique cachée** : chaque nouvelle fonctionnalité doit passer par une PR reviewée.

---

## V1.1 — Stabilité (post-bêta fermée, ~4–6 semaines)

### Correction des risques bloquants

- **R-01** : Récupération de session Enseigner après rechargement
  - Persister l'état actif (`timeline`, `activities`, `startedAt`) dans Supabase
  - Restaurer au rechargement si une session est marquée `en_cours`
  - Test : recharger en plein milieu d'un cours → reprendre exactement là où on était

- **R-02** : Meilleure gestion d'erreur copilot
  - Afficher un message clair si le streaming timeout
  - Bouton "Réessayer" visible dans le panneau copilot
  - Timeout configurable (défaut 15s)

- **R-05** : Remplacement complet de « ScorgIA » par « Scorgia »
  - Persona d'onboarding (Chemin B)
  - Logo sidebar (ScorgiaLogo → KlassIALogo)
  - Page d'accueil (mentions textuelles + composant logo)

- **R-07** : Nettoyage dead code useTimeIntelligence.ts
  - Retirer la double branche `? 0 : 0`

- **R-08** : Fix unmount warning CourseEndDialog
  - Utiliser `useRef` pour annuler le setTimeout

### Améliorations de stabilité

- Gérer le cas `402 Quota exceeded` avec un message d'erreur lisible
- Ajouter `AbortController` timeout à toutes les routes streaming
- Nettoyage des `console.log` de debug restants

---

## V1.2 — Accessibilité & performance (~8–10 semaines post-bêta)

- **R-03** : Audit WCAG 2.1 AA complet
  - Focus visible sur tous les éléments interactifs
  - Rôles ARIA sur les composants canvas, timeline, dialogs
  - Contrastes suffisants (4.5:1 minimum texte normal)
  - Navigation clavier complète dans le module Enseigner

- Optimisation images (`next/image` systématique)
- Lazy loading des composants lourds (FlowReplay, copilot panel)
- Score Lighthouse ≥ 85 (Performance, Accessibility, Best Practices)

---

## V1.3 — Monétisation & croissance (~12–16 semaines post-bêta)

- Intégration Stripe (paiement des forfaits Pro et Pro+)
- Page de pricing publique
- Portail client : historique de facturation, changement de forfait
- Quota mensuels de générations IA par forfait
- Statistiques d'usage par enseignant (rapport mensuel auto-envoyé)

---

## V2.0 — Fonctionnalités enseignantes avancées (roadmap 6+ mois)

Ces fonctionnalités étaient dans la roadmap initiale mais ont été délibérément exclues du périmètre bêta (règle absolue SC-03K : aucune nouvelle fonctionnalité métier).

- **Suivi élève** : carnet de notes, profils d'apprentissage, rapports parents
- **Collaboration** : partage de leçons entre enseignants du même établissement
- **Voix** : lecture audio des instructions pour les élèves DYS
- **Mode hors ligne** : cache des leçons pour les classes sans wifi stable
- **Communauté** : bibliothèque partagée de leçons validées par les pairs
- **Intégrations LMS** : export vers Google Classroom, Teams, Moodle

---

## Décision de lancement production

Le lancement en production (accès public payant) est conditionné à :

1. Résolution de R-01 (récupération session) — **bloquant**
2. Résolution de R-03 (accessibilité) — **bloquant**
3. Score satisfaction bêta ≥ 4.0 / 5
4. ≥ 50 enseignants bêta actifs sur 30 jours
5. Système de paiement opérationnel
6. Support client minimum en place (FAQ + email)
7. Politique de confidentialité + CGU rédigées et validées (LPRPDE / Loi 25 Québec)
