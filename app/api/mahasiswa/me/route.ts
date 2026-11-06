import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { verifyStudentToken, STUDENT_COOKIE } from '@/lib/auth'
import { evaluatePeriodTimeline } from '@/lib/pengguguran-utils'

async function getAuthenticatedStudent(req: Request) {
  let nim = req.headers.get('x-student-nim')
  if (!nim) {
    try {
      const cookieStore = cookies()
      const token = cookieStore.get(STUDENT_COOKIE)?.value
      if (token) {
        const session = await verifyStudentToken(token)
        if (session) nim = session.nim
      }
    } catch {
      nim = null
    }
  }
  if (!nim) return null
  return prisma.mahasiswa.findUnique({
    where: { nim },
  })
}

export async function GET(req: NextRequest) {
  try {
    const student = await getAuthenticatedStudent(req)
    if (!student) {
      return NextResponse.json({ error: 'Unauthorized: Sesi mahasiswa tidak ditemukan' }, { status: 401 })
    }

    const [activePeriode, submissionStats] = await Promise.all([
      prisma.periodePengguguran.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.pengajuanPengguguran.groupBy({
        by: ['status'],
        where: { nim: student.nim },
        _count: { _all: true },
      }),
    ])

    const stats = {
      total: 0,
      menungguProdi: 0,
      disetujuiProdi: 0,
      disetujuiAkademik: 0,
      ditolak: 0,
    }

    for (const s of submissionStats) {
      stats.total += s._count._all
      if (s.status === 'MENUNGGU_VERIFIKASI_PRODI') stats.menungguProdi += s._count._all
      if (s.status === 'DISETUJUI_PRODI') stats.disetujuiProdi += s._count._all
      if (s.status === 'DISETUJUI_AKADEMIK') stats.disetujuiAkademik += s._count._all
      if (s.status === 'DITOLAK_PRODI' || s.status === 'DITOLAK_AKADEMIK') stats.ditolak += s._count._all
    }

    return NextResponse.json({
      success: true,
      student: {
        nim: student.nim,
        name: student.name,
        prodi: student.prodi,
        prodiCode: student.prodiCode || 'HKUM',
        semester: student.semester,
        status: student.status,
        ipk: student.ipk,
        kurikulum: student.kurikulum || '2024',
        email: student.email,
        phone: student.phone,
        lastLoginAt: student.lastLoginAt,
      },
      stats,
      activePeriode: activePeriode
        ? {
            ...activePeriode,
            timeline: evaluatePeriodTimeline(activePeriode),
          }
        : null,
    })
  } catch (error) {
    console.error('Error fetching student profile:', error)
    return NextResponse.json({ error: 'Gagal memuat profil mahasiswa' }, { status: 500 })
  }
}

