import { NextRequest } from 'next/server'
import { PATCH as keputusanAkademik } from '@/app/api/akademik/pengguguran/[id]/keputusan-akademik/route'

export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  return keputusanAkademik(req, ctx)
}

export async function PATCH(req: NextRequest, ctx: { params: { id: string } }) {
  return keputusanAkademik(req, ctx)
}

