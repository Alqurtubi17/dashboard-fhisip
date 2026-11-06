import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { verifyAccessToken, ACCESS_COOKIE } from '@/lib/auth'
import { createAuditLog } from '@/lib/audit'
import { evaluatePeriodTimeline, getProdiNameByCode } from '@/lib/pengguguran-utils'

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
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(5, parseInt(searchParams.get('limit') || '10', 10)))
    const search = searchParams.get('search')?.trim() || ''
    const prodi = searchParams.get('prodi')?.trim() || ''
    const status = searchParams.get('status')?.trim() || ''
    const periodeId = searchParams.get('periodeId')?.trim() || ''

    // Role-based scoping
    const isSuperAdmin = user.role.slug === 'superadmin'
    const isAkademik = user.role.slug === 'akademik'
    const isKaprodi = user.role.slug === 'kaprodi'

    const where: any = {}

    // If Kaprodi is tied to a specific prodiCode and no specific filter passed, default to their prodi
    if (isKaprodi && user.prodiCode) {
      where.prodiCode = user.prodiCode
    } else if (prodi && prodi !== 'ALL') {
      where.prodiCode = prodi
    }

    // Regular users (e.g., student/pengaju) only see their own submissions
    if (!isSuperAdmin && !isAkademik && !isKaprodi) {
      where.pengajuId = user.id
    }

    if (status && status !== 'ALL') {
      where.status = status
    }

    if (periodeId && periodeId !== 'ALL') {
      where.periodeId = periodeId
    }

    if (search) {
      where.OR = [
        { nomorPengajuan: { contains: search, mode: 'insensitive' } },
        { nim: { contains: search, mode: 'insensitive' } },
        { namaMahasiswa: { contains: search, mode: 'insensitive' } },
        { kodeMatkul: { contains: search, mode: 'insensitive' } },
        { namaMatkul: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [total, items, statsRaw, activePeriode] = await Promise.all([
      prisma.pengajuanPengguguran.count({ where }),
      prisma.pengajuanPengguguran.findMany({
        where,
        include: {
          periode: { select: { id: true, semester: true, tahunAkademik: true, nama: true } },
          mataKuliah: { select: { id: true, kodeMatkul: true, namaMatkul: true, sks: true, kategori: true } },
          pengaju: { select: { id: true, name: true, email: true } },
          verifikatorProdi: { select: { id: true, name: true, email: true } },
          keputusanAkademikUser: { select: { id: true, name: true, email: true } },
          riwayat: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      // Stats count grouped by status under same scoping (without status filter)
      prisma.pengajuanPengguguran.groupBy({
        by: ['status'],
        where: {
          ...(isKaprodi && user.prodiCode ? { prodiCode: user.prodiCode } : {}),
          ...(!isSuperAdmin && !isAkademik && !isKaprodi ? { pengajuId: user.id } : {}),
          ...(periodeId && periodeId !== 'ALL' ? { periodeId } : {}),
        },
        _count: { _all: true },
      }),
      prisma.periodePengguguran.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
      }),
    ])

    const statsMap: Record<string, number> = {
      TOTAL: 0,
      MENUNGGU_VERIFIKASI_PRODI: 0,
      DISETUJUI_PRODI: 0,
      DISETUJUI_AKADEMIK: 0,
      DITOLAK_PRODI: 0,
      DITOLAK_AKADEMIK: 0,
    }

    for (const s of statsRaw) {
      statsMap[s.status] = s._count._all
      statsMap.TOTAL += s._count._all
    }

    const summary = {
      total: statsMap.TOTAL,
      menungguProdi: statsMap.MENUNGGU_VERIFIKASI_PRODI,
      disetujuiProdi: statsMap.DISETUJUI_PRODI,
      disetujuiAkademik: statsMap.DISETUJUI_AKADEMIK,
      ditolak: statsMap.DITOLAK_PRODI + statsMap.DITOLAK_AKADEMIK,
    }

    const activeTimeline = activePeriode ? evaluatePeriodTimeline(activePeriode) : null

    return NextResponse.json({
      success: true,
      data: items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      summary,
      activePeriode: activePeriode
        ? {
            ...activePeriode,
            timeline: activeTimeline,
          }
        : null,
      currentUserRole: user.role.slug,
      userProdiCode: user.prodiCode,
    })
  } catch (error) {
    console.error('Error fetching pengajuan pengguguran:', error)
    return NextResponse.json({ error: 'Gagal memuat data pengajuan pengguguran mata kuliah' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: Harap login terlebih dahulu' }, { status: 401 })
    }

    const body = await req.json().catch(() => null)
    if (!body) {
      return NextResponse.json({ error: 'Body permintaan tidak valid' }, { status: 400 })
    }

    const { nim, namaMahasiswa, prodiCode, mataKuliahId, alasan, periodeId } = body

    if (!nim || !namaMahasiswa || !prodiCode || !mataKuliahId || !alasan) {
      return NextResponse.json(
        { error: 'Semua kolom wajib diisi (NIM, Nama Mahasiswa, Program Studi, Mata Kuliah, dan Alasan)' },
        { status: 400 }
      )
    }

    if (alasan.trim().length < 10) {
      return NextResponse.json({ error: 'Alasan pengguguran minimal 10 karakter' }, { status: 400 })
    }

    // 1. Validasi Periode
    const periode = periodeId
      ? await prisma.periodePengguguran.findUnique({ where: { id: periodeId } })
      : await prisma.periodePengguguran.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'desc' } })

    if (!periode || !periode.isActive) {
      return NextResponse.json(
        { error: 'Periode pengajuan pengguguran mata kuliah tidak ditemukan atau sudah dinonaktifkan.' },
        { status: 400 }
      )
    }

    const timeline = evaluatePeriodTimeline(periode)
    if (!timeline.isPengajuanOpen) {
      return NextResponse.json(
        {
          error:
            'Periode pengajuan pengguguran mata kuliah saat ini tidak aktif atau sudah ditutup. Pengajuan hanya dapat dilakukan sesuai jadwal.',
        },
        { status: 400 }
      )
    }

    // 2. Validasi Mata Kuliah
    const mataKuliah = await prisma.mataKuliah.findUnique({
      where: { id: mataKuliahId },
    })

    if (!mataKuliah || !mataKuliah.isActive) {
      return NextResponse.json({ error: 'Mata kuliah yang dipilih tidak ditemukan atau tidak aktif.' }, { status: 400 })
    }

    // 3. Validasi Utama: Kategori INTI vs NON_INTI
    if (mataKuliah.kategori === 'INTI') {
      return NextResponse.json(
        {
          error: 'Mata kuliah ini termasuk kategori Mata Kuliah Inti dan tidak dapat diajukan untuk pengguguran.',
        },
        { status: 400 }
      )
    }

    // 4. Pencegahan Pengajuan Ganda
    const existingActive = await prisma.pengajuanPengguguran.findFirst({
      where: {
        nim: nim.trim(),
        mataKuliahId: mataKuliah.id,
        periodeId: periode.id,
        status: {
          in: ['MENUNGGU_VERIFIKASI_PRODI', 'DISETUJUI_PRODI', 'DISETUJUI_AKADEMIK'],
        },
      },
    })

    if (existingActive) {
      return NextResponse.json(
        {
          error: `Mahasiswa dengan NIM ${nim} sudah memiliki pengajuan aktif untuk mata kuliah ${mataKuliah.kodeMatkul} pada periode ${periode.semester}. Tidak dapat mengajukan ulang sebelum pengajuan sebelumnya ditolak.`,
        },
        { status: 400 }
      )
    }

    // 5. Generate Nomor Pengajuan Unik
    const countToday = await prisma.pengajuanPengguguran.count({
      where: { periodeId: periode.id },
    })
    const serial = String(countToday + 1).padStart(4, '0')
    const nomorPengajuan = `PG-${periode.semester}-${serial}`

    const prodiName = getProdiNameByCode(prodiCode)

    // 6. Transaksi Database
    const newPengajuan = await prisma.$transaction(async (tx) => {
      const created = await tx.pengajuanPengguguran.create({
        data: {
          nomorPengajuan,
          periodeId: periode.id,
          pengajuId: user.id,
          nim: nim.trim(),
          namaMahasiswa: namaMahasiswa.trim(),
          prodiCode: prodiCode.trim().toUpperCase(),
          prodiName,
          mataKuliahId: mataKuliah.id,
          kodeMatkul: mataKuliah.kodeMatkul,
          namaMatkul: mataKuliah.namaMatkul,
          sks: mataKuliah.sks,
          kategoriMatkul: mataKuliah.kategori,
          alasan: alasan.trim(),
          status: 'MENUNGGU_VERIFIKASI_PRODI',
        },
      })

      // Catat ke riwayat
      await tx.riwayatPengguguran.create({
        data: {
          pengajuanId: created.id,
          statusAwal: null,
          statusAkhir: 'MENUNGGU_VERIFIKASI_PRODI',
          actorId: user.id,
          actorName: user.name,
          actorRole: user.role.name,
          catatan: 'Pengajuan pengguguran diajukan ke Program Studi.',
          action: 'SUBMIT',
        },
      })

      return created
    })

    await createAuditLog(
      `Membuat Pengajuan Pengguguran MK: ${nomorPengajuan} (${mataKuliah.kodeMatkul} - ${nim})`,
      req
    )

    return NextResponse.json(
      {
        success: true,
        message: 'Pengajuan pengguguran mata kuliah berhasil dikirim ke Program Studi.',
        data: newPengajuan,
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Error creating pengajuan pengguguran:', error)
    return NextResponse.json(
      { error: error?.message || 'Terjadi kesalahan server saat memproses pengajuan' },
      { status: 500 }
    )
  }
}

