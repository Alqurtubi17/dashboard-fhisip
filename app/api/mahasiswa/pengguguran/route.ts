import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { verifyStudentToken, STUDENT_COOKIE } from '@/lib/auth'
import { createAuditLog } from '@/lib/audit'
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
  return prisma.mahasiswa.findUnique({ where: { nim } })
}

export async function GET(req: NextRequest) {
  try {
    const student = await getAuthenticatedStudent(req)
    if (!student) {
      return NextResponse.json({ error: 'Unauthorized: Sesi mahasiswa tidak ditemukan' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(50, Math.max(5, parseInt(searchParams.get('limit') || '10', 10)))
    const status = searchParams.get('status')?.trim() || ''

    const where: any = { nim: student.nim }
    if (status && status !== 'ALL') {
      where.status = status
    }

    const [total, items] = await Promise.all([
      prisma.pengajuanPengguguran.count({ where }),
      prisma.pengajuanPengguguran.findMany({
        where,
        include: {
          periode: { select: { id: true, semester: true, tahunAkademik: true, nama: true } },
          mataKuliah: { select: { id: true, kodeMatkul: true, namaMatkul: true, sks: true, kategori: true } },
          riwayat: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ])

    return NextResponse.json({
      success: true,
      data: items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching student submissions:', error)
    return NextResponse.json({ error: 'Gagal memuat riwayat pengajuan' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const student = await getAuthenticatedStudent(req)
    if (!student) {
      return NextResponse.json({ error: 'Unauthorized: Sesi mahasiswa tidak ditemukan' }, { status: 401 })
    }

    const body = await req.json().catch(() => null)
    if (!body) {
      return NextResponse.json({ error: 'Permintaan tidak valid' }, { status: 400 })
    }

    const { kodeMatkul, alasan, lampiranUrl, lampiranNama } = body

    if (!kodeMatkul || !alasan) {
      return NextResponse.json({ error: 'Kode mata kuliah dan alasan pengguguran wajib diisi' }, { status: 400 })
    }

    if (alasan.trim().length < 10) {
      return NextResponse.json({ error: 'Alasan pengguguran minimal 10 karakter' }, { status: 400 })
    }

    // 1. Validasi Periode Aktif
    const activePeriode = await prisma.periodePengguguran.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    })

    if (!activePeriode) {
      return NextResponse.json({ error: 'Tidak ada periode pengguguran yang aktif saat ini.' }, { status: 400 })
    }

    const timeline = evaluatePeriodTimeline(activePeriode)
    if (!timeline.isPengajuanOpen) {
      return NextResponse.json(
        {
          error:
            'Periode pengajuan pengguguran mata kuliah saat ini tidak aktif atau sudah ditutup. Pengajuan hanya dapat dilakukan sesuai jadwal resmi.',
        },
        { status: 400 }
      )
    }

    // 2. Validasi Mata Kuliah di Database Resmi
    const course = await prisma.mataKuliah.findUnique({
      where: { kodeMatkul: String(kodeMatkul).trim().toUpperCase() },
    })

    if (!course || !course.isActive) {
      return NextResponse.json({ error: 'Mata kuliah tidak ditemukan dalam kurikulum resmi aktif.' }, { status: 400 })
    }

    // 3. Validasi Utama: Kategori Inti vs Non-Inti
    if (course.kategori === 'INTI') {
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
        nim: student.nim,
        mataKuliahId: course.id,
        periodeId: activePeriode.id,
        status: { in: ['MENUNGGU_VERIFIKASI_PRODI', 'DISETUJUI_PRODI', 'DISETUJUI_AKADEMIK'] },
      },
    })

    if (existingActive) {
      return NextResponse.json(
        {
          error: `Anda sudah memiliki pengajuan aktif (${existingActive.nomorPengajuan}) untuk mata kuliah ini pada periode akademik berjalan.`,
        },
        { status: 400 }
      )
    }

    // 5. Generate Nomor Pengajuan
    const countTotal = await prisma.pengajuanPengguguran.count({
      where: { periodeId: activePeriode.id },
    })
    const serial = String(countTotal + 1).padStart(4, '0')
    const nomorPengajuan = `PG-${activePeriode.semester}-${serial}`

    // 6. Simpan Transaksional
    const newPengajuan = await prisma.$transaction(async (tx) => {
      const created = await tx.pengajuanPengguguran.create({
        data: {
          nomorPengajuan,
          periodeId: activePeriode.id,
          pengajuId: null, // Diajukan mandiri oleh mahasiswa
          nim: student.nim,
          namaMahasiswa: student.name,
          prodiCode: course.prodiCode || student.prodiCode || 'HKUM',
          prodiName: course.prodiName || student.prodi,
          mataKuliahId: course.id,
          kodeMatkul: course.kodeMatkul,
          namaMatkul: course.namaMatkul,
          sks: course.sks,
          kategoriMatkul: course.kategori,
          kurikulum: student.kurikulum || '2024',
          alasan: alasan.trim(),
          lampiranUrl: lampiranUrl || null,
          lampiranNama: lampiranNama || null,
          status: 'MENUNGGU_VERIFIKASI_PRODI',
        },
      })

      await tx.riwayatPengguguran.create({
        data: {
          pengajuanId: created.id,
          statusAwal: null,
          statusAkhir: 'MENUNGGU_VERIFIKASI_PRODI',
          actorId: student.nim,
          actorName: student.name,
          actorRole: 'Mahasiswa',
          catatan: 'Pengajuan pengguguran diajukan mandiri melalui Portal Mahasiswa.',
          action: 'SUBMIT',
        },
      })

      return created
    })

    await createAuditLog(
      `Mahasiswa ${student.nim} mengajukan pengguguran: ${nomorPengajuan} (${course.kodeMatkul})`,
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
    console.error('Error submitting student pengguguran:', error)
    return NextResponse.json({ error: error?.message || 'Gagal menyimpan pengajuan' }, { status: 500 })
  }
}
