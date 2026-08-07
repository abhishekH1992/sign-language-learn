import React from 'react'
import { Fraunces, Source_Sans_3 } from 'next/font/google'
import { getCurrentUser } from '@/lib/auth'
import { SiteHeader } from '@/components/SiteHeader'

const display = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  weight: ['500', '700'],
})

const body = Source_Sans_3({
  subsets: ['latin'],
  variable: '--font-source',
  weight: ['400', '600', '700'],
})

export const metadata = {
  title: 'Learn',
  description: 'Learn with video lessons, practice, and quizzes.',
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  const { user } = await getCurrentUser()

  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <head>
        {/* Served from /public to avoid Next.js 404s on CSS paths that include route-group parentheses */}
        <link rel="stylesheet" href="/styles/nzsl.css" />
      </head>
      <body>
        <SiteHeader email={user && 'email' in user ? user.email : null} />
        <div id="main">{props.children}</div>
      </body>
    </html>
  )
}
