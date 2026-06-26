import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/api-auth'

// ─── Types ────────────────────────────────────────────────────────────────────

type StyleImage = 'pedagogique' | 'realiste' | 'schema' | 'illustration'
type Dimensions = '1024x768' | '512x512' | '768x1024'

// ─── Prompt SVG pour Claude ───────────────────────────────────────────────────

function buildSvgPrompt(description: string, style: StyleImage, matiere: string, dims: Dimensions): string {
  const [w, h] = dims.split('x').map(Number)

  const styleInstructions: Record<StyleImage, string> = {
    schema: `Schéma pédagogique clair avec formes géométriques, flèches, et zones colorées.
Utiliser des couleurs douces : violet #A78BFA, bleu #60A5FA, vert #34D399, orange #FB923C.
Inclure du texte en français, labels, et légendes. Schéma type cahier scolaire.`,
    pedagogique: `Illustration pédagogique colorée et engageante pour élèves.
Couleurs vives mais harmonieuses. Style moderne et clair. Texte français si pertinent.`,
    illustration: `Illustration artistique éducative. Style moderne, propre, professionnel.
Couleurs harmonieuses, composition équilibrée.`,
    realiste: `Représentation visuelle réaliste et précise du sujet.
Détails pertinents, style sobre et professionnel.`,
  }

  return `Génère du code SVG valide représentant : "${description}"
Matière : ${matiere || 'Général'}
Style : ${styleInstructions[style]}
Dimensions : viewBox="0 0 ${w} ${h}"

CONTRAINTES STRICTES :
- Retourne UNIQUEMENT le code SVG complet, sans aucun texte avant ou après
- Commencer par <svg et terminer par </svg>
- Inclure xmlns="http://www.w3.org/2000/svg"
- Utiliser viewBox="0 0 ${w} ${h}"
- Tout le texte doit être en français canadien
- Rendre le SVG visuellement riche, pédagogique et professionnel
- Inclure un fond clair (blanc ou gris très clair)
- Utiliser des couleurs : violet #7F77DD, bleu #60A5FA, vert #34D399, orange #FB923C, rouge #F87171
- Ajouter un titre en haut et une légende si pertinent
- Minimum 300 éléments SVG pour un résultat riche`
}

// ─── Route POST ───────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  const { error, session, supabase: authSupabase } = await requireAuth()
  if (error) return error

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'Clé API Anthropic manquante' }, { status: 500 })

  // ── Vérifier forfait ──────────────────────────────────────────────────────
  const supabase = await createClient()
  const { data: profil } = await supabase
    .from('utilisateurs')
    .select('id, forfait')
    .eq('user_id', session!.user.id)
    .single()

  if (!profil?.id) return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 })

  const forfait = profil.forfait || 'gratuit'
  if (!['pro_plus', 'institution'].includes(forfait)) {
    return NextResponse.json(
      { error: "La génération d'images est réservée aux forfaits Pro+ et Institution.", code: 'FORFAIT_INSUFFISANT' },
      { status: 403 },
    )
  }

  let body: any
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'Corps invalide' }, { status: 400 }) }

  const {
    description,
    style            = 'schema' as StyleImage,
    contexte_matiere = '',
    dimensions       = '1024x768' as Dimensions,
  } = body

  if (!description?.trim()) {
    return NextResponse.json({ error: 'Description requise' }, { status: 400 })
  }

  const client = new Anthropic({ apiKey })

  // ── Générer SVG avec Claude ───────────────────────────────────────────────
  try {
    const msg = await client.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 4096,
      messages:   [{ role: 'user', content: buildSvgPrompt(description, style, contexte_matiere, dimensions) }],
    })

    const raw = msg.content[0].type === 'text' ? msg.content[0].text : ''

    // Extraire le SVG
    const svgMatch = raw.match(/<svg[\s\S]*<\/svg>/)
    if (!svgMatch) {
      return NextResponse.json(
        { error: 'Impossible de générer le SVG. Essayez une description plus précise.' },
        { status: 422 },
      )
    }

    const svgCode = svgMatch[0]

    // Convertir en data URL
    const svgBase64 = Buffer.from(svgCode, 'utf-8').toString('base64')
    const dataUrl   = `data:image/svg+xml;base64,${svgBase64}`

    // Uploader dans Supabase Storage si possible
    let storageUrl: string | null = null
    try {
      const fileName = `schemas/${profil.id}/${Date.now()}-schema.svg`
      const { data: uploadData } = await supabase.storage
        .from('ressources')
        .upload(fileName, Buffer.from(svgCode, 'utf-8'), {
          contentType:    'image/svg+xml',
          upsert:         false,
        })

      if (uploadData) {
        const { data: { publicUrl } } = supabase.storage
          .from('ressources')
          .getPublicUrl(fileName)
        storageUrl = publicUrl
      }
    } catch {
      // Storage facultatif — on retourne le data URL à la place
    }

    return NextResponse.json({
      url:        storageUrl || dataUrl,
      data_url:   dataUrl,
      svg_code:   svgCode,
      type:       'svg',
      style,
      dimensions,
      description,
    })

  } catch (err: any) {
    console.error('generer-image:', err)
    // Fallback : retourner un SVG placeholder
    const [w, h] = dimensions.split('x').map(Number)
    const placeholder = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
  <rect width="${w}" height="${h}" fill="#F8F9FF" rx="12"/>
  <rect x="20" y="20" width="${w - 40}" height="${h - 40}" fill="none" stroke="#7F77DD" stroke-width="2" stroke-dasharray="8,4" rx="8"/>
  <text x="${w / 2}" y="${h / 2 - 20}" text-anchor="middle" font-family="sans-serif" font-size="18" fill="#7F77DD" font-weight="bold">✦ KlassIA+</text>
  <text x="${w / 2}" y="${h / 2 + 10}" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#94A3B8">${description.substring(0, 60)}</text>
  <text x="${w / 2}" y="${h / 2 + 35}" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#CBD5E1">Schéma pédagogique — KlassIA+</text>
</svg>`
    const b64 = Buffer.from(placeholder, 'utf-8').toString('base64')
    return NextResponse.json({
      url:        `data:image/svg+xml;base64,${b64}`,
      data_url:   `data:image/svg+xml;base64,${b64}`,
      svg_code:   placeholder,
      type:       'svg_placeholder',
      style,
      dimensions,
      description,
      warning:    'Schéma placeholder — génération complète indisponible.',
    })
  }
}
