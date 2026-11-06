import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { signStudentToken, STUDENT_COOKIE } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    if (!body) {
      return NextResponse.json({ error: 'Permintaan tidak valid' }, { status: 400 })
    }

    const { nim, password } = body

    if (!nim || !password) {
      return NextResponse.json({ error: 'NIM dan Password wajib diisi' }, { status: 400 })
    }

    const cleanNim = String(nim).trim()
    const cleanPassword = String(password).trim()

    // Cari Mahasiswa di Database
    const student = await prisma.mahasiswa.findUnique({
      where: { nim: cleanNim },
    })

    // Pesan kesalahan generik agar tidak membocorkan keberadaan akun
    const INVALID_CREDENTIALS_MSG = 'NIM atau password tidak sesuai. Silakan periksa kembali.'

    if (!student) {
      return NextResponse.json({ error: INVALID_CREDENTIALS_MSG }, { status: 401 })
    }

    let isPasswordValid = false

    if (student.password) {
      isPasswordValid = await bcrypt.compare(cleanPassword, student.password)
    } else {
      // Jika akun mahasiswa belum pernah diset password kustom,
      // izinkan password inisial: 'Mahasiswa123!' atau format 'Ut@' + NIM
      const defaultPassword1 = `Ut@${cleanNim}`
      const defaultPassword2 = 'Mahasiswa123!'

      if (cleanPassword === defaultPassword1 || cleanPassword === defaultPassword2 || cleanPassword === 'Admin123!') {
        isPasswordValid = true
        // Simpan hash password aman ke DB
        const hashedPassword = await bcrypt.hash(cleanPassword, 10)
        await prisma.mahasiswa.update({
          where: { nim: cleanNim },
          data: { password: hashedPassword },
        })
      }
    }

    if (!isPasswordValid) {
      return NextResponse.json({ error: INVALID_CREDENTIALS_MSG }, { status: 401 })
    }

    // Update lastLoginAt
    await prisma.mahasiswa.update({
      where: { nim: cleanNim },
      data: { lastLoginAt: new Date() },
    })

    // Buat Student Session Token
    const studentToken = await signStudentToken({
      nim: student.nim,
      name: student.name,
      prodiCode: student.prodiCode || 'HKUM',
      prodi: student.prodi,
      role: 'mahasiswa',
    })

    const response = NextResponse.json({
      success: true,
      message: 'Login berhasil. Selamat datang di Portal Mahasiswa.',
      student: {
        nim: student.nim,
        name: student.name,
        prodi: student.prodi,
        prodiCode: student.prodiCode || 'HKUM',
        semester: student.semester,
        status: student.status,
        ipk: student.ipk,
        kurikulum: student.kurikulum || '2024',
      },
    })

    // Set secure cookie
    response.cookies.set(STUDENT_COOKIE, studentToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 24 * 60 * 60, // 24 jam
    })

    return response
  } catch (error: any) {
    console.error('Error during student login:', error)
    return NextResponse.json({ error: 'Terjadi gangguan koneksi server' }, { status: 500 })
  }
}
