import { NextRequest, NextResponse } from 'next/server'
import { GET as getMahasiswaPengguguran } from '@/app/api/mahasiswa/pengguguran/route'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  return getMahasiswaPengguguran(req)
}

