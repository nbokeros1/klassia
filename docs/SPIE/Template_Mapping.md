# Template Mapping — Gabarits utilisateur

**Statut :** SPIE-BETA-02 · Actif  
**API :** `POST /api/spie/analyze-template`  
**Composant :** `src/components/build-year/TemplateMapping.tsx`

---

## Flux

1. L'enseignant téléverse son gabarit (Word, PDF, texte)
2. L'API extrait le texte et l'analyse via Claude (haiku)
3. Un mapping est généré : sections du gabarit → objets SPIE
4. Un aperçu est affiché avec la compatibilité (%)
5. L'enseignant peut accepter, corriger ou revenir au gabarit ScorgIA

---

## Règles absolues

- **Le fichier original n'est jamais modifié ni stocké**
- **Les documents d'un utilisateur ne sont jamais utilisés pour un autre**
- L'enseignant peut revenir au gabarit ScorgIA à tout moment

---

## Statuts de mapping

| Statut | Signification |
|--------|---------------|
| `reconnu` | Section identifiée et mappée à un objet SPIE |
| `manquant` | Section obligatoire SPIE absente du gabarit |
| `supplementaire` | Section présente dans le gabarit mais sans équivalent SPIE |
| `incompris` | Section détectée mais non analysable |
| `ignore` | Section explicitement ignorée par l'enseignant |

---

## Compatibilité

```
compatibilite_spie = sections_reconnues / sections_detectees × 100
```

`peut_utiliser = true` si compatibilité ≥ 30%.

---

## API

```typescript
POST /api/spie/analyze-template
FormData { file: File }

Response: {
  success: true,
  mapping: GabaritMappingResult
}
```
