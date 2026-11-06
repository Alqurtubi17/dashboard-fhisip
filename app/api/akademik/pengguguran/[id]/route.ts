import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { verifyAccessToken, ACCESS_COOKIE } from '@/lib/auth'

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

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params
    const pengajuan = await prisma.pengajuanPengguguran.findUnique({
      where: { id },
      include: {
        periode: true,
        mataKuliah: true,
        pengaju: { select: { id: true, name: true, email: true } },
        verifikatorProdi: { select: { id: true, name: true, email: true } },
        keputusanAkademikUser: { select: { id: true, name: true, email: true } },
        riwayat: {
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!pengajuan) {
      return NextResponse.json({ error: 'Pengajuan tidak ditemukan' }, { status: 404 })
    }

    // Authorization check
    const isSuperAdmin = user.role.slug === 'superadmin'
    const isAkademik = user.role.slug === 'akademik'
    const isKaprodi = user.role.slug === 'kaprodi'

    if (!isSuperAdmin && !isAkademik) {
      if (isKaprodi && user.prodiCode && user.prodiCode !== pengajuan.prodiCode) {
        return NextResponse.json({ error: 'Anda tidak memiliki hak akses pada pengajuan prodi ini' }, { status: 403 })
      }
      if (!isKaprodi && pengajuan.pengajuId !== user.id) {
        return NextResponse.json({ error: 'Forbidden: Anda tidak berwenang melihat pengajuan ini' }, { status: 403 })
      }
    }

    return NextResponse.json({
      success: true,
      data: pengajuan,
    })
  } catch (error) {
    console.error('Error fetching detail pengajuan:', error)
    return NextResponse.json({ error: 'Gagal memuat detail pengajuan pengguguran' }, { status: 500 })
  }
}

