import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { verifyAccessToken, ACCESS_COOKIE } from '@/lib/auth'
import { createAuditLog } from '@/lib/audit'

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
    if (!user || user.role.slug !== 'superadmin') {
      return NextResponse.json(
        { error: 'Forbidden: Hanya Administrator yang berwenang memperbarui atau memperpanjang periode.' },
        { status: 403 }
      )
    }

    const { id } = params
    const body = await req.json().catch(() => null)
    if (!body) {
      return NextResponse.json({ error: 'Body permintaan tidak valid' }, { status: 400 })
    }

    const periode = await prisma.periodePengguguran.findUnique({ where: { id } })
    if (!periode) {
      return NextResponse.json({ error: 'Periode tidak ditemukan' }, { status: 404 })
    }

    const updateData: any = {}

    if (body.nama !== undefined) updateData.nama = body.nama
    if (body.tahunAkademik !== undefined) updateData.tahunAkademik = body.tahunAkademik
    if (body.semester !== undefined) updateData.semester = body.semester
    if (body.keterangan !== undefined) updateData.keterangan = body.keterangan

    if (body.pengajuanStart) updateData.pengajuanStart = new Date(body.pengajuanStart)
    if (body.pengajuanEnd) updateData.pengajuanEnd = new Date(body.pengajuanEnd)
    if (body.verifikasiProdiStart) updateData.verifikasiProdiStart = new Date(body.verifikasiProdiStart)
    if (body.verifikasiProdiEnd) updateData.verifikasiProdiEnd = new Date(body.verifikasiProdiEnd)
    if (body.keputusanAkademikStart) updateData.keputusanAkademikStart = new Date(body.keputusanAkademikStart)
    if (body.keputusanAkademikEnd) updateData.keputusanAkademikEnd = new Date(body.keputusanAkademikEnd)
    if (body.pengumumanDate) updateData.pengumumanDate = new Date(body.pengumumanDate)

    if (body.isActive !== undefined) {
      updateData.isActive = Boolean(body.isActive)
      if (body.isActive) {
        await prisma.periodePengguguran.updateMany({
          where: { id: { not: id }, isActive: true },
          data: { isActive: false },
        })
      }
    }

    // Jika ada perpanjangan
    if (body.alasanPerpanjangan) {
      updateData.alasanPerpanjangan = body.alasanPerpanjangan.trim()
    }

    const updated = await prisma.periodePengguguran.update({
      where: { id },
      data: updateData,
    })

    const logAction = body.alasanPerpanjangan
      ? `Perpanjangan Periode Pengguguran: ${updated.nama}. Alasan: ${body.alasanPerpanjangan}`
      : `Update Periode Pengguguran: ${updated.nama}`

    await createAuditLog(logAction, req)

    return NextResponse.json({
      success: true,
      message: 'Periode pengguguran berhasil diperbarui.',
      data: updated,
    })
  } catch (error: any) {
    console.error('Error updating periode:', error)
    return NextResponse.json({ error: error?.message || 'Gagal memperbarui periode' }, { status: 500 })
  }
}

