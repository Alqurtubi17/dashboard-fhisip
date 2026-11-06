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

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: Harap login terlebih dahulu' }, { status: 401 })
    }

    // Otorisasi: Hanya staf Akademik atau Superadmin
    if (user.role.slug !== 'akademik' && user.role.slug !== 'superadmin') {
      return NextResponse.json(
        { error: 'Forbidden: Hanya Staf Akademik atau Administrator yang berwenang mengambil keputusan akhir ini.' },
        { status: 403 }
      )
    }

    const { id } = params
    const body = await req.json().catch(() => null)
    if (!body) {
      return NextResponse.json({ error: 'Body permintaan tidak valid' }, { status: 400 })
    }

    const { keputusan, catatan } = body // 'SETUJU' | 'TOLAK'

    if (!keputusan || !['SETUJU', 'TOLAK'].includes(keputusan)) {
      return NextResponse.json({ error: 'Keputusan tidak valid (harus SETUJU atau TOLAK)' }, { status: 400 })
    }

    if (keputusan === 'TOLAK' && (!catatan || catatan.trim().length < 5)) {
      return NextResponse.json(
        { error: 'Alasan penolakan dari bagian Akademik wajib dicantumkan (minimal 5 karakter).' },
        { status: 400 }
      )
    }

    const pengajuan = await prisma.pengajuanPengguguran.findUnique({
      where: { id },
      include: { periode: true },
    })

    if (!pengajuan) {
      return NextResponse.json({ error: 'Pengajuan tidak ditemukan' }, { status: 404 })
    }

    // SYARAT MUTLAK: Hanya pengajuan yang lolos verifikasi Prodi ('DISETUJUI_PRODI') yang boleh diproses Akademik
    if (pengajuan.status !== 'DISETUJUI_PRODI') {
      return NextResponse.json(
        {
          error: `Pengajuan belum atau tidak memenuhi syarat untuk keputusan Akademik. Status saat ini: "${pengajuan.status}". Hanya pengajuan berstatus "Disetujui Prodi" yang dapat diproses.`,
        },
        { status: 400 }
      )
    }

    // Validasi Periode Keputusan Akademik
    const timeline = evaluatePeriodTimeline(pengajuan.periode)
    if (!timeline.isKeputusanAkademikOpen) {
      return NextResponse.json(
        {
          error:
            'Periode keputusan Akademik saat ini tidak aktif atau telah berakhir sesuai jadwal kalender akademik.',
        },
        { status: 400 }
      )
    }

    const now = new Date()
    const nextStatus = keputusan === 'SETUJU' ? 'DISETUJUI_AKADEMIK' : 'DITOLAK_AKADEMIK'
    const actionName = keputusan === 'SETUJU' ? 'AKADEMIK_SETUJU' : 'AKADEMIK_TOLAK'

    const updated = await prisma.$transaction(async (tx) => {
      const res = await tx.pengajuanPengguguran.update({
        where: { id },
        data: {
          status: nextStatus,
          keputusanAkademikId: user.id,
          keputusanAkademikName: user.name,
          keputusanAkademikAt: now,
          catatanAkademik: catatan ? catatan.trim() : null,
        },
      })

      await tx.riwayatPengguguran.create({
        data: {
          pengajuanId: id,
          statusAwal: 'DISETUJUI_PRODI',
          statusAkhir: nextStatus,
          actorId: user.id,
          actorName: user.name,
          actorRole: user.role.name,
          catatan:
            catatan?.trim() ||
            (keputusan === 'SETUJU'
              ? 'Pengguguran disetujui resmi oleh Bagian Akademik (Selesai).'
              : 'Ditolak oleh Bagian Akademik.'),
          action: actionName,
        },
      })

      return res
    })

    await createAuditLog(
      `Keputusan Akademik: ${pengajuan.nomorPengajuan} -> ${nextStatus} oleh ${user.name}`,
      req
    )

    return NextResponse.json({
      success: true,
      message:
        keputusan === 'SETUJU'
          ? 'Pengguguran mata kuliah berhasil disetujui resmi oleh bagian Akademik (Proses Selesai).'
          : 'Pengajuan telah ditolak oleh bagian Akademik.',
      data: updated,
    })
  } catch (error: any) {
    console.error('Error during keputusan akademik:', error)
    return NextResponse.json({ error: error?.message || 'Gagal menyimpan keputusan Akademik' }, { status: 500 })
  }
}

