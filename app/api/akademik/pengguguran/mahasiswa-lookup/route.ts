import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { verifyAccessToken, ACCESS_COOKIE } from '@/lib/auth'
import { resolveProdiInfo } from '@/lib/prodi-codes'

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

    // Ambil daftar mata kuliah NON-INTI resmi yang berawalan FS untuk prodi ini
    const prodiFilterList = prodiInfo
      ? [prodiInfo.officialCode, prodiInfo.legacyCode, ...prodiInfo.srsCodes]
      : []

    const eligibleCourses = await prisma.mataKuliah.findMany({
      where: {
        isActive: true,
        kategori: 'NON_INTI',
        kodeMatkul: { startsWith: 'FS', mode: 'insensitive' },
        ...(prodiInfo
          ? {
              OR: [
                { prodiCode: { in: prodiFilterList } },
                { kodeMatkul: { startsWith: prodiInfo.officialCode, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { kodeMatkul: 'asc' },
      take: 150,
    })

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

