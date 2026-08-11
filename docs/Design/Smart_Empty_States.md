# Smart Empty States
## États vides intelligents — DS 2.0 DESIGN-06 M11

**Date :** 2026-08-10

---

## Concept

> Un état vide n'est pas une absence. C'est une invitation.

Les états vides dans le workspace ne sont pas des pages blanches. Ils proposent l'action la plus pertinente selon le contexte de l'enseignant.

---

## Composants existants

### NoClassesState

Affiché quand `classes.length === 0` dans le workspace.

```tsx
<NoClassesState
  isFr={isFr}
  onCreateClass={() => router.push('/dashboard/classes')}
/>
```

**Message :** "Commencez par créer une classe pour démarrer votre préparation."

### ClassPickerState

Affiché quand `classeId === null` mais `classes.length > 0`.

```tsx
<ClassPickerState
  isFr={isFr}
  classes={classes}
  onSelectClasse={id => setClasseId(id)}
/>
```

**Message :** "Sélectionnez une classe pour commencer."

---

## CSS Smart Empty State (M11)

```css
.ii-smart-empty          /* Conteneur centré, 48px padding */
.ii-smart-empty__icon    /* Icône 32px, opacity 0.4 */
.ii-smart-empty__title   /* Titre 15px, font-display, bold */
.ii-smart-empty__desc    /* Description 12px, secondary, 1.6 */
.ii-smart-empty__cta     /* Bouton violet, 9px 20px */
```

---

## Principes

1. **Une seule action** par état vide
2. **Message court** — max 2 lignes
3. **Pas de jargon** — "Créez votre première classe" pas "Aucune entité classe trouvée"
4. **Icône discrète** — opacity 0.4, pas de grande illustration
5. **AI Visibility Level 0** — aucune mention de l'IA dans les états vides

---

## Exemples de messages

| Contexte | Message | CTA |
|----------|---------|-----|
| Pas de classe | "Créez votre première classe pour commencer." | Créer une classe |
| Classe sans document | "Posez une question à l'assistant ou choisissez une action." | Ouvrir l'assistant |
| Pas de leçon dans bibliothèque | "Aucune leçon sauvegardée pour cette classe." | Préparer une leçon |
| Pas d'activité récente | (section masquée) | — |
