import { prisma } from '../lib/prisma'

async function main() {
  const prodiList: any[] = await prisma.$queryRawUnsafe(
    `SELECT DISTINCT prodi, "prodiCode", COUNT(*)::int as count FROM mahasiswa GROUP BY prodi, "prodiCode" ORDER BY count DESC LIMIT 20;`
  )
  console.log('📊 Distinct prodi in DB:')
  console.table(prodiList)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
