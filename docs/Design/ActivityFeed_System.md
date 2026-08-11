# ActivityFeed_System.md
## Système Fil d'Activité — ScorgIA DS 2.0

**Date :** 2026-08-10  
**Référence :** DESIGN-05 Mission 4

---

## Concept

> Pas de bruit. Seulement les événements utiles.

Le fil d'activité montre l'historique récent des actions pédagogiques importantes. Il est **conditionnel** — il disparaît si aucune activité n'est disponible.

---

## Source de données

```typescript
fetch('/api/activity/timeline?limit=5', { cache: 'no-store' })
  .then(body => { if (body?.timeline) setRecentActivity(body.timeline) })
```

Type `TimelineEntry` (`src/lib/activity-engine/activity-summary.ts`) :
```typescript
interface TimelineEntry {
  id:          string
  type:        string    // 'lesson_created', 'ia_document_generated', etc.
  subject?:    string    // titre de la leçon / document
  occurredAt:  string    // ISO 8601
}
```

---

## CSS Classes (DESIGN-05)

```css
.tj-feed           /* Conteneur — flex column */
.tj-feed-item      /* Ligne d'événement + ligne verticale ::after */
.tj-feed-dot       /* Cercle 20px coloré selon catégorie */
.tj-feed-dot--ia         /* violet clair */
.tj-feed-dot--success    /* vert clair */
.tj-feed-dot--document   /* bleu clair */
.tj-feed-dot--default    /* gris clair */
.tj-feed-content   /* Zone texte (flex: 1) */
.tj-feed-label     /* Titre de l'événement (12px, 500) */
.tj-feed-sub       /* Sujet optionnel (10px, muted) */
.tj-feed-time      /* Temps relatif (10px, muted, flex-shrink: 0) */
```

---

## Mapping type → dot class

```typescript
const dotClass =
  entry.type.startsWith('ia_') ? 'tj-feed-dot--ia'
  : ['lesson_created', 'evaluation_created',
     'workflow_completed', 'mission_completed'].includes(entry.type)
    ? 'tj-feed-dot--success'
  : entry.type.startsWith('document_') ? 'tj-feed-dot--document'
  : 'tj-feed-dot--default'
```

---

## Types d'événements supportés

| Type | Icône | Label FR | Catégorie |
|------|-------|----------|-----------|
| `lesson_created` | 📝 | Leçon créée | success |
| `lesson_updated` | ✏️ | Leçon modifiée | default |
| `evaluation_created` | 📊 | Évaluation créée | success |
| `document_uploaded` | 📎 | Document ajouté | document |
| `document_moved` | 📁 | Document déplacé | document |
| `calendar_event_created` | 📅 | Événement créé | default |
| `assignment_corrected` | ✅ | Devoir corrigé | success |
| `workflow_started` | ▶️ | Plan démarré | default |
| `workflow_completed` | 🏁 | Plan terminé | success |
| `mission_completed` | 🎯 | Mission complétée | success |
| `ia_conversation_started` | 🤖 | Conversation IA | ia |
| `ia_document_generated` | ✨ | Document généré par IA | ia |

---

## Rendu (dashboard/page.tsx)

```tsx
{recentActivity.length > 0 && (
  <div className="glass-light" style={card}>
    <h2 style={secTitle}>Activité récente</h2>
    <div className="tj-feed">
      {recentActivity.slice(0, 5).map(entry => {
        const dotClass = /* mapping ci-dessus */
        return (
          <div key={entry.id} className="tj-feed-item">
            <div className={`tj-feed-dot ${dotClass}`} aria-hidden>
              {activityIcon(entry.type)}
            </div>
            <div className="tj-feed-content">
              <div className="tj-feed-label">{activityLabel(entry.type)}</div>
              {entry.subject && <div className="tj-feed-sub">{entry.subject}</div>}
            </div>
            <span className="tj-feed-time">{formatRelative(entry.occurredAt)}</span>
          </div>
        )
      })}
    </div>
  </div>
)}
```

---

## Règles

1. **Maximum 5 entrées** — pas de pagination dans le dashboard
2. **Conditionnel** — si `recentActivity.length === 0`, la section n'existe pas
3. **Non bloquant** — le fetch échoue silencieusement (pas d'erreur affichée)
4. **Ordre** — chronologique inverse (le plus récent en haut)
5. **Temps relatif** — `formatRelative()` : "à l'instant", "il y a Xmin", "il y a Xh", "il y a Xj"

---

## Extension — Nouvel événement

1. Ajouter le `type` dans `ACTIVITY_ICONS` et `ACTIVITY_LABELS` (dashboard/page.tsx)
2. Décider de la catégorie de dot (`ia`, `success`, `document`, `default`)
3. S'assurer que l'API `/api/activity/timeline` retourne ce type
4. Aucune modification du rendu nécessaire — il est générique

---

## Voir aussi

- [Timeline_System.md](Timeline_System.md) — Timeline du jour
- [Dashboard_Redesign.md](Dashboard_Redesign.md) — Contexte dashboard complet
