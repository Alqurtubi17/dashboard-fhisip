import { prisma } from '@/lib/prisma'
import { getExternalToken } from '@/lib/external-auth'

export async function fetchUtApi(code: string, payload: Record<string, any> = {}) {
  try {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
    const config = await prisma.apiConfig.findUnique({
      where: { code: code.toUpperCase().trim() },
      include: { provider: true },
    })

    if (!config) {
      return { success: false, error: `Config ${code} not found` }
    }

    const reqHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/plain, */*',
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    }

    if (config.providerId) {
      const tokenRes = await getExternalToken(config.providerId)
      if (tokenRes.success && tokenRes.token) {
        reqHeaders[tokenRes.headerName] = `${tokenRes.headerPrefix}${tokenRes.token}`
      }
    }

    let finalTargetUrl = config.targetUrl
    let fetchBody: string | undefined = undefined

    if (config.graphqlQuery) {
      fetchBody = JSON.stringify({
        query: config.graphqlQuery,
        variables: payload.variables || payload,
      })
    } else {
      const isGet = (config.method || '').toUpperCase() === 'GET'
      if (isGet) {
        const urlObj = new URL(config.targetUrl)
        for (const [k, v] of Object.entries(payload)) {
          if (v !== undefined && v !== null && v !== '') {
            urlObj.searchParams.set(k, String(v))
          }
        }
        finalTargetUrl = urlObj.toString()
      } else {
        fetchBody = JSON.stringify(payload)
      }
    }

    let res = await fetch(finalTargetUrl, {
      method: config.method || 'POST',
      headers: reqHeaders,
      body: fetchBody,
    })

    let text = await res.text()
    let json: any = {}
    try {
      json = JSON.parse(text)
    } catch {
      json = { raw: text }
    }

    // Auto-refresh token jika kadaluarsa (HTTP 401, 403, atau pesan respon mengindikasikan token tidak valid/kadaluarsa)
    const lowerText = typeof text === 'string' ? text.toLowerCase() : ''
    const isTokenExpired =
      res.status === 401 ||
      res.status === 403 ||
      json?.statusCode === 401 ||
      json?.statusCode === 403 ||
      lowerText.includes('token kadaluarsa') ||
      lowerText.includes('token expired') ||
      lowerText.includes('token tidak valid') ||
      lowerText.includes('invalid token') ||
      lowerText.includes('jwt expired') ||
      lowerText.includes('unauthorized') ||
      lowerText.includes('token habis')

    if (isTokenExpired && config.providerId) {
      const refreshed = await getExternalToken(config.providerId, true)
      if (refreshed.success && refreshed.token) {
        reqHeaders[refreshed.headerName] = `${refreshed.headerPrefix}${refreshed.token}`
        res = await fetch(finalTargetUrl, {
          method: config.method || 'POST',
          headers: reqHeaders,
          body: fetchBody,
        })
        text = await res.text()
        try {
          json = JSON.parse(text)
        } catch {
          json = { raw: text }
        }
      }
    }

    if (!res.ok) {
      return { success: false, status: res.status, data: json }
    }

    // Jika upstream mengirim status 200 tetapi JSON berisi indikasi error auth/gagal
    if (json && (json.status === false || json.success === false) && !json.data) {
      return { success: false, status: res.status, data: json, error: json.message || 'API response indicated failure' }
    }

    return { success: true, data: json }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error' }
  }
}
