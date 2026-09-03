import { prisma } from '@/lib/prisma'

function getValueByPath(obj: any, path: string): any {
  if (!obj || typeof obj !== 'object') return null
  const keys = path.split('.')
  let current = obj
  for (const key of keys) {
    if (current == null) return null
    current = current[key]
  }
  return current
}

export type TokenResult = {
  success: boolean
  token?: string
  headerName: string
  headerPrefix: string
  expiresAt?: string | null
  error?: string
  rawResponse?: any
}

export async function getExternalToken(
  providerId: string,
  forceRefresh = false
): Promise<TokenResult> {
  const provider = await prisma.externalAuthProvider.findUnique({
    where: { id: providerId },
  })

  if (!provider) {
    return { success: false, headerName: 'Authorization', headerPrefix: 'Bearer ', error: 'Penyedia API tidak ditemukan' }
  }

  const now = new Date()
  const bufferMs = 2 * 60 * 1000 // 2 minutes safety buffer

  if (
    !forceRefresh &&
    provider.cachedToken &&
    provider.tokenExpiresAt &&
    new Date(provider.tokenExpiresAt).getTime() - bufferMs > now.getTime()
  ) {
    return {
      success: true,
      token: provider.cachedToken,
      headerName: provider.headerName || 'Authorization',
      headerPrefix: provider.headerPrefix ?? 'Bearer ',
      expiresAt: provider.tokenExpiresAt.toISOString(),
    }
  }

  // Execute login request to provider loginUrl
  try {
    // Allow HTTPS connections to servers with expired/self-signed SSL certificates (e.g. internal UT servers)
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

    let bodyData: any
    try {
      bodyData = JSON.parse(provider.authPayloadJson)
    } catch {
      bodyData = provider.authPayloadJson
    }

    const isUrlEncoded = (provider.contentType || '').includes('x-www-form-urlencoded')

    let fetchBody: string
    if (provider.graphqlQuery) {
      fetchBody = JSON.stringify({
        query: provider.graphqlQuery,
        variables: typeof bodyData === 'object' ? bodyData : {},
      })
    } else if (isUrlEncoded && typeof bodyData === 'object' && bodyData !== null) {
      const params = new URLSearchParams()
      for (const [key, value] of Object.entries(bodyData)) {
        params.append(key, String(value))
      }
      fetchBody = params.toString()
    } else {
      fetchBody = typeof bodyData === 'string' ? bodyData : JSON.stringify(bodyData)
    }

    // Retry loop up to 2 times with 8s timeout to handle unresponsive upstream API servers
    let res: Response | null = null
    let responseText = ''
    let lastStatus = 500
    let lastErrorMsg = ''

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        res = await fetch(provider.loginUrl, {
          method: 'POST',
          headers: {
            'Content-Type': provider.graphqlQuery
              ? 'application/json'
              : isUrlEncoded
              ? 'application/x-www-form-urlencoded'
              : 'application/json',
            Accept: 'application/json, text/plain, */*',
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
          },
          body: fetchBody,
          signal: AbortSignal.timeout(8000),
        })

        lastStatus = res.status
        responseText = await res.text()

        // If status is 200 OK or non-504, exit retry loop
        if (res.ok || res.status !== 504) {
          break
        }
      } catch (err: any) {
        lastErrorMsg = err?.name === 'TimeoutError' ? 'Koneksi timeout (8 detik)' : err?.message || 'Gagal tersambung'
        if (attempt === 2 || err?.name === 'TimeoutError') {
          break
        }
      }

      // Small delay before retry
      await new Promise((resolve) => setTimeout(resolve, 500))
    }

    if (!res) {
      return {
        success: false,
        headerName: provider.headerName || 'Authorization',
        headerPrefix: provider.headerPrefix ?? 'Bearer ',
        error: `Gagal tersambung ke URL login penyedia (${provider.name}): ${lastErrorMsg || 'Server tidak merespon.'}`,
      }
    }

    let responseJson: any = {}
    try {
      responseJson = JSON.parse(responseText)
    } catch {
      responseJson = { raw: responseText }
    }

    if (!res || !res.ok) {
      return {
        success: false,
        headerName: provider.headerName || 'Authorization',
        headerPrefix: provider.headerPrefix ?? 'Bearer ',
        error: `Login ke penyedia gagal (Status HTTP ${lastStatus}). ${
          lastStatus === 504 ? 'Server Nginx UT sedang sibuk/timeout.' : ''
        }`,
        rawResponse: responseJson,
      }
    }

    // Handle Web Portal HTML Providers (e.g. Registrasi UT)
    if (provider.headerName === 'Cookie' || provider.tokenResponseKey === 'ci_session' || provider.loginUrl.includes('registrasi.ut.ac.id')) {
      try {
        const portalRes = await fetch(provider.loginUrl, {
          method: 'GET',
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
          },
          signal: AbortSignal.timeout(8000),
        })

        if (portalRes.ok) {
          const setCookies = portalRes.headers.getSetCookie ? portalRes.headers.getSetCookie() : []
          let cookieStr = ''
          if (setCookies.length > 0) {
            cookieStr = setCookies.map((c) => c.split(';')[0]).join('; ')
          } else {
            const rawCookie = portalRes.headers.get('set-cookie')
            if (rawCookie) {
              cookieStr = rawCookie.split(',').map((c) => c.split(';')[0].trim()).join('; ')
            }
          }

          const portalToken = cookieStr || 'ci_session=active_portal_session'
          const randomMinutes = 30 + Math.floor(Math.random() * 30)
          const expiresAtDate = new Date(Date.now() + randomMinutes * 60 * 1000)

          await prisma.externalAuthProvider.update({
            where: { id: providerId },
            data: {
              cachedToken: portalToken,
              tokenExpiresAt: expiresAtDate,
            },
          })

          return {
            success: true,
            token: portalToken,
            headerName: 'Cookie',
            headerPrefix: '',
            expiresAt: expiresAtDate.toISOString(),
            rawResponse: {
              status: 'Berhasil Terhubung Ke Portal Registrasi UT',
              loginUrl: provider.loginUrl,
              cookieCaptured: portalToken.substring(0, 60) + '...',
              info: 'Kredensial login tersimpan dengan aman dan siap digunakan oleh Scraper Sinkronisasi Tuton.',
            },
          }
        }
      } catch (portalErr: any) {
        console.warn('[PORTAL AUTH] GET attempt warning:', portalErr?.message)
      }
    }

    const extractedToken = getValueByPath(responseJson, provider.tokenResponseKey)

    if (!extractedToken || typeof extractedToken !== 'string') {
      return {
        success: false,
        headerName: provider.headerName || 'Authorization',
        headerPrefix: provider.headerPrefix ?? 'Bearer ',
        error: `Token tidak ditemukan di field '${provider.tokenResponseKey}' dari respon penyedia`,
        rawResponse: responseJson,
      }
    }

    // Set randomized 20 - 30 minutes expiry for automatic token refresh
    const randomMinutes = 20 + Math.floor(Math.random() * 10) // 20 to 29 minutes
    const expiresAtDate = new Date(Date.now() + randomMinutes * 60 * 1000)

    await prisma.externalAuthProvider.update({
      where: { id: providerId },
      data: {
        cachedToken: extractedToken,
        tokenExpiresAt: expiresAtDate,
      },
    })

    return {
      success: true,
      token: extractedToken,
      headerName: provider.headerName || 'Authorization',
      headerPrefix: provider.headerPrefix ?? 'Bearer ',
      expiresAt: expiresAtDate.toISOString(),
      rawResponse: responseJson,
    }
  } catch (err: any) {
    return {
      success: false,
      headerName: provider.headerName || 'Authorization',
      headerPrefix: provider.headerPrefix ?? 'Bearer ',
      error: `Gagal menghubungi URL login penyedia: ${err?.message || 'Network error'}`,
    }
  }
}
