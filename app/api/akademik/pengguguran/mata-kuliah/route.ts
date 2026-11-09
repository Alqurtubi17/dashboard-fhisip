import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { verifyAccessToken, ACCESS_COOKIE } from '@/lib/auth'
import { createAuditLog } from '@/lib/audit'
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
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search')?.trim() || ''
    const prodiCode = searchParams.get('prodiCode')?.trim() || ''
    const kategori = searchParams.get('kategori')?.trim() || ''
    const limit = Math.min(300, Math.max(1, parseInt(searchParams.get('limit') || '150', 10)))

    // Sesuai arahan: gunakan kode baru semua yang berawalan FS
    const conditions: any[] = [
      { isActive: true },
      { kodeMatkul: { startsWith: 'FS', mode: 'insensitive' } },
    ]

    if (prodiCode && prodiCode !== 'ALL') {
      const pInfo = resolveProdiInfo(prodiCode)
      if (pInfo) {
        conditions.push({
          OR: [
            { prodiCode: { in: [pInfo.officialCode, pInfo.legacyCode, ...pInfo.srsCodes] } },
            { kodeMatkul: { startsWith: pInfo.officialCode, mode: 'insensitive' } },
          ],
        })
      } else {
        conditions.push({ prodiCode })
      }
    }

    if (kategori && (kategori === 'INTI' || kategori === 'NON_INTI')) {
      conditions.push({ kategori })
    }

    if (search) {
      conditions.push({
        OR: [
          { kodeMatkul: { contains: search, mode: 'insensitive' } },
          { namaMatkul: { contains: search, mode: 'insensitive' } },
        ],
      })
    }

    const where: any = conditions.length > 1 ? { AND: conditions } : conditions[0]

    const items = await prisma.mataKuliah.findMany({
      where,
      orderBy: [{ kodeMatkul: 'asc' }],
      take: limit,
    })

    return NextResponse.json({
      success: true,
      data: items,
    })
  } catch (error) {
    console.error('Error fetching mata kuliah:', error)
    return NextResponse.json({ error: 'Gagal memuat daftar mata kuliah' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser(req)
    if (!user || (user.role.slug !== 'superadmin' && user.role.slug !== 'akademik')) {
      return NextResponse.json(
        { error: 'Forbidden: Hanya Administrator atau Akademik yang dapat mengubah kategori mata kuliah.' },
        { status: 403 }
      )
    }

    const body = await req.json().catch(() => null)
    if (!body || !body.id || !body.kategori || !['INTI', 'NON_INTI'].includes(body.kategori)) {
      return NextResponse.json({ error: 'Data id dan kategori (INTI/NON_INTI) tidak valid' }, { status: 400 })
    }

    const updated = await prisma.mataKuliah.update({
      where: { id: body.id },
      data: { kategori: body.kategori },
    })

    await createAuditLog(
      `Ubah Kategori MK: ${updated.kodeMatkul} ${updated.namaMatkul} -> ${updated.kategori} oleh ${user.name}`,
      req
    )

    return NextResponse.json({
      success: true,
      message: `Kategori mata kuliah ${updated.kodeMatkul} berhasil diubah menjadi ${updated.kategori}.`,
      data: updated,
    })
  } catch (error: any) {
    console.error('Error updating mata kuliah kategori:', error)
    return NextResponse.json({ error: error?.message || 'Gagal mengubah kategori mata kuliah' }, { status: 500 })
  }
}

