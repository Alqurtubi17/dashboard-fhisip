import { resolveProdiInfo } from './prodi-codes'

/**
 * Utilities for Pengguguran Mata Kuliah Module
 */

export const PRODI_OPTIONS = [
  { code: 'FSIH', name: 'S1 Ilmu Hukum (FSIH)' },
  { code: 'FSSP', name: 'S1 Perpajakan (FSSP)' },
  { code: 'FSAP', name: 'S1 Administrasi Publik (FSAP)' },
  { code: 'FSAB', name: 'S1 Administrasi Bisnis (FSAB)' },
  { code: 'FSIK', name: 'S1 Ilmu Komunikasi (FSIK)' },
  { code: 'FSIP', name: 'S1 Ilmu Perpustakaan (FSIP)' },
  { code: 'FSSO', name: 'S1 Sosiologi (FSSO)' },
  { code: 'FSSI', name: 'S1 Sastra Inggris (FSSI)' },
  { code: 'FSPE', name: 'S1 Ilmu Pemerintahan (FSPE)' },
]

export function getProdiNameByCode(code: string): string {
  const resolved = resolveProdiInfo(code)
  if (resolved) return resolved.name
  const found = PRODI_OPTIONS.find((p) => p.code.toUpperCase() === code.toUpperCase())
  return found ? found.name : code
}

export function cleanStudentName(name: string | null | undefined): string {
  if (!name) return ''
  return name.replace(/\s*\(.*?\)\s*/g, '').trim()
}

export function formatAcademicStatus(rawStatus?: string | null): {
  label: string
  fullText: string
  badgeBg: string
  badgeText: string
  badgeBorder: string
} {
  const full = (rawStatus || 'Aktif').trim()
  const lower = full.toLowerCase()

  if (lower === 'aktif') {
    return {
      label: 'Aktif',
      fullText: full,
      badgeBg: 'bg-emerald-50',
      badgeText: 'text-emerald-700',
      badgeBorder: 'border-emerald-200',
    }
  }

  if (lower.includes('alumni') || lower.includes('lulus')) {
    return {
      label: 'Alumni',
      fullText: full,
      badgeBg: 'bg-blue-50',
      badgeText: 'text-blue-700',
      badgeBorder: 'border-blue-200',
    }
  }

  if (lower.includes('pindah') || lower.includes('batal') || lower.includes('pending')) {
    return {
      label: 'Pindah / Batal Registrasi',
      fullText: full,
      badgeBg: 'bg-amber-50',
      badgeText: 'text-amber-800',
      badgeBorder: 'border-amber-200',
    }
  }

  if (lower.includes('non-aktif') || lower.includes('belum pernah')) {
    return {
      label: 'Non-Aktif',
      fullText: full,
      badgeBg: 'bg-slate-100',
      badgeText: 'text-slate-700',
      badgeBorder: 'border-slate-200',
    }
  }

  if (lower.includes('drop out') || lower.includes('do') || lower.includes('mengundurkan') || lower.includes('meninggal')) {
    return {
      label: 'Tidak Aktif',
      fullText: full,
      badgeBg: 'bg-rose-50',
      badgeText: 'text-rose-700',
      badgeBorder: 'border-rose-200',
    }
  }

  return {
    label: full.length > 22 ? full.slice(0, 20) + '...' : full,
    fullText: full,
    badgeBg: 'bg-slate-100',
    badgeText: 'text-slate-700',
    badgeBorder: 'border-slate-200',
  }
}

export type StatusInfo = {
  label: string
  color: string
  badgeBg: string
  badgeText: string
  stepIndex: number
}

export const STATUS_MAP: Record<string, StatusInfo> = {
  MENUNGGU_VERIFIKASI_PRODI: {
    label: 'Menunggu Verifikasi Prodi',
    color: 'amber',
    badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
    badgeText: 'Menunggu Verifikasi Prodi',
    stepIndex: 1,
  },
  DITOLAK_PRODI: {
    label: 'Ditolak Prodi',
    color: 'rose',
    badgeBg: 'bg-rose-50 text-rose-700 border-rose-200',
    badgeText: 'Ditolak Prodi',
    stepIndex: 1,
  },
  DISETUJUI_PRODI: {
    label: 'Disetujui Prodi / Menunggu Akademik',
    color: 'blue',
    badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
    badgeText: 'Disetujui Prodi',
    stepIndex: 2,
  },
  DITOLAK_AKADEMIK: {
    label: 'Ditolak Akademik',
    color: 'rose',
    badgeBg: 'bg-rose-50 text-rose-700 border-rose-200',
    badgeText: 'Ditolak Akademik',
    stepIndex: 3,
  },
  DISETUJUI_AKADEMIK: {
    label: 'Disetujui Akademik / Selesai',
    color: 'emerald',
    badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    badgeText: 'Disetujui Akademik (Selesai)',
    stepIndex: 4,
  },
}

export function formatWIBDate(date: Date | string | null | undefined): string {
  if (!date) return '-'
  const d = new Date(date)
  if (isNaN(d.getTime())) return '-'
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d) + ' WIB'
}

export function formatWIBDateShort(date: Date | string | null | undefined): string {
  if (!date) return '-'
  const d = new Date(date)
  if (isNaN(d.getTime())) return '-'
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d)
}

export type TimelinePeriodCheck = {
  isPengajuanOpen: boolean
  isVerifikasiProdiOpen: boolean
  isKeputusanAkademikOpen: boolean
  currentStage: 'SEBELUM_PENGAJUAN' | 'PENGAJUAN' | 'VERIFIKASI_PRODI' | 'KEPUTUSAN_AKADEMIK' | 'PENGUMUMAN' | 'SELESAI'
  daysRemainingPengajuan: number
  daysRemainingVerifikasi: number
  daysRemainingAkademik: number
}

export function evaluatePeriodTimeline(periode: {
  pengajuanStart: Date | string
  pengajuanEnd: Date | string
  verifikasiProdiStart: Date | string
  verifikasiProdiEnd: Date | string
  keputusanAkademikStart: Date | string
  keputusanAkademikEnd: Date | string
  pengumumanDate?: Date | string | null
  isActive?: boolean
}): TimelinePeriodCheck {
  const now = new Date()
  const pStart = new Date(periode.pengajuanStart)
  const pEnd = new Date(periode.pengajuanEnd)
  const vStart = new Date(periode.verifikasiProdiStart)
  const vEnd = new Date(periode.verifikasiProdiEnd)
  const aStart = new Date(periode.keputusanAkademikStart)
  const aEnd = new Date(periode.keputusanAkademikEnd)

  const isPengajuanOpen = Boolean(periode.isActive) && now >= pStart && now <= pEnd
  const isVerifikasiProdiOpen = Boolean(periode.isActive) && now >= vStart && now <= vEnd
  const isKeputusanAkademikOpen = Boolean(periode.isActive) && now >= aStart && now <= aEnd

  const diffDays = (target: Date) => {
    const diffMs = target.getTime() - now.getTime()
    return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
  }

  let currentStage: TimelinePeriodCheck['currentStage'] = 'SELESAI'
  if (now < pStart) {
    currentStage = 'SEBELUM_PENGAJUAN'
  } else if (now <= pEnd) {
    currentStage = 'PENGAJUAN'
  } else if (now <= vEnd) {
    currentStage = 'VERIFIKASI_PRODI'
  } else if (now <= aEnd) {
    currentStage = 'KEPUTUSAN_AKADEMIK'
  } else if (periode.pengumumanDate && now <= new Date(periode.pengumumanDate)) {
    currentStage = 'PENGUMUMAN'
  }

  return {
    isPengajuanOpen,
    isVerifikasiProdiOpen,
    isKeputusanAkademikOpen,
    currentStage,
    daysRemainingPengajuan: isPengajuanOpen ? diffDays(pEnd) : 0,
    daysRemainingVerifikasi: isVerifikasiProdiOpen ? diffDays(vEnd) : 0,
    daysRemainingAkademik: isKeputusanAkademikOpen ? diffDays(aEnd) : 0,
  }
}

