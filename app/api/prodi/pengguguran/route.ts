import { NextRequest } from 'next/server'
import { GET as getPengguguran } from '@/app/api/akademik/pengguguran/route'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  return getPengguguran(req)
}

