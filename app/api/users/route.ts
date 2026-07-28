import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { sanitizeInput, isValidPassword } from '@/lib/security'
import { createAuditLog } from '@/lib/audit'

const createUserSchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter'),
  email: z.string().email('Email tidak valid'),
  password: z.string().min(8, 'Password minimal 8 karakter'),
  roleId: z.string().min(1, 'Role wajib dipilih'),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional().default('ACTIVE'),
})

export async function GET() {
  try {
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
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json({ error: 'Gagal mengambil data pengguna' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    const parsed = createUserSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
    }

    const { name, email, password, roleId, status } = parsed.data

    const passCheck = isValidPassword(password)
    if (!passCheck.valid) {
      return NextResponse.json({ error: passCheck.message }, { status: 400 })
    }

    const sanitizedName = sanitizeInput(name)

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: 'Email sudah terdaftar' }, { status: 409 })
    }

    const role = await prisma.role.findUnique({ where: { id: roleId } })
    if (!role) {
      return NextResponse.json({ error: 'Role tidak ditemukan' }, { status: 404 })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: {
        name: sanitizedName,
        email,
        password: hashedPassword,
        roleId,
        status,
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

    await createAuditLog(`TAMBAH_USER: ${user.name} (${user.email})`, req)

    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json({ error: 'Gagal membuat pengguna' }, { status: 500 })
  }
}
