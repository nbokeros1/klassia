# Vercel — Évaluation de compatibilité bêta
> **Mission** : DEPLOY-BETA-01 · M7  
> **Date** : 2026-08-05  
> **Statut** : Évaluation complète — 2 risques critiques identifiés

---

## Résumé des risques

| Risque | Sévérité | Impact |
|--------|----------|--------|
| Timeout SSE lesson-engine (13 étapes) | 🔴 Critique | Génération de leçon incomplète ou coupée |
| Timeout SSE build-year (plan annuel) | 🔴 Critique | Construction de l'année incomplète |
| Payload curriculum upload (PDF/DOCX) | 🟡 Modéré | Fichiers > 4.5 Mo rejetés par Vercel |
| Timeout exports DOCX/PDF/PPTX | 🟡 Modéré | Exports lents si leçon volumineuse |
| Mémoire Anthropic SDK | 🟢 Faible | Node.js serverless 1024 Mo suffisant |

---

## 1. SSE Streaming — Risque critique

### Routes concernées

| Route | Pipeline | Durée estimée |
|-------|----------|---------------|
| `/api/spie/lesson-engine` | 13 étapes Claude séquentielles | 90–180 secondes |
| `/api/spie/build-year` | Plan annuel + séquences | 60–120 secondes |
| `/api/ia/assistant` | Chat streaming (tokens) | < 30 secondes |
| `/api/ia/generer` | Génération leçon simple | 30–60 secondes |

### Limites Vercel

| Plan Vercel | Timeout fonction serverless | Streaming SSE |
|-------------|----------------------------|---------------|
| Hobby | 60 secondes | ✅ Supporté |
| Pro | **300 secondes** | ✅ Supporté |
| Enterprise | Configurable | ✅ Supporté |

> **Conclusion** : Le plan **Vercel Pro est obligatoire** pour la bêta. Le plan Hobby couperait `lesson-engine` à mi-chemin (13 étapes prennent 90–180 s).

### Configuration requise

Ajouter `export const maxDuration = 300` dans les routes SSE longues :

```typescript
// src/app/api/spie/lesson-engine/route.ts
export const maxDuration = 300

// src/app/api/spie/build-year/route.ts
export const maxDuration = 300
```

> ⚠ Ces ajouts sont documentés ici mais **ne pas modifier les fichiers maintenant** — attendre la validation PO du déploiement.

---

## 2. Taille des payloads

### Upload de curriculum (PDF, DOCX)

- Vercel limite les request bodies à **4.5 Mo** par défaut pour les routes serverless
- Un curriculum provincial peut dépasser 4.5 Mo
- La route `/api/ia/curriculum` reçoit le fichier encodé en base64 (facteur ×1.33)

**Risque** : Un PDF de 3.5 Mo encode en ~4.7 Mo base64 → rejeté par Vercel.

**Mitigation recommandée (post-bêta)** : upload direct vers Supabase Storage depuis le client, puis passer l'URL à l'API.  
**Pour la bêta** : tester avec des curricula < 3 Mo, documenter la limite dans l'interface.

### Exports DOCX/PDF/PPTX

Les exports génèrent les fichiers côté serveur et les retournent en réponse binaire.

| Export | Durée estimée | Taille réponse |
|--------|--------------|----------------|
| DOCX (`docx` library) | 5–15 secondes | 50–500 Ko |
| PDF (`html-pdf` ou similaire) | 10–30 secondes | 100 Ko–2 Mo |
| PPTX (`pptxgenjs`) | 5–20 secondes | 200 Ko–3 Mo |

**Conclusion** : Dans les limites du plan Pro (300 s). Pas de risque immédiat.

---

## 3. Runtime Proxy (Middleware)

La route `src/proxy.ts` tourne en **Node.js runtime** (pas Edge).  
Vercel supporte le proxy Node.js avec les plans Pro+.

- Pas de limitation Edge (pas de `import` natif Node.js)
- Le proxy fait des requêtes Supabase DB → acceptable en Node.js runtime
- Timeout proxy : non applicable (le proxy ne génère pas de contenu IA)

---

## 4. Variables d'environnement

Voir `SCORGIA_BETA_ENVIRONMENT_VARIABLES.md` — toutes les variables sont compatibles Vercel.  
`SUPABASE_SERVICE_ROLE_KEY` et `ANTHROPIC_API_KEY` : activer en **Production uniquement** (pas Preview).

---

## 5. Build time

Build actuel : 27 s compilation + 58 s TypeScript + 3.6 s static = **~90 secondes total**.  
Vercel limite le build time à 45 minutes (Pro). Aucun risque.

---

## 6. Node.js version

`package.json` et `next.config.ts` n'imposent pas de version Node.js explicite.  
Vercel utilise Node.js 20.x par défaut (Pro).  
Next.js 16.2.6 requiert Node.js 18.18+. ✅ Compatible.

---

## Actions requises avant déploiement

| Action | Priorité | Fichier |
|--------|----------|---------|
| Souscrire Vercel Pro | 🔴 Obligatoire | — |
| Ajouter `maxDuration = 300` aux routes SSE longues | 🔴 Obligatoire | lesson-engine, build-year |
| Documenter la limite upload 4.5 Mo dans l'UI | 🟡 Recommandé | — |
| Tester les exports avec une leçon complète | 🟡 Recommandé | smoke test |

---

*Document créé : DEPLOY-BETA-01 · M7 · 2026-08-05*
