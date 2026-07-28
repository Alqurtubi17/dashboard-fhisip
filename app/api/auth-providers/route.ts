import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'

export async function GET() {
  try {
    const providers = await prisma.externalAuthProvider.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { apiConfigs: true } },
      },
    })
    return NextResponse.json(providers)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { name, loginUrl, authPayloadJson, tokenResponseKey, contentType, graphqlQuery, headerName, headerPrefix } = body

    if (!name || !loginUrl || !authPayloadJson) {
      return NextResponse.json(
        { error: 'Nama, URL Login, dan Payload Auth wajib diisi' },
        { status: 400 }
      )
    }

    const provider = await prisma.externalAuthProvider.create({
      data: {
        name,
        loginUrl,
        authPayloadJson,
        tokenResponseKey: tokenResponseKey || 'access_token',
        contentType: contentType || 'application/json',
        graphqlQuery: graphqlQuery || null,
        headerName: headerName || 'Authorization',
        headerPrefix: headerPrefix ?? 'Bearer ',
      },
    })

    await createAuditLog(`TAMBAH_PENYEDIA_API: ${provider.name}`, req)

    return NextResponse.json(provider, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
