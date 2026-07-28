import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function setupSrsProvider() {
  const loginUrl = 'https://api-srs.ut.ac.id/backend-srs/api/graphql'
  const graphqlMutation = 'mutation loginUser($user: LoginPayload!) {\n  loginUser(user: $user)\n}'
  const payloadJson = JSON.stringify(
    {
      user: {
        email: 'hanifh@ecampus.ut.ac.id',
        password: 'Baru2022',
      },
    },
    null,
    2
  )

  let srsProvider = await prisma.externalAuthProvider.findFirst({
    where: {
      OR: [{ name: { contains: 'GraphQL SRS' } }, { loginUrl: { contains: 'api-srs.ut.ac.id' } }],
    },
  })

  if (srsProvider) {
    srsProvider = await prisma.externalAuthProvider.update({
      where: { id: srsProvider.id },
      data: {
        name: 'Server GraphQL SRS (api-srs.ut.ac.id)',
        loginUrl,
        graphqlQuery: graphqlMutation,
        authPayloadJson: payloadJson,
        tokenResponseKey: 'data.loginUser',
        headerName: 'Authorization',
        headerPrefix: 'Bearer ',
      },
    })
    console.log(`Updated GraphQL SRS Provider (${srsProvider.id})`)
  } else {
    srsProvider = await prisma.externalAuthProvider.create({
      data: {
        name: 'Server GraphQL SRS (api-srs.ut.ac.id)',
        loginUrl,
        graphqlQuery: graphqlMutation,
        authPayloadJson: payloadJson,
        tokenResponseKey: 'data.loginUser',
        headerName: 'Authorization',
        headerPrefix: 'Bearer ',
      },
    })
    console.log(`Created new GraphQL SRS Provider (${srsProvider.id})`)
  }

  // Link all ApiConfigs targeting api-srs.ut.ac.id to this new provider
  const updatedConfigs = await prisma.apiConfig.updateMany({
    where: {
      targetUrl: { contains: 'api-srs.ut.ac.id' },
    },
    data: {
      providerId: srsProvider.id,
    },
  })

  console.log(`Linked ${updatedConfigs.count} GraphQL API Configs to Server GraphQL SRS Provider!`)
}

setupSrsProvider()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
