import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function importFromGithub() {
  console.log('Fetching repository contents from GitHub...')
  const resContents = await fetch('https://api.github.com/repos/fhisiper/api/contents', {
    headers: {
      'User-Agent': 'Dashboard-FHISIP-Importer',
      Accept: 'application/vnd.github.v3+json',
    },
  })

  if (!resContents.ok) {
    console.error(`Failed to fetch repo content: ${resContents.status}`)
    process.exit(1)
  }

  const files: any[] = await resContents.json()
  const requestFiles = files.filter(
    (f) => f.name.startsWith('yaak.rq_') && (f.name.endsWith('.yaml') || f.name.endsWith('.yml'))
  )

  console.log(`Found ${requestFiles.length} request YAML files in fhisiper/api repo. Processing...`)

  let defaultProvider = await prisma.externalAuthProvider.findFirst({
    where: { name: { contains: 'fhisiper' } },
  })

  if (!defaultProvider) {
    defaultProvider = await prisma.externalAuthProvider.create({
      data: {
        name: 'Server GraphQL UT (fhisiper/api)',
        loginUrl: 'https://api-provider.ac.id/v1/auth/login',
        authPayloadJson: JSON.stringify({ username: 'user_fhisip', password: 'your_password' }),
        tokenResponseKey: 'access_token',
        headerName: 'Authorization',
        headerPrefix: 'Bearer ',
      },
    })
  }

  let importedCount = 0

  for (const file of requestFiles) {
    try {
      const rawRes = await fetch(file.download_url)
      if (!rawRes.ok) continue

      const rawText = await rawRes.text()

      // Extract GraphQL query string
      let graphqlQuery: string | null = null
      const queryMatch = rawText.match(/query:\s*\|?\n([\s\S]+?)(?=\n\w+:|$)/)
      if (queryMatch && queryMatch[1]) {
        graphqlQuery = queryMatch[1].trim()
      }

      // Extract URL or fallback to default GraphQL URL
      let targetUrl = 'https://api.ut.ac.id/graphql'
      const urlMatch = rawText.match(/url:\s*(.+)/)
      if (urlMatch && urlMatch[1] && urlMatch[1].trim() && !urlMatch[1].includes('${')) {
        targetUrl = urlMatch[1].trim().replace(/^['"]|['"]$/g, '')
      }

      // Extract Query Name to use as Code & Name
      let queryName = ''
      if (graphqlQuery) {
        const nameMatch = graphqlQuery.match(/(?:query|mutation)\s+([A-Za-z0-9_]+)/)
        if (nameMatch && nameMatch[1]) {
          queryName = nameMatch[1]
        }
      }

      if (!queryName) {
        queryName = file.name.replace('yaak.rq_', '').replace(/\.yaml$/, '')
      }

      // Format clean Code (e.g. GET_DATA_PRIBADI_VALID)
      const cleanCode = queryName
        .replace(/([a-z])([A-Z])/g, '$1_$2')
        .toUpperCase()

      const cleanName = queryName
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/_/g, ' ')
        .trim()

      await prisma.apiConfig.upsert({
        where: { code: cleanCode },
        update: {
          name: cleanName,
          targetUrl,
          method: 'POST',
          graphqlQuery,
          providerId: defaultProvider.id,
        },
        create: {
          code: cleanCode,
          name: cleanName,
          targetUrl,
          method: 'POST',
          graphqlQuery,
          providerId: defaultProvider.id,
        },
      })

      importedCount++
      console.log(`[${importedCount}/${requestFiles.length}] Imported API: ${cleanCode} -> ${cleanName}`)
    } catch (err: any) {
      console.error(`Error processing file ${file.name}:`, err?.message)
    }
  }

  console.log(`\n🎉 SUKSES! ${importedCount} API & GraphQL telah berhasil diimpor ke database!`)
}

importFromGithub()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect())
