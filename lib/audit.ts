import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { verifyAccessToken, ACCESS_COOKIE } from '@/lib/auth'

export async function createAuditLog(action: string, req?: Request) {
  try {
    let userId: string | null = null

    if (req) {
      userId = req.headers.get('x-user-id')
    }

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

    let ip: string | null = null
    let browser: string | null = null

    if (req) {
      ip =
        req.headers.get('x-forwarded-for') ||
        req.headers.get('x-real-ip') ||
        '127.0.0.1'
      browser = req.headers.get('user-agent') || 'Browser'
    }

    await prisma.auditLog.create({
      data: {
        action,
        userId,
        ip,
        browser,
      },
    })
  } catch (err) {
    console.error('Audit log error:', err)
  }
}
