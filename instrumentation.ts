export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { ensureSrsTokenSchedulerStarted } = await import('@/lib/srs-token-scheduler')
    ensureSrsTokenSchedulerStarted()
  }
}
