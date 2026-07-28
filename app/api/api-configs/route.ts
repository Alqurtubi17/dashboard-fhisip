import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'

export async function GET() {
  try {
    const configs = await prisma.apiConfig.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        provider: {
          select: { id: true, name: true, loginUrl: true, status: true, cachedToken: true, tokenExpiresAt: true },
        },
      },
    })
    return NextResponse.json(configs)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { code, name, targetUrl, method, graphqlQuery, providerId } = body

    if (!code || !name || !targetUrl) {
      return NextResponse.json(
        { error: 'Kode API, Nama, dan Target URL wajib diisi' },
        { status: 400 }
      )
    }

    const cleanGql = graphqlQuery ? graphqlQuery.split(/variables\s*:\s*(?:\|-)?/)[0].trim() : null

    const config = await prisma.apiConfig.create({
      data: {
        code: code.toUpperCase().trim(),
        name,
        targetUrl,
        method: method || 'POST',
        graphqlQuery: cleanGql,
        providerId: providerId || null,
      },
    })

    await createAuditLog(`TAMBAH_CONFIG_API: ${config.name} [${config.code}]`, req)

    return NextResponse.json(config, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
