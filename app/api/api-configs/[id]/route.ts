import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const config = await prisma.apiConfig.findUnique({
      where: { id: params.id },
      include: { provider: true },
    })
    if (!config) return NextResponse.json({ error: 'Konfigurasi API tidak ditemukan' }, { status: 404 })
    return NextResponse.json(config)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json()
    const { code, name, targetUrl, method, graphqlQuery, providerId, status } = body

    const config = await prisma.apiConfig.update({
      where: { id: params.id },
      data: {
        code: code?.toUpperCase()?.trim(),
        name,
        targetUrl,
        method: method || 'POST',
        graphqlQuery: graphqlQuery || null,
        providerId: providerId || null,
        status,
      },
    })
    await createAuditLog(`EDIT_CONFIG_API: ${config.name} [${config.code}]`, req)

    return NextResponse.json(config)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const config = await prisma.apiConfig.findUnique({ where: { id: params.id } })
    await prisma.apiConfig.delete({ where: { id: params.id } })
    if (config) {
      await createAuditLog(`HAPUS_CONFIG_API: ${config.name} [${config.code}]`, req)
    }
    return NextResponse.json({ message: 'Konfigurasi API berhasil dihapus' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
