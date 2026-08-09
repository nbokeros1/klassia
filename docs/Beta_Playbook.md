# Playbook opérationnel bêta — Scorgia
**Version :** SC-03K | **Audience :** Administrateur produit

---

## 1. Ajouter un utilisateur bêta

### Via Supabase Auth (recommandé)
1. Ouvrir Supabase Dashboard → Authentication → Users → Invite user
2. Entrer l'email de l'enseignant
3. Dans `utilisateurs`, mettre à jour le `forfait` vers `pro_plus` (accès complet bêta)
4. Envoyer l'email de bienvenue manuel (voir modèle ci-dessous)

### Via l'admin Scorgia
1. Aller sur `/admin`
2. Trouver l'utilisateur dans la table
3. Changer son forfait en `pro_plus` via le sélecteur

---

## 2. Email de bienvenue bêta (modèle)

```
Objet : Bienvenue dans la bêta Scorgia 🎉

Bonjour [Prénom],

Vous faites partie des premiers enseignants à tester Scorgia.
Votre accès Pro+ est activé pour la durée de la bêta — sans frais.

Accès : https://beta.klassia.app
Email : [email]
Mot de passe temporaire : [si applicable]

En cas de problème, utilisez le bouton 💬 dans l'application
ou répondez directement à cet email.

Votre avis est précieux — n'hésitez pas à tout essayer !

L'équipe Scorgia
```

---

## 3. Surveiller les retours

1. Se connecter sur `/admin`
2. Cliquer sur l'onglet **Bêta & retours**
3. Actualiser régulièrement (bouton ↻)
4. Trier par statut `nouveau` pour traiter les retours non vus

### Fréquence recommandée
- Jours 1–3 de bêta : vérifier 2× par jour
- Jours 4–14 : vérifier 1× par jour
- Semaines 3–4 : vérifier 3× par semaine

---

## 4. Traitement des retours

| Type | Délai de réponse | Action |
|------|-----------------|--------|
| 🐛 Bug bloquant | < 4h | Passer statut → `en_traitement`, corriger, redéployer |
| 🐛 Bug mineur | < 48h | Passer statut → `en_traitement`, planifier dans sprint |
| 💡 Idée | < 1 semaine | Évaluer, répondre par email, ajouter à Roadmap_Post_Beta.md |
| 📝 Commentaire | < 1 semaine | Accuser réception, classer → `resolu` |
| ⭐ Évaluation | — | Compter dans la note moyenne bêta |

---

## 5. Escalade : bug critique en production

1. **Identifier** — Le retour apparaît en statut `nouveau` dans /admin + logs dans `beta_logs`
2. **Évaluer** — Impact utilisateur (combien de personnes affectées ?)
3. **Contenir** — Si besoin, suspendre temporairement l'accès à la fonctionnalité
4. **Corriger** — Fix en branche `fix/` → PR → review → merge
5. **Redéployer** — Vercel déploie automatiquement depuis main
6. **Communiquer** — Envoyer email aux utilisateurs affectés
7. **Post-mortem** — Documenter dans Known_Issues.md

---

## 6. Fins de semaine & congés

- L'application fonctionne de manière autonome (pas d'admin requis en continu)
- En cas de bug bloquant hors heures : le FeedbackWidget capture les retours
- Prévoir un message d'absence si injoignable > 48h

---

## 7. Clôture de la bêta

1. Compiler toutes les notes bêta depuis /admin onglet Bêta
2. Calculer score de satisfaction moyen
3. Documenter les enseignements dans Roadmap_Post_Beta.md
4. Décision formelle GO / NO GO production
5. Si GO : préparer le plan de lancement public (Launch_Plan.md)
