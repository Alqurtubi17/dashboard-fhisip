import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

const menuSchema = z.object({
  name: z.string().min(1).optional(),
  icon: z.string().optional().nullable(),
  url: z.string().optional().nullable(),
  parentId: z.string().optional().nullable(),
  sort: z.number().optional(),
  permissionKey: z.string().optional().nullable(),
})

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => null)
  const parsed = menuSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
  }
  const menu = await prisma.menu.findUnique({ where: { id: params.id } })
  if (!menu) return NextResponse.json({ error: 'Menu tidak ditemukan' }, { status: 404 })

  const { name, icon, url, parentId, sort, permissionKey } = parsed.data

  const updateData: Record<string, any> = {}
  if (name !== undefined) updateData.name = name
  if (icon !== undefined) updateData.icon = icon?.trim() || null
  if (url !== undefined) updateData.url = url?.trim() || null
  if (parentId !== undefined) updateData.parentId = parentId?.trim() || null
  if (sort !== undefined) updateData.sort = sort
  if (permissionKey !== undefined) updateData.permissionKey = permissionKey?.trim() || null

  const updated = await prisma.menu.update({ where: { id: params.id }, data: updateData })
  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const menu = await prisma.menu.findUnique({ where: { id: params.id }, include: { children: true } })
  if (!menu) return NextResponse.json({ error: 'Menu tidak ditemukan' }, { status: 404 })
  if (menu.children.length > 0) {
    return NextResponse.json({ error: 'Hapus submenu terlebih dahulu sebelum menghapus menu induk' }, { status: 409 })
  }
  await prisma.menu.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
