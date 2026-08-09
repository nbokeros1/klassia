# Teaching Pack — Exports DOCX

**Statut :** SPIE-BETA-02 · Actif  
**API :** `POST /api/spie/pack-export`  
**Dépendance :** `docx` (npm)

---

## Types d'export

| Type | Contenu | Entitlement requis |
|------|---------|-------------------|
| `syllabus` | Plan de cours complet | `export_syllabus` |
| `plan_annuel` | Plan annuel DOCX avec timeline textuelle | `export_plan_annuel` |
| `sequence` | Séquence + ses leçons | `export_sequence` |
| `pack_condense` | Syllabus + plan annuel + 1re séquence | `export_plan_annuel` |

---

## Règles d'export absolues

1. **"Powered by Claude" n'apparaît JAMAIS** — ni en pied de page, ni dans les métadonnées, ni dans le contenu généré
2. **Le footer inclut toujours :** `Document généré par ScorgIA (Bodingo AI Tech Inc.) — Avertissement [texte juridique]`
3. **Si province = Alberta :** l'avertissement légal Alberta est inclus dans le footer
4. **Les notes privées** (champ `notes_privees` de `LeconProgramme`) ne sont jamais exportées
5. **Numérotation automatique** des pages en pied de page

---

## Format des exports

Les exports DOCX utilisent :
- `docx.Document` avec sections et styles
- `docx.Paragraph`, `TextRun`, `HeadingLevel`
- `docx.Footer` avec mention légale + numéros de page
- `docx.Packer.toBuffer()` retourné directement comme réponse binaire

Content-Type : `application/vnd.openxmlformats-officedocument.wordprocessingml.document`

---

## API

```typescript
POST /api/spie/pack-export
{
  teaching_pack_id: string,
  type: 'syllabus' | 'plan_annuel' | 'sequence' | 'pack_condense',
  sequence_index?: number   // pour type = 'sequence'
}

Response: Buffer DOCX (binary)
```

---

## Entitlements

Vérifiés server-side via `requireEntitlement` dans `src/lib/spie-access.ts`.  
En cas d'accès non autorisé : `403 Forbidden` avec JSON `{ error: 'entitlement_requis', action }`.

---

## Versionnage et exports

Chaque export reflète le contenu au moment de l'export — il n'y a pas de cache côté serveur.  
Si l'enseignant a modifié le syllabus manuellement, `pack_versions` contient l'historique.  
Les exports ne déclenchent PAS la création d'une nouvelle version dans `pack_versions`.
