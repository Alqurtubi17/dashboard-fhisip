import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

import { createAuditLog } from '@/lib/audit'

const roleSchema = z.object({
  name: z.string().min(2, 'Nama role minimal 2 karakter'),
  slug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9-]+$/, 'Slug hanya boleh huruf kecil, angka, dan tanda -'),
  description: z.string().optional(),
})

export async function GET() {
  const roles = await prisma.role.findMany({
    include: {
      _count: { select: { users: true, permissions: true } },
    },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json(roles)
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parsed = roleSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
  }

  const exists = await prisma.role.findUnique({ where: { slug: parsed.data.slug } })
  if (exists) {
    return NextResponse.json({ error: 'Slug role sudah digunakan' }, { status: 409 })
  }

  const role = await prisma.role.create({ data: parsed.data })
  await createAuditLog(`TAMBAH_ROLE: ${role.name}`, req)
  return NextResponse.json(role, { status: 201 })
}
