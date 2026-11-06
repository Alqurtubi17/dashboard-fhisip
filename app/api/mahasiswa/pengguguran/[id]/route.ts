import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { verifyStudentToken, STUDENT_COOKIE } from '@/lib/auth'

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

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const student = await getAuthenticatedStudent(req)
    if (!student) {
      return NextResponse.json({ error: 'Unauthorized: Sesi mahasiswa tidak ditemukan' }, { status: 401 })
    }

    const { id } = params
    const pengajuan = await prisma.pengajuanPengguguran.findUnique({
      where: { id },
      include: {
        periode: true,
        mataKuliah: true,
        riwayat: { orderBy: { createdAt: 'asc' } },
      },
    })

    if (!pengajuan) {
      return NextResponse.json({ error: 'Pengajuan tidak ditemukan' }, { status: 404 })
    }

    // PENCEGAHAN IDOR: Mahasiswa hanya boleh melihat pengajuan miliknya sendiri
    if (pengajuan.nim !== student.nim) {
      return NextResponse.json(
        { error: 'Forbidden: Anda tidak memiliki akses untuk melihat pengajuan mahasiswa lain.' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      data: pengajuan,
    })
  } catch (error) {
    console.error('Error fetching detail student pengajuan:', error)
    return NextResponse.json({ error: 'Gagal memuat detail pengajuan' }, { status: 500 })
  }
}

