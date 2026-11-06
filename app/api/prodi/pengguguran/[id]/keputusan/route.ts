import { NextRequest } from 'next/server'
import { PATCH as verifikasiProdi } from '@/app/api/akademik/pengguguran/[id]/verifikasi-prodi/route'

export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  return verifikasiProdi(req, ctx)
}

export async function PATCH(req: NextRequest, ctx: { params: { id: string } }) {
  return verifikasiProdi(req, ctx)
}

