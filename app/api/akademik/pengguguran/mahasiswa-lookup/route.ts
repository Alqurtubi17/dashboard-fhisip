import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { verifyAccessToken, ACCESS_COOKIE } from '@/lib/auth'
import { resolveProdiInfo } from '@/lib/prodi-codes'
import { AcademicApiService } from '@/lib/academic-api'

async function getCurrentUser(req: Request) {
  let userId = req.headers.get('x-user-id')
  if (!userId) {
    try {
      const cookieStore = cookies()
      const token = cookieStore.get(ACCESS_COOKIE)?.value
      if (token) {
        const session = await verifyAccessToken(token)
        if (session) userId = session.sub
      }
    } catch {
      userId = null
    }
  }
  if (!userId) return null
  return prisma.user.findUnique({
    where: { id: userId },
    include: { role: true },
  })
}

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const nim = searchParams.get('nim')?.trim()

    if (!nim) {
      return NextResponse.json({ error: 'Parameter NIM wajib disertakan' }, { status: 400 })
    }

    // Cari data mahasiswa di DB
    const student = await prisma.mahasiswa.findFirst({
      where: {
        OR: [
          { nim: { equals: nim, mode: 'insensitive' } },
          { nim: { startsWith: nim, mode: 'insensitive' } },
        ],
      },
      select: {
        nim: true,
        name: true,
        prodi: true,
        prodiCode: true,
        semester: true,
        status: true,
        kurikulum: true,
      },
    })

    if (!student) {
      return NextResponse.json(
        { success: false, message: `Data mahasiswa dengan NIM ${nim} tidak ditemukan dalam pangkalan data akademik.` },
        { status: 404 }
      )
    }

    // Resolusi Program Studi resmi
    const prodiInfo = resolveProdiInfo(student.prodiCode || student.prodi)
    const officialProdiCode = prodiInfo?.officialCode || 'FSAP'
    const officialProdiName = prodiInfo?.name || student.prodi

    // Cari periode pengguguran aktif
    const activePeriode = await prisma.periodePengguguran.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    })

    // Pengajuan aktif yang sudah diajukan oleh mahasiswa ini
    const activeSubmissions = activePeriode
      ? await prisma.pengajuanPengguguran.findMany({
          where: {
            nim: student.nim,
            periodeId: activePeriode.id,
            status: { in: ['MENUNGGU_VERIFIKASI_PRODI', 'DISETUJUI_PRODI', 'DISETUJUI_AKADEMIK'] },
          },
          select: { mataKuliahId: true, kodeMatkul: true, nomorPengajuan: true, status: true },
        })
      : []

    // Ambil daftar mata kuliah langsung dari API LKAM cetak-transkrip-sementara [UO_Z4X_MS_ZDE]
    const courseApiResult = await AcademicApiService.getStudentCourses({
      nim: student.nim,
      prodiCode: officialProdiCode,
      kurikulum: student.kurikulum || '2024',
    })

    const appliedSet = new Set(activeSubmissions.map((s) => s.kodeMatkul.toUpperCase()))

    // Format data mata kuliah sesuai transkrip mahasiswa
    const eligibleCourses = courseApiResult.data.map((c) => ({
      id: c.id || `mk-${c.primary_kode || c.kode_mk}`,
      kodeMatkul: c.kode_mk,
      primaryKode: c.primary_kode || c.kode_mk,
      namaMatkul: c.nama_mk,
      sks: c.sks,
      prodiCode: officialProdiCode,
      prodiName: officialProdiName,
      kategori: c.kategori_mk,
      canDrop: c.canDrop,
      grade: c.grade || '-',
      masa: c.masa || '-',
      kelompok: c.kelompok,
      alreadyApplied:
        appliedSet.has(c.kode_mk.toUpperCase()) ||
        appliedSet.has((c.primary_kode || '').toUpperCase()),
    }))

    return NextResponse.json({
      success: true,
      student: {
        nim: student.nim,
        name: student.name,
        prodi: student.prodi,
        prodiCode: student.prodiCode,
        officialProdiCode,
        prodiName: officialProdiName,
        semester: student.semester,
        status: student.status,
      },
      courses: eligibleCourses,
      activeSubmissions,
    })
  } catch (error) {
    console.error('Error in mahasiswa-lookup:', error)
    return NextResponse.json({ error: 'Gagal mencari data mahasiswa' }, { status: 500 })
  }
}

