import { headers as getHeaders } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@payload-config'

export async function getCurrentUser() {
  const headers = await getHeaders()
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers })
  return { payload, user }
}

export async function requireUser() {
  const ctx = await getCurrentUser()
  if (!ctx.user) {
    redirect('/login')
  }
  return ctx
}
