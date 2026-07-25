import { NextRequest, NextResponse } from 'next/server'
import {
  verifyAccessToken,
  verifyRefreshToken,
  signAccessToken,
  signRefreshToken,
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  SessionPayload,
} from '@/lib/auth'

// Routes that don't require authentication
const PUBLIC_PATHS = ['/login', '/api/auth/login', '/api/auth/refresh']

// Management routes restricted to superadmin only
const SUPERADMIN_ONLY = [
  '/roles',
  '/menus',
  '/users',
  '/audit',
  '/api/roles',
  '/api/menus',
  '/api/permissions',
  '/api/users',
  '/api/audit',
]

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p)) || pathname.startsWith('/_next')) {
    return NextResponse.next()
  }

  let session: SessionPayload | null = null
  let refreshedToken: string | null = null
  let newRefreshTokenStr: string | null = null

  const accessToken = req.cookies.get(ACCESS_COOKIE)?.value
  if (accessToken) {
    session = await verifyAccessToken(accessToken)
  }

  // If access token is invalid/expired, attempt automatic renewal using refresh token
  if (!session) {
    const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value
    if (refreshToken) {
      const refreshSession = await verifyRefreshToken(refreshToken)
      if (refreshSession) {
        session = {
          sub: refreshSession.sub,
          email: refreshSession.email,
          role: refreshSession.role,
          name: refreshSession.name,
        }
        refreshedToken = await signAccessToken(session)
        newRefreshTokenStr = await signRefreshToken(session)
      }
    }
  }

  if (!session) {
    if (pathname.startsWith('/api')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Attach session info to request headers so pages/API routes can read it
  const requestHeaders = new Headers(req.headers)
  requestHeaders.set('x-user-id', session.sub)
  requestHeaders.set('x-user-role', session.role)
  requestHeaders.set('x-user-email', session.email)

  // Check Superadmin-only paths
  if (SUPERADMIN_ONLY.some((p) => pathname.startsWith(p)) && session.role !== 'superadmin') {
    if (pathname.startsWith('/api')) {
      return NextResponse.json({ error: 'Forbidden: superadmin only' }, { status: 403 })
    }
    return NextResponse.redirect(new URL('/dashboard?error=forbidden', req.url))
  }

  const res = NextResponse.next({ request: { headers: requestHeaders } })

  // If session was renewed via refresh token, attach new cookies to the response
  if (refreshedToken && newRefreshTokenStr) {
    res.cookies.set(ACCESS_COOKIE, refreshedToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 15 * 60,
    })
    res.cookies.set(REFRESH_COOKIE, newRefreshTokenStr, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    })
  }

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
