import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { verifyAccessToken, ACCESS_COOKIE } from '@/lib/auth'
import { createAuditLog } from '@/lib/audit'
import { evaluatePeriodTimeline, getProdiNameByCode } from '@/lib/pengguguran-utils'
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
      const pInfo = resolveProdiInfo(prodi)
      if (pInfo) {
        where.prodiCode = { in: [pInfo.officialCode, pInfo.legacyCode, ...pInfo.srsCodes] }
      } else {
        where.prodiCode = prodi
      }
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

    const { nim, namaMahasiswa, prodiCode, mataKuliahId, mataKuliahIds, alasan, periodeId } = body

    const courseIds: string[] = Array.isArray(mataKuliahIds) && mataKuliahIds.length > 0
      ? mataKuliahIds.map(String)
      : mataKuliahId ? [String(mataKuliahId)] : []

    if (!nim || !namaMahasiswa || !prodiCode || courseIds.length === 0 || !alasan) {
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

    // 2. Validasi Mata Kuliah yang Dipilih
    const targetCourses = await prisma.mataKuliah.findMany({
      where: { id: { in: courseIds } },
    })

    if (targetCourses.length !== courseIds.length) {
      return NextResponse.json(
        { error: 'Satu atau lebih mata kuliah yang dipilih tidak ditemukan dalam sistem.' },
        { status: 400 }
      )
    }

    // Validasi setiap mata kuliah (kategori NON_INTI)
    for (const mk of targetCourses) {
      if (!mk.isActive) {
        return NextResponse.json({ error: `Mata kuliah ${mk.kodeMatkul} sedang tidak aktif.` }, { status: 400 })
      }
      if (mk.kategori === 'INTI') {
        return NextResponse.json(
          {
            error: `Mata kuliah ${mk.kodeMatkul} - ${mk.namaMatkul} termasuk kategori Mata Kuliah Inti dan tidak dapat digugurkan.`,
          },
          { status: 400 }
        )
      }
    }

    // 3. Pencegahan Pengajuan Ganda
    const existingActive = await prisma.pengajuanPengguguran.findMany({
      where: {
        nim: nim.trim(),
        mataKuliahId: { in: courseIds },
        periodeId: periode.id,
        status: {
          in: ['MENUNGGU_VERIFIKASI_PRODI', 'DISETUJUI_PRODI', 'DISETUJUI_AKADEMIK'],
        },
      },
      select: { kodeMatkul: true, namaMatkul: true },
    })

    if (existingActive.length > 0) {
      const dupList = existingActive.map((e) => e.kodeMatkul).join(', ')
      return NextResponse.json(
        {
          error: `Mahasiswa dengan NIM ${nim} sudah memiliki pengajuan aktif untuk mata kuliah: ${dupList} pada periode ini.`,
        },
        { status: 400 }
      )
    }

    // 4. Hitung urutan nomor pengajuan
    const countToday = await prisma.pengajuanPengguguran.count({
      where: { periodeId: periode.id },
    })

    const prodiName = getProdiNameByCode(prodiCode)

    // 5. Transaksi Database Batch
    const createdList = await prisma.$transaction(async (tx) => {
      const results = []
      for (let i = 0; i < targetCourses.length; i++) {
        const mk = targetCourses[i]
        const serial = String(countToday + 1 + i).padStart(4, '0')
        const nomorPengajuan = `PG-${periode.semester}-${serial}`

        const created = await tx.pengajuanPengguguran.create({
          data: {
            nomorPengajuan,
            periodeId: periode.id,
            pengajuId: user.id,
            nim: nim.trim(),
            namaMahasiswa: namaMahasiswa.trim(),
            prodiCode: prodiCode.trim().toUpperCase(),
            prodiName,
            mataKuliahId: mk.id,
            kodeMatkul: mk.kodeMatkul,
            namaMatkul: mk.namaMatkul,
            sks: mk.sks,
            kategoriMatkul: mk.kategori,
            alasan: alasan.trim(),
            status: 'MENUNGGU_VERIFIKASI_PRODI',
          },
        })

        await tx.riwayatPengguguran.create({
          data: {
            pengajuanId: created.id,
            statusAwal: null,
            statusAkhir: 'MENUNGGU_VERIFIKASI_PRODI',
            actorId: user.id,
            actorName: user.name,
            actorRole: user.role.name,
            catatan: `Pengajuan pengguguran diajukan ke Program Studi untuk mata kuliah ${mk.kodeMatkul}.`,
            action: 'SUBMIT',
          },
        })

        results.push(created)
      }
      return results
    })

    const courseCodes = targetCourses.map((m) => m.kodeMatkul).join(', ')
    await createAuditLog(
      `Membuat Pengajuan Pengguguran MK (${createdList.length} MK: ${courseCodes} - NIM ${nim})`,
      req
    )

    return NextResponse.json(
      {
        success: true,
        message: `${createdList.length} pengajuan pengguguran mata kuliah berhasil dikirim ke Program Studi.`,
        data: createdList.length === 1 ? createdList[0] : createdList,
        count: createdList.length,
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

