import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'

const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional().or(z.literal('')),
  roleId: z.string().min(1).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
})

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await prisma.user.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      name: true,
      email: true,
      status: true,
      roleId: true,
      role: { select: { id: true, name: true, slug: true } },
      createdAt: true,
    },
  })
  if (!user) return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })
  return NextResponse.json(user)
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => null)
  const parsed = updateUserSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
  }

  const existing = await prisma.user.findUnique({ where: { id: params.id }, include: { role: true } })
  if (!existing) return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })

  if (parsed.data.email && parsed.data.email !== existing.email) {
    const emailTaken = await prisma.user.findUnique({ where: { email: parsed.data.email } })
    if (emailTaken) {
      return NextResponse.json({ error: 'Email sudah digunakan oleh user lain' }, { status: 409 })
    }
  }

  const updateData: Record<string, any> = {}
  if (parsed.data.name) updateData.name = parsed.data.name
  if (parsed.data.email) updateData.email = parsed.data.email
  if (parsed.data.roleId) updateData.roleId = parsed.data.roleId
  if (parsed.data.status) updateData.status = parsed.data.status

  if (parsed.data.password && parsed.data.password.trim().length > 0) {
    updateData.password = await bcrypt.hash(parsed.data.password, 10)
  }

  const updated = await prisma.user.update({
    where: { id: params.id },
    data: updateData,
    select: {
      id: true,
      name: true,
      email: true,
      status: true,
      roleId: true,
      role: { select: { id: true, name: true, slug: true } },
      createdAt: true,
    },
  })

  await createAuditLog(`EDIT_USER: ${updated.name}`, req)

  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const currentUserId = req.headers.get('x-user-id')
  if (currentUserId === params.id) {
    return NextResponse.json({ error: 'Tidak dapat menghapus akun sendiri' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { id: params.id } })
  if (!user) return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })

  await prisma.user.delete({ where: { id: params.id } })
  await createAuditLog(`HAPUS_USER: ${user.name}`, req)

  return NextResponse.json({ success: true })
}
