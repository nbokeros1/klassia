// ── Mission Engine — Détecteur : Prochaine leçon ───────────────────────────
//
// 4 cas métier (ordre de priorité décroissant) :
//   1. Pas de classe ou de matière           → []
//   2. Classe + matière, pas de programme    → unfinished_document / create_annual_plan (p=100)
//   3. Programme + aucune leçon existante    → next_lesson / prepare_first_lesson (p=95)
//   4. Programme + leçons existantes         → next_lesson / prepare_next_lesson (p=90)
//
// ME-08 : reçoit TeacherSituation (via TeacherBrain) au lieu de MissionDataContext.
// Règle confiance : confidence < 0.40 → pas de sujet précis.

import type { Mission, MissionEvidence } from '../types'
import type { TeacherSituation } from '../../teacher-brain/types'
import { CONFIDENCE_THRESHOLD_SUGGEST } from '../../teacher-brain/teacher-brain'

// ── Utilitaires ─────────────────────────────────────────────────────────────

const RE_DIACRITICS = new RegExp('[\\u0300-\\u036f]', 'g')

function normaliser(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(RE_DIACRITICS, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function buildMissionId(
  type:         string,
  enseignantId: string,
  classeId:     string,
  matiere:      string,
): string {
  const matiereNorm = normaliser(matiere).replace(/ /g, '_')
  return `${type}:${enseignantId}:${classeId}:${matiereNorm}`
}

// ── Extraction de sujet (déterministe, sans IA) ──────────────────────────────
// Exportée pour usage par ProgressBuilder et les tests.

export function extractSuggestedTopic(
  programmeAnnuel: { texteExtrait: string | null } | null,
  dernieresLecons: { nom: string }[],
): string | null {
  if (!programmeAnnuel?.texteExtrait) return null

  const texte    = programmeAnnuel.texteExtrait
  const lignes   = texte.split('\n').map(l => l.trim()).filter(Boolean)
  const couverts = new Set(dernieresLecons.map(l => normaliser(l.nom)))

  for (const ligne of lignes) {
    if (/^[=\-_]{3,}$/.test(ligne))           continue
    if (/^\d{1,2}[\/\-]\d{1,2}/.test(ligne))  continue
    if (/^https?:\/\//.test(ligne))            continue

    const sujet = ligne.replace(/^[\d.)\-*•–—>\s]+/, '').trim()
    if (sujet.length < 3 || sujet.length > 120) continue

    if (!couverts.has(normaliser(sujet))) {
      return sujet
    }
  }

  return null
}

// ── Détecteur ────────────────────────────────────────────────────────────────

export async function detectNextLesson(situation: TeacherSituation): Promise<Mission[]> {
  const { classe, matiere, enseignant, confidence, today } = situation
  const { progress } = situation

  // Cas 1 : contexte insuffisant
  if (!classe || !matiere) return []

  const enseignantId = enseignant?.id ?? classe.id
  const classeId     = classe.id

  // Appliquer la règle de confiance : pas de sujet précis si confidence trop faible
  const canSuggestTopic = confidence >= CONFIDENCE_THRESHOLD_SUGGEST
  const suggestedTopic  = canSuggestTopic ? progress.suggestedTopic : null

  // Cas 2 : pas de programme annuel
  if (!progress.hasProgramme) {
    const id = buildMissionId('unfinished_document', enseignantId, classeId, matiere)

    const evidence: MissionEvidence[] = [
      { source: 'programme_annuel', label: 'Aucun programme annuel trouvé pour cette matière' },
    ]

    const mission: Mission = {
      id,
      type:        'unfinished_document',
      title:       `Créer le programme annuel — ${matiere}`,
      description: `Aucun programme annuel n'existe pour ${matiere} dans ${classe.nom}. Créez-le pour débloquer la planification des leçons.`,
      priority:    100,
      status:      'proposed',
      reason: {
        code:        'no_programme_annuel',
        label:       'Programme annuel manquant',
        description: `Aucun programme annuel n'a été trouvé pour ${matiere}. ScorgIA ne peut pas planifier les prochaines leçons sans cette base.`,
      },
      createdAt: today,
      metadata: { action: 'create_annual_plan', matiere, classe_id: classeId },
      evidence,
    }

    return [mission]
  }

  const id = buildMissionId('next_lesson', enseignantId, classeId, matiere)

  // Cas 3 : programme présent, aucune leçon
  if (situation.classroom.lessonsCount === 0) {
    const evidence: MissionEvidence[] = [
      {
        source:     'programme_annuel',
        documentId: progress.programmeAnnuelId ?? undefined,
        label:      'Programme annuel disponible',
        valeur:     suggestedTopic ?? undefined,
      },
    ]

    const mission: Mission = {
      id,
      type:  'next_lesson',
      title: suggestedTopic
        ? `Préparer : ${suggestedTopic}`
        : `Préparer la première leçon — ${matiere}`,
      description: suggestedTopic
        ? `Le programme annuel suggère de commencer par « ${suggestedTopic} » pour ${classe.nom}.`
        : `Le programme annuel est prêt. Il est temps de préparer la première leçon de ${matiere}.`,
      priority: 95,
      status:   'proposed',
      reason: {
        code:        'first_lesson',
        label:       'Première leçon à préparer',
        description: `Aucune leçon n'a encore été créée pour ${matiere}. ScorgIA suggère de commencer la planification.`,
      },
      createdAt: today,
      metadata: {
        action:          'prepare_first_lesson',
        matiere,
        classe_id:       classeId,
        suggested_topic: suggestedTopic,
      },
      evidence,
    }

    return [mission]
  }

  // Cas 4 : leçons existantes → suggérer la prochaine
  const evidence: MissionEvidence[] = [
    {
      source:     'programme_annuel',
      documentId: progress.programmeAnnuelId ?? undefined,
      label:      'Programme annuel disponible',
      valeur:     suggestedTopic ?? undefined,
    },
    {
      source:     'derniere_lecon',
      documentId: progress.derniereLeconId ?? undefined,
      label:      `Dernière leçon : ${progress.derniereLeconNom ?? '—'}`,
    },
  ]

  const mission: Mission = {
    id,
    type:  'next_lesson',
    title: suggestedTopic
      ? `Préparer : ${suggestedTopic}`
      : `Préparer la prochaine leçon — ${matiere}`,
    description: suggestedTopic
      ? `Suite à « ${progress.derniereLeconNom} », le programme suggère « ${suggestedTopic} » pour ${classe.nom}.`
      : `Après « ${progress.derniereLeconNom} », il est temps de planifier la prochaine leçon de ${matiere}.`,
    priority: 90,
    status:   'proposed',
    reason: {
      code:        'next_lesson_due',
      label:       'Prochaine leçon à planifier',
      description: `${situation.classroom.lessonsCount} leçon(s) créée(s) pour ${matiere}. La prochaine est à planifier.`,
    },
    createdAt: today,
    metadata: {
      action:             'prepare_next_lesson',
      matiere,
      classe_id:          classeId,
      derniere_lecon_id:  progress.derniereLeconId,
      derniere_lecon_nom: progress.derniereLeconNom,
      suggested_topic:    suggestedTopic,
    },
    evidence,
  }

  return [mission]
}
