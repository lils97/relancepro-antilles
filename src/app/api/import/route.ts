import { NextRequest, NextResponse } from 'next/server'

// POST /api/import — Import de fichier Excel/CSV
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 })
    }

    // Vérifier le type de fichier
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
    ]
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/i)) {
      return NextResponse.json(
        { error: 'Format non supporté. Utilisez .xlsx, .xls ou .csv' },
        { status: 400 }
      )
    }

    const { parseExcelFile, parseCsvFile } = await import('@/lib/excel-import')

    const result = file.name.endsWith('.csv')
      ? await parseCsvFile(file)
      : await parseExcelFile(file)

    // TODO: Insérer en base de données
    // const { prisma } = await import('@/lib/prisma')
    // const importBatch = await prisma.importBatch.create({
    //   data: {
    //     filename: file.name,
    //     totalRows: result.totalRows,
    //     columnMapping: result.columnMapping,
    //   }
    // })
    //
    // for (const p of result.prospects) {
    //   if (!p.lastName || (!p.phone && !p.email)) continue
    //   await prisma.prospect.upsert({
    //     where: { phone: p.phone ?? '' },
    //     create: { ...p, importBatchId: importBatch.id },
    //     update: {},
    //   })
    // }

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json({ error: 'Erreur lors de l\'import' }, { status: 500 })
  }
}
