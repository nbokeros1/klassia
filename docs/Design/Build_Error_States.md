# Build Error States
## Gestion des erreurs — DS 2.0 DESIGN-07 M12

**Date :** 2026-08-10

---

## Principe

> Une erreur doit expliquer clairement ce qui s'est passé, montrer ce qui est prêt, et proposer une action.

Jamais : `"Erreur"` seul.
Toujours : description + état partiel + action de récupération.

---

## Structure d'un état d'erreur

```
Construction interrompue.

La création du plan annuel n'a pas pu être finalisée.

Ce qui est prêt :
✓ Curriculum
✓ Syllabus

[Reprendre la construction]
```

---

## Implémentation

L'état d'erreur est détecté via `erreurEvent = events.find(e => e.step === 'erreur')`.

```tsx
{isError && (
  <div className="d7-error-block">
    <div className="d7-error-title">
      {erreurEvent?.message ?? globalError ?? 'Une étape n\'a pas pu être finalisée.'}
    </div>
    <div className="d7-error-ready">
      {doneSteps.map(cp => <span key={cp.step}>{cp.label}</span>)}
    </div>
    <button onClick={() => window.location.reload()}>Reprendre la construction</button>
  </div>
)}
```

---

## Messages d'erreur par étape

| Étape | Message suggéré |
|-------|----------------|
| `curriculum` | La lecture du curriculum n'a pas pu être finalisée. |
| `syllabus` | La création du syllabus n'a pas pu être finalisée. |
| `programme_annuel` | La génération du plan annuel a rencontré un problème. |
| `sequences` | La structuration des séquences n'a pas pu être finalisée. |
| `plans_lecon` | La génération des plans de leçon a rencontré un problème. |
| `premiere_lecon` | La première leçon n'a pas pu être développée. |
| `quiz` | La création du quiz n'a pas pu être finalisée. |

Ces messages viennent du `event.message` du pipeline — ils ne sont pas inventés côté frontend.

---

## Règles

1. **Jamais "Erreur" seul** — toujours un contexte
2. **Afficher ce qui est prêt** — `.d7-error-ready` liste les checkpoints `termine`
3. **Action claire** — "Reprendre la construction" — recharge et reprend au checkpoint manquant
4. **Détails techniques** — Founder-only dans le monitoring, jamais dans l'UI enseignant
5. **Pas d'emoji rouge** — la sobriété rassure mieux que les alertes visuelles

---

## CSS

```css
.d7-error-block   /* Container rouge discret */
.d7-error-title   /* Message principal */
.d7-error-ready   /* Liste de ce qui est prêt */
.d7-error-ready span::before { content: '✓ '; color: #10B981; }
```
