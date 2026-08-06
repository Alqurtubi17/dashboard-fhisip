import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

// GET -> returns all permissions grouped by module, with a boolean "checked" flag for this role
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const role = await prisma.role.findFirst({
    where: {
      OR: [{ id: params.id }, { slug: params.id }],
    },
  })

  if (!role) return NextResponse.json({ error: 'Role tidak ditemukan' }, { status: 404 })

  const allPermissions = await prisma.permission.findMany({ orderBy: [{ module: 'asc' }, { action: 'asc' }] })
  const rolePermissions = await prisma.rolePermission.findMany({ where: { roleId: role.id } })
  const checkedIds = new Set(rolePermissions.map((rp) => rp.permissionId))

  const grouped: Record<string, { id: string; action: string; checked: boolean }[]> = {}
  for (const p of allPermissions) {
    if (!grouped[p.module]) grouped[p.module] = []
    grouped[p.module].push({ id: p.id, action: p.action, checked: checkedIds.has(p.id) || role.isSystem })
  }

  return NextResponse.json({ role, modules: grouped })
}

const putSchema = z.object({
  permissionIds: z.array(z.string()),
})

// PUT -> replace the full set of permissions assigned to this role
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const role = await prisma.role.findFirst({
    where: {
      OR: [{ id: params.id }, { slug: params.id }],
    },
  })

  if (!role) return NextResponse.json({ error: 'Role tidak ditemukan' }, { status: 404 })

  if (role.isSystem) {
    return NextResponse.json({ error: 'Hak Akses Super Admin memiliki otorisasi penuh dan tidak dapat diubah.' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  const parsed = putSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
  }

  await prisma.$transaction([
    prisma.rolePermission.deleteMany({ where: { roleId: role.id } }),
    prisma.rolePermission.createMany({
      data: parsed.data.permissionIds.map((permissionId) => ({ roleId: role.id, permissionId })),
      skipDuplicates: true,
    }),
  ])

  return NextResponse.json({ success: true })
}
