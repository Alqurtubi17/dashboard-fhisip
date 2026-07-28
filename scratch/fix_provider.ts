import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixProvider() {
  const provider = await prisma.externalAuthProvider.findFirst({
    where: {
      OR: [{ name: { contains: 'FHISIP' } }, { loginUrl: { contains: 'api-mahasiswa-srs.ut.ac.id' } }],
    },
  })

  const payloadJson = JSON.stringify(
    {
      email: 'api-fhisip@ut.ac.id',
      password: 'UT03tf4C!!rf',
    },
    null,
    2
  )

  if (provider) {
    await prisma.externalAuthProvider.update({
      where: { id: provider.id },
      data: {
        name: 'API FHISIP',
        loginUrl: 'https://api-mahasiswa-srs.ut.ac.id/api-srs-mahasiswa/v1/auth',
        authPayloadJson: payloadJson,
        tokenResponseKey: 'token',
        contentType: 'application/x-www-form-urlencoded',
        headerName: 'Authorization',
        headerPrefix: 'Bearer ',
      },
    })
    console.log(`Updated provider ${provider.id} to form-urlencoded working config!`)
  } else {
    const newP = await prisma.externalAuthProvider.create({
      data: {
        name: 'API FHISIP',
        loginUrl: 'https://api-mahasiswa-srs.ut.ac.id/api-srs-mahasiswa/v1/auth',
        authPayloadJson: payloadJson,
        tokenResponseKey: 'token',
        contentType: 'application/x-www-form-urlencoded',
        headerName: 'Authorization',
        headerPrefix: 'Bearer ',
      },
    })
    console.log(`Created new provider ${newP.id} with form-urlencoded working config!`)
  }
}

fixProvider()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
