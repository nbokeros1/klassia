# Modèle de reprise du Build
**ScorgIA · RELEASE-P0.2 · 2026-08-09**

---

## Problème

L'utilisateur peut appuyer sur "Reconstruire" par accident, ou le wizard peut être ré-ouvert sans intention de supprimer le travail existant.

---

## Solution — Modal de confirmation

Quand `teaching_pack` existe pour la classe, cliquer "🔄 Reconstruire" dans `programme/page.tsx` affiche une modal de confirmation :

```
🔄 Reconstruire l'année scolaire ?

Cette action va régénérer le plan annuel et toutes les leçons pour cette classe.
Le contenu actuel sera remplacé. Cette opération ne peut pas être annulée.

[Oui, reconstruire]  [Annuler]
```

Si aucun pack n'existe, le wizard s'ouvre directement (aucune confirmation nécessaire).

---

## CTA adaptatif

Les `EmptyState` dans `programme/page.tsx` affichent un CTA contextuel :

```ts
const ctaLabel = pack ? 'Reprendre la génération' : 'Construire mon année'
```

| Condition | CTA | Action |
|-----------|-----|--------|
| Pas de pack | "Construire mon année" | Ouvre wizard directement |
| Pack existant | "Reprendre la génération" | Ouvre modal confirmation |

---

## Idempotence du pipeline

Si la reprise est confirmée :
1. `teaching_packs` : UPSERT (mise à jour en place, pas de nouveau row)
2. `programme_annuel` : check-then-update (via `teaching_pack_id`)
3. `studio_ia_memoire` : UPSERT (mise à jour du contexte IA)
4. `fichiers_dossier` : nouveaux INSERT (anciens fichiers non supprimés)

---

## État du Teaching Pack pendant la reprise

```
pack.statut = 'generation_en_cours'
→ SSE stream
→ pack.statut = 'pret' (si succès)
→ pack.statut = 'partiellement_genere' (si erreur partielle)
```

---

## Build partiel

Si le pipeline est interrompu (timeout réseau, quota IA) :
- `pack.statut = 'partiellement_genere'`
- Le `programme_annuel` peut être partiellement renseigné
- Les `fichiers_dossier` créés avant l'interruption sont conservés
- L'utilisateur peut relancer via "Reprendre la génération"
