import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../payload.config'
import { seedAlphabetMedia } from './seedAlphabetMedia'

async function main() {
  const payload = await getPayload({ config })
  await seedAlphabetMedia(payload)
  console.log('Alphabet media seed complete')
  process.exit(0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
