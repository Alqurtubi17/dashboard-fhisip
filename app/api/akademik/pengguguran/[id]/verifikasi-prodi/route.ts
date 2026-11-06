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

    // Otorisasi Role: Hanya Kaprodi atau Superadmin
    if (user.role.slug !== 'kaprodi' && user.role.slug !== 'superadmin') {
      return NextResponse.json(
        { error: 'Forbidden: Hanya Petugas Program Studi (Kaprodi) atau Admin yang berhak memverifikasi pengajuan ini.' },
        { status: 403 }
      )
    }

    const { id } = params
    const body = await req.json().catch(() => null)
    if (!body) {
      return NextResponse.json({ error: 'Body permintaan tidak valid' }, { status: 400 })
    }

    const { keputusan, catatan } = body // keputusan: 'SETUJU' | 'TOLAK'

    if (!keputusan || !['SETUJU', 'TOLAK'].includes(keputusan)) {
      return NextResponse.json({ error: 'Keputusan tidak valid (harus SETUJU atau TOLAK)' }, { status: 400 })
    }

    if (keputusan === 'TOLAK' && (!catatan || catatan.trim().length < 5)) {
      return NextResponse.json(
        { error: 'Alasan penolakan Program Studi wajib dicantumkan (minimal 5 karakter).' },
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

    // Validasi Otoritas Prodi: Kaprodi tidak boleh memverifikasi prodi lain
    if (user.role.slug === 'kaprodi' && user.prodiCode && user.prodiCode !== pengajuan.prodiCode) {
      return NextResponse.json(
        {
          error: `Anda ditugaskan pada Prodi ${user.prodiCode} dan tidak memiliki kewenangan memverifikasi pengajuan untuk Prodi ${pengajuan.prodiCode}.`,
        },
        { status: 403 }
      )
    }

    // Validasi Periode Verifikasi Prodi
    const timeline = evaluatePeriodTimeline(pengajuan.periode)
    if (!timeline.isVerifikasiProdiOpen) {
      return NextResponse.json(
        {
          error:
            'Periode verifikasi Program Studi saat ini tidak aktif atau sudah berakhir sesuai jadwal kalender akademik.',
        },
        { status: 400 }
      )
    }

    // Validasi Status Saat Ini: Harus 'MENUNGGU_VERIFIKASI_PRODI'
    if (pengajuan.status !== 'MENUNGGU_VERIFIKASI_PRODI') {
      return NextResponse.json(
        {
          error: `Pengajuan ini sudah berstatus "${pengajuan.status}" dan tidak dapat diproses ulang pada tahap verifikasi Prodi.`,
        },
        { status: 400 }
      )
    }

    const now = new Date()
    const nextStatus = keputusan === 'SETUJU' ? 'DISETUJUI_PRODI' : 'DITOLAK_PRODI'
    const actionName = keputusan === 'SETUJU' ? 'VERIFIKASI_PRODI_SETUJU' : 'VERIFIKASI_PRODI_TOLAK'

    const updated = await prisma.$transaction(async (tx) => {
      const res = await tx.pengajuanPengguguran.update({
        where: { id },
        data: {
          status: nextStatus,
          verifikatorProdiId: user.id,
          verifikatorProdiName: user.name,
          verifikasiProdiAt: now,
          catatanProdi: catatan ? catatan.trim() : null,
        },
      })

      await tx.riwayatPengguguran.create({
        data: {
          pengajuanId: id,
          statusAwal: 'MENUNGGU_VERIFIKASI_PRODI',
          statusAkhir: nextStatus,
          actorId: user.id,
          actorName: user.name,
          actorRole: user.role.name,
          catatan: catatan?.trim() || (keputusan === 'SETUJU' ? 'Disetujui oleh Program Studi.' : 'Ditolak oleh Program Studi.'),
          action: actionName,
        },
      })

      return res
    })

    await createAuditLog(
      `Verifikasi Prodi: ${pengajuan.nomorPengajuan} -> ${nextStatus} oleh ${user.name}`,
      req
    )

    return NextResponse.json({
      success: true,
      message:
        keputusan === 'SETUJU'
          ? 'Pengajuan berhasil disetujui Program Studi dan diteruskan ke bagian Akademik.'
          : 'Pengajuan telah ditolak oleh Program Studi.',
      data: updated,
    })
  } catch (error: any) {
    console.error('Error during verifikasi prodi:', error)
    return NextResponse.json({ error: error?.message || 'Gagal menyimpan verifikasi Prodi' }, { status: 500 })
  }
}

