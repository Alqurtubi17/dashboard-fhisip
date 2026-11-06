import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { evaluatePeriodTimeline } from '@/lib/pengguguran-utils'

export async function GET() {
  try {
    const activePeriode = await prisma.periodePengguguran.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    })

    if (!activePeriode) {
      return NextResponse.json({ success: false, message: 'Tidak ada periode aktif.' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: {
        ...activePeriode,
        timeline: evaluatePeriodTimeline(activePeriode),
      },
    })
  } catch (error) {
    return NextResponse.json({ error: 'Gagal memuat periode' }, { status: 500 })
  }
}

