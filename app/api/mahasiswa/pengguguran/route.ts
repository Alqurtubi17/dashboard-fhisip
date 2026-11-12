import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { verifyStudentToken, STUDENT_COOKIE } from '@/lib/auth'
import { createAuditLog } from '@/lib/audit'
import { evaluatePeriodTimeline } from '@/lib/pengguguran-utils'

export const dynamic = 'force-dynamic'

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

    const { kodeMatkul, courses, kodeMatkulList, alasan, lampiranUrl, lampiranNama } = body

    // Mendukung pengajuan satu atau banyak mata kuliah sekaligus
    type CourseInput = {
      kodeMatkul?: string
      kode_mk?: string
      namaMatkul?: string
      nama_mk?: string
      sks?: number
    }

    let inputCourses: CourseInput[] = []
    if (Array.isArray(courses) && courses.length > 0) {
      inputCourses = courses
    } else if (Array.isArray(kodeMatkulList) && kodeMatkulList.length > 0) {
      inputCourses = kodeMatkulList.map((k: string) => ({ kodeMatkul: k }))
    } else if (kodeMatkul) {
      inputCourses = [{
        kodeMatkul,
        namaMatkul: body.namaMatkul,
        sks: body.sks,
      }]
    }

    if (inputCourses.length === 0 || !alasan) {
      return NextResponse.json({ error: 'Pilih minimal 1 mata kuliah dan isi alasan pengguguran' }, { status: 400 })
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

    // 2. Validasi & Siapkan Setiap Mata Kuliah
    const validatedCourses: any[] = []

    for (const cInput of inputCourses) {
      const rawCode = String(cInput.kodeMatkul || cInput.kode_mk || '').trim().toUpperCase()
      if (!rawCode) continue
      const primaryCode = rawCode.split('(')[0].trim()

      let course = await prisma.mataKuliah.findFirst({
        where: {
          OR: [
            { kodeMatkul: rawCode },
            { kodeMatkul: primaryCode },
          ],
        },
      })

      if (!course) {
        // Auto-upsert mata kuliah transkrip jika belum tersimpan di DB
        course = await prisma.mataKuliah.create({
          data: {
            kodeMatkul: primaryCode,
            namaMatkul: cInput.namaMatkul || cInput.nama_mk || primaryCode,
            sks: parseInt(String(cInput.sks || '3'), 10) || 3,
            prodiCode: student.prodiCode || 'FSAP',
            prodiName: student.prodi || 'FHISIP',
            kategori: 'NON_INTI',
            isActive: true,
          },
        })
      }

      if (!course.isActive) {
        return NextResponse.json({ error: `Mata kuliah ${course.kodeMatkul} sedang tidak aktif.` }, { status: 400 })
      }

      // Validasi Utama: Kategori Inti vs Non-Inti
      if (course.kategori === 'INTI') {
        return NextResponse.json(
          {
            error: `Mata kuliah ${course.kodeMatkul} - ${course.namaMatkul} termasuk kategori Mata Kuliah Inti dan tidak dapat digugurkan.`,
          },
          { status: 400 }
        )
      }

      // Pencegahan Pengajuan Ganda
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
            error: `Anda sudah memiliki pengajuan aktif (${existingActive.nomorPengajuan}) untuk mata kuliah ${course.kodeMatkul} pada periode ini.`,
          },
          { status: 400 }
        )
      }

      validatedCourses.push(course)
    }

    if (validatedCourses.length === 0) {
      return NextResponse.json({ error: 'Tidak ada mata kuliah valid yang dipilih untuk diajukan.' }, { status: 400 })
    }

    // 3. Simpan Transaksional Batch
    const countTotal = await prisma.pengajuanPengguguran.count({
      where: { periodeId: activePeriode.id },
    })

    const createdList = await prisma.$transaction(async (tx) => {
      const results = []
      for (let i = 0; i < validatedCourses.length; i++) {
        const course = validatedCourses[i]
        const serial = String(countTotal + 1 + i).padStart(4, '0')
        const nomorPengajuan = `PG-${activePeriode.semester}-${serial}`

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
            catatan: `Pengajuan pengguguran untuk ${course.kodeMatkul} diajukan mandiri melalui Portal Mahasiswa.`,
            action: 'SUBMIT',
          },
        })

        results.push(created)
      }
      return results
    })

    const codesStr = validatedCourses.map((c) => c.kodeMatkul).join(', ')
    await createAuditLog(
      `Mahasiswa ${student.nim} mengajukan pengguguran ${createdList.length} MK: ${codesStr}`,
      req
    )

    return NextResponse.json(
      {
        success: true,
        message: `Pengajuan pengguguran untuk ${createdList.length} mata kuliah berhasil dikirim ke Program Studi.`,
        count: createdList.length,
        data: createdList,
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Error submitting student pengguguran:', error)
    return NextResponse.json({ error: error?.message || 'Gagal menyimpan pengajuan' }, { status: 500 })
  }
}

