import { NextResponse } from 'next/server'
import { STUDENT_COOKIE } from '@/lib/auth'

export async function POST() {
  const response = NextResponse.json({
    success: true,
    message: 'Logout berhasil.',
  })

  response.cookies.set(STUDENT_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })

  return response
}
