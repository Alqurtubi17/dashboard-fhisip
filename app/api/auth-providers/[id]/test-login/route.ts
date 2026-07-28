import { NextResponse } from 'next/server'
import { getExternalToken } from '@/lib/external-auth'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    // Force refresh handshake test login
    const result = await getExternalToken(params.id, true)
    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Gagal menjalankan pengujian login' },
      { status: 500 }
    )
  }
}
