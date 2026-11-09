import { NextRequest, NextResponse } from 'next/server'
import { studentLoadBalancer } from '@/lib/load-balancer'

export async function GET(req: NextRequest) {
  try {
    const stats = studentLoadBalancer.getClusterStatus()

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      loadBalancer: stats,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil metrik load balancer.' },
      { status: 500 }
    )
  }
}

