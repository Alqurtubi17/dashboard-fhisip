import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'Dashboard | FHISIP',
    template: '%s | FHISIP',
  },
  description: 'Sistem Informasi Administrasi Akademik & Layanan Data FHISIP Universitas Terbuka',
  icons: {
    icon: '/fhisip-logo.jpg',
    shortcut: '/fhisip-logo.jpg',
    apple: '/fhisip-logo.jpg',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="min-h-screen text-slate-800 antialiased">{children}</body>
    </html>
  )
}
