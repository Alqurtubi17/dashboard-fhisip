import { NextRequest, NextResponse } from 'next/server'
import {
  verifyAccessToken,
  verifyRefreshToken,
  signAccessToken,
  signRefreshToken,
  verifyStudentToken,
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  STUDENT_COOKIE,
  SessionPayload,
} from '@/lib/auth'
import { loginRateLimiter, apiRateLimiter } from '@/lib/rate-limit'
import { getClientIp, isValidOrigin } from '@/lib/security'
import { studentLoadBalancer } from '@/lib/load-balancer'

// Routes and static assets that don't require authentication
const PUBLIC_PATHS = [
  '/login',
  '/api/auth/login',
  '/api/auth/refresh',
  '/favicon.ico',
  '/icon.png',
  '/ut-logo.png',
  '/fhisip-logo.jpg',
]

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
  if ((pathname === '/api/auth/login' || pathname === '/api/mahasiswa/auth/login') && method === 'POST') {
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

  // Public path check and static file extensions
  if (
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith('/_next') ||
    /\.(png|jpg|jpeg|svg|ico|webp)$/i.test(pathname)
  ) {
    return addSecurityHeaders(NextResponse.next())
  }

  // Redirect alias /mahasiswa/login to /portal-mahasiswa/login
  if (pathname === '/mahasiswa/login') {
    return NextResponse.redirect(new URL('/portal-mahasiswa/login', req.url))
  }

  // Student Portal Load Balancer, Protection & Routing
  // Only target student portal paths and student-specific APIs (NOT admin dashboard /api/mahasiswa or /api/mahasiswa/sync)
  const isStudentPortalRoute =
    pathname.startsWith('/portal-mahasiswa') ||
    pathname.startsWith('/api/mahasiswa/auth') ||
    pathname.startsWith('/api/mahasiswa/mata-kuliah') ||
    pathname.startsWith('/api/mahasiswa/me') ||
    pathname.startsWith('/api/mahasiswa/password') ||
    pathname.startsWith('/api/mahasiswa/pengguguran') ||
    pathname === '/api/mahasiswa/load-balancer'

  if (isStudentPortalRoute) {
    // 1. Cluster overload / concurrency threshold check
    if (studentLoadBalancer.isClusterOverloaded()) {
      const res = NextResponse.json(
        { error: 'Server Portal Mahasiswa sedang menerima antrean tinggi. Silakan coba kembali sesaat lagi.' },
        { status: 503, headers: { 'Retry-After': '2' } }
      )
      return addSecurityHeaders(res)
    }

    // 2. Identify student session if exists
    const studentToken = req.cookies.get(STUDENT_COOKIE)?.value
    let studentSession = null
    if (studentToken) {
      studentSession = await verifyStudentToken(studentToken)
    }

    // 3. Select balanced node using Sticky Session Hash (NIM or Client IP)
    const routingKey = studentSession?.nim || clientIp || 'portal-client'
    const targetNode = studentLoadBalancer.selectNode(routingKey)
    studentLoadBalancer.acquireConnection(targetNode.id)

    // Helper to inject load balancer telemetry into response
    const attachLbHeaders = (res: NextResponse): NextResponse => {
      res.headers.set('X-Load-Balancer-Node', targetNode.id)
      res.headers.set('X-Load-Balancer-Region', targetNode.region)
      res.headers.set('X-Load-Balancer-Status', targetNode.status)
      res.headers.set('X-Load-Balancer-Latency', `${targetNode.averageLatencyMs}ms`)
      res.headers.set('X-Load-Balancer-Active', String(targetNode.activeConnections))
      return addSecurityHeaders(res)
    }

    // 4. Public Student Endpoints (Login page, Auth API, and Load Balancer telemetry)
    const isPublicStudentPath =
      pathname === '/portal-mahasiswa/login' ||
      pathname === '/api/mahasiswa/auth/login' ||
      pathname === '/api/mahasiswa/load-balancer'

    if (isPublicStudentPath) {
      const requestHeaders = new Headers(req.headers)
      requestHeaders.set('x-lb-node-id', targetNode.id)
      requestHeaders.set('x-lb-region', targetNode.region)
      requestHeaders.set('x-lb-status', targetNode.status)

      const res = NextResponse.next({ request: { headers: requestHeaders } })
      return attachLbHeaders(res)
    }

    // 5. Protected Student Endpoints: Require valid student session
    if (!studentSession) {
      if (pathname.startsWith('/api')) {
        const res = NextResponse.json(
          { error: 'Unauthorized: Sesi mahasiswa telah berakhir. Silakan login kembali.' },
          { status: 401 }
        )
        return attachLbHeaders(res)
      }
      return attachLbHeaders(NextResponse.redirect(new URL('/portal-mahasiswa/login', req.url)))
    }

    // 6. Authorized student request: Forward with student & LB headers
    const requestHeaders = new Headers(req.headers)
    requestHeaders.set('x-student-nim', studentSession.nim)
    requestHeaders.set('x-student-name', studentSession.name)
    requestHeaders.set('x-student-prodi', studentSession.prodiCode)
    requestHeaders.set('x-user-role', 'mahasiswa')
    requestHeaders.set('x-lb-node-id', targetNode.id)
    requestHeaders.set('x-lb-region', targetNode.region)
    requestHeaders.set('x-lb-status', targetNode.status)

    const res = NextResponse.next({ request: { headers: requestHeaders } })
    return attachLbHeaders(res)
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
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:png|jpg|jpeg|svg|ico|webp)$).*)'],
}
