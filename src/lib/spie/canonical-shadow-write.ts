import { createHash } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { ContenuProgramme, LeconProgramme, Unite } from '@/lib/types/database'

export type CanonicalShadowWriteResult = {
  ok: boolean
  expected: {
    units: number
    sequences: number
    lessons: number
  }
  actual: {
    units: number
    sequences: number
    lessons: number
  }
  errors: string[]
}

type CanonicalContext = {
  supabase: SupabaseClient
  programme: ContenuProgramme
  programmeAnnuelId: string
  teachingPackId: string
  enseignantId: string
  classeId: string
}

type UnitRow = {
  id: string
  programme_annuel_id: string
  teaching_pack_id: string
  enseignant_id: string
  classe_id: string
  numero: number
  titre: string
  domain_code: string | null
  curriculum_outcome_ids: string[]
  statut: 'brouillon' | 'planifiee' | 'prete' | 'archivee'
}

type SequenceRow = {
  id: string
  unit_id: string
  numero: number
  titre: string
  theme: string | null
  semaine_debut: number
  semaine_fin: number
  curriculum_outcome_ids: string[]
  grandes_idees: string[]
  objectifs: string[]
  concepts_cles: string[]
  justification_pedagogique: string | null
  activite_culminante: string | null
  evaluation_prevue: string | null
  aydte_sequence_id: string | null
  duree_estimee_heures: number | null
  statut: 'brouillon' | 'planifiee' | 'prete' | 'archivee'
}

type LessonRow = {
  id: string
  sequence_id: string
  lecon_id: string | null
  numero: number
  titre: string
  sujet: string | null
  duree_minutes: number
  type: 'introduction' | 'developpement' | 'evaluation' | 'synthese'
  progression_role: 'introduction' | 'acquisition' | 'pratique' | 'approfondissement' | 'integration' | 'evaluation' | 'autre' | null
  curriculum_outcome_ids: string[]
  objectif_apprentissage: string | null
  activite_principale: string | null
  preuve_apprentissage: string | null
  justification: string | null
  statut: 'planifiee' | 'a_preparer' | 'preparee' | 'archivee'
}

export async function shadowWriteCanonicalPedagogicalStructure(
  ctx: CanonicalContext,
): Promise<CanonicalShadowWriteResult> {
  const errors: string[] = []
  const { supabase, programme, programmeAnnuelId } = ctx
  const rows = buildCanonicalRows(ctx)
  const expected = {
    units: rows.units.length,
    sequences: rows.sequences.length,
    lessons: rows.lessons.length,
  }

  if (expected.units === 0 || expected.sequences === 0 || expected.lessons === 0) {
    return {
      ok: false,
      expected,
      actual: { units: 0, sequences: 0, lessons: 0 },
      errors: ['Programme canonique incomplet: unités, séquences et leçons sont requis.'],
    }
  }

  const { error: deleteErr } = await supabase
    .from('pedagogical_units')
    .delete()
    .eq('programme_annuel_id', programmeAnnuelId)

  if (deleteErr) {
    return {
      ok: false,
      expected,
      actual: { units: 0, sequences: 0, lessons: 0 },
      errors: [`Delete précédent échoué: ${deleteErr.message}`],
    }
  }

  const { error: unitErr } = await supabase.from('pedagogical_units').insert(rows.units)
  if (unitErr) errors.push(`Insert unités échoué: ${unitErr.message}`)

  if (!unitErr) {
    const { error: seqErr } = await supabase.from('pedagogical_sequences').insert(rows.sequences)
    if (seqErr) errors.push(`Insert séquences échoué: ${seqErr.message}`)
  }

  if (errors.length === 0) {
    const { error: lessonErr } = await supabase.from('pedagogical_lessons').insert(rows.lessons)
    if (lessonErr) errors.push(`Insert leçons échoué: ${lessonErr.message}`)
  }

  const actual = await countCanonicalRows(supabase, programmeAnnuelId)
  const countMismatch = actual.units !== expected.units
    || actual.sequences !== expected.sequences
    || actual.lessons !== expected.lessons

  if (countMismatch) {
    errors.push(`Compteurs inattendus: attendu ${expected.units}/${expected.sequences}/${expected.lessons}, obtenu ${actual.units}/${actual.sequences}/${actual.lessons}`)
  }

  console.info('[SPIE_CANONICAL_SHADOW_WRITE]', {
    programmeAnnuelId,
    schemaVersion: programme.schema_version ?? 'legacy',
    expected,
    actual,
    ok: errors.length === 0,
  })

  return { ok: errors.length === 0, expected, actual, errors }
}

function buildCanonicalRows(ctx: CanonicalContext): {
  units: UnitRow[]
  sequences: SequenceRow[]
  lessons: LessonRow[]
} {
  const units: UnitRow[] = []
  const sequences: SequenceRow[] = []
  const lessons: LessonRow[] = []
  const seqUnitMap = new Map<string, string>()
  const sourceUnitMap = new Map<string, string>()

  if (ctx.programme.units?.length) {
    for (const unit of ctx.programme.units) {
      const unitDbId = canonicalUuid(ctx.programmeAnnuelId, `unit:${unit.id}`)
      sourceUnitMap.set(unit.id, unitDbId)
      units.push({
        id: unitDbId,
        programme_annuel_id: ctx.programmeAnnuelId,
        teaching_pack_id: ctx.teachingPackId,
        enseignant_id: ctx.enseignantId,
        classe_id: ctx.classeId,
        numero: unit.numero,
        titre: unit.titre,
        domain_code: unit.id,
        curriculum_outcome_ids: unit.outcome_ids ?? [],
        statut: 'planifiee',
      })
      for (const sequenceId of unit.sequence_ids) seqUnitMap.set(sequenceId, unitDbId)
    }
  }

  for (let seqIdx = 0; seqIdx < ctx.programme.unites.length; seqIdx++) {
    const unite = ctx.programme.unites[seqIdx]
    const sequenceSourceId = unite.sequence_id ?? `legacy-seq-${seqIdx + 1}`
    let unitDbId = unite.unit_id ? sourceUnitMap.get(unite.unit_id) : undefined
    unitDbId = unitDbId ?? seqUnitMap.get(sequenceSourceId)

    if (!unitDbId) {
      unitDbId = canonicalUuid(ctx.programmeAnnuelId, `legacy-unit:${sequenceSourceId}`)
      units.push(buildLegacyUnitRow(ctx, unite, seqIdx, unitDbId))
    }

    const sequenceDbId = canonicalUuid(ctx.programmeAnnuelId, `sequence:${sequenceSourceId}`)
    sequences.push(buildSequenceRow(unite, seqIdx, unitDbId, sequenceDbId))

    for (let lessonIdx = 0; lessonIdx < unite.lecons.length; lessonIdx++) {
      lessons.push(buildLessonRow(unite.lecons[lessonIdx], lessonIdx, sequenceDbId, sequenceSourceId, ctx.programmeAnnuelId))
    }
  }

  return { units, sequences, lessons }
}

function buildLegacyUnitRow(
  ctx: CanonicalContext,
  unite: Unite,
  seqIdx: number,
  unitDbId: string,
): UnitRow {
  return {
    id: unitDbId,
    programme_annuel_id: ctx.programmeAnnuelId,
    teaching_pack_id: ctx.teachingPackId,
    enseignant_id: ctx.enseignantId,
    classe_id: ctx.classeId,
    numero: unite.numero ?? seqIdx + 1,
    titre: unite.titre,
    domain_code: unite.unit_id ?? null,
    curriculum_outcome_ids: unite.curriculum_outcome_ids ?? [],
    statut: 'planifiee',
  }
}

function buildSequenceRow(unite: Unite, seqIdx: number, unitDbId: string, sequenceDbId: string): SequenceRow {
  return {
    id: sequenceDbId,
    unit_id: unitDbId,
    numero: unite.numero ?? seqIdx + 1,
    titre: unite.titre,
    theme: unite.theme ?? null,
    semaine_debut: Math.max(1, unite.semaine_debut ?? 1),
    semaine_fin: Math.max(unite.semaine_debut ?? 1, unite.semaine_fin ?? unite.semaine_debut ?? 1),
    curriculum_outcome_ids: unite.curriculum_outcome_ids ?? [],
    grandes_idees: unite.grandes_idees ?? [],
    objectifs: unite.objectifs ?? [],
    concepts_cles: unite.concepts_cles ?? [],
    justification_pedagogique: unite.justification_pedagogique ?? null,
    activite_culminante: unite.activite_culminante ?? null,
    evaluation_prevue: unite.evaluation_prevue ?? null,
    aydte_sequence_id: unite.sequence_id ?? null,
    duree_estimee_heures: estimateSequenceHours(unite),
    statut: 'planifiee',
  }
}

function buildLessonRow(
  lecon: LeconProgramme,
  lessonIdx: number,
  sequenceDbId: string,
  sequenceSourceId: string,
  programmeAnnuelId: string,
): LessonRow {
  return {
    id: canonicalUuid(programmeAnnuelId, `lesson:${sequenceSourceId}:${lecon.numero ?? lessonIdx + 1}:${lessonIdx}`),
    sequence_id: sequenceDbId,
    lecon_id: lecon.lecon_id ?? null,
    numero: lecon.numero ?? lessonIdx + 1,
    titre: lecon.titre,
    sujet: lecon.sujet ?? null,
    duree_minutes: Math.max(1, lecon.duree_minutes ?? 60),
    type: lecon.type ?? 'developpement',
    progression_role: lecon.progression_role ?? null,
    curriculum_outcome_ids: lecon.curriculum_outcome_ids ?? [],
    objectif_apprentissage: lecon.objectif_apprentissage ?? null,
    activite_principale: lecon.activite_principale ?? null,
    preuve_apprentissage: lecon.preuve_apprentissage ?? null,
    justification: lecon.justification ?? null,
    statut: mapLessonStatus(lecon),
  }
}

async function countCanonicalRows(
  supabase: SupabaseClient,
  programmeAnnuelId: string,
): Promise<CanonicalShadowWriteResult['actual']> {
  const { data: unitRows, count: units } = await supabase
    .from('pedagogical_units')
    .select('id', { count: 'exact' })
    .eq('programme_annuel_id', programmeAnnuelId)

  const unitIds = (unitRows ?? []).map(row => row.id as string)
  if (unitIds.length === 0) {
    return { units: units ?? 0, sequences: 0, lessons: 0 }
  }

  const { data: sequenceRows, count: sequences } = await supabase
    .from('pedagogical_sequences')
    .select('id', { count: 'exact' })
    .in('unit_id', unitIds)

  const sequenceIds = (sequenceRows ?? []).map(row => row.id as string)
  if (sequenceIds.length === 0) {
    return { units: units ?? 0, sequences: sequences ?? 0, lessons: 0 }
  }

  const { count: lessons } = await supabase
    .from('pedagogical_lessons')
    .select('id', { count: 'exact', head: true })
    .in('sequence_id', sequenceIds)

  return {
    units: units ?? 0,
    sequences: sequences ?? 0,
    lessons: lessons ?? 0,
  }
}

function estimateSequenceHours(unite: Unite): number | null {
  const minutes = unite.lecons.reduce((sum, lecon) => sum + (lecon.duree_minutes ?? 60), 0)
  return minutes > 0 ? Math.round((minutes / 60) * 10) / 10 : null
}

function mapLessonStatus(lecon: LeconProgramme): LessonRow['statut'] {
  if (lecon.statut === 'archivee') return 'archivee'
  if (lecon.lecon_id || lecon.statut === 'prete' || lecon.statut === 'complete') return 'preparee'
  if (lecon.statut === 'brouillon') return 'a_preparer'
  return 'planifiee'
}

function canonicalUuid(scope: string, value: string): string {
  const hex = createHash('sha1').update(`${scope}:${value}`).digest('hex').slice(0, 32).split('')
  hex[12] = '5'
  const variant = Number.parseInt(hex[16], 16)
  hex[16] = ((variant & 0x3) | 0x8).toString(16)
  return `${hex.slice(0, 8).join('')}-${hex.slice(8, 12).join('')}-${hex.slice(12, 16).join('')}-${hex.slice(16, 20).join('')}-${hex.slice(20, 32).join('')}`
}
