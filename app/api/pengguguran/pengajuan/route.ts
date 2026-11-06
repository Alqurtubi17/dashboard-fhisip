import { NextRequest, NextResponse } from 'next/server'
import { POST as postMahasiswaPengguguran } from '@/app/api/mahasiswa/pengguguran/route'

export async function POST(req: NextRequest) {
  return postMahasiswaPengguguran(req)
}
