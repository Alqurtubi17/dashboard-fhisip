import { NextRequest } from 'next/server'
import { GET as getPengguguran } from '@/app/api/akademik/pengguguran/route'

export async function GET(req: NextRequest) {
  return getPengguguran(req)
}

