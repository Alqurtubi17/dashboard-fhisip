import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getExternalToken } from '@/lib/external-auth'

export async function POST(req: Request, { params }: { params: { code: string } }) {
  return handleProxyRequest(req, params.code)
}

export async function GET(req: Request, { params }: { params: { code: string } }) {
  return handleProxyRequest(req, params.code)
}

async function handleProxyRequest(req: Request, code: string) {
  try {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
    const config = await prisma.apiConfig.findUnique({
      where: { code: code.toUpperCase().trim() },
      include: { provider: true },
    })

    if (!config) {
      return NextResponse.json(
        { error: `Konfigurasi API Proxy dengan kode '${code}' tidak ditemukan` },
        { status: 404 }
      )
    }

    if (config.status === 'INACTIVE') {
      return NextResponse.json(
        { error: `API Proxy '${config.name}' saat ini dalam status nonaktif` },
        { status: 403 }
      )
    }

    const reqHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/plain, */*',
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
    }

    // Attach External Token if Provider linked
    if (config.providerId) {
      const tokenRes = await getExternalToken(config.providerId)
      if (!tokenRes.success || !tokenRes.token) {
        return NextResponse.json(
          {
            error: `Otentikasi Penyedia API Gagal: ${tokenRes.error || 'Token tidak valid'}`,
            providerResponse: tokenRes.rawResponse,
          },
          { status: 401 }
        )
      }
      reqHeaders[tokenRes.headerName] = `${tokenRes.headerPrefix}${tokenRes.token}`
    }

    let clientBody: any = {}
    if (req.method !== 'GET') {
      try {
        clientBody = await req.json()
      } catch {
        clientBody = {}
      }
    }

    let fetchBody: string | undefined = undefined
    let finalTargetUrl = config.targetUrl

    if (config.graphqlQuery) {
      const queryStr = config.graphqlQuery.split(/variables\s*:\s*(?:\|-)?/)[0].trim()
      let rawVars = clientBody.variables ?? clientBody ?? {}
      if (typeof rawVars !== 'object' || rawVars === null) rawVars = {}

      // Filter variables: only include variables actually used in query ($varName)
      const cleanVars: Record<string, any> = {}
      for (const [key, val] of Object.entries(rawVars)) {
        if (queryStr.includes('$' + key)) {
          if (val === '' || val === null) {
            // Keep key only if variable is required (e.g. $search: String!)
            const isRequired = new RegExp(`\\$${key}\\s*:\\s*[^,\\)\\s]+!`).test(queryStr)
            if (isRequired) {
              cleanVars[key] = val
            }
          } else {
            cleanVars[key] = val
          }
        }
      }

      fetchBody = JSON.stringify({
        query: queryStr,
        variables: cleanVars,
      })
    } else {
      const isGet = (config.method || '').toUpperCase() === 'GET' || req.method === 'GET'
      if (isGet) {
        const vars = clientBody.variables ?? clientBody
        if (typeof vars === 'object' && vars !== null && Object.keys(vars).length > 0) {
          let baseUrl = config.targetUrl
          const pathParamKey = Object.keys(vars).find(
            (k) =>
              k === 'noBilling' ||
              k === 'no_billing' ||
              k === 'nobilling' ||
              (k === 'nim' && baseUrl.endsWith('/data-pribadi'))
          )

          if (pathParamKey && vars[pathParamKey]) {
            const val = String(vars[pathParamKey]).trim()
            if (baseUrl.endsWith('/billing-detail') || baseUrl.endsWith('/data-pribadi')) {
              baseUrl = `${baseUrl}/${val}`
            }
          }

          const urlObj = new URL(baseUrl)
          for (const [k, v] of Object.entries(vars)) {
            if (k !== pathParamKey && v !== undefined && v !== null && v !== '') {
              urlObj.searchParams.set(k, String(v))
            }
          }
          finalTargetUrl = urlObj.toString()
        }
      } else {
        fetchBody = JSON.stringify(clientBody)
      }
    }

    const targetRes = await fetch(finalTargetUrl, {
      method: config.method || 'POST',
      headers: reqHeaders,
      body: fetchBody,
    })

    const responseText = await targetRes.text()
    let responseJson: any = {}
    try {
      responseJson = JSON.parse(responseText)
    } catch {
      responseJson = { raw: responseText }
    }

    return NextResponse.json(responseJson, { status: targetRes.status })
  } catch (error: any) {
    return NextResponse.json(
      { error: `Gagal menghubungkan proxy ke target API: ${error?.message || 'Network Error'}` },
      { status: 500 }
    )
  }
}
