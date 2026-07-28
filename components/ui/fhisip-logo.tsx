import React from 'react'
import logoImg from '@/public/fhisip-logo.jpg'

export function FhisipLogo({
  className = 'w-10 h-10',
  variant = 'gold',
}: {
  className?: string
  variant?: 'light' | 'dark' | 'gold' | 'transparent'
}) {
  return (
    <div className={`relative flex items-center justify-center shrink-0 overflow-hidden rounded-xl shadow-sm ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={logoImg.src}
        alt="Logo UT FHISIP"
        className="w-full h-full object-cover rounded-xl"
      />
    </div>
  )
}
