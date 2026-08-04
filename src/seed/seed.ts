import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../payload.config'
import { seedContent } from './seedContent'

async function main() {
  const payload = await getPayload({ config })
  await seedContent(payload)
  console.log('Seed complete')
  process.exit(0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
