# Checklist de lancement bêta — Scorgia
**Version :** SC-03K | **Mise à jour :** 2026-07-28

---

## A. Infrastructure & déploiement

- [ ] `031_beta_tables.sql` exécuté dans Supabase Production
- [ ] `032_enseigner.sql` exécuté dans Supabase Production
- [ ] Variables d'environnement production vérifiées :
  - [ ] `NEXT_PUBLIC_SUPABASE_URL` ✓
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` ✓
  - [ ] `SUPABASE_SERVICE_ROLE_KEY` (non exposée côté client) ✓
  - [ ] `ANTHROPIC_API_KEY` ✓
- [ ] Build Next.js sans erreurs TypeScript (`npx tsc --noEmit`)
- [ ] Build de production (`npm run build`) sans erreurs
- [ ] Déploiement sur Vercel ou serveur cible réussi
- [ ] Domaine HTTPS configuré (ex. beta.klassia.app)

---

## B. Sécurité

- [ ] `SUPABASE_SERVICE_ROLE_KEY` absente de toutes les variables `NEXT_PUBLIC_*`
- [ ] RLS activées sur `beta_feedback` et `beta_logs`
- [ ] Politiques RLS validées : lecture admin uniquement
- [ ] Pas de données sensibles dans les logs client
- [ ] Route `/admin` protégée (vérifier redirection si non-admin)

---

## C. Parcours utilisateur validé

- [ ] Inscription → email de confirmation → login fonctionne
- [ ] Onboarding Chemin A (création manuelle de classe) complété
- [ ] Onboarding Chemin B (upload emploi du temps) complété
- [ ] BetaTour affiché au premier login, ignorable, pas de rechargement infini
- [ ] FeedbackWidget visible en bas à gauche dans le dashboard
- [ ] Envoi d'un retour type "bug" → visible dans /admin onglet Bêta
- [ ] Module Préparer → génération d'une leçon complète
- [ ] Module Enseigner → démarrer → activités → terminer → stats de fin
- [ ] Export PDF d'une leçon générée
- [ ] Export PPTX d'une leçon générée
- [ ] Bibliothèque → retrouver une leçon passée

---

## D. Contenu & branding

- [ ] Titre de page : « Scorgia » (non « ScorgIA ») — `layout.tsx` ✓
- [ ] Admin : « Scorgia » dans le titre ✓
- [ ] Onboarding : vérifier mentions "ScorgIA" restantes
- [ ] Page d'accueil : stats gonflées (+847 enseignants) à neutraliser ou supprimer
- [ ] Témoignages fictifs clairement marqués comme "exemples" (ou supprimés)

---

## E. Opérationnel

- [ ] Accès admin configuré pour enwaha22@gmail.com (`is_admin = true`)
- [ ] Groupe bêta de 5–10 enseignants identifié et contacté
- [ ] Email de bienvenue bêta rédigé et testé
- [ ] Canal de communication bêta créé (email/Slack/WhatsApp)
- [ ] SLA de réponse aux bugs défini (voir Beta_Playbook.md)
- [ ] Sauvegarde Supabase vérifiée (point-in-time recovery actif)

---

## F. Monitoring

- [ ] Onglet Bêta dans /admin accessible et affichant les données
- [ ] Premier retour bêta de test reçu et visible
- [ ] Premier log d'erreur de test reçu et visible
- [ ] Alertes email Supabase configurées (quota, erreurs)

---

## Signature Go / No Go

| Critère | Statut |
|---------|--------|
| Infrastructure déployée | ☐ |
| Parcours utilisateur validé | ☐ |
| Sécurité vérifiée | ☐ |
| Groupe bêta prêt | ☐ |
| **Décision finale** | ☐ GO / ☐ NO GO |

**Responsable :** enwaha22@gmail.com  
**Date cible de lancement :** À définir
