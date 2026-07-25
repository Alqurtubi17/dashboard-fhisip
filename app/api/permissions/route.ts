import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Utility endpoint: list all distinct modules (used when building menu permission dropdown)
export async function GET() {
  const permissions = await prisma.permission.findMany({ orderBy: [{ module: 'asc' }, { action: 'asc' }] })
  return NextResponse.json(permissions)
}
