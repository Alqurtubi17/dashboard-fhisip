import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'Dashboard FHISIP UT',
    template: '%s | Dashboard FHISIP UT',
  },
  description: 'Sistem Informasi Administrasi Akademik & Layanan Data FHISIP Universitas Terbuka',
  icons: {
    icon: [
      { url: '/fhisip-logo.jpg', type: 'image/jpeg' },
      { url: '/icon.png', type: 'image/png' },
    ],
    shortcut: '/fhisip-logo.jpg',
    apple: '/fhisip-logo.jpg',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <head>
        <link rel="icon" href="/fhisip-logo.jpg" type="image/jpeg" />
        <link rel="icon" href="/icon.png" type="image/png" />
        <link rel="shortcut icon" href="/fhisip-logo.jpg" type="image/jpeg" />
        <link rel="apple-touch-icon" href="/fhisip-logo.jpg" />
      </head>
      <body className="min-h-screen text-slate-800 antialiased">{children}</body>
    </html>
  )
}
