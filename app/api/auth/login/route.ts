import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { signAccessToken, signRefreshToken, ACCESS_COOKIE, REFRESH_COOKIE } from '@/lib/auth'
import { getClientIp } from '@/lib/security'

const loginSchema = z.object({
  email: z.string().email('Email tidak valid'),
  password: z.string().min(1, 'Password wajib diisi'),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    const parsed = loginSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
    }
    const { email, password } = parsed.data

    const user = await prisma.user.findUnique({
      where: { email },
      include: { role: true },
    })

    if (!user || user.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Email atau password salah' }, { status: 401 })
    }

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      return NextResponse.json({ error: 'Email atau password salah' }, { status: 401 })
    }

    const payload = { sub: user.id, email: user.email, role: user.role.slug, name: user.name }
    const accessToken = await signAccessToken(payload)
    const refreshToken = await signRefreshToken(payload)

    const ip = getClientIp(req.headers)

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'LOGIN',
        ip,
        browser: req.headers.get('user-agent') ?? undefined,
      },
    })

    const res = NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role.slug, roleName: user.role.name },
    })

    res.cookies.set(ACCESS_COOKIE, accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 15 * 60,
    })
    res.cookies.set(REFRESH_COOKIE, refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    })

    return res
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan sistem saat proses login' }, { status: 500 })
  }
}
