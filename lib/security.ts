/**
 * Escapes HTML characters in user input to prevent Cross-Site Scripting (XSS).
 */
export function sanitizeInput(str: string): string {
  if (typeof str !== 'string') return str
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

/**
 * Validates password strength (min 8 chars, must contain at least 1 letter and 1 number).
 */
export function isValidPassword(password: string): { valid: boolean; message?: string } {
  if (!password || password.length < 8) {
    return { valid: false, message: 'Password minimal 8 karakter' }
  }
  const hasLetter = /[a-zA-Z]/.test(password)
  const hasNumber = /[0-9]/.test(password)
  if (!hasLetter || !hasNumber) {
    return { valid: false, message: 'Password harus mengombinasikan huruf dan angka' }
  }
  return { valid: true }
}

/**
 * Validates request Origin / Referer header against target Host to protect against CSRF attacks.
 */
export function isValidOrigin(requestOrigin: string | null, requestHost: string | null): boolean {
  if (!requestOrigin || !requestHost) {
    // If headers missing in browser environment during state-changing calls, fail safe
    return false
  }

  try {
    const originUrl = new URL(requestOrigin)
    // Extract host without port if necessary or compare origin host directly
    return originUrl.host === requestHost
  } catch {
    return false
  }
}

/**
 * Safely extracts client IP address from request headers.
 */
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for')
  const realIp = headers.get('x-real-ip')
  let ip = forwarded ? forwarded.split(',')[0].trim() : realIp
  if (!ip || ip === '::1' || ip === '::ffff:127.0.0.1') {
    ip = '127.0.0.1'
  }
  return ip
}
