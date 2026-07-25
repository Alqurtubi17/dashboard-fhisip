import { NextRequest, NextResponse } from 'next/server'
import {
  verifyRefreshToken,
  signAccessToken,
  signRefreshToken,
  ACCESS_COOKIE,
  REFRESH_COOKIE,
} from '@/lib/auth'

export async function POST(req: NextRequest) {
  const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value

  if (!refreshToken) {
    return NextResponse.json({ error: 'No refresh token provided' }, { status: 401 })
  }

  const session = await verifyRefreshToken(refreshToken)
  if (!session) {
    return NextResponse.json({ error: 'Invalid or expired refresh token' }, { status: 401 })
  }

  const payload = {
    sub: session.sub,
    email: session.email,
    role: session.role,
    name: session.name,
  }

  const newAccessToken = await signAccessToken(payload)
  const newRefreshToken = await signRefreshToken(payload)

  const res = NextResponse.json({ success: true, user: payload })

  res.cookies.set(ACCESS_COOKIE, newAccessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 15 * 60,
  })

  res.cookies.set(REFRESH_COOKIE, newRefreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
  })

  return res
}
