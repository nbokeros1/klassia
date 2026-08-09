# Processus de collecte et traitement des retours bêta — Scorgia
**Version :** SC-03K | **Mise à jour :** 2026-07-28

---

## 1. Canaux de collecte

### Canal principal : FeedbackWidget (in-app)

Le bouton 💬 en bas à gauche de chaque page du dashboard permet à l'enseignant d'envoyer :

| Type | Usage | Champs |
|------|-------|--------|
| 🐛 Bug | Signaler un problème technique | Titre (optionnel) + Description + Page auto |
| 💡 Idée | Proposer une amélioration | Titre (optionnel) + Description |
| 📝 Commentaire | Laisser un avis général | Description |
| ⭐ Évaluation | Noter une fonctionnalité | Description + Note 1–5 |

**Flux technique :**
- Formulaire → POST `/api/beta/feedback`
- Sauvegarde dans `beta_feedback` (Supabase)
- Visible dans `/admin` → onglet « Bêta & retours »

### Canal secondaire : Email direct

Pour les retours urgents ou complexes, les utilisateurs bêta peuvent écrire à : enwaha22@gmail.com

### Canal tertiaire : Logs automatiques

Le logger client capture automatiquement les erreurs JavaScript non gérées :
- Utilisation : `logger.error('[TAG]', 'message', data)` dans le code
- Capture globale via `installGlobalErrorCapture()` (à brancher dans un Client Component racine)
- Stockage dans `beta_logs` (Supabase)

---

## 2. Processus de triage

```
Retour reçu
    ↓
[Admin /admin onglet Bêta]
    ↓
Classifier par sévérité
    ↓
  ┌─────────────────────────────────────┐
  │ Bug bloquant → Statut "en_traitement" → Fix < 4h │
  │ Bug mineur   → Planifier dans sprint suivant      │
  │ Idée         → Évaluer → Roadmap_Post_Beta.md     │
  │ Commentaire  → Accuser réception                  │
  └─────────────────────────────────────┘
    ↓
Répondre à l'enseignant par email
    ↓
Mettre à jour statut → "resolu" ou "ferme"
```

---

## 3. SLA (Niveau de service bêta)

| Type de retour | Accusé de réception | Résolution |
|----------------|---------------------|------------|
| Bug bloquant | < 1h | < 4h |
| Bug mineur | < 24h | < 1 semaine |
| Idée | < 72h | Non applicable (planification) |
| Commentaire | < 72h | — |

---

## 4. Suivi des retours dans l'admin

1. Aller sur `/admin` → onglet **Bêta & retours**
2. Actualiser avec le bouton ↻
3. Utiliser le sélecteur de statut pour tracker chaque retour :
   - `nouveau` → Non traité
   - `en_traitement` → En cours de résolution
   - `resolu` → Fix déployé
   - `ferme` → Décision de ne pas donner suite

---

## 5. Rapport de satisfaction bêta

À la fin de chaque phase bêta, calculer :

- **Note moyenne** : moyenne des `feature_note` de type `rating`
- **Taux de satisfaction** : % de retours positifs (ideas + remark sans mention de bug)
- **Volume de bugs** : nombre de bugs par utilisateur actif par semaine
- **Top 3 idées** : idées les plus souvent mentionnées

Documenter le rapport dans un commentaire sur la PR de clôture de phase.

---

## 6. Communication retour vers les utilisateurs

Toujours répondre aux retours — même négatifs. Modèle de réponse :

### Pour un bug résolu
```
Bonjour [Prénom],

Merci pour votre signalement ! Le problème que vous avez décrit
([résumé du bug]) a été corrigé et le correctif est en ligne.

N'hésitez pas à nous faire signe si cela se reproduit.

L'équipe Scorgia
```

### Pour une idée prise en compte
```
Bonjour [Prénom],

Merci pour cette suggestion ! L'idée de [résumé de l'idée]
est notée et ajoutée à notre feuille de route.

Nous ne pouvons pas garantir un délai, mais elle sera
étudiée lors de notre prochaine planification.

L'équipe Scorgia
```
