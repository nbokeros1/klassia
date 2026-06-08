import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'Aucun fichier' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())
    const mammoth = await import('mammoth')
    const result = await mammoth.convertToHtml({ buffer })

    return NextResponse.json({ html: result.value, messages: result.messages })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
