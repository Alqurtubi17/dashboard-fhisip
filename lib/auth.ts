import { SignJWT, jwtVerify } from 'jose'

const ACCESS_SECRET = new TextEncoder().encode(process.env.JWT_ACCESS_SECRET || 'dev-access-secret')
const REFRESH_SECRET = new TextEncoder().encode(process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret')

export type SessionPayload = {
  sub: string // user id
  email: string
  role: string // role slug
  name: string
}

export async function signAccessToken(payload: SessionPayload) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(ACCESS_SECRET)
}

export async function signRefreshToken(payload: SessionPayload) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(REFRESH_SECRET)
}

export async function verifyAccessToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, ACCESS_SECRET)
    return payload as unknown as SessionPayload
  } catch {
    return null
  }
}

export async function verifyRefreshToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, REFRESH_SECRET)
    return payload as unknown as SessionPayload
  } catch {
    return null
  }
}

export const ACCESS_COOKIE = 'amp_access_token'
export const REFRESH_COOKIE = 'amp_refresh_token'
