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
import { loginRateLimiter, apiRateLimiter } from '@/lib/rate-limit'
import { getClientIp, isValidOrigin } from '@/lib/security'

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

// Helper to attach security headers to responses
function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-DNS-Prefetch-Control', 'off')
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()')
  return response
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const method = req.method
  const clientIp = getClientIp(req.headers)

  // 1. Rate Limiting for Login
  if (pathname === '/api/auth/login' && method === 'POST') {
    const rateCheck = loginRateLimiter.check(5, clientIp)
    if (!rateCheck.success) {
      const res = NextResponse.json(
        { error: 'Terlalu banyak percobaan login. Silakan coba beberapa menit lagi.' },
        { status: 429, headers: { 'Retry-After': String(rateCheck.reset) } }
      )
      return addSecurityHeaders(res)
    }
  }

  // 2. Rate Limiting for General API routes
  if (pathname.startsWith('/api')) {
    const apiCheck = apiRateLimiter.check(100, clientIp)
    if (!apiCheck.success) {
      const res = NextResponse.json(
        { error: 'Batas kuota permintaan API terlampaui. Silakan coba sebentar lagi.' },
        { status: 429, headers: { 'Retry-After': String(apiCheck.reset) } }
      )
      return addSecurityHeaders(res)
    }
  }

  // 3. CSRF Verification for state-changing API requests (POST, PUT, PATCH, DELETE)
  if (pathname.startsWith('/api') && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const origin = req.headers.get('origin') || req.headers.get('referer')
    const host = req.headers.get('host')
    if (origin && host && !isValidOrigin(origin, host)) {
      const res = NextResponse.json({ error: 'Permintaan ditolak: CSRF validation failed' }, { status: 403 })
      return addSecurityHeaders(res)
    }
  }

  // Public path check
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p)) || pathname.startsWith('/_next')) {
    return addSecurityHeaders(NextResponse.next())
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
      const res = NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      return addSecurityHeaders(res)
    }
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('redirect', pathname)
    return addSecurityHeaders(NextResponse.redirect(loginUrl))
  }

  // Attach session info to request headers so pages/API routes can read it
  const requestHeaders = new Headers(req.headers)
  requestHeaders.set('x-user-id', session.sub)
  requestHeaders.set('x-user-role', session.role)
  requestHeaders.set('x-user-email', session.email)

  // Check Superadmin-only paths
  if (SUPERADMIN_ONLY.some((p) => pathname.startsWith(p)) && session.role !== 'superadmin') {
    if (pathname.startsWith('/api')) {
      const res = NextResponse.json({ error: 'Forbidden: superadmin only' }, { status: 403 })
      return addSecurityHeaders(res)
    }
    return addSecurityHeaders(NextResponse.redirect(new URL('/dashboard?error=forbidden', req.url)))
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

  return addSecurityHeaders(res)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
