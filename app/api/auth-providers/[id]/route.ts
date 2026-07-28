import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const provider = await prisma.externalAuthProvider.findUnique({
      where: { id: params.id },
      include: { apiConfigs: true },
    })
    if (!provider) return NextResponse.json({ error: 'Provider tidak ditemukan' }, { status: 404 })
    return NextResponse.json(provider)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json()
    const { name, loginUrl, authPayloadJson, tokenResponseKey, contentType, graphqlQuery, headerName, headerPrefix, status } = body

    const provider = await prisma.externalAuthProvider.update({
      where: { id: params.id },
      data: {
        name,
        loginUrl,
        authPayloadJson,
        tokenResponseKey: tokenResponseKey || 'access_token',
        contentType: contentType || 'application/json',
        graphqlQuery: graphqlQuery || null,
        headerName: headerName || 'Authorization',
        headerPrefix: headerPrefix ?? 'Bearer ',
        status,
      },
    })
    await createAuditLog(`EDIT_PENYEDIA_API: ${provider.name}`, req)

    return NextResponse.json(provider)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const provider = await prisma.externalAuthProvider.findUnique({ where: { id: params.id } })
    await prisma.externalAuthProvider.delete({ where: { id: params.id } })
    if (provider) {
      await createAuditLog(`HAPUS_PENYEDIA_API: ${provider.name}`, req)
    }
    return NextResponse.json({ message: 'Provider berhasil dihapus' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
