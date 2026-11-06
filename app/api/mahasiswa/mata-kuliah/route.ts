import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { verifyStudentToken, STUDENT_COOKIE } from '@/lib/auth'
import { AcademicApiService } from '@/lib/academic-api'

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
  return prisma.mahasiswa.findUnique({ where: { nim } })
}

export async function GET(req: NextRequest) {
  try {
    const student = await getAuthenticatedStudent(req)
    if (!student) {
      return NextResponse.json({ error: 'Unauthorized: Sesi mahasiswa tidak ditemukan' }, { status: 401 })
    }

    // Ambil periode aktif
    const activePeriode = await prisma.periodePengguguran.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    })

    // Ambil pengajuan aktif mahasiswa pada periode ini
    const activeSubmissions = activePeriode
      ? await prisma.pengajuanPengguguran.findMany({
          where: {
            nim: student.nim,
            periodeId: activePeriode.id,
            status: { in: ['MENUNGGU_VERIFIKASI_PRODI', 'DISETUJUI_PRODI', 'DISETUJUI_AKADEMIK'] },
          },
          select: { kodeMatkul: true, nomorPengajuan: true, status: true },
        })
      : []

    const appliedCourseMap = new Map(activeSubmissions.map((s) => [s.kodeMatkul.toUpperCase(), s]))

    // Panggil Service Integrasi Academic API
    const apiResult = await AcademicApiService.getStudentCourses({
      nim: student.nim,
      prodiCode: student.prodiCode || 'HKUM',
      kurikulum: student.kurikulum || '2024',
    })

    // Tandai status pengajuan aktif pada setiap mata kuliah
    const enrichedData = apiResult.data.map((c) => {
      const existing = appliedCourseMap.get(c.kode_mk.toUpperCase())
      return {
        ...c,
        alreadyApplied: Boolean(existing),
        existingSubmissionNumber: existing?.nomorPengajuan,
        existingSubmissionStatus: existing?.status,
      }
    })

    return NextResponse.json({
      success: true,
      source: apiResult.source,
      apiConfigured: apiResult.apiConfigured,
      message: apiResult.message,
      timestamp: apiResult.timestamp,
      data: enrichedData,
    })
  } catch (error) {
    console.error('Error in student mata-kuliah endpoint:', error)
    return NextResponse.json({ error: 'Gagal memuat daftar mata kuliah' }, { status: 500 })
  }
}

