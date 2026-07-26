import React from 'react'

export function FhisipLogo({ className = 'w-10 h-10', variant = 'light' }: { className?: string; variant?: 'light' | 'dark' | 'gold' }) {
  return (
    <div className={`relative flex items-center justify-center shrink-0 ${className}`}>
      {/* Outer Seal Badge */}
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-sm">
        {/* Outer Ring */}
        <circle cx="50" cy="50" r="48" fill={variant === 'dark' ? '#002B49' : variant === 'gold' ? '#FFC700' : '#005691'} />
        <circle cx="50" cy="50" r="44" stroke="#FFC700" strokeWidth="2.5" strokeDasharray="4 2" />
        
        {/* Academic Scales & Book Emblem */}
        {/* Open Book */}
        <path d="M26 62 C36 56 46 60 50 64 C54 60 64 56 74 62 L74 38 C64 34 54 37 50 40 C46 37 36 34 26 38 Z" fill="#FFFFFF" opacity="0.95" />
        <path d="M50 40 L50 64" stroke="#002B49" strokeWidth="2" strokeLinecap="round" />
        
        {/* Pillar / Torch Symbol of Law & Governance */}
        <path d="M46 22 H54 V34 H46 Z" fill="#FFC700" />
        <path d="M44 22 L50 14 L56 22 Z" fill="#FFC700" />
        
        {/* Star Accent */}
        <path d="M50 18 L51.5 21 L55 21.5 L52.5 24 L53 27.5 L50 26 L47 27.5 L47.5 24 L45 21.5 L48.5 21 Z" fill="#FFFFFF" />
      </svg>
    </div>
  )
}
