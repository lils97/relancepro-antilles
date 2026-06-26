import { NextRequest, NextResponse } from 'next/server'
// import { prisma } from '@/lib/prisma' // Décommenter quand la DB est configurée

// GET /api/prospects
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    const category = searchParams.get('category') || ''
    const score = searchParams.get('score') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    // TODO: Décommenter pour connexion DB réelle
    // const where: any = {}
    // if (search) {
    //   where.OR = [
    //     { lastName: { contains: search, mode: 'insensitive' } },
    //     { firstName: { contains: search, mode: 'insensitive' } },
    //     { phone: { contains: search } },
    //     { email: { contains: search, mode: 'insensitive' } },
    //     { city: { contains: search, mode: 'insensitive' } },
    //   ]
    // }
    // if (status) where.status = status
    // if (category) where.category = category
    // if (score) where.aiScoreLabel = score
    //
    // const [prospects, total] = await Promise.all([
    //   prisma.prospect.findMany({
    //     where,
    //     include: { _count: { select: { activities: true, messages: true } } },
    //     orderBy: { aiScore: 'desc' },
    //     skip: (page - 1) * limit,
    //     take: limit,
    //   }),
    //   prisma.prospect.count({ where }),
    // ])

    // Mock response pour développement
    const { MOCK_PROSPECTS } = await import('@/lib/mock-data')
    return NextResponse.json({
      data: MOCK_PROSPECTS,
      total: MOCK_PROSPECTS.length,
      page,
      limit,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST /api/prospects
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validation basique
    if (!body.lastName) {
      return NextResponse.json({ error: 'Le nom est obligatoire' }, { status: 400 })
    }

    // TODO: Décommenter pour DB réelle
    // const prospect = await prisma.prospect.create({
    //   data: {
    //     ...body,
    //     aiScore: 0,
    //     aiScoreLabel: 'LOW',
    //     createdAt: new Date(),
    //   }
    // })

    // Mock
    const prospect = { id: Date.now().toString(), ...body, createdAt: new Date().toISOString() }
    return NextResponse.json({ data: prospect }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
