// MON-ANNEE-V2.1A — Section 19 : Class Folder Binding (taxonomie corrigée)
//
// Arborescence officielle :
//   Préparation/Curriculum/       → type_fichier: 'curriculum'
//   Préparation/Syllabus/         → type_fichier: 'document', tag: spie:syllabus
//   Préparation/Plan annuel/      → type_fichier: 'document', tag: spie:plan_annuel
//   Préparation/Séquences/        → type_fichier: 'sequence', tag: spie:sequence
//   Préparation/Plans de leçons/  → type_fichier: 'plan_lecon', tag: spie:plan_lecon
//   Leçons/                       → type_fichier: 'lecon_complete' (générée réellement)
//
// Idempotence : read-then-write
//   - Entrée absente              → INSERT
//   - Entrée présente, bon dossier → skip
//   - Entrée présente, mauvais dossier → UPDATE dossier_id (correction taxonomie)
//
// Invariants :
//   - Ne supprime jamais aucun fichier (user ou système)
//   - source_meta_json.type_contenu explicite sur chaque entrée
//   - Non-bloquant : erreurs journalisées, jamais propagées au build

import type { SupabaseClient } from '@supabase/supabase-js'
import type { ContenuProgramme } from '@/lib/types/database'

type FichierInsert = {
  dossier_id:       string
  enseignant_id:    string
  classe_id:        string
  nom:              string
  type_fichier:     string
  statut:           string
  tags:             string[]
  description:      string
  teaching_pack_id: string
  sequence_index:   number | null
  lecon_index:      number | null
  indexe_studio_ia: boolean
  source_meta_json: Record<string, string>
}

type ExistingEntry = {
  id:             string
  dossier_id:     string
  type_fichier:   string
  sequence_index: number | null
  lecon_index:    number | null
  tags:           string[]
}

export type FolderBindingResult = {
  inserted: number
  updated:  number
  skipped:  number
  errors:   string[]
}

// Clé composite d'unicité : "type_fichier:sous_type:seq_idx:lecon_idx"
function buildKey(
  typeFichier: string,
  tags: string[],
  seqIdx: number | null,
  leconIdx: number | null,
): string {
  const sub = tags
    .find(t => t.startsWith('spie:') && t !== 'spie:system')
    ?.slice('spie:'.length) ?? ''
  return `${typeFichier}:${sub}:${seqIdx ?? -1}:${leconIdx ?? -1}`
}

// Garantit qu'un sous-dossier existe sous parent_id, crée s'il est absent (idempotent)
async function ensureSubFolder(
  supabase:      SupabaseClient,
  classeId:      string,
  enseignantId:  string,
  parentId:      string,
  nom:           string,
  ordre:         number,
): Promise<string | null> {
  const { data: existing } = await supabase
    .from('dossiers_systeme')
    .select('id')
    .eq('classe_id', classeId)
    .eq('parent_id', parentId)
    .eq('nom', nom)
    .maybeSingle()

  if (existing?.id) return existing.id

  const { data: created } = await supabase
    .from('dossiers_systeme')
    .insert({
      classe_id:     classeId,
      enseignant_id: enseignantId,
      parent_id:     parentId,
      nom,
      type:          'custom',
      ordre,
    })
    .select('id')
    .single()

  return created?.id ?? null
}

export async function bindProgrammeToClassFolder(params: {
  supabase:               SupabaseClient
  classeId:               string
  enseignantId:           string
  packId:                 string
  progId:                 string
  programme:              ContenuProgramme
  premiereLeconFichierId: string | null
}): Promise<FolderBindingResult> {
  const {
    supabase, classeId, enseignantId, packId, progId,
    programme, premiereLeconFichierId,
  } = params

  // ── 1. Dossiers existants pour cette classe ───────────────────────────────
  const { data: dossiers } = await supabase
    .from('dossiers_systeme')
    .select('id, type, nom, parent_id')
    .eq('classe_id', classeId)

  const dosMap = new Map<string, string>()  // type → id (premier trouvé)
  let prepId: string | null = null
  for (const d of (dossiers ?? [])) {
    if (!dosMap.has(d.type)) dosMap.set(d.type, d.id)
    if (d.type === 'preparation' && !prepId) prepId = d.id
  }

  // ── 2. Créer les sous-dossiers manquants sous Préparation ─────────────────
  // Syllabus et Séquences ne font pas partie des dossiers créés par défaut
  let syllabusDos:  string | null = null
  let sequencesDos: string | null = null

  if (prepId) {
    syllabusDos  = await ensureSubFolder(supabase, classeId, enseignantId, prepId, 'Syllabus',  2)
    sequencesDos = await ensureSubFolder(supabase, classeId, enseignantId, prepId, 'Séquences', 4)
  }

  // ── 3. Entrées système déjà présentes pour ce pack ────────────────────────
  const { data: existing } = await supabase
    .from('fichiers_dossier')
    .select('id, dossier_id, type_fichier, sequence_index, lecon_index, tags')
    .eq('teaching_pack_id', packId)

  // Map clé → entrée existante (pour diff dossier_id)
  const existMap = new Map<string, ExistingEntry>()
  for (const f of (existing ?? [])) {
    const key = buildKey(f.type_fichier, f.tags ?? [], f.sequence_index, f.lecon_index)
    existMap.set(key, {
      id:             f.id,
      dossier_id:     f.dossier_id,
      type_fichier:   f.type_fichier,
      sequence_index: f.sequence_index,
      lecon_index:    f.lecon_index,
      tags:           f.tags ?? [],
    })
  }

  const toInsert: FichierInsert[] = []
  const toUpdate: Array<{ id: string; dossier_id: string }> = []
  const errors: string[] = []

  // INSERT si absent, UPDATE dossier si mal placé, skip si correct
  function addEntry(entry: FichierInsert): void {
    const key = buildKey(entry.type_fichier, entry.tags, entry.sequence_index, entry.lecon_index)
    const found = existMap.get(key)
    if (!found) {
      toInsert.push(entry)
    } else if (found.dossier_id !== entry.dossier_id) {
      toUpdate.push({ id: found.id, dossier_id: entry.dossier_id })
    }
  }

  // ── Curriculum → Préparation/Curriculum ───────────────────────────────────
  const curricDos = dosMap.get('curriculum')
  if (curricDos) {
    addEntry({
      dossier_id:       curricDos,
      enseignant_id:    enseignantId,
      classe_id:        classeId,
      nom:              `Curriculum — ${programme.source_curriculum ?? 'Programme'}`,
      type_fichier:     'curriculum',
      statut:           'valide',
      tags:             ['spie:system', 'spie:curriculum'],
      description:      `Source : ${programme.source_curriculum ?? 'non spécifiée'}`,
      teaching_pack_id: packId,
      sequence_index:   null,
      lecon_index:      null,
      indexe_studio_ia: false,
      source_meta_json: {
        type_contenu: 'curriculum',
        pack_id:      packId,
      },
    })
  }

  // ── Syllabus → Préparation/Syllabus ──────────────────────────────────────
  if (syllabusDos) {
    addEntry({
      dossier_id:       syllabusDos,
      enseignant_id:    enseignantId,
      classe_id:        classeId,
      nom:              `Syllabus — ${programme.titre}`,
      type_fichier:     'document',
      statut:           'valide',
      tags:             ['spie:system', 'spie:syllabus'],
      description:      `Syllabus du programme — ${programme.nb_semaines} semaines`,
      teaching_pack_id: packId,
      sequence_index:   null,
      lecon_index:      null,
      indexe_studio_ia: false,
      source_meta_json: {
        type_contenu: 'syllabus',
        pack_id:      packId,
        prog_id:      progId,
      },
    })
  }

  // ── Plan annuel → Préparation/Plan annuel ─────────────────────────────────
  const planDos = dosMap.get('plan_annuel')
  if (planDos) {
    addEntry({
      dossier_id:       planDos,
      enseignant_id:    enseignantId,
      classe_id:        classeId,
      nom:              programme.titre,
      type_fichier:     'document',
      statut:           'valide',
      tags:             ['spie:system', 'spie:plan_annuel'],
      description:      `${programme.unites.length} séquences · ${programme.nb_semaines} semaines`,
      teaching_pack_id: packId,
      sequence_index:   null,
      lecon_index:      null,
      indexe_studio_ia: false,
      source_meta_json: {
        type_contenu: 'plan_annuel',
        pack_id:      packId,
        prog_id:      progId,
      },
    })
  }

  // ── Séquences → Préparation/Séquences  |  Plans → Préparation/Plans de leçons
  const planLeconsDos = dosMap.get('plans_lecons')

  for (let si = 0; si < programme.unites.length; si++) {
    const unite  = programme.unites[si]
    const seqPad = String(unite.numero).padStart(2, '0')

    // Sequence outline → Séquences/
    if (sequencesDos) {
      addEntry({
        dossier_id:       sequencesDos,
        enseignant_id:    enseignantId,
        classe_id:        classeId,
        nom:              `S${seqPad} — ${unite.titre}`,
        type_fichier:     'sequence',
        statut:           'brouillon',
        tags:             ['spie:system', 'spie:sequence'],
        description:      unite.justification_pedagogique ?? `Semaines ${unite.semaine_debut}–${unite.semaine_fin}`,
        teaching_pack_id: packId,
        sequence_index:   si,
        lecon_index:      null,
        indexe_studio_ia: false,
        source_meta_json: {
          type_contenu: 'sequence_outline',
          pack_id:      packId,
          prog_id:      progId,
          seq_num:      String(unite.numero),
        },
      })
    }

    // Lesson outlines → Plans de leçons/
    if (planLeconsDos) {
      for (let li = 0; li < unite.lecons.length; li++) {
        const lecon    = unite.lecons[li]
        const leconPad = String(lecon.numero).padStart(2, '0')
        addEntry({
          dossier_id:       planLeconsDos,
          enseignant_id:    enseignantId,
          classe_id:        classeId,
          nom:              `S${seqPad}-L${leconPad} — ${lecon.titre}`,
          type_fichier:     'plan_lecon',
          statut:           lecon.lecon_id ? 'valide' : 'brouillon',
          tags:             ['spie:system', 'spie:plan_lecon'],
          description:      lecon.objectif_apprentissage ?? lecon.sujet,
          teaching_pack_id: packId,
          sequence_index:   si,
          lecon_index:      li,
          indexe_studio_ia: false,
          source_meta_json: {
            type_contenu: 'lesson_outline',
            pack_id:      packId,
            prog_id:      progId,
            seq_num:      String(unite.numero),
            lecon_num:    String(lecon.numero),
          },
        })
      }
    }
  }

  // ── 4. Batch insert ───────────────────────────────────────────────────────
  if (toInsert.length > 0) {
    const { error: insertErr } = await supabase
      .from('fichiers_dossier')
      .insert(toInsert)
    if (insertErr) {
      errors.push(`Batch insert: ${insertErr.message}`)
      return { inserted: 0, updated: 0, skipped: existMap.size, errors }
    }
  }

  // ── 5. Correction de dossier (entrées mal placées) ────────────────────────
  // Chaque UPDATE est individuel — volume max ~50 par classe, acceptable
  for (const { id, dossier_id } of toUpdate) {
    const { error: upErr } = await supabase
      .from('fichiers_dossier')
      .update({ dossier_id })
      .eq('id', id)
    if (upErr) errors.push(`Update dossier ${id}: ${upErr.message}`)
  }

  // ── 6. Placer la première leçon générée dans Leçons/ ─────────────────────
  // Met à jour dossier_id, teaching_pack_id, tags, source_meta_json
  // Toujours exécuté (correction possible si leçon mal placée en V2.1 initial)
  const leconsDos = dosMap.get('lecons')
  if (premiereLeconFichierId && leconsDos) {
    await supabase
      .from('fichiers_dossier')
      .update({
        dossier_id:       leconsDos,
        teaching_pack_id: packId,
        sequence_index:   0,
        lecon_index:      0,
        tags:             ['spie:system', 'spie:lecon_complete'],
        source_meta_json: {
          type_contenu: 'lecon_complete',
          pack_id:      packId,
          prog_id:      progId,
          seq_num:      '1',
          lecon_num:    '1',
        },
      })
      .eq('id', premiereLeconFichierId)
  }

  return {
    inserted: toInsert.length,
    updated:  toUpdate.length,
    skipped:  existMap.size - toUpdate.length,
    errors,
  }
}
