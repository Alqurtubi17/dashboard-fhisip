import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'
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

export async function PATCH(req: NextRequest) {
  try {
    const student = await getAuthenticatedStudent(req)
    if (!student) {
      return NextResponse.json({ error: 'Unauthorized: Sesi mahasiswa tidak ditemukan' }, { status: 401 })
    }

    const body = await req.json().catch(() => null)
    if (!body) {
      return NextResponse.json({ error: 'Body permintaan tidak valid' }, { status: 400 })
    }

    const { currentPassword, newPassword } = body

    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json({ error: 'Password baru minimal 8 karakter' }, { status: 400 })
    }

    // Jika sudah ada password lama, verifikasi
    if (student.password) {
      if (!currentPassword) {
        return NextResponse.json({ error: 'Password saat ini wajib diisi' }, { status: 400 })
      }
      const match = await bcrypt.compare(currentPassword, student.password)
      if (!match) {
        return NextResponse.json({ error: 'Password saat ini tidak cocok' }, { status: 400 })
      }
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10)
    await prisma.mahasiswa.update({
      where: { nim: student.nim },
      data: { password: hashedPassword },
    })

    return NextResponse.json({
      success: true,
      message: 'Password berhasil diperbarui.',
    })
  } catch (error) {
    console.error('Error changing student password:', error)
    return NextResponse.json({ error: 'Gagal memperbarui password' }, { status: 500 })
  }
}
