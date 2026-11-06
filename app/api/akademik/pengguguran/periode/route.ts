import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { verifyAccessToken, ACCESS_COOKIE } from '@/lib/auth'
import { createAuditLog } from '@/lib/audit'
import { evaluatePeriodTimeline } from '@/lib/pengguguran-utils'

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
    const periodes = await prisma.periodePengguguran.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { pengajuan: true },
        },
      },
    })

    const enriched = periodes.map((p) => ({
      ...p,
      timeline: evaluatePeriodTimeline(p),
      totalPengajuan: p._count.pengajuan,
    }))

    return NextResponse.json({
      success: true,
      data: enriched,
    })
  } catch (error) {
    console.error('Error fetching periodes:', error)
    return NextResponse.json({ error: 'Gagal memuat daftar periode pengguguran' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req)
    if (!user || (user.role.slug !== 'superadmin' && user.role.slug !== 'akademik')) {
      return NextResponse.json(
        { error: 'Forbidden: Hanya Administrator atau Staf Akademik yang dapat membuat periode baru.' },
        { status: 403 }
      )
    }

    const body = await req.json().catch(() => null)
    if (!body) {
      return NextResponse.json({ error: 'Body permintaan tidak valid' }, { status: 400 })
    }

    const {
      tahunAkademik,
      semester,
      nama,
      pengajuanStart,
      pengajuanEnd,
      verifikasiProdiStart,
      verifikasiProdiEnd,
      keputusanAkademikStart,
      keputusanAkademikEnd,
      pengumumanDate,
      keterangan,
      isActive = true,
    } = body

    if (
      !tahunAkademik ||
      !semester ||
      !nama ||
      !pengajuanStart ||
      !pengajuanEnd ||
      !verifikasiProdiStart ||
      !verifikasiProdiEnd ||
      !keputusanAkademikStart ||
      !keputusanAkademikEnd
    ) {
      return NextResponse.json(
        { error: 'Seluruh tanggal timeline wajib diisi lengkap (Pengajuan, Verifikasi Prodi, dan Keputusan Akademik)' },
        { status: 400 }
      )
    }

    // Jika isActive true, nonaktifkan periode lain yang aktif
    if (isActive) {
      await prisma.periodePengguguran.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      })
    }

    const newPeriode = await prisma.periodePengguguran.create({
      data: {
        tahunAkademik,
        semester,
        nama,
        isActive: Boolean(isActive),
        pengajuanStart: new Date(pengajuanStart),
        pengajuanEnd: new Date(pengajuanEnd),
        verifikasiProdiStart: new Date(verifikasiProdiStart),
        verifikasiProdiEnd: new Date(verifikasiProdiEnd),
        keputusanAkademikStart: new Date(keputusanAkademikStart),
        keputusanAkademikEnd: new Date(keputusanAkademikEnd),
        pengumumanDate: pengumumanDate ? new Date(pengumumanDate) : null,
        keterangan,
      },
    })

    await createAuditLog(`Membuat Periode Pengguguran Baru: ${nama} (${semester})`, req)

    return NextResponse.json({
      success: true,
      message: 'Periode pengguguran berhasil dibuat.',
      data: newPeriode,
    })
  } catch (error: any) {
    console.error('Error creating periode:', error)
    return NextResponse.json({ error: error?.message || 'Gagal membuat periode pengguguran' }, { status: 500 })
  }
}

