import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'

export async function GET() {
  const menus = await prisma.menu.findMany({
    where: { parentId: null },
    include: { children: { orderBy: { sort: 'asc' } } },
    orderBy: { sort: 'asc' },
  })
  return NextResponse.json(menus)
}

const menuSchema = z.object({
  name: z.string().min(1, 'Nama menu wajib diisi'),
  icon: z.string().optional().nullable(),
  url: z.string().optional().nullable(),
  parentId: z.string().optional().nullable(),
  sort: z.number().optional(),
  permissionKey: z.string().optional().nullable(),
})

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parsed = menuSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
  }

  const { name, icon, url, parentId, sort, permissionKey } = parsed.data

  const cleanData = {
    name,
    icon: icon?.trim() || null,
    url: url?.trim() || null,
    parentId: parentId?.trim() || null,
    sort: sort ?? 0,
    permissionKey: permissionKey?.trim() || null,
  }

  const menu = await prisma.menu.create({ data: cleanData })
  await createAuditLog(`TAMBAH_MENU: ${menu.name}`, req)
  return NextResponse.json(menu, { status: 201 })
}
