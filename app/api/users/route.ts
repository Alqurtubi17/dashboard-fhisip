import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

const createUserSchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter'),
  email: z.string().email('Email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
  roleId: z.string().min(1, 'Role wajib dipilih'),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional().default('ACTIVE'),
})

export async function GET() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      status: true,
      roleId: true,
      role: { select: { id: true, name: true, slug: true } },
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(users)
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parsed = createUserSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } })
  if (existing) {
    return NextResponse.json({ error: 'Email sudah terdaftar' }, { status: 409 })
  }

  const role = await prisma.role.findUnique({ where: { id: parsed.data.roleId } })
  if (!role) {
    return NextResponse.json({ error: 'Role tidak ditemukan' }, { status: 404 })
  }

  const hashedPassword = await bcrypt.hash(parsed.data.password, 10)

  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      password: hashedPassword,
      roleId: parsed.data.roleId,
      status: parsed.data.status,
    },
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

  return NextResponse.json(user, { status: 201 })
}
