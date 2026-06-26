import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'

// ─── Route POST ───────────────────────────────────────────────────────────────
// action = 'generer' : génère un plan annuel tenant compte du calendrier scolaire,
//                      retourne le HTML sans le sauvegarder.
// action = 'appliquer': sauvegarde le plan_html fourni dans fichiers_dossier.

export async function POST(request: Request) {
  const { error, session, supabase } = await requireAuth()
  if (error) return error

  let body: any
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'Corps invalide' }, { status: 400 }) }

  const { action, classe_id, plan_html, journees_pedagogiques = [], semaines_relache = [], dates_bulletins = [], autres_evenements = [] } = body

  if (!classe_id) return NextResponse.json({ error: 'classe_id requis' }, { status: 400 })

  // Vérifier que la classe appartient à cet utilisateur
  const { data: profil } = await supabase!.from('utilisateurs').select('id, province').eq('user_id', session!.user.id).single()
  if (!profil?.id) return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 })

  const { data: classe } = await supabase!.from('classes').select('*').eq('id', classe_id).eq('enseignant_id', profil.id).single()
  if (!classe) return NextResponse.json({ error: 'Classe introuvable ou accès refusé' }, { status: 404 })

  // ── ACTION : APPLIQUER ────────────────────────────────────────────────────

  if (action === 'appliquer') {
    if (!plan_html) return NextResponse.json({ error: 'plan_html requis pour appliquer' }, { status: 400 })

    // Trouver le dossier plan_annuel de la classe
    const { data: dossiers } = await supabase!.from('dossiers_systeme').select('id').eq('classe_id', classe_id).eq('type', 'plan_annuel').limit(1)
    if (!dossiers?.[0]) return NextResponse.json({ error: 'Dossier plan_annuel introuvable pour cette classe' }, { status: 404 })

    // Insérer le nouveau plan (sans supprimer l'ancien — historique conservé)
    const { data: fichier, error: insertErr } = await supabase!.from('fichiers_dossier').insert({
      enseignant_id:    profil.id,
      classe_id:        classe_id,
      dossier_id:       dossiers[0].id,
      nom:              `Programme annuel — ${classe.nom} (révisé ${new Date().toLocaleDateString('fr-CA')})`,
      type_fichier:     'plan_annuel',
      statut:           'brouillon',
      contenu_html:     plan_html,
      indexe_studio_ia: true,
    } as any).select().single()

    if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })
    return NextResponse.json({ ok: true, fichier_id: fichier.id })
  }

  // ── ACTION : GÉNÉRER ──────────────────────────────────────────────────────

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'Clé API Anthropic manquante' }, { status: 500 })

  // Construire le contexte calendrier scolaire
  const ctxJPed = journees_pedagogiques.length > 0
    ? `\n\nJOURNÉES PÉDAGOGIQUES (pas de cours élèves) :\n${journees_pedagogiques.map((j: any) => `- ${j.date} : ${j.description}`).join('\n')}`
    : ''

  const ctxRelache = semaines_relache.length > 0
    ? `\n\nSEMAINES DE RELÂCHE (élèves absents) :\n${semaines_relache.map((r: any) => `- Du ${r.debut} au ${r.fin} : ${r.description}`).join('\n')}`
    : ''

  const ctxBulletins = dates_bulletins.length > 0
    ? `\n\nDATES DE BULLETINS (évaluations sommatives à prévoir) :\n${dates_bulletins.map((b: any) => `- ${b.date} : ${b.description}`).join('\n')}`
    : ''

  const ctxAutres = autres_evenements.length > 0
    ? `\n\nAUTRES DATES IMPORTANTES :\n${autres_evenements.map((e: any) => `- ${e.date} : ${e.description}`).join('\n')}`
    : ''

  const prompt = `Tu es un expert pédagogique canadien. Génère un programme annuel complet en HTML pour :
- Classe : ${classe.nom}
- Matière : ${classe.matiere || ''}
- Niveau : ${classe.niveau || ''}
- Province : ${profil.province || 'Canada'}
${ctxJPed}${ctxRelache}${ctxBulletins}${ctxAutres}

CONSIGNES IMPORTANTES :
- Positionne les unités et séquences en ÉVITANT les semaines de relâche et journées pédagogiques.
- Prévois des évaluations sommatives AVANT les dates de remise de bulletins (minimum 2 semaines avant).
- Structure le programme par trimestres / unités thématiques / compétences visées.
- Retourne le programme complet en HTML (h1, h2, p, ul, table) — environ 800-1200 mots.`

  try {
    const client = new Anthropic({ apiKey })
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001', max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    })
    const planHtml = msg.content[0].type === 'text' ? msg.content[0].text : ''
    return NextResponse.json({ plan_html: planHtml })
  } catch (err: any) {
    console.error('regenerer-plan-annuel:', err)
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 })
  }
}
