import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AMP — Academic Management Platform',
  description: 'Platform manajemen akademik modern',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="min-h-screen text-slate-800 antialiased">{children}</body>
    </html>
  )
}
