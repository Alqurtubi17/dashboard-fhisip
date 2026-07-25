import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
})

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const role = await prisma.role.findUnique({
    where: { id: params.id },
    include: { permissions: { include: { permission: true } } },
  })
  if (!role) return NextResponse.json({ error: 'Role tidak ditemukan' }, { status: 404 })
  return NextResponse.json(role)
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => null)
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
  }

  const role = await prisma.role.findUnique({ where: { id: params.id } })
  if (!role) return NextResponse.json({ error: 'Role tidak ditemukan' }, { status: 404 })

  const updated = await prisma.role.update({ where: { id: params.id }, data: parsed.data })
  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const role = await prisma.role.findUnique({ where: { id: params.id } })
  if (!role) return NextResponse.json({ error: 'Role tidak ditemukan' }, { status: 404 })
  if (role.isSystem) {
    return NextResponse.json({ error: 'Role sistem (Super Admin) tidak dapat dihapus' }, { status: 403 })
  }

  const userCount = await prisma.user.count({ where: { roleId: params.id } })
  if (userCount > 0) {
    return NextResponse.json(
      { error: `Role masih digunakan oleh ${userCount} user, pindahkan user terlebih dahulu` },
      { status: 409 }
    )
  }

  await prisma.role.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
