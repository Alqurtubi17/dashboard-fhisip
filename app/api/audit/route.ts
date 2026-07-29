import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const logs = await prisma.auditLog.findMany({
    take: 100,
    orderBy: { createdAt: 'desc' },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: { select: { name: true } },
        },
      },
    },
  })
  return NextResponse.json(logs)
}

export async function DELETE() {
  try {
    await prisma.auditLog.deleteMany({})
    return NextResponse.json({ success: true, message: 'Semua catatan audit log berhasil di-reset' })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Gagal mereset audit log' }, { status: 500 })
  }
}

