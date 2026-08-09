import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import path from 'path'
import os from 'os'

const execAsync = promisify(exec)

export const maxDuration = 120

export async function POST(req: NextRequest) {
  const { error } = await requireAuth()
  if (error) return error

  const body = await req.json()

  // ── Générer le DOCX via la route interne ─────────────────────────────────
  const docxResponse = await fetch(
    new URL('/api/export/docx', req.url),
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': req.headers.get('cookie') ?? '',
      },
      body: JSON.stringify(body),
    }
  )

  if (!docxResponse.ok) {
    return NextResponse.json({ error: 'Erreur génération DOCX' }, { status: 500 })
  }

  const docxBuffer = await docxResponse.arrayBuffer()
  const tmpDir     = os.tmpdir()
  const tmpDocx    = path.join(tmpDir, `scorgia_${Date.now()}.docx`)
  const tmpPdf     = tmpDocx.replace('.docx', '.pdf')

  fs.writeFileSync(tmpDocx, Buffer.from(docxBuffer))

  try {
    await execAsync(
      `soffice --headless --convert-to pdf --outdir "${tmpDir}" "${tmpDocx}"`
    )

    const pdfBuffer = fs.readFileSync(tmpPdf)

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type':        'application/pdf',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(body.titre ?? 'scorgia')}.pdf"`,
      },
    })
  } finally {
    if (fs.existsSync(tmpDocx)) fs.unlinkSync(tmpDocx)
    if (fs.existsSync(tmpPdf))  fs.unlinkSync(tmpPdf)
  }
}
