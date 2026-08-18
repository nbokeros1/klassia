import { NextRequest, NextResponse } from 'next/server'
import { extraireTexte, FormatNonSupporte } from '@/lib/documents/extraire-texte'

// Minimum meaningful curriculum text — prevents accepting empty or near-empty documents
const MIN_CURRICULUM_CHARS = 100

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier reçu.' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const result = await extraireTexte(buffer, file.type, file.name)

    if (result.texte.length < MIN_CURRICULUM_CHARS) {
      return NextResponse.json({
        error:   'CURRICULUM_EXTRACTION_TOO_SHORT',
        message: 'Le document est trop court pour servir de curriculum. Vérifiez le contenu du fichier et réessayez.',
      }, { status: 422 })
    }

    return NextResponse.json({
      texte:    result.texte,
      nom:      file.name,
      nb_pages: result.nb_pages,
    })
  } catch (err: unknown) {
    if (err instanceof FormatNonSupporte) {
      return NextResponse.json({
        error:   'FORMAT_NON_SUPPORTE',
        message: 'Ce format de fichier n\'est pas pris en charge. Utilisez PDF, Word (.docx), ou texte (.txt, .md).',
      }, { status: 415 })
    }
    const detail = err instanceof Error ? err.message : String(err)
    return NextResponse.json({
      error:   'CURRICULUM_EXTRACTION_FAILED',
      message: `ScorgIA n'a pas pu lire ce document de curriculum. ${detail}`,
    }, { status: 500 })
  }
}
