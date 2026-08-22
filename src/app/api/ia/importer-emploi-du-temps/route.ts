import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'

export const maxDuration = 60

// ─── Types (mêmes que onboarding-auto) ───────────────────────────────────────

interface CoursDetecte {
  jour:        string
  heure_debut: string
  heure_fin:   string
  salle?:      string
}

interface ClasseDetectee {
  nom:        string
  matiere:    string
  niveau:     string
  nb_eleves:  number
  cours:      CoursDetecte[]
}

interface ProgressEvent {
  etape:       number | 'complete' | 'erreur' | 'quota_epuise'
  message:     string
  progression: number
  details?:    Record<string, any>
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function encodeEvent(controller: ReadableStreamDefaultController, ev: ProgressEvent) {
  controller.enqueue(new TextEncoder().encode(JSON.stringify(ev) + '\n'))
}

function datesPourJour(jour: string, anneeDebut: string, anneeFin: string): string[] {
  const JOURS: Record<string, number> = {
    Lundi: 1, Mardi: 2, Mercredi: 3, Jeudi: 4, Vendredi: 5, Samedi: 6,
    Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5,
  }
  const jourNum = JOURS[jour]
  if (jourNum === undefined) return []
  const debut = new Date(anneeDebut)
  const fin   = new Date(anneeFin)
  const dates: string[] = []
  const d = new Date(debut)
  while (d.getDay() !== jourNum) d.setDate(d.getDate() + 1)
  while (d <= fin) { dates.push(d.toISOString()); d.setDate(d.getDate() + 7) }
  return dates
}

// Vérification quota inline — mirrors resolver.ts logic for server-route safety.
function verifierQuota(profil: any): { autorise: boolean; raison?: string } {
  if (profil.is_admin) return { autorise: true }
  if (profil.role === 'beta') return { autorise: true }
  const forfait = profil.forfait || 'gratuit'
  if (forfait === 'pro_plus' || forfait === 'institution') return { autorise: true }
  if (forfait === 'gratuit') {
    const total = profil.generations_ia_total_a_vie ?? 0
    if (total >= 5) return { autorise: false, raison: 'Vos 5 générations gratuites sont épuisées.' }
    return { autorise: true }
  }
  if (forfait === 'pro') {
    const derniereReinit = profil.derniere_reinit_quota ? new Date(profil.derniere_reinit_quota) : new Date(0)
    const jours = (Date.now() - derniereReinit.getTime()) / 86400000
    const compteur = jours >= 30 ? 0 : (profil.generations_ia_mois_courant ?? 0)
    if (compteur >= 75) return { autorise: false, raison: 'Limite de 75 générations ce mois atteinte.' }
    return { autorise: true }
  }
  return { autorise: true }
}

// ─── Route POST ───────────────────────────────────────────────────────────────
// Cascade POST-onboarding — création de classes + contenu IA avec vérification quota.
// Contrairement à onboarding-auto, cette route n'exige pas que la cascade initiale
// soit complète et ne la marque pas comme telle. Elle consomme le quota normalement.

export async function POST(request: Request) {
  const { error, session, supabase } = await requireAuth()
  if (error) return error

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'Clé API Anthropic manquante' }, { status: 500 })

  let body: any
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'Corps invalide' }, { status: 400 }) }

  const {
    emploi_du_temps = [] as ClasseDetectee[],
    curriculum_texte = '',
    annee_debut      = `${new Date().getFullYear()}-09-01`,
    annee_fin        = `${new Date().getFullYear() + 1}-06-30`,
  } = body

  if (emploi_du_temps.length === 0) {
    return NextResponse.json({ error: 'emploi_du_temps requis et non vide.' }, { status: 400 })
  }

  const { data: profil } = await supabase!
    .from('utilisateurs')
    .select('id, prenom, province, profil_ia, forfait, is_admin, role, generations_ia_total_a_vie, generations_ia_mois_courant, derniere_reinit_quota')
    .eq('user_id', session!.user.id)
    .single()

  if (!profil?.id) return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 })

  // Vérifier quota AVANT de démarrer la génération IA
  const quotaCheck = verifierQuota(profil)
  const genererContenuIA = quotaCheck.autorise

  const client = new Anthropic({ apiKey })
  const enseignantId = profil.id

  return new Response(
    new ReadableStream({
      async start(controller) {
        const classesCreees: any[] = []
        const total = emploi_du_temps.length

        try {
          // ── ÉTAPE 1 — Créer les classes ──────────────────────────────────

          encodeEvent(controller, { etape: 1, progression: 2, message: `Création de ${total} classe(s)…` })

          for (let i = 0; i < emploi_du_temps.length; i++) {
            const cls = emploi_du_temps[i]
            const { data: classeCreee, error: errCls } = await supabase!
              .from('classes')
              .insert({
                enseignant_id:  enseignantId,
                nom:            cls.nom      || `Classe ${i + 1}`,
                niveau:         cls.niveau   || '',
                matiere:        cls.matiere  || '',
                matieres:       cls.matiere  ? [cls.matiere] : [],
                nombre_eleves:  cls.nb_eleves || 0,
                couleur:        ['#7F77DD', '#60A5FA', '#34D399', '#F472B6', '#FB923C', '#FBC34A'][i % 6],
                langue:         'fr',
                annee_scolaire: `${new Date(annee_debut).getFullYear()}-${new Date(annee_fin).getFullYear()}`,
              } as any)
              .select()
              .single()

            if (!errCls && classeCreee) {
              classesCreees.push({ ...classeCreee, _source: cls })
              encodeEvent(controller, {
                etape: 1, progression: Math.round(5 + (i + 1) / total * 15),
                message: `✓ Classe "${classeCreee.nom}" créée`,
                details: { classes_creees: classesCreees.length },
              })
            }
          }

          // ── ÉTAPE 2 — Cours récurrents + Calendrier ──────────────────────

          encodeEvent(controller, { etape: 2, progression: 20, message: "Calcul des horaires…" })

          let totalEvenements = 0
          for (const classeCreee of classesCreees) {
            const src: ClasseDetectee = classeCreee._source

            // cours_semaine (vue hebdo)
            if (src.cours?.length > 0) {
              for (const cours of src.cours) {
                await supabase!.from('cours_semaine').insert({
                  enseignant_id: enseignantId,
                  classe_id:     classeCreee.id,
                  nom_classe:    src.nom || classeCreee.nom,
                  couleur:       classeCreee.couleur || '#7F77DD',
                  jour:          cours.jour,
                  heure_debut:   cours.heure_debut,
                  heure_fin:     cours.heure_fin,
                  salle:         cours.salle || null,
                  recurrent:     true,
                } as any)
              }
            }

            // evenements_calendrier (instances annuelles)
            if (src.cours?.length > 0) {
              const inserts: any[] = []
              for (const cours of src.cours) {
                const dates = datesPourJour(cours.jour, annee_debut, annee_fin)
                for (const dateISO of dates) {
                  inserts.push({
                    enseignant_id: enseignantId,
                    classe_id:     classeCreee.id,
                    titre:         `${src.matiere || src.nom} — ${cours.heure_debut}`,
                    type:          'lecon',
                    date_debut:    dateISO,
                    recurrence:    'hebdomadaire',
                    couleur:       classeCreee.couleur || '#7F77DD',
                  })
                }
              }
              for (let b = 0; b < inserts.length; b += 200) {
                await supabase!.from('evenements_calendrier').insert(inserts.slice(b, b + 200) as any)
              }
              totalEvenements += inserts.length
            }
          }

          encodeEvent(controller, {
            etape: 2, progression: 35,
            message: totalEvenements > 0
              ? `✓ ${totalEvenements} cours planifiés dans l'agenda`
              : '✓ Structure créée (aucun horaire fourni)',
            details: { total_evenements: totalEvenements },
          })

          // ── QUOTA ÉPUISÉ : créer seulement la structure ──────────────────

          if (!genererContenuIA) {
            encodeEvent(controller, {
              etape: 'quota_epuise', progression: 100,
              message: `ℹ️ ${quotaCheck.raison} Les dossiers et horaires ont été créés. Passez à un forfait payant pour que ScorgIA génère automatiquement le plan annuel et les leçons.`,
              details: {
                classes_creees:   classesCreees.length,
                evenements_crees: totalEvenements,
                contenu_ia:       false,
              },
            })
            controller.close()
            return
          }

          // ── ÉTAPE 3 — Programmes annuels ─────────────────────────────────

          encodeEvent(controller, { etape: 3, progression: 38, message: 'Génération des programmes annuels…' })

          for (let i = 0; i < classesCreees.length; i++) {
            const cls = classesCreees[i]
            const src: ClasseDetectee = cls._source

            const promptProgramme = curriculum_texte
              ? `Tu es un expert pédagogique canadien. Génère un programme annuel structuré pour la classe "${src.nom}", matière : "${src.matiere}", niveau : "${src.niveau}".\nCurriculum fourni :\n${curriculum_texte.substring(0, 3000)}\nRetourne un programme en HTML avec les grandes périodes, unités et compétences.`
              : `Tu es un expert pédagogique canadien. Génère un programme annuel structuré pour :\n- Classe : ${src.nom}\n- Matière : ${src.matiere}\n- Niveau : ${src.niveau}\n- Province : ${profil.province || 'Canada'}\nRetourne le programme en HTML avec les grandes périodes, unités et compétences.`

            const msg = await client.messages.create({
              model: 'claude-haiku-4-5-20251001', max_tokens: 1500,
              messages: [{ role: 'user', content: promptProgramme }],
            })
            const contenuProgramme = msg.content[0].type === 'text' ? msg.content[0].text : ''

            const { data: dossiers } = await supabase!.from('dossiers_systeme').select('id').eq('classe_id', cls.id).eq('type', 'plan_annuel').limit(1)
            if (dossiers?.[0]) {
              await supabase!.from('fichiers_dossier').insert({
                enseignant_id: enseignantId, classe_id: cls.id, dossier_id: dossiers[0].id,
                nom: `Programme annuel — ${src.nom}`, type_fichier: 'plan_annuel',
                statut: 'brouillon', contenu_html: contenuProgramme, indexe_studio_ia: true,
              } as any)
            }
            encodeEvent(controller, { etape: 3, progression: Math.round(38 + (i + 1) / classesCreees.length * 17), message: `✓ Programme annuel généré pour "${src.nom}"` })
          }

          // ── ÉTAPE 4 — Séquences ───────────────────────────────────────────

          encodeEvent(controller, { etape: 4, progression: 55, message: "Génération des séquences…" })

          const sequencesCreees: Array<{ sequence: any; cls: any; src: ClasseDetectee }> = []
          for (let i = 0; i < classesCreees.length; i++) {
            const cls = classesCreees[i]
            const src: ClasseDetectee = cls._source
            const msg = await client.messages.create({
              model: 'claude-haiku-4-5-20251001', max_tokens: 1000,
              messages: [{ role: 'user', content: `Tu es un expert pédagogique canadien. Génère 4 à 6 séquences d'apprentissage pour : Classe : ${src.nom}, Matière : ${src.matiere}, Niveau : ${src.niveau}. Retourne UNIQUEMENT un JSON valide : [{"titre":"...","description":"...","nb_lecons":4,"objectifs":["..."]}]` }],
            })
            const rawSeq = msg.content[0].type === 'text' ? msg.content[0].text : '[]'
            let sequences: any[] = []
            try { const m = rawSeq.match(/\[[\s\S]*\]/); sequences = m ? JSON.parse(m[0]) : [] } catch { sequences = [] }
            for (const seq of sequences) {
              const { data: seqCreee } = await supabase!.from('plans_sequence').insert({ enseignant_id: enseignantId, classe_id: cls.id, titre: seq.titre || 'Séquence', description: seq.description || '', nb_lecons: seq.nb_lecons || 4, objectifs: seq.objectifs || [], statut: 'brouillon' } as any).select().single()
              if (seqCreee) sequencesCreees.push({ sequence: seqCreee, cls, src })
            }
            encodeEvent(controller, { etape: 4, progression: Math.round(55 + (i + 1) / classesCreees.length * 15), message: `✓ ${sequences.length} séquence(s) pour "${src.nom}"` })
          }

          // ── ÉTAPE 5 — Plans de leçons ─────────────────────────────────────

          encodeEvent(controller, { etape: 5, progression: 70, message: `Génération des plans de leçons…` })

          let totalLecons = 0
          for (let si = 0; si < sequencesCreees.length; si++) {
            const { sequence, cls, src } = sequencesCreees[si]
            const nbLecons = Math.min(sequence.nb_lecons || 4, 6)
            const msg = await client.messages.create({
              model: 'claude-haiku-4-5-20251001', max_tokens: 2000,
              messages: [{ role: 'user', content: `Tu es un expert pédagogique canadien. Génère ${nbLecons} plans de leçons synthétiques pour la séquence "${sequence.titre}". Matière : ${src.matiere}, Niveau : ${src.niveau}. Retourne UNIQUEMENT un JSON valide : [{"titre":"...","objectif":"...","duree":60,"amorce":"...","developpement":"...","cloture":"..."}]` }],
            })
            const rawPlans = msg.content[0].type === 'text' ? msg.content[0].text : '[]'
            let plans: any[] = []
            try { const m = rawPlans.match(/\[[\s\S]*\]/); plans = m ? JSON.parse(m[0]) : [] } catch { plans = [] }
            const { data: dossiers } = await supabase!.from('dossiers_systeme').select('id').eq('classe_id', cls.id).eq('type', 'plans_lecons').limit(1)
            for (const plan of plans) {
              await supabase!.from('lecons').insert({ enseignant_id: enseignantId, classe_id: cls.id, sequence_id: sequence.id, titre: plan.titre, sujet: plan.objectif, statut: 'brouillon', type_document: 'plan_lecon', contenu: { objectif: plan.objectif, amorce: plan.amorce, developpement: plan.developpement, cloture: plan.cloture } } as any)
              if (dossiers?.[0]) {
                await supabase!.from('fichiers_dossier').insert({ enseignant_id: enseignantId, classe_id: cls.id, dossier_id: dossiers[0].id, nom: plan.titre, type_fichier: 'plan_lecon', statut: 'brouillon', contenu_html: `<h1>${plan.titre}</h1><p><strong>Objectif :</strong> ${plan.objectif}</p><h2>🎯 Amorce</h2><p>${plan.amorce}</p><h2>📚 Développement</h2><p>${plan.developpement}</p><h2>✅ Clôture</h2><p>${plan.cloture}</p>`, indexe_studio_ia: true } as any)
              }
              totalLecons++
            }
            encodeEvent(controller, { etape: 5, progression: Math.round(70 + (si + 1) / sequencesCreees.length * 28), message: `✓ ${plans.length} plan(s) pour "${sequence.titre}"`, details: { total_lecons: totalLecons } })
          }

          // ── TERMINÉ ───────────────────────────────────────────────────────

          encodeEvent(controller, {
            etape: 'complete', progression: 100,
            message: '✓ Vos classes sont prêtes !',
            details: {
              classes_creees:     classesCreees.length,
              evenements_crees:   totalEvenements,
              sequences_creees:   sequencesCreees.length,
              plans_lecons_crees: totalLecons,
              premiere_classe_id: classesCreees[0]?.id || null,
            },
          })
        } catch (err: any) {
          encodeEvent(controller, { etape: 'erreur', progression: -1, message: `❌ Erreur : ${err.message || 'Erreur inattendue'}` })
        } finally {
          controller.close()
        }
      },
    }),
    { headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Transfer-Encoding': 'chunked' } },
  )
}
