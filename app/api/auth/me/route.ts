import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getRolePermissionKeys } from '@/lib/permissions'

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id')
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: true },
  })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const permissionKeys = await getRolePermissionKeys(user.roleId)

  return NextResponse.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role.slug,
    roleName: user.role.name,
    permissions: Array.from(permissionKeys),
  })
}
